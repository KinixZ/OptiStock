<?php
// scripts/php/automation_runtime.php
// Funciones compartidas para generar reportes automatizados bajo demanda.

declare(strict_types=1);

if (!defined('AUTOMATION_MODULE_LABELS')) {
    define('AUTOMATION_MODULE_LABELS', [
        'inventario' => 'Inventario actual',
        'usuarios' => 'Usuarios actuales',
        'areas_zonas' => 'Áreas y zonas',
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
        'reportes y análisis' => 'ingresos/egresos',
        'reportes y analisis' => 'ingresos/egresos',
        'historial de movimientos' => 'ingresos/egresos',
        'historial_movimientos' => 'ingresos/egresos',
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
            'ingresos/egresos' => 'Ingresos y egresos',
            'ingresos' => 'Ingresos registrados',
            'egresos' => 'Egresos registrados',
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

if (!function_exists('resolve_movement_focus_type')) {
    function resolve_movement_focus_type(string $moduleValue): string
    {
        if ($moduleValue === 'ingresos') {
            return 'ingreso';
        }
        if ($moduleValue === 'egresos') {
            return 'egreso';
        }
        return '';
    }
}

if (!function_exists('filter_movement_collections_for_focus')) {
    function filter_movement_collections_for_focus(
        string $focusType,
        array $movementsByUser,
        array $timeline,
        array $recentMovements
    ): array {
        if ($focusType === '') {
            return [$movementsByUser, $timeline, $recentMovements];
        }

        $filteredByUser = [];
        foreach ($movementsByUser as $entry) {
            $ingresos = (int) ($entry['ingresos'] ?? 0);
            $egresos = (int) ($entry['egresos'] ?? 0);

            if ($focusType === 'ingreso') {
                if ($ingresos <= 0) {
                    continue;
                }
                $entry['movements'] = $ingresos;
                $entry['ingresos'] = $ingresos;
                $entry['egresos'] = 0;
                $entry['net'] = $ingresos;
            } else {
                if ($egresos <= 0) {
                    continue;
                }
                $entry['movements'] = $egresos;
                $entry['ingresos'] = 0;
                $entry['egresos'] = $egresos;
                $entry['net'] = -$egresos;
            }

            $filteredByUser[] = $entry;
        }

        $filteredTimeline = [];
        foreach ($timeline as $entry) {
            $label = $entry['label'] ?? '';
            $ingresos = (int) ($entry['ingresos'] ?? 0);
            $egresos = (int) ($entry['egresos'] ?? 0);

            if ($focusType === 'ingreso') {
                if ($ingresos <= 0) {
                    continue;
                }
                $filteredTimeline[] = [
                    'label' => $label,
                    'movements' => $ingresos,
                    'ingresos' => $ingresos,
                    'egresos' => 0,
                    'net' => $ingresos,
                ];
            } else {
                if ($egresos <= 0) {
                    continue;
                }
                $filteredTimeline[] = [
                    'label' => $label,
                    'movements' => $egresos,
                    'ingresos' => 0,
                    'egresos' => $egresos,
                    'net' => -$egresos,
                ];
            }
        }

        $filteredRecent = [];
        foreach ($recentMovements as $movement) {
            $type = strtolower((string) ($movement['type'] ?? ''));
            if ($type !== $focusType) {
                continue;
            }
            $filteredRecent[] = $movement;
        }

        return [$filteredByUser, $filteredTimeline, $filteredRecent];
    }
}

if (!function_exists('gather_area_snapshot')) {
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
            'areas' => [],
            'zones' => [],
            'topAreas' => [],
            'topZones' => [],
        ];

        try {
            $stmt = $conn->prepare('SELECT COUNT(*) AS total, AVG(porcentaje_ocupacion) AS avg_occ,
                    SUM(capacidad_utilizada) AS used_capacity, SUM(volumen) AS volume
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
            error_log('[automation] No se pudo obtener el resumen de áreas: ' . $exception->getMessage());
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
            error_log('[automation] No se pudo obtener el resumen de zonas: ' . $exception->getMessage());
        }

        try {
            $stmt = $conn->prepare('SELECT nombre, descripcion, volumen, capacidad_utilizada,
                    porcentaje_ocupacion, productos_registrados
                FROM areas WHERE id_empresa = ? ORDER BY nombre ASC');
            $stmt->bind_param('i', $empresaId);
            $stmt->execute();
            $result = $stmt->get_result();
            while ($row = $result->fetch_assoc()) {
                $snapshot['areas'][] = [
                    'name' => $row['nombre'] ?? 'Área',
                    'description' => $row['descripcion'] ?? '',
                    'volume' => $row['volumen'] !== null ? (float) $row['volumen'] : 0.0,
                    'usedCapacity' => $row['capacidad_utilizada'] !== null ? (float) $row['capacidad_utilizada'] : 0.0,
                    'occupancy' => $row['porcentaje_ocupacion'] !== null ? (float) $row['porcentaje_ocupacion'] : 0.0,
                    'products' => (int) ($row['productos_registrados'] ?? 0),
                ];
            }
            $stmt->close();
        } catch (Throwable $exception) {
            error_log('[automation] No se pudo listar las áreas de la empresa: ' . $exception->getMessage());
        }

        try {
            $stmt = $conn->prepare('SELECT nombre, porcentaje_ocupacion, capacidad_utilizada,
                    volumen, productos_registrados
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
            error_log('[automation] No se pudo listar las áreas destacadas: ' . $exception->getMessage());
        }

        try {
            $stmt = $conn->prepare('SELECT z.nombre, z.descripcion, z.productos_registrados,
                    z.porcentaje_ocupacion, z.capacidad_utilizada, z.volumen,
                    z.tipo_almacenamiento, a.nombre AS area_nombre
                FROM zonas z
                LEFT JOIN areas a ON a.id = z.area_id
                WHERE z.id_empresa = ?
                ORDER BY a.nombre ASC, z.nombre ASC');
            $stmt->bind_param('i', $empresaId);
            $stmt->execute();
            $result = $stmt->get_result();
            while ($row = $result->fetch_assoc()) {
                $snapshot['zones'][] = [
                    'name' => $row['nombre'] ?? 'Zona',
                    'description' => $row['descripcion'] ?? '',
                    'area' => $row['area_nombre'] ?? '',
                    'storageType' => $row['tipo_almacenamiento'] ?? '',
                    'occupancy' => $row['porcentaje_ocupacion'] !== null ? (float) $row['porcentaje_ocupacion'] : 0.0,
                    'capacity' => $row['capacidad_utilizada'] !== null ? (float) $row['capacidad_utilizada'] : 0.0,
                    'volume' => $row['volumen'] !== null ? (float) $row['volumen'] : 0.0,
                    'products' => (int) ($row['productos_registrados'] ?? 0),
                ];
            }
            $stmt->close();
        } catch (Throwable $exception) {
            error_log('[automation] No se pudo obtener la información de zonas: ' . $exception->getMessage());
        }

        try {
            $stmt = $conn->prepare('SELECT nombre, porcentaje_ocupacion, capacidad_utilizada,
                    productos_registrados
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
            error_log('[automation] No se pudo listar las zonas destacadas: ' . $exception->getMessage());
        }

        return $snapshot;
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

if (!function_exists('gather_inventory_report')) {
    function gather_inventory_report(mysqli $conn, int $empresaId): array
    {
        $report = [
            'totals' => [
                'products' => 0,
                'totalStock' => 0,
                'valuation' => 0.0,
                'outOfStock' => 0,
                'withLocation' => 0,
            ],
            'categories' => [],
            'products' => [],
        ];

        try {
            $stmt = $conn->prepare('SELECT COUNT(*) AS total_products,
                    SUM(stock) AS total_stock,
                    SUM(CASE WHEN stock <= 0 THEN 1 ELSE 0 END) AS out_of_stock,
                    SUM(CASE WHEN zona_id IS NOT NULL THEN 1 ELSE 0 END) AS with_location,
                    SUM(stock * precio_compra) AS valuation
                FROM productos WHERE empresa_id = ?');
            $stmt->bind_param('i', $empresaId);
            $stmt->execute();
            $stmt->bind_result($totalProducts, $totalStock, $outOfStock, $withLocation, $valuation);
            if ($stmt->fetch()) {
                $report['totals']['products'] = (int) $totalProducts;
                $report['totals']['totalStock'] = (int) ($totalStock ?? 0);
                $report['totals']['outOfStock'] = (int) ($outOfStock ?? 0);
                $report['totals']['withLocation'] = (int) ($withLocation ?? 0);
                $report['totals']['valuation'] = $valuation !== null ? (float) $valuation : 0.0;
            }
            $stmt->close();
        } catch (Throwable $exception) {
            error_log('[automation] No se pudo calcular el resumen de inventario: ' . $exception->getMessage());
        }

        try {
            $stmt = $conn->prepare('SELECT COALESCE(c.nombre, "Sin categoría") AS categoria,
                    COUNT(*) AS productos,
                    SUM(p.stock) AS total_stock
                FROM productos p
                LEFT JOIN categorias c ON c.id = p.categoria_id
                WHERE p.empresa_id = ?
                GROUP BY categoria
                ORDER BY total_stock DESC, categoria ASC
                LIMIT 15');
            $stmt->bind_param('i', $empresaId);
            $stmt->execute();
            $result = $stmt->get_result();
            while ($row = $result->fetch_assoc()) {
                $report['categories'][] = [
                    'name' => $row['categoria'] ?? 'Sin categoría',
                    'products' => (int) ($row['productos'] ?? 0),
                    'stock' => (int) ($row['total_stock'] ?? 0),
                ];
            }
            $stmt->close();
        } catch (Throwable $exception) {
            error_log('[automation] No se pudo obtener el stock por categoría: ' . $exception->getMessage());
        }

        try {
            $stmt = $conn->prepare('SELECT p.nombre, p.codigo_qr, p.stock, p.last_movimiento, p.last_tipo,
                    c.nombre AS categoria, sc.nombre AS subcategoria,
                    a.nombre AS area_nombre, z.nombre AS zona_nombre
                FROM productos p
                LEFT JOIN categorias c ON c.id = p.categoria_id
                LEFT JOIN subcategorias sc ON sc.id = p.subcategoria_id
                LEFT JOIN zonas z ON z.id = p.zona_id
                LEFT JOIN areas a ON a.id = z.area_id
                WHERE p.empresa_id = ?
                ORDER BY p.stock DESC, p.nombre ASC
                LIMIT 60');
            $stmt->bind_param('i', $empresaId);
            $stmt->execute();
            $result = $stmt->get_result();
            while ($row = $result->fetch_assoc()) {
                $lastMovementLabel = '';
                if (!empty($row['last_movimiento'])) {
                    try {
                        $lastMovement = new DateTimeImmutable((string) $row['last_movimiento']);
                        $lastMovementLabel = format_spanish_datetime($lastMovement);
                    } catch (Throwable $exception) {
                        $lastMovementLabel = (string) $row['last_movimiento'];
                    }
                }

                $category = $row['categoria'] ?? '';
                $subcategory = $row['subcategoria'] ?? '';
                $categoryLabel = $category;
                if ($subcategory !== '') {
                    $categoryLabel = $category !== '' ? $category . ' · ' . $subcategory : $subcategory;
                }

                $areaLabel = $row['area_nombre'] ?? '';
                $zoneLabel = $row['zona_nombre'] ?? '';
                $locationLabel = trim($areaLabel . ($zoneLabel !== '' ? ' · ' . $zoneLabel : ''));

                $report['products'][] = [
                    'name' => $row['nombre'] ?? 'Producto',
                    'category' => $categoryLabel !== '' ? $categoryLabel : 'Sin categoría',
                    'stock' => (int) ($row['stock'] ?? 0),
                    'code' => $row['codigo_qr'] ?? '',
                    'location' => $locationLabel,
                    'lastMovement' => $lastMovementLabel,
                    'lastType' => $row['last_tipo'] ?? '',
                ];
            }
            $stmt->close();
        } catch (Throwable $exception) {
            error_log('[automation] No se pudo listar el detalle de productos: ' . $exception->getMessage());
        }

        return $report;
    }
}

if (!function_exists('gather_users_report')) {
    function gather_users_report(mysqli $conn, int $empresaId): array
    {
        $report = [
            'totals' => [
                'users' => 0,
                'active' => 0,
                'inactive' => 0,
            ],
            'roles' => [],
            'people' => [],
        ];

        try {
            $stmt = $conn->prepare('SELECT COUNT(*) AS total_users,
                    SUM(CASE WHEN u.activo = 1 THEN 1 ELSE 0 END) AS activos,
                    SUM(CASE WHEN u.activo = 0 THEN 1 ELSE 0 END) AS inactivos
                FROM usuario u
                INNER JOIN usuario_empresa ue ON ue.id_usuario = u.id_usuario
                WHERE ue.id_empresa = ?');
            $stmt->bind_param('i', $empresaId);
            $stmt->execute();
            $stmt->bind_result($totalUsers, $activeUsers, $inactiveUsers);
            if ($stmt->fetch()) {
                $report['totals']['users'] = (int) $totalUsers;
                $report['totals']['active'] = (int) ($activeUsers ?? 0);
                $report['totals']['inactive'] = (int) ($inactiveUsers ?? 0);
            }
            $stmt->close();
        } catch (Throwable $exception) {
            error_log('[automation] No se pudo calcular el total de usuarios: ' . $exception->getMessage());
        }

        try {
            $stmt = $conn->prepare('SELECT COALESCE(u.rol, "Sin rol") AS rol, COUNT(*) AS total
                FROM usuario u
                INNER JOIN usuario_empresa ue ON ue.id_usuario = u.id_usuario
                WHERE ue.id_empresa = ?
                GROUP BY rol
                ORDER BY total DESC, rol ASC');
            $stmt->bind_param('i', $empresaId);
            $stmt->execute();
            $result = $stmt->get_result();
            while ($row = $result->fetch_assoc()) {
                $report['roles'][] = [
                    'role' => $row['rol'] ?? 'Sin rol',
                    'total' => (int) ($row['total'] ?? 0),
                ];
            }
            $stmt->close();
        } catch (Throwable $exception) {
            error_log('[automation] No se pudo obtener el resumen por rol: ' . $exception->getMessage());
        }

        $userIndex = [];
        try {
            $stmt = $conn->prepare('SELECT u.id_usuario, u.nombre, u.apellido, u.correo, u.telefono,
                    u.rol, u.activo, u.fecha_registro
                FROM usuario u
                INNER JOIN usuario_empresa ue ON ue.id_usuario = u.id_usuario
                WHERE ue.id_empresa = ?
                ORDER BY u.nombre ASC, u.apellido ASC
                LIMIT 120');
            $stmt->bind_param('i', $empresaId);
            $stmt->execute();
            $result = $stmt->get_result();
            while ($row = $result->fetch_assoc()) {
                $userId = (int) ($row['id_usuario'] ?? 0);
                $registeredLabel = '';
                if (!empty($row['fecha_registro'])) {
                    try {
                        $registeredDate = new DateTimeImmutable((string) $row['fecha_registro']);
                        $registeredLabel = format_spanish_datetime($registeredDate);
                    } catch (Throwable $exception) {
                        $registeredLabel = (string) $row['fecha_registro'];
                    }
                }

                $report['people'][] = [
                    'id' => $userId,
                    'name' => trim(($row['nombre'] ?? '') . ' ' . ($row['apellido'] ?? '')),
                    'email' => $row['correo'] ?? '',
                    'phone' => $row['telefono'] ?? '',
                    'role' => $row['rol'] ?? '',
                    'active' => (int) ($row['activo'] ?? 0) === 1,
                    'registered' => $registeredLabel,
                    'accesses' => [],
                ];

                if ($userId > 0) {
                    $userIndex[$userId] = count($report['people']) - 1;
                }
            }
            $stmt->close();
        } catch (Throwable $exception) {
            error_log('[automation] No se pudo listar a los usuarios de la empresa: ' . $exception->getMessage());
        }

        if (!empty($userIndex)) {
            $idList = implode(',', array_map('intval', array_keys($userIndex)));
            if ($idList !== '') {
                try {
                    $sql = 'SELECT uaz.id_usuario, a.nombre AS area_nombre, z.nombre AS zona_nombre
                        FROM usuario_area_zona uaz
                        LEFT JOIN areas a ON a.id = uaz.id_area
                        LEFT JOIN zonas z ON z.id = uaz.id_zona
                        WHERE uaz.id_usuario IN (' . $idList . ')
                        ORDER BY a.nombre ASC, z.nombre ASC';
                    $result = $conn->query($sql);
                    if ($result instanceof mysqli_result) {
                        while ($row = $result->fetch_assoc()) {
                            $userId = (int) ($row['id_usuario'] ?? 0);
                            if (!isset($userIndex[$userId])) {
                                continue;
                            }
                            $labelParts = [];
                            if (!empty($row['area_nombre'])) {
                                $labelParts[] = 'Área: ' . $row['area_nombre'];
                            }
                            if (!empty($row['zona_nombre'])) {
                                $labelParts[] = 'Zona: ' . $row['zona_nombre'];
                            }
                            $label = $labelParts ? implode(' · ', $labelParts) : 'Área asignada';
                            $report['people'][$userIndex[$userId]]['accesses'][] = $label;
                        }
                    }
                } catch (Throwable $exception) {
                    error_log('[automation] No se pudieron obtener los accesos de usuarios: ' . $exception->getMessage());
                }
            }
        }

        foreach ($report['people'] as &$person) {
            $person['accessSummary'] = $person['accesses'] ? implode(', ', $person['accesses']) : 'Sin asignaciones';
            unset($person['accesses']);
        }
        unset($person);

        return $report;
    }
}

if (!function_exists('gather_activity_log_report')) {
    function gather_activity_log_report(mysqli $conn, int $empresaId, DateTimeImmutable $start, DateTimeImmutable $end): array
    {
        $report = [
            'total' => 0,
            'logs' => [],
            'moduleCounts' => [],
        ];

        $startSql = $start->format('Y-m-d');
        $endSql = $end->format('Y-m-d');

        try {
            $stmt = $conn->prepare('SELECT lc.modulo, lc.accion, lc.fecha, lc.hora, u.nombre, u.apellido
                FROM log_control lc
                INNER JOIN usuario u ON u.id_usuario = lc.id_usuario
                LEFT JOIN usuario_empresa ue ON ue.id_usuario = u.id_usuario
                WHERE lc.fecha BETWEEN ? AND ?
                  AND (ue.id_empresa = ? OR u.id_usuario = (SELECT usuario_creador FROM empresa WHERE id_empresa = ? LIMIT 1))
                ORDER BY lc.fecha DESC, lc.hora DESC
                LIMIT 60');
            $stmt->bind_param('ssii', $startSql, $endSql, $empresaId, $empresaId);
            $stmt->execute();
            $result = $stmt->get_result();
            while ($row = $result->fetch_assoc()) {
                $timestamp = null;
                if (!empty($row['fecha'])) {
                    $candidate = trim((string) $row['fecha']);
                    $timePart = trim((string) ($row['hora'] ?? '00:00:00'));
                    try {
                        $timestamp = new DateTimeImmutable($candidate . ' ' . $timePart);
                    } catch (Throwable $exception) {
                        $timestamp = null;
                    }
                }

                $dateLabel = $timestamp ? format_spanish_datetime($timestamp, false) : (string) ($row['fecha'] ?? '');
                $timeLabel = $timestamp ? $timestamp->format('H:i') : (string) ($row['hora'] ?? '');
                $module = $row['modulo'] ?? 'Registro';

                $report['logs'][] = [
                    'module' => $module,
                    'action' => $row['accion'] ?? '',
                    'date' => $dateLabel,
                    'time' => $timeLabel,
                    'user' => trim(($row['nombre'] ?? '') . ' ' . ($row['apellido'] ?? '')),
                ];

                $report['moduleCounts'][$module] = ($report['moduleCounts'][$module] ?? 0) + 1;
                $report['total'] += 1;
            }
            $stmt->close();
        } catch (Throwable $exception) {
            error_log('[automation] No se pudieron obtener los registros de actividad: ' . $exception->getMessage());
        }

        return $report;
    }
}

if (!function_exists('gather_access_log_report')) {
    function gather_access_log_report(mysqli $conn, int $empresaId, DateTimeImmutable $start, DateTimeImmutable $end): array
    {
        $report = [
            'total' => 0,
            'entries' => [],
            'actionCounts' => [],
            'lastAccessByUser' => [],
        ];

        $startSql = $start->format('Y-m-d H:i:s');
        $endSql = $end->format('Y-m-d H:i:s');

        try {
            $stmt = $conn->prepare('SELECT ra.accion, ra.fecha, u.nombre, u.apellido, u.rol, u.id_usuario
                FROM registro_accesos ra
                INNER JOIN usuario u ON u.id_usuario = ra.id_usuario
                LEFT JOIN usuario_empresa ue ON ue.id_usuario = u.id_usuario
                WHERE ra.fecha BETWEEN ? AND ?
                  AND (ue.id_empresa = ? OR u.id_usuario = (SELECT usuario_creador FROM empresa WHERE id_empresa = ? LIMIT 1))
                ORDER BY ra.fecha DESC
                LIMIT 60');
            $stmt->bind_param('ssii', $startSql, $endSql, $empresaId, $empresaId);
            $stmt->execute();
            $result = $stmt->get_result();
            while ($row = $result->fetch_assoc()) {
                $timestamp = null;
                if (!empty($row['fecha'])) {
                    try {
                        $timestamp = new DateTimeImmutable((string) $row['fecha']);
                    } catch (Throwable $exception) {
                        $timestamp = null;
                    }
                }

                $dateLabel = $timestamp ? format_spanish_datetime($timestamp, false) : '';
                $timeLabel = $timestamp ? $timestamp->format('H:i') : '';
                $action = $row['accion'] ?? '';
                $userName = trim(($row['nombre'] ?? '') . ' ' . ($row['apellido'] ?? ''));
                $userId = (int) ($row['id_usuario'] ?? 0);

                $report['entries'][] = [
                    'action' => $action,
                    'date' => $dateLabel,
                    'time' => $timeLabel,
                    'user' => $userName,
                    'role' => $row['rol'] ?? '',
                ];

                $report['actionCounts'][$action] = ($report['actionCounts'][$action] ?? 0) + 1;
                $report['total'] += 1;

                if ($userId > 0 && !isset($report['lastAccessByUser'][$userId])) {
                    $report['lastAccessByUser'][$userId] = [
                        'user' => $userName,
                        'action' => $action,
                        'date' => $dateLabel,
                        'time' => $timeLabel,
                    ];
                }
            }
            $stmt->close();
        } catch (Throwable $exception) {
            error_log('[automation] No se pudo obtener el registro de accesos: ' . $exception->getMessage());
        }

        $report['lastAccessByUser'] = array_values($report['lastAccessByUser']);
        return $report;
    }
}

if (!function_exists('build_movement_focus')) {
    function build_movement_focus(array $timeline, array $recentMovements, string $mode): array
    {
        $normalizedMode = $mode !== '' ? $mode : 'ingresos/egresos';
        $filterType = '';
        if ($normalizedMode === 'ingresos') {
            $filterType = 'ingreso';
        } elseif ($normalizedMode === 'egresos') {
            $filterType = 'egreso';
        }

        $totals = [
            'movements' => 0,
            'ingresos' => 0,
            'egresos' => 0,
            'net' => 0,
        ];

        $focusTimeline = [];
        foreach ($timeline as $entry) {
            $label = $entry['label'] ?? '';
            $ingresos = (int) ($entry['ingresos'] ?? 0);
            $egresos = (int) ($entry['egresos'] ?? 0);
            $movements = (int) ($entry['movements'] ?? ($ingresos + $egresos));

            if ($filterType === 'ingreso') {
                if ($ingresos <= 0) {
                    continue;
                }
                $focusTimeline[] = [
                    'label' => $label,
                    'ingresos' => $ingresos,
                ];
                $totals['ingresos'] += $ingresos;
                $totals['movements'] += $ingresos;
                continue;
            }

            if ($filterType === 'egreso') {
                if ($egresos <= 0) {
                    continue;
                }
                $focusTimeline[] = [
                    'label' => $label,
                    'egresos' => $egresos,
                ];
                $totals['egresos'] += $egresos;
                $totals['movements'] += $egresos;
                continue;
            }

            $focusTimeline[] = [
                'label' => $label,
                'movements' => $movements,
                'ingresos' => $ingresos,
                'egresos' => $egresos,
                'net' => $ingresos - $egresos,
            ];
            $totals['movements'] += $movements;
            $totals['ingresos'] += $ingresos;
            $totals['egresos'] += $egresos;
        }

        $filteredRecent = [];
        foreach ($recentMovements as $movement) {
            $type = strtolower((string) ($movement['type'] ?? ''));
            if ($filterType !== '' && $type !== $filterType) {
                continue;
            }
            $filteredRecent[] = $movement;
        }

        if ($filterType === '') {
            $totals['net'] = $totals['ingresos'] - $totals['egresos'];
        } else {
            $totals['net'] = $totals['ingresos'] - $totals['egresos'];
        }

        return [
            'mode' => $normalizedMode,
            'totals' => $totals,
            'timeline' => $focusTimeline,
            'recent' => array_slice($filteredRecent, 0, 40),
        ];
    }
}

if (!function_exists('build_report_payload')) {
    function build_report_payload(mysqli $conn, array $automation, DateTimeImmutable $now): array
    {
        [$periodStart, $periodEnd] = compute_reporting_window($automation, $now);
        $empresaId = (int) ($automation['id_empresa'] ?? 0);
        $moduleValue = normalize_module_value($automation['modulo'] ?? '');
        $moduleLabel = resolve_module_label($automation['modulo'] ?? '');

        $movementsByUser = gather_movements_by_user($conn, $empresaId, $periodStart, $periodEnd);
        $movementTimeline = gather_movement_timeline($conn, $empresaId, $periodStart, $periodEnd);
        $recentMovements = gather_recent_movements($conn, $empresaId, $periodStart, $periodEnd);

        $focusType = resolve_movement_focus_type($moduleValue);
        if ($focusType !== '') {
            [$movementsByUser, $movementTimeline, $recentMovements] = filter_movement_collections_for_focus(
                $focusType,
                $movementsByUser,
                $movementTimeline,
                $recentMovements
            );
        }

        $payload = [
            'module' => $moduleValue,
            'moduleLabel' => $moduleLabel,
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
            'recentMovements' => $recentMovements,
            'areas' => gather_area_snapshot($conn, $empresaId),
            'requests' => gather_request_summary($conn, $empresaId, $periodStart, $periodEnd),
        ];

        switch ($moduleValue) {
            case 'inventario':
                $payload['inventory'] = gather_inventory_report($conn, $empresaId);
                break;
            case 'usuarios':
                $payload['users'] = gather_users_report($conn, $empresaId);
                break;
            case 'registro_actividades':
                $payload['activityLog'] = gather_activity_log_report($conn, $empresaId, $periodStart, $periodEnd);
                break;
            case 'accesos':
                $payload['accessLog'] = gather_access_log_report($conn, $empresaId, $periodStart, $periodEnd);
                break;
            default:
                // otros módulos reutilizan datos base
                break;
        }

        $focusMode = in_array($moduleValue, ['ingresos/egresos', 'ingresos', 'egresos'], true)
            ? $moduleValue
            : '';
        $payload['movementFocus'] = build_movement_focus($movementTimeline, $recentMovements, $focusMode);

        return $payload;
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
