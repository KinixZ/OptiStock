<?php
// scripts/php/scheduler.php

declare(strict_types=1);

define('OPTISTOCK_REPORT_HISTORY_NO_ROUTER', true);
require_once __DIR__ . '/report_history.php';

const AUTOMATION_MODULE_LABELS = [
    'inventario' => 'Inventario actual',
    'usuarios' => 'Usuarios actuales',
    'areas_zonas' => 'Áreas y zonas',
    'historial_movimientos' => 'Historial de movimientos',
    'ingresos/egresos' => 'Ingresos y egresos',
    'ingresos' => 'Ingresos registrados',
    'egresos' => 'Egresos registrados',
    'registro_actividades' => 'Registro de actividades',
    'solicitudes' => 'Historial de solicitudes',
    'accesos' => 'Accesos de usuarios',
];

const LEGACY_AUTOMATION_MODULE_ALIASES = [
    'gestión de inventario' => 'inventario',
    'gestion de inventario' => 'inventario',
    'gestión de usuarios' => 'usuarios',
    'gestion de usuarios' => 'usuarios',
    'reportes y análisis' => 'historial_movimientos',
    'reportes y analisis' => 'historial_movimientos',
    'ingresos y egresos' => 'ingresos/egresos',
    'resumen de ingresos y egresos' => 'ingresos/egresos',
    'recepción y almacenamiento' => 'ingresos',
    'recepcion y almacenamiento' => 'ingresos',
    'despacho y distribución' => 'egresos',
    'despacho y distribucion' => 'egresos',
    'alertas y monitoreo' => 'registro_actividades',
    'registro de accesos' => 'accesos',
    'accesos de usuarios' => 'accesos',
    'control de accesos' => 'accesos',
];

function normalize_module_value(?string $value): string
{
    $candidate = trim((string) $value);
    if ($candidate === '') {
        return '';
    }
    if (isset(AUTOMATION_MODULE_LABELS[$candidate])) {
        return $candidate;
    }
    $lower = function_exists('mb_strtolower') ? mb_strtolower($candidate, 'UTF-8') : strtolower($candidate);
    if (isset(LEGACY_AUTOMATION_MODULE_ALIASES[$lower])) {
        return LEGACY_AUTOMATION_MODULE_ALIASES[$lower];
    }
    return '';
}

function resolve_module_label(?string $value): string
{
    $normalized = normalize_module_value($value);
    if ($normalized !== '' && isset(AUTOMATION_MODULE_LABELS[$normalized])) {
        return AUTOMATION_MODULE_LABELS[$normalized];
    }
    return trim((string) $value);
}

function log_msg(string $message): void
{
    error_log('[scheduler] ' . $message);
}

// Intentar cargar el autoload de Composer si existe. Esto ayuda a asegurar que
// Dompdf (y otras dependencias instaladas vía Composer) estén disponibles
// cuando el script se ejecuta desde cron/CLI.
try {
    $vendorAutoload = realpath(__DIR__ . '/../../vendor/autoload.php');
    if ($vendorAutoload && is_file($vendorAutoload)) {
        require_once $vendorAutoload;
        error_log('[scheduler] Composer autoload cargado desde: ' . $vendorAutoload);
    } else {
        error_log('[scheduler] vendor/autoload.php no encontrado; las dependencias instaladas con Composer no se cargarán automáticamente.');
    }
} catch (Throwable $e) {
    error_log('[scheduler] Error al intentar cargar vendor/autoload.php: ' . $e->getMessage());
}

// Log rápido sobre disponibilidad de Dompdf (útil para depuración en cron)
error_log('[scheduler] Dompdf disponible: ' . (class_exists('Dompdf\\Dompdf') ? 'sí' : 'no'));

function fetch_due_automations(mysqli $conn): array
{
    $sql = 'SELECT uuid, id_empresa, nombre, modulo, formato, frecuencia, hora_ejecucion, dia_semana, dia_mes, notas, activo, proxima_ejecucion, ultimo_ejecutado, creado_en
            FROM reportes_automatizados
            WHERE activo = 1 AND (proxima_ejecucion IS NULL OR proxima_ejecucion <= NOW())
            ORDER BY proxima_ejecucion IS NULL, proxima_ejecucion ASC, creado_en ASC
            LIMIT 20';

    $result = $conn->query($sql);
    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $row['modulo'] = normalize_module_value($row['modulo'] ?? '');
        $rows[] = $row;
    }

    return $rows;
}

function weekday_name(int $index): string
{
    $names = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return $names[$index] ?? 'Día';
}

function format_spanish_datetime(DateTimeImmutable $date, bool $includeTime = true): string
{
    $months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    $day = $date->format('j');
    $monthIndex = (int) $date->format('n') - 1;
    $month = $months[$monthIndex] ?? '';
    $year = $date->format('Y');
    if ($includeTime) {
        $time = $date->format('H:i');
        return sprintf('%s de %s de %s · %s h', $day, $month, $year, $time);
    }

    return sprintf('%s de %s de %s', $day, $month, $year);
}

function format_period_label(DateTimeImmutable $start, DateTimeImmutable $end): string
{
    return sprintf('%s → %s', format_spanish_datetime($start), format_spanish_datetime($end));
}

function compute_reporting_window(array $automation, DateTimeImmutable $now): array
{
    $frequency = (string) ($automation['frecuencia'] ?? 'daily');
    $end = $now;
    $start = null;
    $creation = null;
    $hasPreviousRun = false;

    if (!empty($automation['creado_en'])) {
        try {
            $creation = new DateTimeImmutable((string) $automation['creado_en']);
        } catch (Throwable $exception) {
            $creation = null;
        }
    }

    if (!empty($automation['ultimo_ejecutado'])) {
        try {
            $start = new DateTimeImmutable((string) $automation['ultimo_ejecutado']);
            $hasPreviousRun = true;
        } catch (Throwable $exception) {
            $start = null;
        }
    }

    if (!$start) {
        switch ($frequency) {
            case 'weekly':
                $start = $now->modify('-7 days');
                break;
            case 'biweekly':
                $start = $now->modify('-14 days');
                break;
            case 'monthly':
                $start = $now->modify('-1 month');
                break;
            default:
                $start = $now->modify('-1 day');
                break;
        }
    }

    if ($hasPreviousRun && $creation instanceof DateTimeImmutable && $start < $creation) {
        $start = $creation;
    }

    if ($start > $end) {
        $start = $end->modify('-1 hour');
    }

    return [$start, $end];
}

function format_frequency_label(array $automation): string
{
    $frequency = (string) ($automation['frecuencia'] ?? 'daily');
    switch ($frequency) {
        case 'weekly':
            $weekday = isset($automation['dia_semana']) ? (int) $automation['dia_semana'] : 1;
            return 'Semanal · ' . weekday_name($weekday);
        case 'biweekly':
            $day = isset($automation['dia_mes']) ? (int) $automation['dia_mes'] : 1;
            return 'Quincenal · Día ' . max(1, $day);
        case 'monthly':
            $day = isset($automation['dia_mes']) ? (int) $automation['dia_mes'] : 1;
            return 'Mensual · Día ' . max(1, $day);
        default:
            return 'Diario';
    }
}

function gather_company_profile(mysqli $conn, int $empresaId): array
{
    try {
        $stmt = $conn->prepare('SELECT nombre_empresa, logo_empresa FROM empresa WHERE id_empresa = ? LIMIT 1');
        $stmt->bind_param('i', $empresaId);
        $stmt->execute();
        $stmt->bind_result($name, $logo);
        $profile = ['name' => 'OptiStock', 'logo' => null];
        if ($stmt->fetch()) {
            $profile['name'] = $name ?: 'OptiStock';
            $logoPath = null;
            if ($logo) {
                $relative = ltrim($logo, '/');
                $basePath = realpath(__DIR__ . '/../../');
                if ($basePath !== false) {
                    $candidate = $basePath . '/' . $relative;
                    if (is_file($candidate)) {
                        $logoPath = $candidate;
                    }
                }
            }
            if ($logoPath) {
                $mime = @mime_content_type($logoPath) ?: 'image/png';
                $data = @file_get_contents($logoPath);
                if ($data !== false) {
                    $profile['logo'] = 'data:' . $mime . ';base64,' . base64_encode($data);
                }
            }
        }
        $stmt->close();
        return $profile;
    } catch (Throwable $exception) {
        log_msg('No se pudo obtener la información de la empresa: ' . $exception->getMessage());
        return ['name' => 'OptiStock', 'logo' => null];
    }
}

function gather_palette(mysqli $conn, int $empresaId): array
{
    try {
        $stmt = $conn->prepare('SELECT color_sidebar, color_topbar FROM configuracion_empresa WHERE id_empresa = ? LIMIT 1');
        $stmt->bind_param('i', $empresaId);
        $stmt->execute();
        $stmt->bind_result($sidebar, $topbar);
        $palette = [
            'primary' => '#ff6f91',
            'secondary' => '#0f172a',
            'neutral' => '#f8fafc',
        ];
        if ($stmt->fetch()) {
            if ($topbar) {
                $palette['primary'] = $topbar;
            }
            if ($sidebar) {
                $palette['secondary'] = $sidebar;
            }
        }
        $stmt->close();
        return $palette;
    } catch (Throwable $exception) {
        log_msg('No se pudo obtener la paleta de colores: ' . $exception->getMessage());
        return [
            'primary' => '#ff6f91',
            'secondary' => '#0f172a',
            'neutral' => '#f8fafc',
        ];
    }
}

function gather_movements_by_user(mysqli $conn, int $empresaId, DateTimeImmutable $start, DateTimeImmutable $end): array
{
    try {
        $sql = 'SELECT u.id_usuario, u.nombre, u.apellido, u.rol, COUNT(*) AS movimientos,
                       SUM(CASE WHEN m.tipo = \"ingreso\" THEN m.cantidad ELSE 0 END) AS ingresos,
                       SUM(CASE WHEN m.tipo = \"egreso\" THEN m.cantidad ELSE 0 END) AS egresos
                FROM movimientos m
                INNER JOIN usuario u ON u.id_usuario = m.id_usuario
                WHERE m.empresa_id = ? AND m.fecha_movimiento BETWEEN ? AND ?
                GROUP BY u.id_usuario, u.nombre, u.apellido, u.rol
                ORDER BY movimientos DESC, ingresos DESC';

        $stmt = $conn->prepare($sql);
        $startSql = $start->format('Y-m-d H:i:s');
        $endSql = $end->format('Y-m-d H:i:s');
        $stmt->bind_param('iss', $empresaId, $startSql, $endSql);
        $stmt->execute();
        $result = $stmt->get_result();
        $data = [];
        while ($row = $result->fetch_assoc()) {
            $ingresos = (int) $row['ingresos'];
            $egresos = (int) $row['egresos'];
            $data[] = [
                'userId' => (int) $row['id_usuario'],
                'user' => trim(($row['nombre'] ?? '') . ' ' . ($row['apellido'] ?? '')),
                'role' => $row['rol'] ?? '',
                'movements' => (int) $row['movimientos'],
                'ingresos' => $ingresos,
                'egresos' => $egresos,
                'net' => $ingresos - $egresos,
            ];
        }
        $stmt->close();
        return $data;
    } catch (Throwable $exception) {
        log_msg('No se pudieron obtener los movimientos por usuario: ' . $exception->getMessage());
        return [];
    }
}

function gather_movement_timeline(mysqli $conn, int $empresaId, DateTimeImmutable $start, DateTimeImmutable $end): array
{
    try {
        $sql = 'SELECT DATE(m.fecha_movimiento) AS fecha,
                       COUNT(*) AS movimientos,
                       SUM(CASE WHEN m.tipo = \"ingreso\" THEN m.cantidad ELSE 0 END) AS ingresos,
                       SUM(CASE WHEN m.tipo = \"egreso\" THEN m.cantidad ELSE 0 END) AS egresos
                FROM movimientos m
                WHERE m.empresa_id = ? AND m.fecha_movimiento BETWEEN ? AND ?
                GROUP BY fecha
                ORDER BY fecha ASC';
        $stmt = $conn->prepare($sql);
        $startSql = $start->format('Y-m-d H:i:s');
        $endSql = $end->format('Y-m-d H:i:s');
        $stmt->bind_param('iss', $empresaId, $startSql, $endSql);
        $stmt->execute();
        $result = $stmt->get_result();
        $data = [];
        while ($row = $result->fetch_assoc()) {
            $date = null;
            try {
                $date = new DateTimeImmutable((string) $row['fecha']);
            } catch (Throwable $exception) {
                $date = new DateTimeImmutable('now');
            }
            $ingresos = (int) $row['ingresos'];
            $egresos = (int) $row['egresos'];
            $data[] = [
                'label' => format_spanish_datetime($date, false),
                'movements' => (int) $row['movimientos'],
                'ingresos' => $ingresos,
                'egresos' => $egresos,
                'net' => $ingresos - $egresos,
            ];
        }
        $stmt->close();
        return $data;
    } catch (Throwable $exception) {
        log_msg('No se pudo generar el historial de movimientos: ' . $exception->getMessage());
        return [];
    }
}

function gather_recent_movements(
    mysqli $conn,
    int $empresaId,
    DateTimeImmutable $start,
    DateTimeImmutable $end,
    int $limit = 40
): array {
    $recent = [];
    $limit = max(1, min($limit, 200));

    try {
        $sql = 'SELECT m.id, m.tipo, m.cantidad, m.fecha_movimiento,
                       p.nombre AS producto_nombre,
                       p.codigo_qr AS producto_codigo,
                       z.nombre AS zona_nombre,
                       a.nombre AS area_nombre,
                       u.nombre AS usuario_nombre,
                       u.apellido AS usuario_apellido
                FROM movimientos m
                LEFT JOIN productos p ON p.id = m.producto_id
                LEFT JOIN zonas z ON z.id = p.zona_id
                LEFT JOIN areas a ON a.id = z.area_id
                LEFT JOIN usuario u ON u.id_usuario = m.id_usuario
                WHERE m.empresa_id = ? AND m.fecha_movimiento BETWEEN ? AND ?
                ORDER BY m.fecha_movimiento DESC
                LIMIT ' . $limit;

        $stmt = $conn->prepare($sql);
        $startSql = $start->format('Y-m-d H:i:s');
        $endSql = $end->format('Y-m-d H:i:s');
        $stmt->bind_param('iss', $empresaId, $startSql, $endSql);
        $stmt->execute();
        $result = $stmt->get_result();

        while ($row = $result->fetch_assoc()) {
            $timestamp = null;
            try {
                $timestamp = new DateTimeImmutable((string) ($row['fecha_movimiento'] ?? ''));
            } catch (Throwable $exception) {
                $timestamp = $start;
            }

            $recent[] = [
                'id' => (int) ($row['id'] ?? 0),
                'type' => (string) ($row['tipo'] ?? ''),
                'quantity' => (int) ($row['cantidad'] ?? 0),
                'dateLabel' => format_spanish_datetime($timestamp),
                'product' => $row['producto_nombre'] ?? '',
                'productCode' => $row['producto_codigo'] ?? '',
                'area' => $row['area_nombre'] ?? '',
                'zone' => $row['zona_nombre'] ?? '',
                'user' => trim((string) ($row['usuario_nombre'] ?? '') . ' ' . ($row['usuario_apellido'] ?? '')),
            ];
        }

        $stmt->close();
    } catch (Throwable $exception) {
        log_msg('No se pudo obtener el detalle de movimientos recientes: ' . $exception->getMessage());
    }

    return $recent;
}

function compute_movement_summary(array $movementsByUser, array $timeline): array
{
    $summary = [
        'totalMovements' => 0,
        'uniqueUsers' => count($movementsByUser),
        'totalIngresos' => 0,
        'totalEgresos' => 0,
        'net' => 0,
    ];

    foreach ($movementsByUser as $item) {
        $summary['totalMovements'] += (int) $item['movements'];
        $summary['totalIngresos'] += (int) $item['ingresos'];
        $summary['totalEgresos'] += (int) $item['egresos'];
    }

    if ($summary['totalMovements'] === 0 && count($timeline)) {
        foreach ($timeline as $item) {
            $summary['totalMovements'] += (int) $item['movements'];
            $summary['totalIngresos'] += (int) $item['ingresos'];
            $summary['totalEgresos'] += (int) $item['egresos'];
        }
    }

    $summary['net'] = $summary['totalIngresos'] - $summary['totalEgresos'];

    return $summary;
}

function gather_area_snapshot(mysqli $conn, int $empresaId): array
{
    $snapshot = [
        'totals' => [
            'areas' => 0,
            'zones' => 0,
            'avgAreaOccupancy' => null,
            'avgZoneOccupancy' => null,
            'usedCapacity' => 0.0,
            'volume' => 0.0,
        ],
        'topAreas' => [],
        'topZones' => [],
    ];

    try {
        $stmt = $conn->prepare('SELECT COUNT(*) AS total, AVG(porcentaje_ocupacion) AS avg_occ, SUM(capacidad_utilizada) AS used_capacity, SUM(volumen) AS volume
            FROM areas WHERE id_empresa = ?');
        $stmt->bind_param('i', $empresaId);
        $stmt->execute();
        $stmt->bind_result($total, $avg, $used, $volume);
        if ($stmt->fetch()) {
            $snapshot['totals']['areas'] = (int) $total;
            $snapshot['totals']['avgAreaOccupancy'] = $avg !== null ? (float) $avg : null;
            $snapshot['totals']['usedCapacity'] = $used !== null ? (float) $used : 0.0;
            $snapshot['totals']['volume'] = $volume !== null ? (float) $volume : 0.0;
        }
        $stmt->close();
    } catch (Throwable $exception) {
        log_msg('No se pudo obtener el resumen de áreas: ' . $exception->getMessage());
    }

    try {
        $stmt = $conn->prepare('SELECT nombre, porcentaje_ocupacion, capacidad_utilizada, volumen, productos_registrados
            FROM areas WHERE id_empresa = ? ORDER BY porcentaje_ocupacion DESC LIMIT 5');
        $stmt->bind_param('i', $empresaId);
        $stmt->execute();
        $result = $stmt->get_result();
        while ($row = $result->fetch_assoc()) {
            $snapshot['topAreas'][] = [
                'name' => $row['nombre'] ?? 'Área',
                'occupancy' => $row['porcentaje_ocupacion'] !== null ? (float) $row['porcentaje_ocupacion'] : 0.0,
                'capacity' => $row['capacidad_utilizada'] !== null ? (float) $row['capacidad_utilizada'] : 0.0,
                'volume' => $row['volumen'] !== null ? (float) $row['volumen'] : 0.0,
                'products' => (int) ($row['productos_registrados'] ?? 0),
            ];
        }
        $stmt->close();
    } catch (Throwable $exception) {
        log_msg('No se pudo listar las áreas principales: ' . $exception->getMessage());
    }

    try {
        $stmt = $conn->prepare('SELECT COUNT(*) AS total, AVG(porcentaje_ocupacion) AS avg_occ
            FROM zonas WHERE id_empresa = ?');
        $stmt->bind_param('i', $empresaId);
        $stmt->execute();
        $stmt->bind_result($total, $avg);
        if ($stmt->fetch()) {
            $snapshot['totals']['zones'] = (int) $total;
            $snapshot['totals']['avgZoneOccupancy'] = $avg !== null ? (float) $avg : null;
        }
        $stmt->close();
    } catch (Throwable $exception) {
        log_msg('No se pudo obtener el resumen de zonas: ' . $exception->getMessage());
    }

    try {
        $stmt = $conn->prepare('SELECT nombre, porcentaje_ocupacion, capacidad_utilizada, productos_registrados
            FROM zonas WHERE id_empresa = ? ORDER BY porcentaje_ocupacion DESC LIMIT 5');
        $stmt->bind_param('i', $empresaId);
        $stmt->execute();
        $result = $stmt->get_result();
        while ($row = $result->fetch_assoc()) {
            $snapshot['topZones'][] = [
                'name' => $row['nombre'] ?? 'Zona',
                'occupancy' => $row['porcentaje_ocupacion'] !== null ? (float) $row['porcentaje_ocupacion'] : 0.0,
                'capacity' => $row['capacidad_utilizada'] !== null ? (float) $row['capacidad_utilizada'] : 0.0,
                'products' => (int) ($row['productos_registrados'] ?? 0),
            ];
        }
        $stmt->close();
    } catch (Throwable $exception) {
        log_msg('No se pudo listar las zonas principales: ' . $exception->getMessage());
    }

    return $snapshot;
}

function gather_request_summary(mysqli $conn, int $empresaId, DateTimeImmutable $start, DateTimeImmutable $end): array
{
    $summary = [
        'openTotal' => 0,
        'periodCreated' => [],
        'periodResolved' => [],
        'recentOpen' => [],
        'recentResolved' => [],
    ];

    $startSql = $start->format('Y-m-d H:i:s');
    $endSql = $end->format('Y-m-d H:i:s');

    try {
        $stmt = $conn->prepare('SELECT COUNT(*) FROM solicitudes_cambios WHERE id_empresa = ? AND estado = \"en_proceso\"');
        $stmt->bind_param('i', $empresaId);
        $stmt->execute();
        $stmt->bind_result($count);
        if ($stmt->fetch()) {
            $summary['openTotal'] = (int) $count;
        }
        $stmt->close();
    } catch (Throwable $exception) {
        log_msg('No se pudo calcular el total de solicitudes abiertas: ' . $exception->getMessage());
    }

    try {
        $stmt = $conn->prepare('SELECT estado, COUNT(*) AS total
            FROM solicitudes_cambios
            WHERE id_empresa = ? AND fecha_creacion BETWEEN ? AND ?
            GROUP BY estado');
        $stmt->bind_param('iss', $empresaId, $startSql, $endSql);
        $stmt->execute();
        $result = $stmt->get_result();
        while ($row = $result->fetch_assoc()) {
            $summary['periodCreated'][] = [
                'estado' => $row['estado'] ?? '',
                'total' => (int) ($row['total'] ?? 0),
            ];
        }
        $stmt->close();
    } catch (Throwable $exception) {
        log_msg('No se pudo obtener el resumen de solicitudes creadas: ' . $exception->getMessage());
    }

    try {
        $stmt = $conn->prepare('SELECT estado, COUNT(*) AS total
            FROM solicitudes_cambios_historial
            WHERE id_empresa = ? AND fecha_resolucion BETWEEN ? AND ?
            GROUP BY estado');
        $stmt->bind_param('iss', $empresaId, $startSql, $endSql);
        $stmt->execute();
        $result = $stmt->get_result();
        while ($row = $result->fetch_assoc()) {
            $summary['periodResolved'][] = [
                'estado' => $row['estado'] ?? '',
                'total' => (int) ($row['total'] ?? 0),
            ];
        }
        $stmt->close();
    } catch (Throwable $exception) {
        log_msg('No se pudo obtener el resumen de solicitudes resueltas: ' . $exception->getMessage());
    }

    try {
        $stmt = $conn->prepare('SELECT modulo, resumen, estado, fecha_creacion
            FROM solicitudes_cambios
            WHERE id_empresa = ?
            ORDER BY fecha_creacion DESC
            LIMIT 5');
        $stmt->bind_param('i', $empresaId);
        $stmt->execute();
        $result = $stmt->get_result();
        while ($row = $result->fetch_assoc()) {
            $created = null;
            try {
                $created = new DateTimeImmutable((string) $row['fecha_creacion']);
            } catch (Throwable $exception) {
                $created = new DateTimeImmutable('now');
            }
            $summary['recentOpen'][] = [
                'module' => $row['modulo'] ?? '',
                'summary' => $row['resumen'] ?? '',
                'estado' => $row['estado'] ?? '',
                'dateLabel' => format_spanish_datetime($created),
            ];
        }
        $stmt->close();
    } catch (Throwable $exception) {
        log_msg('No se pudo listar las solicitudes abiertas recientes: ' . $exception->getMessage());
    }

    try {
        $stmt = $conn->prepare('SELECT modulo, resumen, estado, fecha_resolucion
            FROM solicitudes_cambios_historial
            WHERE id_empresa = ?
            ORDER BY fecha_resolucion DESC
            LIMIT 5');
        $stmt->bind_param('i', $empresaId);
        $stmt->execute();
        $result = $stmt->get_result();
        while ($row = $result->fetch_assoc()) {
            $resolved = null;
            try {
                $resolved = new DateTimeImmutable((string) $row['fecha_resolucion']);
            } catch (Throwable $exception) {
                $resolved = new DateTimeImmutable('now');
            }
            $summary['recentResolved'][] = [
                'module' => $row['modulo'] ?? '',
                'summary' => $row['resumen'] ?? '',
                'estado' => $row['estado'] ?? '',
                'dateLabel' => format_spanish_datetime($resolved),
            ];
        }
        $stmt->close();
    } catch (Throwable $exception) {
        log_msg('No se pudo listar las solicitudes resueltas recientes: ' . $exception->getMessage());
    }

    return $summary;
}

function build_report_payload(mysqli $conn, array $automation, DateTimeImmutable $now): array
{
    [$periodStart, $periodEnd] = compute_reporting_window($automation, $now);
    $empresaId = (int) ($automation['id_empresa'] ?? 0);

    $movementsByUser = gather_movements_by_user($conn, $empresaId, $periodStart, $periodEnd);
    $movementTimeline = gather_movement_timeline($conn, $empresaId, $periodStart, $periodEnd);

    return [
        'company' => gather_company_profile($conn, $empresaId),
        'palette' => gather_palette($conn, $empresaId),
        'period' => [
            'start' => $periodStart,
            'end' => $periodEnd,
            'label' => format_period_label($periodStart, $periodEnd),
            'frequencyLabel' => format_frequency_label($automation),
        ],
        'generatedAt' => $now,
        'generatedAtLabel' => format_spanish_datetime($now),
        'summary' => compute_movement_summary($movementsByUser, $movementTimeline),
        'movementsByUser' => $movementsByUser,
        'movementTimeline' => $movementTimeline,
        'recentMovements' => gather_recent_movements($conn, $empresaId, $periodStart, $periodEnd),
        'areas' => gather_area_snapshot($conn, $empresaId),
        'requests' => gather_request_summary($conn, $empresaId, $periodStart, $periodEnd),
    ];
}

function csv_escape($value): string
{
    $string = (string) $value;
    $string = str_replace("\"", "\"\"", $string);
    return "\"" . $string . "\"";
}

function render_report_csv(array $payload): string
{
    $lines = [];
    $lines[] = 'Sección,Detalle,Valor';

    $summary = $payload['summary'] ?? [];
    $lines[] = implode(',', [csv_escape('Resumen'), csv_escape('Total de movimientos'), csv_escape($summary['totalMovements'] ?? 0)]);
    $lines[] = implode(',', [csv_escape('Resumen'), csv_escape('Usuarios activos'), csv_escape($summary['uniqueUsers'] ?? 0)]);
    $lines[] = implode(',', [csv_escape('Resumen'), csv_escape('Entradas registradas'), csv_escape($summary['totalIngresos'] ?? 0)]);
    $lines[] = implode(',', [csv_escape('Resumen'), csv_escape('Salidas registradas'), csv_escape($summary['totalEgresos'] ?? 0)]);
    $lines[] = implode(',', [csv_escape('Resumen'), csv_escape('Variación neta'), csv_escape($summary['net'] ?? 0)]);

    $lines[] = '';
    $lines[] = implode(',', [csv_escape('Movimientos por usuario'), csv_escape('Usuario'), csv_escape('Movimientos / Entradas / Salidas / Variación')]);
    foreach ($payload['movementsByUser'] ?? [] as $item) {
        $detail = sprintf('%s (%s)', $item['user'] ?? 'Usuario', $item['role'] ?? '');
        $value = sprintf('%s / %s / %s / %s', $item['movements'] ?? 0, $item['ingresos'] ?? 0, $item['egresos'] ?? 0, $item['net'] ?? 0);
        $lines[] = implode(',', [csv_escape('Movimientos por usuario'), csv_escape($detail), csv_escape($value)]);
    }

    $lines[] = '';
    $lines[] = implode(',', [csv_escape('Historial'), csv_escape('Fecha'), csv_escape('Movimientos / Entradas / Salidas / Variación')]);
    foreach ($payload['movementTimeline'] ?? [] as $item) {
        $value = sprintf('%s / %s / %s / %s', $item['movements'] ?? 0, $item['ingresos'] ?? 0, $item['egresos'] ?? 0, $item['net'] ?? 0);
        $lines[] = implode(',', [csv_escape('Historial'), csv_escape($item['label'] ?? ''), csv_escape($value)]);
    }

    return implode("\n", $lines);
}

try {
    $conn = db_connect();
} catch (Throwable $exception) {
    log_msg('No se pudo conectar a la base de datos: ' . $exception->getMessage());
    exit(1);
}

$automations = [];
try {
    $automations = fetch_due_automations($conn);
} catch (Throwable $exception) {
    log_msg('No se pudieron consultar las automatizaciones pendientes: ' . $exception->getMessage());
}

if (!count($automations)) {
    $conn->close();
    log_msg('No hay automatizaciones pendientes.');
    exit(0);
}

ensure_storage();

foreach ($automations as $automationItem) {
    try {
        $empresaId = (int) ($automationItem['id_empresa'] ?? 0);
        $automationUuid = (string) ($automationItem['uuid'] ?? '');
        if ($automationUuid === '') {
            continue;
        }

        $now = new DateTimeImmutable('now');
        $payload = build_report_payload($conn, $automationItem, $now);

        $moduleValue = normalize_module_value($automationItem['modulo'] ?? '');
        $moduleLabel = resolve_module_label($automationItem['modulo'] ?? '');

        $automationView = [
            'id' => $automationUuid,
            'name' => (string) ($automationItem['nombre'] ?? 'Reporte automatizado'),
            'module' => $moduleLabel,
            'moduleValue' => $moduleValue,
            'format' => (string) ($automationItem['formato'] ?? 'pdf'),
            'frequency' => (string) ($automationItem['frecuencia'] ?? 'daily'),
            'weekday' => $automationItem['dia_semana'] !== null ? (int) $automationItem['dia_semana'] : null,
            'monthday' => $automationItem['dia_mes'] !== null ? (int) $automationItem['dia_mes'] : null,
            'time' => substr((string) ($automationItem['hora_ejecucion'] ?? '08:00:00'), 0, 5),
            'notes' => (string) ($automationItem['notas'] ?? ''),
        ];

        $format = $automationView['format'] === 'excel' ? 'excel' : 'pdf';
        $binary = '';
        $mimeType = 'application/pdf';
        $extension = 'pdf';

        if ($format === 'excel') {
            $binary = render_report_csv($payload);
            $mimeType = 'text/csv';
            $extension = 'csv';
        } else {
            if (!class_exists('Dompdf\\Dompdf')) {
                log_msg('Dompdf no está instalado; se omite la automatización ' . $automationUuid);
                continue;
            }
            ob_start();
            $reportData = $payload;
            $automation = $automationView;
            // Attempt to load the shared report CSS from the web UI so automated
            // PDFs look identical to the ones generated by the client.
            $extraCss = '';
            $cssFragments = [];

            $palettePath = realpath(__DIR__ . '/../../styles/theme/palette.css');
            if ($palettePath && is_file($palettePath)) {
                $paletteCss = @file_get_contents($palettePath);
                if ($paletteCss !== false) {
                    $cssFragments[] = trim($paletteCss);
                }
            }

            $cssPath = realpath(__DIR__ . '/../../styles/reports/reportes.css');
            if ($cssPath && is_file($cssPath)) {
                $cssContent = @file_get_contents($cssPath);
                if ($cssContent !== false) {
                    // Minimal sanitization: remove @import lines that reference relative
                    // URLs (Dompdf may not resolve them) and keep the rest.
                    $cssContent = preg_replace('/@import[^;]+;\s*/i', '', $cssContent);
                    $cssFragments[] = trim($cssContent);
                }
            }

            if (!empty($cssFragments)) {
                $extraCss = implode("\n", array_filter($cssFragments, static function ($fragment) {
                    return $fragment !== '';
                }));
            }
            include __DIR__ . '/automation_template.php';
            $html = ob_get_clean();
            $dompdf = new Dompdf\Dompdf();
            $dompdf->loadHtml($html);
            $dompdf->setPaper('A4', 'portrait');
            $dompdf->render();
            $binary = $dompdf->output();
        }

        if ($binary === '') {
            log_msg('No se generó contenido para la automatización ' . $automationUuid);
            continue;
        }

        $fileBaseName = sanitize_file_name($automationView['name']);
        $timestampLabel = $now->format('Y-m-d H-i');
        $originalName = $fileBaseName . ' - ' . $timestampLabel . '.' . $extension;
        $storageName = time() . '-' . random_id() . '.' . $extension;
        $filePath = REPORT_FILES_DIR . '/' . $storageName;

        file_put_contents($filePath, $binary, LOCK_EX);

        $entry = [
            'id' => random_id(),
            'originalName' => $originalName,
            'mimeType' => $mimeType,
            'storageName' => $storageName,
            'size' => strlen($binary),
            'createdAt' => gmdate('c'),
            'expiresAt' => gmdate('c', time() + REPORT_RETENTION_SECONDS),
            'source' => $automationView['module'] ? ('Automatización · ' . $automationView['module']) : 'Automatización',
            'notes' => $automationView['notes'] ?: 'Generado automáticamente',
        ];

        try {
            insert_report_reference($entry, $empresaId, $conn);
        } catch (Throwable $exception) {
            @unlink($filePath);
            log_msg('No se pudo registrar el reporte generado: ' . $exception->getMessage());
            continue;
        }

        try {
            ensure_automation_run_table($conn);
            $runAt = $now->format('Y-m-d H:i:s');
            $runStmt = $conn->prepare('INSERT INTO reportes_automatizados_runs (automation_uuid, empresa_id, run_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE run_at = VALUES(run_at)');
            $runStmt->bind_param('sis', $automationUuid, $empresaId, $runAt);
            $runStmt->execute();
            $runStmt->close();
        } catch (Throwable $exception) {
            log_msg('No se pudo registrar la ejecución en la bitácora: ' . $exception->getMessage());
        }

        $lastRunSql = $now->format('Y-m-d H:i:s');
        $nextRun = null;
        try {
            $automationForNext = [
                'frecuencia' => $automationView['frequency'],
                'hora_ejecucion' => $automationItem['hora_ejecucion'] ?? ($automationView['time'] . ':00'),
                'dia_semana' => $automationView['weekday'],
                'dia_mes' => $automationView['monthday'],
                'ultimo_ejecutado' => $lastRunSql,
            ];
            $nextRunDate = compute_next_run_for_automation($automationForNext, (new DateTimeImmutable($lastRunSql))->modify('+1 minute'));
            if ($nextRunDate instanceof DateTimeImmutable) {
                $nextRun = $nextRunDate->format('Y-m-d H:i:s');
            }
        } catch (Throwable $exception) {
            log_msg('No se pudo calcular la siguiente ejecución: ' . $exception->getMessage());
        }

        try {
            if ($nextRun !== null) {
                $stmt = $conn->prepare('UPDATE reportes_automatizados SET ultimo_ejecutado = ?, proxima_ejecucion = ? WHERE uuid = ? AND id_empresa = ?');
                $stmt->bind_param('sssi', $lastRunSql, $nextRun, $automationUuid, $empresaId);
            } else {
                $stmt = $conn->prepare('UPDATE reportes_automatizados SET ultimo_ejecutado = ?, proxima_ejecucion = NULL WHERE uuid = ? AND id_empresa = ?');
                $stmt->bind_param('ssi', $lastRunSql, $automationUuid, $empresaId);
            }
            $stmt->execute();
            $stmt->close();
        } catch (Throwable $exception) {
            log_msg('No se pudo actualizar la automatización ' . $automationUuid . ': ' . $exception->getMessage());
        }

        log_msg('Reporte generado correctamente para la automatización ' . $automationUuid);
    } catch (Throwable $exception) {
        log_msg('Fallo al generar la automatización: ' . $exception->getMessage());
    }
}

$conn->close();
log_msg('Scheduler finalizado.');
