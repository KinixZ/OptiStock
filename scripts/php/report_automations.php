<?php
// scripts/php/report_automations.php
// Gestiona la configuración de automatizaciones de reportes en la base de datos.

declare(strict_types=1);

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

const DB_SERVER = 'localhost';
const DB_USER = 'u296155119_Admin';
const DB_PASSWORD = '4Dmin123o';
const DB_NAME = 'u296155119_OptiStock';

const AUTOMATION_MODULE_VALUES = [
    'inventario',
    'usuarios',
    'areas_zonas',
    'historial_movimientos',
    'ingresos/egresos',
    'ingresos',
    'egresos',
    'registro_actividades',
    'solicitudes',
    'accesos',
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
    if (in_array($candidate, AUTOMATION_MODULE_VALUES, true)) {
        return $candidate;
    }
    $lower = function_exists('mb_strtolower') ? mb_strtolower($candidate, 'UTF-8') : strtolower($candidate);
    if (isset(LEGACY_AUTOMATION_MODULE_ALIASES[$lower])) {
        return LEGACY_AUTOMATION_MODULE_ALIASES[$lower];
    }
    return '';
}

function respond_json(int $statusCode, array $payload): void
{
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function db_connect(): mysqli
{
    $conn = new mysqli(DB_SERVER, DB_USER, DB_PASSWORD, DB_NAME);
    $conn->set_charset('utf8mb4');
    return $conn;
}

function sanitize_uuid(?string $value): string
{
    $clean = preg_replace('/[^A-Za-z0-9:_-]/', '', (string) $value);
    $clean = $clean !== null ? $clean : '';
    return substr($clean, 0, 64);
}

function normalize_format(?string $value): string
{
    return strtolower((string) $value) === 'excel' ? 'excel' : 'pdf';
}

function normalize_frequency(?string $value): string
{
    $allowed = ['daily', 'weekly', 'biweekly', 'monthly'];
    $candidate = strtolower((string) $value);
    return in_array($candidate, $allowed, true) ? $candidate : 'daily';
}

function normalize_time(?string $value): string
{
    $candidate = (string) $value;
    if (preg_match('/^(\d{1,2}):(\d{1,2})$/', $candidate, $matches)) {
        $hours = max(0, min(23, (int) $matches[1]));
        $minutes = max(0, min(59, (int) $matches[2]));
        return sprintf('%02d:%02d:00', $hours, $minutes);
    }

    return '08:00:00';
}

function normalize_weekday($value): ?string
{
    if ($value === null || $value === '') {
        return null;
    }
    $int = (int) $value;
    $int = max(0, min(6, $int));
    return (string) $int;
}

function normalize_monthday($value): ?string
{
    if ($value === null || $value === '') {
        return null;
    }
    $int = (int) $value;
    $int = max(1, min(31, $int));
    return (string) $int;
}

function to_mysql_datetime($value): ?string
{
    if ($value === null || $value === '') {
        return null;
    }
    $timestamp = strtotime((string) $value);
    if ($timestamp === false) {
        return null;
    }
    return date('Y-m-d H:i:s', $timestamp);
}

function to_iso_datetime($value): ?string
{
    if ($value === null || $value === '') {
        return null;
    }
    $timestamp = strtotime((string) $value);
    if ($timestamp === false) {
        return null;
    }
    return gmdate('c', $timestamp);
}

function map_row(array $row): array
{
    $time = (string) ($row['hora_ejecucion'] ?? '08:00:00');
    $time = substr($time, 0, 5);

    return [
        'id' => (string) ($row['uuid'] ?? ''),
        'empresaId' => (int) ($row['id_empresa'] ?? 0),
        'name' => (string) ($row['nombre'] ?? ''),
        'module' => normalize_module_value($row['modulo'] ?? ''),
        'format' => (string) ($row['formato'] ?? 'pdf'),
        'frequency' => (string) ($row['frecuencia'] ?? 'daily'),
        'time' => $time,
        'weekday' => isset($row['dia_semana']) ? (int) $row['dia_semana'] : null,
        'monthday' => isset($row['dia_mes']) ? (int) $row['dia_mes'] : null,
        'notes' => (string) ($row['notas'] ?? ''),
        'active' => (bool) ($row['activo'] ?? 0),
        'lastRunAt' => to_iso_datetime($row['ultimo_ejecutado'] ?? null),
        'nextRunAt' => to_iso_datetime($row['proxima_ejecucion'] ?? null),
        'createdAt' => to_iso_datetime($row['creado_en'] ?? null),
        'updatedAt' => to_iso_datetime($row['actualizado_en'] ?? null),
    ];
}

function fetch_automations(int $empresaId): array
{
    $conn = db_connect();

    try {
        $stmt = $conn->prepare('SELECT uuid, id_empresa, nombre, modulo, formato, frecuencia, hora_ejecucion, dia_semana, dia_mes, notas, activo, ultimo_ejecutado, proxima_ejecucion, creado_en, actualizado_en FROM reportes_automatizados WHERE id_empresa = ? ORDER BY proxima_ejecucion IS NULL, proxima_ejecucion ASC, creado_en ASC');
        $stmt->bind_param('i', $empresaId);
        $stmt->execute();
        $result = $stmt->get_result();
        $automations = [];
        while ($row = $result->fetch_assoc()) {
            $automations[] = map_row($row);
        }
        $stmt->close();
        return $automations;
    } finally {
        $conn->close();
    }
}

function list_automations(): void
{
    $empresaId = isset($_GET['empresa']) ? (int) $_GET['empresa'] : 0;
    if ($empresaId <= 0) {
        respond_json(400, ['success' => false, 'message' => 'Debes indicar una empresa válida.']);
    }

    try {
        $automations = fetch_automations($empresaId);
    } catch (Throwable $exception) {
        respond_json(500, ['success' => false, 'message' => 'No se pudieron consultar las automatizaciones.']);
    }

    respond_json(200, ['success' => true, 'automations' => $automations]);
}

function sync_automations(): void
{
    $input = json_decode(file_get_contents('php://input') ?: 'null', true);
    if (!is_array($input)) {
        respond_json(400, ['success' => false, 'message' => 'Solicitud inválida.']);
    }

    $empresaId = isset($input['empresaId']) ? (int) $input['empresaId'] : 0;
    if ($empresaId <= 0) {
        respond_json(400, ['success' => false, 'message' => 'Debes indicar una empresa válida.']);
    }

    $rawAutomations = isset($input['automations']) && is_array($input['automations']) ? $input['automations'] : [];
    $normalized = [];

    $invalidModules = [];

    foreach ($rawAutomations as $automation) {
        if (!is_array($automation)) {
            continue;
        }

        $uuid = sanitize_uuid($automation['id'] ?? '');
        if ($uuid === '') {
            $uuid = bin2hex(random_bytes(12));
        }

        $name = trim((string) ($automation['name'] ?? ''));
        if ($name === '') {
            $name = 'Reporte automatizado';
        }

        $module = normalize_module_value($automation['module'] ?? null);
        if ($module === '') {
            $invalidModules[] = $name;
            continue;
        }

        $format = normalize_format($automation['format'] ?? null);
        $frequency = normalize_frequency($automation['frequency'] ?? null);
        $time = normalize_time($automation['time'] ?? null);
        $weekday = normalize_weekday($automation['weekday'] ?? null);
        $monthday = normalize_monthday($automation['monthday'] ?? null);
        $notes = trim((string) ($automation['notes'] ?? ''));
        if (function_exists('mb_substr')) {
            $notes = mb_substr($notes, 0, 240);
        } else {
            $notes = substr($notes, 0, 240);
        }
        $active = !empty($automation['active']) ? 1 : 0;
        $lastRunAt = to_mysql_datetime($automation['lastRunAt'] ?? null);
        $nextRunAt = to_mysql_datetime($automation['nextRunAt'] ?? null);
        $createdAt = to_mysql_datetime($automation['createdAt'] ?? null);

        $normalized[] = [
            'uuid' => $uuid,
            'name' => $name,
            'module' => $module,
            'format' => $format,
            'frequency' => $frequency,
            'time' => $time,
            'weekday' => $weekday,
            'monthday' => $monthday,
            'notes' => $notes,
            'active' => $active,
            'lastRunAt' => $lastRunAt,
            'nextRunAt' => $nextRunAt,
            'createdAt' => $createdAt,
        ];
    }

    if (!empty($invalidModules)) {
        $invalidNames = [];
        foreach ($invalidModules as $value) {
            $nameCandidate = trim((string) $value);
            if ($nameCandidate === '') {
                continue;
            }
            if (!in_array($nameCandidate, $invalidNames, true)) {
                $invalidNames[] = $nameCandidate;
            }
        }
        $label = count($invalidNames) > 1 ? 'automatizaciones' : 'automatización';
        $list = implode(', ', $invalidNames);
        respond_json(400, [
            'success' => false,
            'message' => "Selecciona un módulo válido para la {$label}: {$list}.",
        ]);
    }

    try {
        $conn = db_connect();
    } catch (Throwable $exception) {
        respond_json(500, ['success' => false, 'message' => 'No se pudo conectar a la base de datos.']);
    }

    try {
        $conn->begin_transaction();

        if (count($normalized) === 0) {
            $stmtDelete = $conn->prepare('DELETE FROM reportes_automatizados WHERE id_empresa = ?');
            $stmtDelete->bind_param('i', $empresaId);
            $stmtDelete->execute();
            $stmtDelete->close();
        } else {
            $placeholders = implode(',', array_fill(0, count($normalized), '?'));
            $stmtDelete = $conn->prepare("DELETE FROM reportes_automatizados WHERE id_empresa = ? AND uuid NOT IN ($placeholders)");
            $types = 'i' . str_repeat('s', count($normalized));
            $params = [$empresaId];
            foreach ($normalized as $item) {
                $params[] = $item['uuid'];
            }
            $stmtDelete->bind_param($types, ...$params);
            $stmtDelete->execute();
            $stmtDelete->close();
        }

        if (!empty($normalized)) {
            $stmt = $conn->prepare('INSERT INTO reportes_automatizados (uuid, id_empresa, nombre, modulo, formato, frecuencia, hora_ejecucion, dia_semana, dia_mes, notas, activo, ultimo_ejecutado, proxima_ejecucion, creado_en) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, NOW())) ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), modulo = VALUES(modulo), formato = VALUES(formato), frecuencia = VALUES(frecuencia), hora_ejecucion = VALUES(hora_ejecucion), dia_semana = VALUES(dia_semana), dia_mes = VALUES(dia_mes), notas = VALUES(notas), activo = VALUES(activo), ultimo_ejecutado = VALUES(ultimo_ejecutado), proxima_ejecucion = VALUES(proxima_ejecucion), actualizado_en = CURRENT_TIMESTAMP');

            $uuid = $name = $module = $format = $frequency = $time = $weekday = $monthday = $notes = $lastRunAt = $nextRunAt = $createdAt = null;
            $active = 0;

            $stmt->bind_param(
                'sisssssssissss',
                $uuid,
                $empresaId,
                $name,
                $module,
                $format,
                $frequency,
                $time,
                $weekday,
                $monthday,
                $notes,
                $active,
                $lastRunAt,
                $nextRunAt,
                $createdAt
            );

            foreach ($normalized as $item) {
                $uuid = $item['uuid'];
                $name = $item['name'];
                $module = $item['module'];
                $format = $item['format'];
                $frequency = $item['frequency'];
                $time = $item['time'];
                $weekday = $item['weekday'];
                $monthday = $item['monthday'];
                $notes = $item['notes'];
                $active = (int) $item['active'];
                $lastRunAt = $item['lastRunAt'];
                $nextRunAt = $item['nextRunAt'];
                $createdAt = $item['createdAt'];
                $stmt->execute();
            }

            $stmt->close();
        }

        $conn->commit();
    } catch (Throwable $exception) {
        $conn->rollback();
        $conn->close();
        respond_json(500, ['success' => false, 'message' => 'No se pudieron sincronizar las automatizaciones.']);
    }

    $conn->close();

    try {
        $automations = fetch_automations($empresaId);
    } catch (Throwable $exception) {
        respond_json(200, ['success' => true, 'automations' => []]);
    }

    respond_json(200, ['success' => true, 'automations' => $automations]);
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'OPTIONS') {
    header('Allow: GET, POST, OPTIONS');
    exit;
}

if ($method === 'GET') {
    list_automations();
}

if ($method === 'POST') {
    sync_automations();
}

http_response_code(405);
header('Allow: GET, POST, OPTIONS');
respond_json(405, ['success' => false, 'message' => 'Método no permitido.']);
