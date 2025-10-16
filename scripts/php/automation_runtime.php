<?php
// scripts/php/automation_runtime.php
// Funciones compartidas para generar reportes automatizados bajo demanda.

declare(strict_types=1);

if (!defined('AUTOMATION_MODULE_LABELS')) {
    define('AUTOMATION_MODULE_LABELS', [
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
    ]);
}

if (!defined('LEGACY_AUTOMATION_MODULE_ALIASES')) {
    define('LEGACY_AUTOMATION_MODULE_ALIASES', [
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
    ]);
}

if (!function_exists('normalize_module_value')) {
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
}

if (!function_exists('resolve_module_label')) {
    function resolve_module_label(?string $value): string
    {
        $normalized = normalize_module_value($value);
        if ($normalized !== '' && isset(AUTOMATION_MODULE_LABELS[$normalized])) {
            return AUTOMATION_MODULE_LABELS[$normalized];
        }
        return trim((string) $value);
    }
}

if (!function_exists('resolve_manual_source_label')) {
    function resolve_manual_source_label(string $moduleValue, string $moduleLabel = ''): string
    {
        $map = [
            'inventario' => 'Gestión de inventario',
            'usuarios' => 'Administración de usuarios',
            'areas_zonas' => 'Áreas y zonas de almacén',
            'historial_movimientos' => 'Control de registros',
            'ingresos/egresos' => 'Ingresos y egresos',
            'ingresos' => 'Historial de ingresos',
            'egresos' => 'Historial de egresos',
            'registro_actividades' => 'Registro de actividades',
            'solicitudes' => 'Historial de solicitudes',
            'accesos' => 'Accesos de usuarios',
        ];

        if (isset($map[$moduleValue])) {
            return $map[$moduleValue];
        }

        return $moduleLabel !== '' ? $moduleLabel : 'Reportes';
    }
}

if (!function_exists('weekday_name')) {
    function weekday_name(int $index): string
    {
        $names = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        return $names[$index] ?? 'Día';
    }
}

if (!function_exists('format_spanish_datetime')) {
    function format_spanish_datetime(DateTimeImmutable $date, bool $includeTime = true): string
    {
        $months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        $day = $date->format('j');
        $monthIndex = (int) $date->format('n') - 1;
        $month = $months[$monthIndex] ?? '';
        $year = $date->format('Y');
        if ($includeTime) {
            $time = $date->format('H:i');
            return sprintf('%s de %s de %s · %s hrs', $day, $month, $year, $time);
        }
        return sprintf('%s de %s de %s', $day, $month, $year);
    }
}

if (!function_exists('format_period_label')) {
    function format_period_label(DateTimeImmutable $start, DateTimeImmutable $end): string
    {
        if ($start->format('Y-m-d') === $end->format('Y-m-d')) {
            return 'Período de análisis: ' . format_spanish_datetime($start, false);
        }
        return sprintf('Período de análisis: %s — %s', format_spanish_datetime($start, false), format_spanish_datetime($end, false));
    }
}

if (!function_exists('compute_reporting_window')) {
    function compute_reporting_window(array $automation, DateTimeImmutable $now): array
    {
        $frequency = (string) ($automation['frecuencia'] ?? 'daily');
        $start = $now->setTime(0, 0, 0, 0);
        $end = $now->setTime(23, 59, 59, 0);
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
                $start = $now->setTime(0, 0, 0, 0);
            }
        }

        if (!$hasPreviousRun) {
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

        if ($creation instanceof DateTimeImmutable && $start < $creation) {
            $start = $creation;
        }

        if ($start > $end) {
            $start = $end->modify('-1 hour');
        }

        return [$start, $end];
    }
}

if (!function_exists('format_frequency_label')) {
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
}

if (!function_exists('gather_company_profile')) {
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
            error_log('[automation] No se pudo obtener la información de la empresa: ' . $exception->getMessage());
            return ['name' => 'OptiStock', 'logo' => null];
        }
    }
}

if (!function_exists('gather_palette')) {
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
            error_log('[automation] No se pudo obtener la paleta de colores: ' . $exception->getMessage());
            return [
                'primary' => '#ff6f91',
                'secondary' => '#0f172a',
                'neutral' => '#f8fafc',
            ];
        }
    }
}

if (!function_exists('gather_movements_by_user')) {
    function gather_movements_by_user(mysqli $conn, int $empresaId, DateTimeImmutable $start, DateTimeImmutable $end): array
    {
        try {
            $sql = 'SELECT u.id_usuario, u.nombre, u.apellido, u.rol, COUNT(*) AS movimientos,
                           SUM(CASE WHEN m.tipo = "ingreso" THEN m.cantidad ELSE 0 END) AS ingresos,
                           SUM(CASE WHEN m.tipo = "egreso" THEN m.cantidad ELSE 0 END) AS egresos
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
            error_log('[automation] No se pudieron obtener los movimientos por usuario: ' . $exception->getMessage());
            return [];
        }
    }
}

if (!function_exists('gather_movement_timeline')) {
    function gather_movement_timeline(mysqli $conn, int $empresaId, DateTimeImmutable $start, DateTimeImmutable $end): array
    {
        try {
            $sql = 'SELECT DATE(m.fecha_movimiento) AS fecha,
                           COUNT(*) AS movimientos,
                           SUM(CASE WHEN m.tipo = "ingreso" THEN m.cantidad ELSE 0 END) AS ingresos,
                           SUM(CASE WHEN m.tipo = "egreso" THEN m.cantidad ELSE 0 END) AS egresos
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
            error_log('[automation] No se pudo generar el historial de movimientos: ' . $exception->getMessage());
            return [];
        }
    }
}

if (!function_exists('gather_recent_movements')) {
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
                $date = null;
                try {
                    $date = new DateTimeImmutable((string) $row['fecha_movimiento']);
                } catch (Throwable $exception) {
                    $date = new DateTimeImmutable('now');
                }
                $recent[] = [
                    'id' => (int) ($row['id'] ?? 0),
                    'type' => $row['tipo'] ?? '',
                    'quantity' => (int) ($row['cantidad'] ?? 0),
                    'product' => $row['producto_nombre'] ?? '',
                    'productCode' => $row['producto_codigo'] ?? '',
                    'zone' => $row['zona_nombre'] ?? '',
                    'area' => $row['area_nombre'] ?? '',
                    'user' => trim(($row['usuario_nombre'] ?? '') . ' ' . ($row['usuario_apellido'] ?? '')),
                    'dateLabel' => format_spanish_datetime($date),
                ];
            }
            $stmt->close();
        } catch (Throwable $exception) {
            error_log('[automation] No se pudieron listar movimientos recientes: ' . $exception->getMessage());
        }

        return $recent;
    }
}

if (!function_exists('compute_movement_summary')) {
    function compute_movement_summary(array $movementsByUser, array $timeline): array
    {
        $totalMovements = 0;
        $totalIngresos = 0;
        $totalEgresos = 0;
        $users = [];

        foreach ($movementsByUser as $entry) {
            $totalMovements += (int) ($entry['movements'] ?? 0);
            $totalIngresos += (int) ($entry['ingresos'] ?? 0);
            $totalEgresos += (int) ($entry['egresos'] ?? 0);
            $user = $entry['user'] ?? '';
            if ($user !== '') {
                $users[$user] = true;
            }
        }

        foreach ($timeline as $entry) {
            $totalMovements += (int) ($entry['movements'] ?? 0);
            $totalIngresos += (int) ($entry['ingresos'] ?? 0);
            $totalEgresos += (int) ($entry['egresos'] ?? 0);
        }

        return [
            'totalMovements' => $totalMovements,
            'totalIngresos' => $totalIngresos,
            'totalEgresos' => $totalEgresos,
            'net' => $totalIngresos - $totalEgresos,
            'uniqueUsers' => count($users),
        ];
    }
}

if (!function_exists('gather_area_snapshot')) {
    function gather_area_snapshot(mysqli $conn, int $empresaId): array
    {
        $areas = [];
        try {
            $sql = 'SELECT a.nombre AS area_nombre, COUNT(z.id) AS zonas_total,
                           SUM(CASE WHEN p.id IS NOT NULL THEN 1 ELSE 0 END) AS productos_total
                    FROM areas a
                    LEFT JOIN zonas z ON z.area_id = a.id
                    LEFT JOIN productos p ON p.zona_id = z.id
                    WHERE a.empresa_id = ?
                    GROUP BY a.id, a.nombre
                    ORDER BY a.nombre ASC';
            $stmt = $conn->prepare($sql);
            $stmt->bind_param('i', $empresaId);
            $stmt->execute();
            $result = $stmt->get_result();
            while ($row = $result->fetch_assoc()) {
                $areas[] = [
                    'name' => $row['area_nombre'] ?? '',
                    'zones' => (int) ($row['zonas_total'] ?? 0),
                    'products' => (int) ($row['productos_total'] ?? 0),
                ];
            }
            $stmt->close();
        } catch (Throwable $exception) {
            error_log('[automation] No se pudo obtener el resumen de áreas: ' . $exception->getMessage());
        }
        return $areas;
    }
}

if (!function_exists('gather_request_summary')) {
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
            $stmt = $conn->prepare('SELECT COUNT(*) FROM solicitudes_cambios WHERE id_empresa = ? AND estado = "en_proceso"');
            $stmt->bind_param('i', $empresaId);
            $stmt->execute();
            $stmt->bind_result($count);
            if ($stmt->fetch()) {
                $summary['openTotal'] = (int) $count;
            }
            $stmt->close();
        } catch (Throwable $exception) {
            error_log('[automation] No se pudo calcular el total de solicitudes abiertas: ' . $exception->getMessage());
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
            error_log('[automation] No se pudo obtener el resumen de solicitudes creadas: ' . $exception->getMessage());
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
            error_log('[automation] No se pudo obtener el resumen de solicitudes resueltas: ' . $exception->getMessage());
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
            error_log('[automation] No se pudo listar las solicitudes abiertas recientes: ' . $exception->getMessage());
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
            error_log('[automation] No se pudo listar las solicitudes resueltas recientes: ' . $exception->getMessage());
        }

        return $summary;
    }
}

if (!function_exists('build_report_payload')) {
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
}

if (!function_exists('csv_escape')) {
    function csv_escape($value): string
    {
        $string = (string) $value;
        $string = str_replace("\"", "\"\"", $string);
        return '"' . $string . '"';
    }
}

if (!function_exists('render_report_csv')) {
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
}
