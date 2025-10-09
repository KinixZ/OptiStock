<?php
// scripts/php/report_history.php
// Gestiona el historial de reportes utilizando almacenamiento local en el servidor
// y sincroniza los metadatos con la base de datos.

declare(strict_types=1);

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

const REPORT_RETENTION_DAYS = 60; // Se eliminan automáticamente después de ~2 meses.
const REPORT_RETENTION_SECONDS = REPORT_RETENTION_DAYS * 24 * 60 * 60;
const REPORTS_ROOT = __DIR__ . '/../../docs/report-history';
const REPORT_FILES_DIR = REPORTS_ROOT . '/files';
const AUTOMATION_RUN_TOLERANCE_SECONDS = 120; // Margen para comparar ejecuciones duplicadas.

const DB_SERVER = 'localhost';
const DB_USER = 'u296155119_Admin';
const DB_PASSWORD = '4Dmin123o';
const DB_NAME = 'u296155119_OptiStock';

const MIME_EXTENSION_MAP = [
    'application/pdf' => '.pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' => '.xlsx',
    'application/vnd.ms-excel' => '.xls',
    'text/csv' => '.csv',
];

function respond_json(int $statusCode, array $payload): void
{
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function ensure_storage(): void
{
    if (!is_dir(REPORTS_ROOT)) {
        mkdir(REPORTS_ROOT, 0775, true);
    }
    if (!is_dir(REPORT_FILES_DIR)) {
        mkdir(REPORT_FILES_DIR, 0775, true);
    }
}

function db_connect(): mysqli
{
    $conn = new mysqli(DB_SERVER, DB_USER, DB_PASSWORD, DB_NAME);
    $conn->set_charset('utf8mb4');
    return $conn;
}

function to_mysql_datetime(string $iso): string
{
    $timestamp = strtotime($iso);
    if ($timestamp === false) {
        $timestamp = time();
    }

    return date('Y-m-d H:i:s', $timestamp);
}

function insert_report_reference(array $entry, int $empresaId, ?mysqli $externalConn = null): void
{
    $uuid = (string) ($entry['id'] ?? '');
    $originalName = (string) ($entry['originalName'] ?? '');
    $storageName = (string) ($entry['storageName'] ?? '');
    $mimeType = (string) ($entry['mimeType'] ?? '');
    $size = (int) ($entry['size'] ?? 0);
    $createdAt = (string) ($entry['createdAt'] ?? '');
    $expiresAt = (string) ($entry['expiresAt'] ?? '');
    $source = trim((string) ($entry['source'] ?? ''));
    $notes = trim((string) ($entry['notes'] ?? ''));

    if ($uuid === '' || $originalName === '' || $storageName === '') {
        throw new RuntimeException('Faltan datos obligatorios para registrar el reporte.');
    }

    $shouldClose = false;
    if ($externalConn instanceof mysqli) {
        $conn = $externalConn;
    } else {
        $conn = db_connect();
        $shouldClose = true;
    }

    try {
        $stmt = $conn->prepare(
            'INSERT INTO reportes_historial (
                uuid, id_empresa, original_name, storage_name, mime_type, file_size, created_at, expires_at, source, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                original_name = VALUES(original_name),
                storage_name = VALUES(storage_name),
                mime_type = VALUES(mime_type),
                file_size = VALUES(file_size),
                created_at = VALUES(created_at),
                expires_at = VALUES(expires_at),
                source = VALUES(source),
                notes = VALUES(notes)'
        );

        $createdAtSql = to_mysql_datetime($createdAt);
        $expiresAtSql = to_mysql_datetime($expiresAt);

        $stmt->bind_param(
            'sisssissss',
            $uuid,
            $empresaId,
            $originalName,
            $storageName,
            $mimeType,
            $size,
            $createdAtSql,
            $expiresAtSql,
            $source,
            $notes
        );

        $stmt->execute();
        $stmt->close();
    } finally {
        if ($shouldClose) {
            $conn->close();
        }
    }
}

function ensure_automation_run_table(mysqli $conn): void
{
    static $ensured = false;
    if ($ensured) {
        return;
    }

    $conn->query(
        'CREATE TABLE IF NOT EXISTS reportes_automatizados_runs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            automation_uuid VARCHAR(64) NOT NULL,
            empresa_id INT NOT NULL,
            run_at DATETIME NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_automation_run (automation_uuid, empresa_id, run_at),
            KEY idx_empresa_run (empresa_id, run_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );

    $ensured = true;
}

function parse_time_parts(string $time): array
{
    $matches = [];
    if (preg_match('/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/', $time, $matches)) {
        $hours = max(0, min(23, (int) $matches[1]));
        $minutes = max(0, min(59, (int) $matches[2]));
        return [$hours, $minutes];
    }

    return [8, 0];
}

function compute_month_date(DateTimeImmutable $reference, int $day, int $hours, int $minutes): DateTimeImmutable
{
    $year = (int) $reference->format('Y');
    $month = (int) $reference->format('n');
    $lastDay = (int) (new DateTimeImmutable(sprintf('%04d-%02d-01', $year, $month)))->modify('last day of this month')->format('j');
    $safeDay = max(1, min($day, $lastDay));

    return $reference
        ->setDate($year, $month, $safeDay)
        ->setTime($hours, $minutes, 0, 0);
}

function compute_next_run_for_automation(array $automation, DateTimeImmutable $reference): ?DateTimeImmutable
{
    $frequency = (string) ($automation['frecuencia'] ?? 'daily');
    [$hours, $minutes] = parse_time_parts((string) ($automation['hora_ejecucion'] ?? '08:00:00'));
    $base = $reference->setTime($hours, $minutes, 0, 0);

    switch ($frequency) {
        case 'weekly':
            $desiredDay = max(0, min(6, (int) ($automation['dia_semana'] ?? 1)));
            $currentDay = (int) $base->format('w');
            $diff = $desiredDay - $currentDay;
            if ($diff < 0 || ($diff === 0 && $base <= $reference)) {
                $diff += 7;
            }
            return $base->modify("+{$diff} days");

        case 'biweekly':
            $day = max(1, min(31, (int) ($automation['dia_mes'] ?? 1)));
            $lastRunRaw = $automation['ultimo_ejecutado'] ?? null;
            if ($lastRunRaw) {
                try {
                    $candidate = (new DateTimeImmutable($lastRunRaw))->setTime($hours, $minutes, 0, 0);
                    while ($candidate <= $reference) {
                        $candidate = $candidate->modify('+14 days');
                    }
                    return $candidate;
                } catch (Exception $exception) {
                    // fall through to base computation
                }
            }
            $candidateBase = compute_month_date($reference, $day, $hours, $minutes);
            if ($candidateBase <= $reference) {
                return $candidateBase->modify('+14 days');
            }
            return $candidateBase;

        case 'monthly':
            $day = max(1, min(31, (int) ($automation['dia_mes'] ?? 1)));
            $candidateBase = compute_month_date($reference, $day, $hours, $minutes);
            if ($candidateBase <= $reference) {
                $nextMonth = $candidateBase->modify('first day of next month');
                $lastDayNextMonth = (int) $nextMonth->modify('last day of this month')->format('j');
                $safeDay = max(1, min($day, $lastDayNextMonth));
                return $nextMonth->setDate(
                    (int) $nextMonth->format('Y'),
                    (int) $nextMonth->format('n'),
                    $safeDay
                )->setTime($hours, $minutes, 0, 0);
            }
            return $candidateBase;

        default:
            if ($base <= $reference) {
                return $base->modify('+1 day');
            }
            return $base;
    }
}

function format_datetime_iso(?DateTimeInterface $dateTime): ?string
{
    if (!$dateTime) {
        return null;
    }

    return $dateTime->setTimezone(new DateTimeZone('UTC'))->format(DateTimeInterface::ATOM);
}

function mysql_datetime_to_iso(?string $value): ?string
{
    if ($value === null || $value === '') {
        return null;
    }

    try {
        return (new DateTimeImmutable($value))->setTimezone(new DateTimeZone('UTC'))->format(DateTimeInterface::ATOM);
    } catch (Exception $exception) {
        return null;
    }
}

function resolve_run_datetime(?string $requestedRunAt, ?string $scheduledRaw): DateTimeImmutable
{
    if ($requestedRunAt) {
        try {
            return new DateTimeImmutable($requestedRunAt);
        } catch (Exception $exception) {
            // continue with scheduled/now fallback
        }
    }

    if ($scheduledRaw) {
        try {
            return new DateTimeImmutable($scheduledRaw);
        } catch (Exception $exception) {
            // continue with now fallback
        }
    }

    return new DateTimeImmutable('now');
}

function seconds_between(DateTimeImmutable $a, DateTimeImmutable $b): int
{
    return (int) abs($a->getTimestamp() - $b->getTimestamp());
}

function sanitize_automation_id(?string $value): string
{
    $clean = preg_replace('/[^A-Za-z0-9:_-]/', '', (string) $value);
    if ($clean === null) {
        $clean = '';
    }

    return substr($clean, 0, 64);
}

function format_number_short($value, int $decimals = 0): string
{
    if (!is_numeric($value)) {
        return '0';
    }

    $number = (float) $value;

    if ($decimals <= 0) {
        return number_format((int) round($number), 0, '.', ',');
    }

    return number_format($number, $decimals, '.', ',');
}

function format_percentage_value($value, int $decimals = 1): string
{
    if (!is_numeric($value)) {
        return '0%';
    }

    return number_format((float) $value, $decimals, '.', ',') . '%';
}

function format_datetime_label(?string $value): string
{
    if ($value === null || $value === '') {
        return 'Sin datos';
    }

    try {
        $dateTime = new DateTimeImmutable($value);
        return $dateTime->format('Y-m-d H:i');
    } catch (Throwable $exception) {
        return (string) $value;
    }
}

function create_metric(string $label, string $value, string $description = ''): array
{
    return [
        'label' => $label,
        'value' => $value,
        'description' => $description,
    ];
}

function create_table(string $title, array $headers, array $rows): array
{
    return [
        'title' => $title,
        'headers' => $headers,
        'rows' => $rows,
    ];
}

function fetch_company_profile(mysqli $conn, int $empresaId): array
{
    try {
        $stmt = $conn->prepare('SELECT nombre_empresa, sector_empresa, fecha_registro, capacidad_maxima_m3, umbral_alerta_capacidad FROM empresa WHERE id_empresa = ? LIMIT 1');
        $stmt->bind_param('i', $empresaId);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc() ?: [];
        $stmt->close();

        return [
            'name' => (string) ($row['nombre_empresa'] ?? ''),
            'sector' => (string) ($row['sector_empresa'] ?? ''),
            'registeredAt' => mysql_datetime_to_iso($row['fecha_registro'] ?? null),
            'capacityMax' => isset($row['capacidad_maxima_m3']) ? (float) $row['capacidad_maxima_m3'] : null,
            'capacityAlert' => isset($row['umbral_alerta_capacidad']) ? (float) $row['umbral_alerta_capacidad'] : null,
        ];
    } catch (Throwable $exception) {
        error_log('fetch_company_profile: ' . $exception->getMessage());
        return [
            'name' => '',
            'sector' => '',
            'registeredAt' => null,
            'capacityMax' => null,
            'capacityAlert' => null,
        ];
    }
}

function fetch_inventory_insights(mysqli $conn, int $empresaId): array
{
    $metrics = [];
    $tables = [];

    try {
        $stmt = $conn->prepare('SELECT COUNT(*) AS total_products, SUM(stock) AS total_stock, AVG(stock) AS avg_stock, MAX(last_movimiento) AS last_update FROM productos WHERE empresa_id = ?');
        $stmt->bind_param('i', $empresaId);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc() ?: [];
        $stmt->close();

        $totalProducts = (int) ($row['total_products'] ?? 0);
        $totalStock = (float) ($row['total_stock'] ?? 0);
        $avgStock = (float) ($row['avg_stock'] ?? 0);
        $lastUpdate = $row['last_update'] ?? null;

        $metrics[] = create_metric('Productos registrados', format_number_short($totalProducts), 'SKU asociados a la empresa.');
        $metrics[] = create_metric('Unidades en inventario', format_number_short($totalStock), 'Suma de existencias actuales.');
        $metrics[] = create_metric('Stock promedio por producto', format_number_short($avgStock, 2), 'Promedio de unidades disponibles.');
        if ($lastUpdate) {
            $metrics[] = create_metric('Última actualización de inventario', format_datetime_label($lastUpdate));
        }
    } catch (Throwable $exception) {
        error_log('fetch_inventory_insights(summary): ' . $exception->getMessage());
    }

    try {
        $stmt = $conn->prepare('SELECT nombre, stock, last_movimiento FROM productos WHERE empresa_id = ? ORDER BY stock ASC, nombre ASC LIMIT 5');
        $stmt->bind_param('i', $empresaId);
        $stmt->execute();
        $result = $stmt->get_result();
        $rows = [];
        while ($row = $result->fetch_assoc()) {
            $rows[] = [
                (string) ($row['nombre'] ?? ''),
                format_number_short($row['stock'] ?? 0),
                format_datetime_label($row['last_movimiento'] ?? null),
            ];
        }
        $stmt->close();

        if ($rows) {
            $tables[] = create_table('Productos con menor stock', ['Producto', 'Stock', 'Último movimiento'], $rows);
        }
    } catch (Throwable $exception) {
        error_log('fetch_inventory_insights(low stock): ' . $exception->getMessage());
    }

    try {
        $stmt = $conn->prepare("SELECT tipo, SUM(cantidad) AS total FROM movimientos WHERE empresa_id = ? AND fecha_movimiento >= DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY tipo");
        $stmt->bind_param('i', $empresaId);
        $stmt->execute();
        $result = $stmt->get_result();
        $ingresos = 0;
        $egresos = 0;
        while ($row = $result->fetch_assoc()) {
            if (($row['tipo'] ?? '') === 'ingreso') {
                $ingresos = (float) ($row['total'] ?? 0);
            }
            if (($row['tipo'] ?? '') === 'egreso') {
                $egresos = (float) ($row['total'] ?? 0);
            }
        }
        $stmt->close();

        if ($ingresos > 0 || $egresos > 0) {
            $metrics[] = create_metric('Ingresos últimos 30 días', format_number_short($ingresos), 'Unidades recibidas recientemente.');
            $metrics[] = create_metric('Egresos últimos 30 días', format_number_short($egresos), 'Unidades despachadas en 30 días.');
            $neto = $ingresos - $egresos;
            $metrics[] = create_metric('Movimiento neto 30 días', format_number_short($neto, 0), 'Resultado de ingresos menos egresos.');
        }
    } catch (Throwable $exception) {
        error_log('fetch_inventory_insights(movements summary): ' . $exception->getMessage());
    }

    try {
        $stmt = $conn->prepare('SELECT m.fecha_movimiento, p.nombre AS producto, m.tipo, m.cantidad, u.nombre, u.apellido FROM movimientos m INNER JOIN productos p ON p.id = m.producto_id INNER JOIN usuario u ON u.id_usuario = m.id_usuario WHERE m.empresa_id = ? ORDER BY m.fecha_movimiento DESC LIMIT 10');
        $stmt->bind_param('i', $empresaId);
        $stmt->execute();
        $result = $stmt->get_result();
        $rows = [];
        while ($row = $result->fetch_assoc()) {
            $responsable = trim(($row['nombre'] ?? '') . ' ' . ($row['apellido'] ?? ''));
            $rows[] = [
                format_datetime_label($row['fecha_movimiento'] ?? null),
                (string) ($row['producto'] ?? ''),
                (string) ($row['tipo'] ?? ''),
                format_number_short($row['cantidad'] ?? 0),
                $responsable !== '' ? $responsable : 'Desconocido',
            ];
        }
        $stmt->close();

        if ($rows) {
            $tables[] = create_table('Movimientos recientes', ['Fecha', 'Producto', 'Tipo', 'Cantidad', 'Responsable'], $rows);
        }
    } catch (Throwable $exception) {
        error_log('fetch_inventory_insights(recent movements): ' . $exception->getMessage());
    }

    return [
        'metrics' => $metrics,
        'tables' => $tables,
    ];
}

function fetch_user_insights(mysqli $conn, int $empresaId): array
{
    $metrics = [];
    $tables = [];

    try {
        $stmt = $conn->prepare('SELECT COUNT(*) AS total FROM usuario_empresa WHERE id_empresa = ?');
        $stmt->bind_param('i', $empresaId);
        $stmt->execute();
        $total = (int) ($stmt->get_result()->fetch_assoc()['total'] ?? 0);
        $stmt->close();

        $metrics[] = create_metric('Usuarios vinculados', format_number_short($total), 'Colaboradores registrados para la empresa.');
    } catch (Throwable $exception) {
        error_log('fetch_user_insights(total): ' . $exception->getMessage());
    }

    try {
        $stmt = $conn->prepare('SELECT COUNT(*) AS activos FROM usuario_empresa ue INNER JOIN usuario u ON u.id_usuario = ue.id_usuario WHERE ue.id_empresa = ? AND u.activo = 1');
        $stmt->bind_param('i', $empresaId);
        $stmt->execute();
        $activos = (int) ($stmt->get_result()->fetch_assoc()['activos'] ?? 0);
        $stmt->close();

        $metrics[] = create_metric('Usuarios activos', format_number_short($activos), 'Cuentas habilitadas para iniciar sesión.');
    } catch (Throwable $exception) {
        error_log('fetch_user_insights(active): ' . $exception->getMessage());
    }

    try {
        $stmt = $conn->prepare('SELECT COUNT(*) AS tutorial FROM usuario_empresa ue INNER JOIN usuario u ON u.id_usuario = ue.id_usuario WHERE ue.id_empresa = ? AND u.tutorial_visto = 1');
        $stmt->bind_param('i', $empresaId);
        $stmt->execute();
        $tutorial = (int) ($stmt->get_result()->fetch_assoc()['tutorial'] ?? 0);
        $stmt->close();

        if ($tutorial > 0) {
            $metrics[] = create_metric('Usuarios con tutorial completado', format_number_short($tutorial), 'Colaboradores que finalizaron el tutorial.');
        }
    } catch (Throwable $exception) {
        error_log('fetch_user_insights(tutorial): ' . $exception->getMessage());
    }

    try {
        $stmt = $conn->prepare('SELECT u.rol, COUNT(*) AS total FROM usuario_empresa ue INNER JOIN usuario u ON u.id_usuario = ue.id_usuario WHERE ue.id_empresa = ? GROUP BY u.rol ORDER BY total DESC');
        $stmt->bind_param('i', $empresaId);
        $stmt->execute();
        $result = $stmt->get_result();
        $rows = [];
        while ($row = $result->fetch_assoc()) {
            $rows[] = [
                (string) ($row['rol'] ?? 'Sin rol'),
                format_number_short($row['total'] ?? 0),
            ];
        }
        $stmt->close();

        if ($rows) {
            $tables[] = create_table('Distribución por rol', ['Rol', 'Usuarios'], $rows);
        }
    } catch (Throwable $exception) {
        error_log('fetch_user_insights(roles): ' . $exception->getMessage());
    }

    try {
        $stmt = $conn->prepare('SELECT ra.fecha, u.nombre, u.apellido, ra.accion FROM registro_accesos ra INNER JOIN usuario u ON u.id_usuario = ra.id_usuario INNER JOIN usuario_empresa ue ON ue.id_usuario = ra.id_usuario WHERE ue.id_empresa = ? ORDER BY ra.fecha DESC LIMIT 10');
        $stmt->bind_param('i', $empresaId);
        $stmt->execute();
        $result = $stmt->get_result();
        $rows = [];
        while ($row = $result->fetch_assoc()) {
            $usuario = trim(($row['nombre'] ?? '') . ' ' . ($row['apellido'] ?? ''));
            $rows[] = [
                format_datetime_label($row['fecha'] ?? null),
                $usuario !== '' ? $usuario : 'Desconocido',
                (string) ($row['accion'] ?? ''),
            ];
        }
        $stmt->close();

        if ($rows) {
            $tables[] = create_table('Historial de accesos', ['Fecha', 'Usuario', 'Acción'], $rows);
        }
    } catch (Throwable $exception) {
        error_log('fetch_user_insights(access log): ' . $exception->getMessage());
    }

    return [
        'metrics' => $metrics,
        'tables' => $tables,
    ];
}

function fetch_area_insights(mysqli $conn, int $empresaId): array
{
    $metrics = [];
    $tables = [];

    try {
        $stmt = $conn->prepare('SELECT COUNT(*) AS total, AVG(porcentaje_ocupacion) AS ocupacion_promedio, SUM(productos_registrados) AS productos FROM areas WHERE id_empresa = ?');
        $stmt->bind_param('i', $empresaId);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc() ?: [];
        $stmt->close();

        $metrics[] = create_metric('Áreas registradas', format_number_short($row['total'] ?? 0));
        if (isset($row['ocupacion_promedio'])) {
            $metrics[] = create_metric('Ocupación promedio de áreas', format_percentage_value($row['ocupacion_promedio'] ?? 0), 'Promedio de ocupación calculado a partir de las áreas.');
        }
        if (isset($row['productos'])) {
            $metrics[] = create_metric('Productos ubicados en áreas', format_number_short($row['productos'] ?? 0));
        }
    } catch (Throwable $exception) {
        error_log('fetch_area_insights(areas summary): ' . $exception->getMessage());
    }

    try {
        $stmt = $conn->prepare('SELECT COUNT(*) AS total_zonas, AVG(porcentaje_ocupacion) AS ocupacion_promedio FROM zonas WHERE id_empresa = ?');
        $stmt->bind_param('i', $empresaId);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc() ?: [];
        $stmt->close();

        $metrics[] = create_metric('Zonas registradas', format_number_short($row['total_zonas'] ?? 0));
        if (isset($row['ocupacion_promedio'])) {
            $metrics[] = create_metric('Ocupación promedio de zonas', format_percentage_value($row['ocupacion_promedio'] ?? 0));
        }
    } catch (Throwable $exception) {
        error_log('fetch_area_insights(zones summary): ' . $exception->getMessage());
    }

    try {
        $stmt = $conn->prepare('SELECT nombre, porcentaje_ocupacion, productos_registrados FROM areas WHERE id_empresa = ? ORDER BY porcentaje_ocupacion DESC LIMIT 5');
        $stmt->bind_param('i', $empresaId);
        $stmt->execute();
        $result = $stmt->get_result();
        $rows = [];
        while ($row = $result->fetch_assoc()) {
            $rows[] = [
                (string) ($row['nombre'] ?? ''),
                format_percentage_value($row['porcentaje_ocupacion'] ?? 0),
                format_number_short($row['productos_registrados'] ?? 0),
            ];
        }
        $stmt->close();

        if ($rows) {
            $tables[] = create_table('Áreas con mayor ocupación', ['Área', 'Ocupación', 'Productos'], $rows);
        }
    } catch (Throwable $exception) {
        error_log('fetch_area_insights(top areas): ' . $exception->getMessage());
    }

    try {
        $stmt = $conn->prepare('SELECT nombre, productos_registrados, porcentaje_ocupacion FROM zonas WHERE id_empresa = ? ORDER BY productos_registrados DESC, porcentaje_ocupacion DESC LIMIT 5');
        $stmt->bind_param('i', $empresaId);
        $stmt->execute();
        $result = $stmt->get_result();
        $rows = [];
        while ($row = $result->fetch_assoc()) {
            $rows[] = [
                (string) ($row['nombre'] ?? ''),
                format_number_short($row['productos_registrados'] ?? 0),
                format_percentage_value($row['porcentaje_ocupacion'] ?? 0),
            ];
        }
        $stmt->close();

        if ($rows) {
            $tables[] = create_table('Zonas con más productos', ['Zona', 'Productos', 'Ocupación'], $rows);
        }
    } catch (Throwable $exception) {
        error_log('fetch_area_insights(top zones): ' . $exception->getMessage());
    }

    return [
        'metrics' => $metrics,
        'tables' => $tables,
    ];
}

function fetch_notification_insights(mysqli $conn, int $empresaId): array
{
    $metrics = [];
    $tables = [];

    try {
        $stmt = $conn->prepare('SELECT COUNT(*) AS total, SUM(estado = "Pendiente") AS pendientes, SUM(prioridad = "Alta") AS altas FROM notificaciones WHERE id_empresa = ?');
        $stmt->bind_param('i', $empresaId);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc() ?: [];
        $stmt->close();

        if (($row['total'] ?? 0) > 0) {
            $metrics[] = create_metric('Alertas registradas', format_number_short($row['total'] ?? 0));
            $metrics[] = create_metric('Alertas pendientes', format_number_short($row['pendientes'] ?? 0));
            $metrics[] = create_metric('Alertas de prioridad alta', format_number_short($row['altas'] ?? 0));
        }
    } catch (Throwable $exception) {
        error_log('fetch_notification_insights(summary): ' . $exception->getMessage());
    }

    try {
        $stmt = $conn->prepare('SELECT titulo, tipo_destinatario, estado, prioridad, creado_en FROM notificaciones WHERE id_empresa = ? ORDER BY creado_en DESC LIMIT 8');
        $stmt->bind_param('i', $empresaId);
        $stmt->execute();
        $result = $stmt->get_result();
        $rows = [];
        while ($row = $result->fetch_assoc()) {
            $rows[] = [
                (string) ($row['titulo'] ?? ''),
                (string) ($row['tipo_destinatario'] ?? ''),
                (string) ($row['estado'] ?? ''),
                (string) ($row['prioridad'] ?? ''),
                format_datetime_label($row['creado_en'] ?? null),
            ];
        }
        $stmt->close();

        if ($rows) {
            $tables[] = create_table('Alertas y notificaciones recientes', ['Título', 'Destinatario', 'Estado', 'Prioridad', 'Creada'], $rows);
        }
    } catch (Throwable $exception) {
        error_log('fetch_notification_insights(list): ' . $exception->getMessage());
    }

    return [
        'metrics' => $metrics,
        'tables' => $tables,
    ];
}

function fetch_activity_log_entries(mysqli $conn, int $empresaId, int $limit = 8): array
{
    try {
        $stmt = $conn->prepare('SELECT lc.fecha, lc.hora, lc.modulo, lc.accion, u.nombre, u.apellido FROM log_control lc INNER JOIN usuario u ON u.id_usuario = lc.id_usuario INNER JOIN usuario_empresa ue ON ue.id_usuario = lc.id_usuario WHERE ue.id_empresa = ? ORDER BY CONCAT(lc.fecha, " ", lc.hora) DESC LIMIT ?');
        $stmt->bind_param('ii', $empresaId, $limit);
        $stmt->execute();
        $result = $stmt->get_result();
        $rows = [];
        while ($row = $result->fetch_assoc()) {
            $fecha = trim((string) ($row['fecha'] ?? ''));
            $hora = trim((string) ($row['hora'] ?? ''));
            $datetime = trim($fecha . ' ' . $hora);
            $responsable = trim(($row['nombre'] ?? '') . ' ' . ($row['apellido'] ?? ''));
            $rows[] = [
                format_datetime_label($datetime !== '' ? $datetime : null),
                (string) ($row['modulo'] ?? ''),
                (string) ($row['accion'] ?? ''),
                $responsable !== '' ? $responsable : 'Desconocido',
            ];
        }
        $stmt->close();

        if (!$rows) {
            return [];
        }

        return create_table('Últimas actividades registradas', ['Fecha', 'Módulo', 'Acción', 'Responsable'], $rows);
    } catch (Throwable $exception) {
        error_log('fetch_activity_log_entries: ' . $exception->getMessage());
        return [];
    }
}

function build_automation_report_data(mysqli $conn, array $automationRow): array
{
    $empresaId = (int) ($automationRow['id_empresa'] ?? 0);
    if ($empresaId <= 0) {
        return [];
    }

    $moduleName = trim((string) ($automationRow['modulo'] ?? ''));
    $moduleKey = strtolower($moduleName);

    $company = fetch_company_profile($conn, $empresaId);
    $inventory = fetch_inventory_insights($conn, $empresaId);
    $users = fetch_user_insights($conn, $empresaId);
    $areas = fetch_area_insights($conn, $empresaId);
    $notifications = fetch_notification_insights($conn, $empresaId);
    $activityTable = fetch_activity_log_entries($conn, $empresaId);

    $metrics = [];
    $tables = [];

    $moduleHandled = false;
    if ($moduleKey !== '') {
        if (strpos($moduleKey, 'usuario') !== false) {
            $metrics = array_merge($metrics, $users['metrics']);
            $tables = array_merge($tables, $users['tables']);
            if ($activityTable) {
                $tables[] = $activityTable;
            }
            $moduleHandled = true;
        } elseif (strpos($moduleKey, 'inventario') !== false || strpos($moduleKey, 'recepción') !== false || strpos($moduleKey, 'almacenamiento') !== false || strpos($moduleKey, 'despacho') !== false || strpos($moduleKey, 'distribución') !== false) {
            $metrics = array_merge($metrics, $inventory['metrics'], $areas['metrics']);
            $tables = array_merge($tables, $inventory['tables'], $areas['tables']);
            $moduleHandled = true;
        } elseif (strpos($moduleKey, 'alerta') !== false || strpos($moduleKey, 'monitoreo') !== false) {
            $metrics = array_merge($metrics, $notifications['metrics']);
            if ($users['metrics']) {
                $metrics[] = $users['metrics'][0];
            }
            $tables = array_merge($tables, $notifications['tables']);
            if ($activityTable) {
                $tables[] = $activityTable;
            }
            $moduleHandled = true;
        }
    }

    if (!$moduleHandled) {
        $metrics = array_merge($metrics, $inventory['metrics'], $users['metrics'], $areas['metrics'], $notifications['metrics']);
        $tables = array_merge($tables, $inventory['tables'], $users['tables'], $areas['tables'], $notifications['tables']);
        if ($activityTable) {
            $tables[] = $activityTable;
        }
    }

    $seenLabels = [];
    $normalizedMetrics = [];
    foreach ($metrics as $metric) {
        $label = isset($metric['label']) ? (string) $metric['label'] : '';
        if ($label === '') {
            continue;
        }
        if (isset($seenLabels[$label])) {
            continue;
        }
        $seenLabels[$label] = true;
        $normalizedMetrics[] = [
            'label' => $label,
            'value' => isset($metric['value']) ? (string) $metric['value'] : '',
            'description' => isset($metric['description']) ? (string) $metric['description'] : '',
        ];
    }

    if (count($normalizedMetrics) > 12) {
        $normalizedMetrics = array_slice($normalizedMetrics, 0, 12);
    }

    $dedupTables = [];
    foreach ($tables as $table) {
        $title = isset($table['title']) ? (string) $table['title'] : '';
        if ($title === '') {
            continue;
        }
        if (isset($dedupTables[$title])) {
            continue;
        }
        $headers = isset($table['headers']) && is_array($table['headers']) ? array_values($table['headers']) : [];
        $rows = [];
        if (isset($table['rows']) && is_array($table['rows'])) {
            foreach ($table['rows'] as $row) {
                if (!is_array($row)) {
                    continue;
                }
                $rows[] = array_map(static function ($value) {
                    return (string) $value;
                }, array_values($row));
            }
        }
        if (!$headers || !$rows) {
            continue;
        }
        if (count($rows) > 15) {
            $rows = array_slice($rows, 0, 15);
        }
        $dedupTables[$title] = [
            'title' => $title,
            'headers' => $headers,
            'rows' => $rows,
        ];
    }

    $generatedAt = (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format(DateTimeInterface::ATOM);

    return [
        'module' => [
            'name' => $moduleName !== '' ? $moduleName : 'Reporte automatizado',
        ],
        'company' => $company,
        'metrics' => $normalizedMetrics,
        'tables' => array_values($dedupTables),
        'generatedAt' => $generatedAt,
    ];
}

function delete_report_reference(?string $uuid): void
{
    $id = trim((string) $uuid);
    if ($id === '') {
        return;
    }

    try {
        $conn = db_connect();
    } catch (mysqli_sql_exception $exception) {
        error_log('No se pudo conectar a la base de datos para limpiar referencias de reportes: ' . $exception->getMessage());
        return;
    }

    try {
        $stmt = $conn->prepare('DELETE FROM reportes_historial WHERE uuid = ?');
        $stmt->bind_param('s', $id);
        $stmt->execute();
        $stmt->close();
    } catch (mysqli_sql_exception $exception) {
        error_log('No se pudo eliminar la referencia del reporte ' . $id . ': ' . $exception->getMessage());
    } finally {
        $conn->close();
    }
}

function remove_report_file(?string $storageName): void
{
    if (!$storageName) {
        return;
    }
    $filePath = REPORT_FILES_DIR . '/' . basename($storageName);
    if (is_file($filePath)) {
        @unlink($filePath);
    }
}

function random_id(): string
{
    try {
        return bin2hex(random_bytes(16));
    } catch (Exception $exception) {
        $fallback = openssl_random_pseudo_bytes(16);
        if ($fallback !== false) {
            return bin2hex($fallback);
        }

        return bin2hex(pack('d', microtime(true)) . pack('d', mt_rand()));
    }
}

function sanitize_file_name(string $name): string
{
    $trimmed = trim($name);
    if ($trimmed === '') {
        return 'reporte';
    }

    $basename = basename($trimmed);
    $sanitized = preg_replace('/[\\\\\/\:*?"<>|]+/', '_', $basename);
    return $sanitized ?: 'reporte';
}

function ensure_extension(string $fileName, string $mimeType): string
{
    if (pathinfo($fileName, PATHINFO_EXTENSION)) {
        return $fileName;
    }
    $extension = MIME_EXTENSION_MAP[$mimeType] ?? '';
    return $fileName . $extension;
}

function str_limit(string $text, int $limit): string
{
    if (function_exists('mb_substr')) {
        return mb_substr($text, 0, $limit);
    }

    return substr($text, 0, $limit);
}

function format_datetime_for_response(?string $value): string
{
    if ($value === null || $value === '') {
        return '';
    }

    $timestamp = strtotime($value);
    if ($timestamp === false) {
        return '';
    }

    return gmdate('c', $timestamp);
}

function map_database_row(array $row): array
{
    $storageName = (string) ($row['storage_name'] ?? '');
    $filePath = $storageName !== '' ? REPORT_FILES_DIR . '/' . basename($storageName) : '';

    $size = isset($row['file_size']) ? (int) $row['file_size'] : 0;
    if ($size <= 0 && $filePath !== '' && is_file($filePath)) {
        $filesize = filesize($filePath);
        if ($filesize !== false) {
            $size = (int) $filesize;
        }
    }

    return [
        'id' => (string) ($row['uuid'] ?? ''),
        'empresaId' => (int) ($row['id_empresa'] ?? 0),
        'originalName' => (string) ($row['original_name'] ?? ''),
        'storageName' => $storageName,
        'mimeType' => (string) ($row['mime_type'] ?? ''),
        'size' => $size,
        'createdAt' => format_datetime_for_response($row['created_at'] ?? null),
        'expiresAt' => format_datetime_for_response($row['expires_at'] ?? null),
        'source' => (string) ($row['source'] ?? ''),
        'notes' => (string) ($row['notes'] ?? ''),
    ];
}

function fetch_reports_from_database(?int $empresaId = null): array
{
    $conn = db_connect();

    try {
        $query = 'SELECT uuid, id_empresa, original_name, storage_name, mime_type, file_size, created_at, expires_at, source, notes FROM reportes_historial';
        $types = '';
        $params = [];

        if ($empresaId !== null && $empresaId > 0) {
            $query .= ' WHERE id_empresa = ?';
            $types = 'i';
            $params[] = $empresaId;
        }

        $query .= ' ORDER BY created_at DESC';

        $stmt = $conn->prepare($query);
        if ($types !== '') {
            $stmt->bind_param($types, ...$params);
        }

        $stmt->execute();
        $result = $stmt->get_result();

        $reports = [];
        while ($row = $result->fetch_assoc()) {
            $storageName = $row['storage_name'] ?? '';
            if ($storageName !== '') {
                $filePath = REPORT_FILES_DIR . '/' . basename($storageName);
                if (!is_file($filePath)) {
                    delete_report_reference($row['uuid'] ?? '');
                    continue;
                }
            }

            $reports[] = map_database_row($row);
        }

        $stmt->close();
        return $reports;
    } finally {
        $conn->close();
    }
}

function purge_expired_reports_from_database(): void
{
    try {
        $conn = db_connect();
    } catch (mysqli_sql_exception $exception) {
        error_log('No se pudo conectar a la base de datos para depurar el historial: ' . $exception->getMessage());
        return;
    }

    try {
        $stmt = $conn->prepare("SELECT uuid, storage_name FROM reportes_historial WHERE expires_at IS NOT NULL AND expires_at <> '' AND expires_at <= NOW()");
        $stmt->execute();
        $stmt->bind_result($uuid, $storageName);

        while ($stmt->fetch()) {
            remove_report_file($storageName);
        }

        $stmt->close();

        $conn->query("DELETE FROM reportes_historial WHERE expires_at IS NOT NULL AND expires_at <> '' AND expires_at <= NOW()");
    } catch (mysqli_sql_exception $exception) {
        error_log('No se pudo limpiar el historial de reportes expirados: ' . $exception->getMessage());
    } finally {
        $conn->close();
    }
}

function list_reports(): void
{
    $empresaId = isset($_GET['empresa']) ? (int) $_GET['empresa'] : 0;

    purge_expired_reports_from_database();

    try {
        $reports = fetch_reports_from_database($empresaId > 0 ? $empresaId : null);
    } catch (mysqli_sql_exception $exception) {
        respond_json(500, [
            'success' => false,
            'message' => 'No se pudo consultar el historial en la base de datos.',
        ]);
    }

    respond_json(200, [
        'success' => true,
        'reports' => $reports,
        'retentionDays' => REPORT_RETENTION_DAYS,
    ]);
}

function automation_data(): void
{
    $empresaId = isset($_GET['empresa']) ? (int) $_GET['empresa'] : 0;
    if ($empresaId <= 0) {
        respond_json(400, [
            'success' => false,
            'message' => 'Debes indicar una empresa válida.',
        ]);
    }

    $automationId = isset($_GET['automation']) ? sanitize_automation_id((string) $_GET['automation']) : '';
    $module = isset($_GET['module']) ? (string) $_GET['module'] : '';

    try {
        $conn = db_connect();
    } catch (Throwable $exception) {
        respond_json(500, [
            'success' => false,
            'message' => 'No se pudo conectar a la base de datos.',
        ]);
    }

    try {
        $automationRow = [
            'id_empresa' => $empresaId,
            'modulo' => $module,
        ];

        if ($automationId !== '') {
            $stmt = $conn->prepare('SELECT uuid, id_empresa, nombre, modulo, frecuencia, hora_ejecucion, dia_semana, dia_mes, notas, activo, ultimo_ejecutado, proxima_ejecucion FROM reportes_automatizados WHERE uuid = ? AND id_empresa = ?');
            $stmt->bind_param('si', $automationId, $empresaId);
            $stmt->execute();
            $result = $stmt->get_result();
            $row = $result->fetch_assoc() ?: null;
            $stmt->close();

            if ($row !== null) {
                $automationRow = $row;
            }
        }

        $data = build_automation_report_data($conn, $automationRow);
    } catch (Throwable $exception) {
        $conn->close();
        respond_json(500, [
            'success' => false,
            'message' => 'No se pudieron obtener los datos del reporte automatizado.',
        ]);
    }

    $conn->close();

    respond_json(200, [
        'success' => true,
        'data' => $data,
    ]);
}

function save_report(): void
{
    $input = json_decode(file_get_contents('php://input') ?: 'null', true);
    if (!is_array($input)) {
        respond_json(400, [
            'success' => false,
            'message' => 'Solicitud inválida.',
        ]);
    }

    $fileName = isset($input['fileName']) ? (string) $input['fileName'] : '';
    $mimeType = isset($input['mimeType']) ? (string) $input['mimeType'] : '';
    $fileContent = isset($input['fileContent']) ? (string) $input['fileContent'] : '';
    $source = isset($input['source']) ? (string) $input['source'] : '';
    $notes = isset($input['notes']) ? (string) $input['notes'] : '';
    $empresaId = isset($input['empresaId']) ? (int) $input['empresaId'] : 0;
    $automationId = isset($input['automationId']) ? trim((string) $input['automationId']) : '';
    $automationRunAtRaw = isset($input['automationRunAt']) ? (string) $input['automationRunAt'] : '';

    if ($fileName === '' || $mimeType === '' || $fileContent === '') {
        respond_json(400, [
            'success' => false,
            'message' => 'Datos del archivo incompletos.',
        ]);
    }

    if ($empresaId <= 0) {
        respond_json(400, [
            'success' => false,
            'message' => 'Debes indicar una empresa válida para asociar el reporte.',
        ]);
    }

    $base64 = $fileContent;
    $markerPos = strpos($base64, 'base64,');
    if ($markerPos !== false) {
        $base64 = substr($base64, $markerPos + 7);
    }

    $binary = base64_decode($base64, true);
    if ($binary === false || $binary === '') {
        respond_json(400, [
            'success' => false,
            'message' => 'No se pudo procesar el archivo enviado.',
        ]);
    }

    ensure_storage();
    purge_expired_reports_from_database();

    $safeName = sanitize_file_name($fileName);
    $finalName = ensure_extension($safeName, $mimeType);
    $extension = pathinfo($finalName, PATHINFO_EXTENSION);
    $storageName = time() . '-' . random_id();
    if ($extension !== '') {
        $storageName .= '.' . $extension;
    }
    $filePath = REPORT_FILES_DIR . '/' . $storageName;

    $conn = null;
    $transactionStarted = false;
    $automationRunAt = null;
    $automationNextRun = null;
    $automationResponse = null;

    if ($automationId !== '') {
        try {
            $conn = db_connect();
        } catch (Throwable $exception) {
            respond_json(500, [
                'success' => false,
                'message' => 'No se pudo conectar a la base de datos para validar la automatización.',
            ]);
        }

        try {
            ensure_automation_run_table($conn);
            $conn->begin_transaction();
            $transactionStarted = true;

            $stmt = $conn->prepare('SELECT uuid, id_empresa, activo, proxima_ejecucion, ultimo_ejecutado, frecuencia, hora_ejecucion, dia_semana, dia_mes FROM reportes_automatizados WHERE uuid = ? AND id_empresa = ? FOR UPDATE');
            $stmt->bind_param('si', $automationId, $empresaId);
            $stmt->execute();
            $result = $stmt->get_result();
            $automationRow = $result->fetch_assoc() ?: null;
            $stmt->close();

            if ($automationRow === null) {
                $conn->rollback();
                $conn->close();
                respond_json(404, [
                    'success' => false,
                    'code' => 'not_found',
                    'message' => 'La automatización indicada no existe.',
                ]);
            }

            if (empty($automationRow['activo'])) {
                $automationPayload = [
                    'id' => $automationId,
                    'active' => false,
                    'lastRunAt' => mysql_datetime_to_iso($automationRow['ultimo_ejecutado'] ?? null),
                    'nextRunAt' => mysql_datetime_to_iso($automationRow['proxima_ejecucion'] ?? null),
                ];
                $conn->rollback();
                $conn->close();
                respond_json(409, [
                    'success' => false,
                    'code' => 'inactive',
                    'message' => 'La automatización está desactivada.',
                    'automation' => $automationPayload,
                ]);
            }

            $automationRunAt = resolve_run_datetime($automationRunAtRaw, $automationRow['proxima_ejecucion'] ?? null);

            $lastRunRaw = $automationRow['ultimo_ejecutado'] ?? null;
            if ($lastRunRaw) {
                try {
                    $lastRun = new DateTimeImmutable($lastRunRaw);
                    if (seconds_between($lastRun, $automationRunAt) <= AUTOMATION_RUN_TOLERANCE_SECONDS) {
                $automationPayload = [
                    'id' => $automationId,
                    'active' => !empty($automationRow['activo']),
                    'lastRunAt' => format_datetime_iso($lastRun),
                    'nextRunAt' => mysql_datetime_to_iso($automationRow['proxima_ejecucion'] ?? null),
                ];
                        $conn->rollback();
                        $conn->close();
                        respond_json(409, [
                            'success' => false,
                            'code' => 'duplicate',
                            'message' => 'El reporte automático ya fue generado para este horario.',
                            'automation' => $automationPayload,
                        ]);
                    }
                } catch (Exception $exception) {
                    // Ignorar formato inválido y continuar.
                }
            }

            $scheduledRaw = $automationRow['proxima_ejecucion'] ?? null;
            if ($scheduledRaw) {
                try {
                    $scheduledAt = new DateTimeImmutable($scheduledRaw);
                    if ($automationRunAt < $scheduledAt && seconds_between($automationRunAt, $scheduledAt) > AUTOMATION_RUN_TOLERANCE_SECONDS) {
                        $automationPayload = [
                            'id' => $automationId,
                            'active' => !empty($automationRow['activo']),
                            'lastRunAt' => mysql_datetime_to_iso($automationRow['ultimo_ejecutado'] ?? null),
                            'nextRunAt' => format_datetime_iso($scheduledAt),
                        ];
                        $conn->rollback();
                        $conn->close();
                        respond_json(409, [
                            'success' => false,
                            'code' => 'not_due',
                            'message' => 'Aún no es momento de ejecutar esta automatización.',
                            'automation' => $automationPayload,
                        ]);
                    }
                } catch (Exception $exception) {
                    // Continuar si la fecha almacenada es inválida.
                }
            }

            $runAtSql = $automationRunAt->format('Y-m-d H:i:s');
            $runStmt = $conn->prepare('INSERT INTO reportes_automatizados_runs (automation_uuid, empresa_id, run_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE run_at = run_at');
            $runStmt->bind_param('sis', $automationId, $empresaId, $runAtSql);
            $runStmt->execute();
            if ($runStmt->affected_rows === 0) {
                $runStmt->close();
                $conn->rollback();
                $conn->close();
                $automationPayload = [
                    'id' => $automationId,
                    'active' => !empty($automationRow['activo']),
                    'lastRunAt' => mysql_datetime_to_iso($automationRow['ultimo_ejecutado'] ?? null),
                    'nextRunAt' => mysql_datetime_to_iso($automationRow['proxima_ejecucion'] ?? null),
                ];
                respond_json(409, [
                    'success' => false,
                    'code' => 'duplicate',
                    'message' => 'El reporte automático ya fue generado para este horario.',
                    'automation' => $automationPayload,
                ]);
            }
            $runStmt->close();

            $automationRow['ultimo_ejecutado'] = $runAtSql;
            $automationNextRun = compute_next_run_for_automation($automationRow, $automationRunAt->modify('+1 minute'));

            $automationResponse = [
                'id' => $automationId,
                'lastRunAt' => format_datetime_iso($automationRunAt),
                'nextRunAt' => format_datetime_iso($automationNextRun),
                'active' => true,
            ];
        } catch (Throwable $exception) {
            if ($transactionStarted) {
                $conn->rollback();
            }
            if ($conn instanceof mysqli) {
                $conn->close();
            }
            respond_json(500, [
                'success' => false,
                'message' => 'No se pudo validar la automatización antes de guardar el reporte.',
            ]);
        }
    }

    if (!($conn instanceof mysqli)) {
        $conn = db_connect();
    }

    $written = file_put_contents($filePath, $binary, LOCK_EX);
    if ($written === false) {
        if ($transactionStarted && $conn instanceof mysqli) {
            $conn->rollback();
            $conn->close();
        }
        respond_json(500, [
            'success' => false,
            'message' => 'No se pudo guardar el archivo en el historial.',
        ]);
    }

    $nowIso = gmdate('c');
    $expiresIso = gmdate('c', time() + REPORT_RETENTION_SECONDS);

    $entry = [
        'id' => random_id(),
        'originalName' => $finalName,
        'mimeType' => $mimeType,
        'storageName' => $storageName,
        'size' => strlen($binary),
        'createdAt' => $nowIso,
        'expiresAt' => $expiresIso,
        'source' => str_limit($source, 120),
        'notes' => str_limit($notes, 240),
    ];

    try {
        insert_report_reference($entry, $empresaId, $conn);

        if ($automationId !== '') {
            $lastRunSql = $automationRunAt->format('Y-m-d H:i:s');
            if ($automationNextRun instanceof DateTimeImmutable) {
                $nextRunSql = $automationNextRun->format('Y-m-d H:i:s');
                $updateStmt = $conn->prepare('UPDATE reportes_automatizados SET ultimo_ejecutado = ?, proxima_ejecucion = ? WHERE uuid = ? AND id_empresa = ?');
                $updateStmt->bind_param('sssi', $lastRunSql, $nextRunSql, $automationId, $empresaId);
            } else {
                $updateStmt = $conn->prepare('UPDATE reportes_automatizados SET ultimo_ejecutado = ?, proxima_ejecucion = NULL WHERE uuid = ? AND id_empresa = ?');
                $updateStmt->bind_param('ssi', $lastRunSql, $automationId, $empresaId);
            }
            $updateStmt->execute();
            $updateStmt->close();
        }

        if ($transactionStarted) {
            $conn->commit();
        }
    } catch (Throwable $exception) {
        if ($transactionStarted) {
            $conn->rollback();
        }
        remove_report_file($storageName);
        if ($conn instanceof mysqli) {
            $conn->close();
        }
        respond_json(500, [
            'success' => false,
            'message' => 'No se pudo registrar el reporte en la base de datos.',
        ]);
    }

    if ($conn instanceof mysqli) {
        $conn->close();
    }

    respond_json(201, [
        'success' => true,
        'report' => [
            'id' => $entry['id'],
            'empresaId' => $empresaId,
            'originalName' => $entry['originalName'],
            'storageName' => $entry['storageName'],
            'mimeType' => $entry['mimeType'],
            'size' => $entry['size'],
            'createdAt' => $entry['createdAt'],
            'expiresAt' => $entry['expiresAt'],
            'source' => $entry['source'],
            'notes' => $entry['notes'],
        ],
        'retentionDays' => REPORT_RETENTION_DAYS,
        'automation' => $automationResponse,
    ]);
}

function find_report_for_download(string $uuid, int $empresaId = 0): ?array
{
    $conn = db_connect();

    try {
        $query = 'SELECT uuid, id_empresa, original_name, storage_name, mime_type FROM reportes_historial WHERE uuid = ?';
        $types = 's';
        $params = [$uuid];

        if ($empresaId > 0) {
            $query .= ' AND id_empresa = ?';
            $types .= 'i';
            $params[] = $empresaId;
        }

        $stmt = $conn->prepare($query);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc() ?: null;
        $stmt->close();

        return $row;
    } finally {
        $conn->close();
    }
}

function download_report(): void
{
    $id = isset($_GET['id']) ? (string) $_GET['id'] : '';
    $empresaId = isset($_GET['empresa']) ? (int) $_GET['empresa'] : 0;
    if ($id === '') {
        respond_json(400, [
            'success' => false,
            'message' => 'Identificador de reporte inválido.',
        ]);
    }

    purge_expired_reports_from_database();

    $report = find_report_for_download($id, $empresaId);
    if ($report === null) {
        respond_json(404, [
            'success' => false,
            'message' => 'Reporte no encontrado o expirado.',
        ]);
    }

    $storageName = $report['storage_name'] ?? '';
    if ($storageName === '') {
        delete_report_reference($id);
        respond_json(410, [
            'success' => false,
            'message' => 'El archivo ya no está disponible.',
        ]);
    }

    $filePath = REPORT_FILES_DIR . '/' . basename($storageName);
    if (!is_file($filePath)) {
        delete_report_reference($id);
        respond_json(410, [
            'success' => false,
            'message' => 'El archivo ya no está disponible.',
        ]);
    }

    $fileName = basename($report['original_name'] ?? ('reporte-' . $id));
    $fileName = str_replace(chr(34), '', $fileName);

    header('Content-Type: ' . ($report['mime_type'] ?? 'application/octet-stream'));
    header('Content-Length: ' . filesize($filePath));
    header('Content-Disposition: attachment; filename="' . $fileName . '"');
    readfile($filePath);
    exit;
}

function delete_report(): void
{
    $input = json_decode(file_get_contents('php://input') ?: 'null', true);
    if (!is_array($input)) {
        respond_json(400, ['success' => false, 'message' => 'Solicitud inválida.']);
    }

    $id = isset($input['id']) ? trim((string) $input['id']) : '';
    $empresaId = isset($input['empresaId']) ? (int) $input['empresaId'] : 0;

    if ($id === '') {
        respond_json(400, ['success' => false, 'message' => 'Identificador de reporte inválido.']);
    }

    try {
        $conn = db_connect();
    } catch (mysqli_sql_exception $exception) {
        error_log('delete_report: no se pudo conectar a la BD: ' . $exception->getMessage());
        respond_json(500, ['success' => false, 'message' => 'No se pudo conectar al servidor.']);
    }

    try {
        $stmt = $conn->prepare('SELECT storage_name, original_name, id_empresa FROM reportes_historial WHERE uuid = ?');
        $stmt->bind_param('s', $id);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc() ?: null;
        $stmt->close();

        if ($row === null) {
            $conn->close();
            respond_json(404, ['success' => false, 'message' => 'Reporte no encontrado.']);
        }

        if ($empresaId > 0 && (int) ($row['id_empresa'] ?? 0) !== $empresaId) {
            $conn->close();
            respond_json(403, ['success' => false, 'message' => 'No tienes permiso para eliminar este reporte.']);
        }

        $storageName = $row['storage_name'] ?? '';
        $originalName = $row['original_name'] ?? '';

        // Remove file from storage
        if ($storageName !== '') {
            remove_report_file($storageName);
        }

        // Delete reference in the same DB connection
        try {
            $del = $conn->prepare('DELETE FROM reportes_historial WHERE uuid = ?');
            $del->bind_param('s', $id);
            $del->execute();
            $del->close();
        } catch (mysqli_sql_exception $ex) {
            error_log('delete_report: no se pudo eliminar referencia DB para ' . $id . ': ' . $ex->getMessage());
            // continue, attempt to log the action anyway
        }

        // Try to register action in log (best-effort)
        try {
            require_once __DIR__ . '/log_utils.php';
            // registrarLog expects ($conn, $idUsuario, $modulo, $accion)
            $accion = 'Eliminó reporte: ' . ($originalName ?: $id);
            @registrarLog($conn, null, 'Reportes', $accion);
        } catch (Throwable $e) {
            error_log('delete_report: no se pudo registrar en log: ' . $e->getMessage());
        }

        $conn->close();
        respond_json(200, ['success' => true, 'message' => 'Reporte eliminado correctamente.']);
    } catch (mysqli_sql_exception $exception) {
        error_log('delete_report: excepción: ' . $exception->getMessage());
        if (isset($conn) && $conn instanceof mysqli) {
            $conn->close();
        }
        respond_json(500, ['success' => false, 'message' => 'Ocurrió un error al eliminar el reporte.']);
    }
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? '';

if ($method === 'OPTIONS') {
    header('Allow: GET, POST, OPTIONS');
    exit;
}

if ($method === 'GET' && $action === 'automation-data') {
    automation_data();
}

if ($method === 'GET' && $action === 'download') {
    download_report();
}

if ($method === 'GET') {
    list_reports();
}

if ($method === 'POST') {
    if ($action === 'delete') {
        delete_report();
    }

    // If action was delete, delete_report already exited with a response.
    if ($action !== 'delete') {
        save_report();
    }
}

http_response_code(405);
header('Allow: GET, POST, OPTIONS');
respond_json(405, [
    'success' => false,
    'message' => 'Método no permitido.',
]);
