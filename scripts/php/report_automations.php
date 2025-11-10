<?php
// scripts/php/report_automations.php
// Gestiona la configuración de automatizaciones de reportes en la base de datos.

declare(strict_types=1);

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

const DB_SERVER = 'localhost';
const DB_USER = 'u296155119_Admin';
const DB_PASSWORD = '4Dmin123o';
const DB_NAME = 'u296155119_OptiStock';

require_once __DIR__ . '/automation_runtime.php';
require_once __DIR__ . '/solicitudes_utils.php';

if (!defined('AUTOMATION_MODULE_VALUES')) {
    define('AUTOMATION_MODULE_VALUES', [
        'inventario',
        'usuarios',
        'areas_zonas',
        'ingresos/egresos',
        'ingresos',
        'egresos',
        'registro_actividades',
        'solicitudes',
        'accesos',
    ]);
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

function normalize_automation_for_comparison(array $automation): array
{
    $id = (string)($automation['id'] ?? $automation['uuid'] ?? '');
    $name = trim((string)($automation['name'] ?? ''));
    $module = normalize_module_value($automation['module'] ?? '');
    $format = strtolower((string)($automation['format'] ?? 'pdf')) === 'excel' ? 'excel' : 'pdf';
    $frequency = normalize_frequency($automation['frequency'] ?? null);

    $rawTime = (string)($automation['time'] ?? '08:00');
    if (preg_match('/^(\d{1,2}):(\d{1,2})/', $rawTime, $matches)) {
        $hours = max(0, min(23, (int)$matches[1]));
        $minutes = max(0, min(59, (int)$matches[2]));
        $time = sprintf('%02d:%02d', $hours, $minutes);
    } else {
        $time = '08:00';
    }

    $weekdayRaw = $automation['weekday'] ?? null;
    $weekday = ($weekdayRaw === '' || $weekdayRaw === null)
        ? null
        : max(0, min(6, (int)$weekdayRaw));

    $monthdayRaw = $automation['monthday'] ?? null;
    $monthday = ($monthdayRaw === '' || $monthdayRaw === null)
        ? null
        : max(1, min(31, (int)$monthdayRaw));

    $notes = trim((string)($automation['notes'] ?? ''));
    if (function_exists('mb_substr')) {
        $notes = mb_substr($notes, 0, 240);
    } else {
        $notes = substr($notes, 0, 240);
    }

    $active = !empty($automation['active']);

    return [
        'id' => $id,
        'name' => $name,
        'module' => $module,
        'format' => $format,
        'frequency' => $frequency,
        'time' => $time,
        'weekday' => $weekday,
        'monthday' => $monthday,
        'notes' => $notes,
        'active' => $active,
    ];
}

function format_time_label(string $time): string
{
    if (preg_match('/^(\d{1,2}):(\d{1,2})/', $time, $matches)) {
        $hours = max(0, min(23, (int)$matches[1]));
        $minutes = max(0, min(59, (int)$matches[2]));
        return sprintf('%02d:%02d', $hours, $minutes);
    }
    return '08:00';
}

function format_automation_frequency_label(array $automation): string
{
    $frequency = strtolower((string)($automation['frequency'] ?? 'daily'));
    $timeLabel = format_time_label($automation['time'] ?? '08:00');

    switch ($frequency) {
        case 'weekly':
            $weekday = isset($automation['weekday']) ? (int)$automation['weekday'] : 1;
            return 'Semanal · ' . weekday_name($weekday) . ' · ' . $timeLabel;
        case 'biweekly':
            $day = isset($automation['monthday']) ? (int)$automation['monthday'] : 1;
            return 'Quincenal · Día ' . max(1, $day) . ' · ' . $timeLabel;
        case 'monthly':
            $day = isset($automation['monthday']) ? (int)$automation['monthday'] : 1;
            return 'Mensual · Día ' . max(1, $day) . ' · ' . $timeLabel;
        default:
            return 'Diario · ' . $timeLabel;
    }
}

function format_automation_filters(array $automation): string
{
    $parts = [];
    $moduleLabel = resolve_module_label($automation['module'] ?? '');
    if ($moduleLabel !== '') {
        $parts[] = 'Módulo: ' . $moduleLabel;
    }

    $format = strtolower((string)($automation['format'] ?? 'pdf')) === 'excel' ? 'Excel' : 'PDF';
    $parts[] = 'Formato: ' . $format;

    $parts[] = 'Frecuencia: ' . format_automation_frequency_label($automation);

    if (!empty($automation['notes'])) {
        $parts[] = 'Notas: ' . $automation['notes'];
    }

    $parts[] = 'Estado: ' . (!empty($automation['active']) ? 'Activa' : 'Pausada');

    return implode(' · ', $parts);
}

function map_difference_label(string $field): string
{
    switch ($field) {
        case 'name':
            return 'Nombre';
        case 'module':
            return 'Módulo';
        case 'format':
            return 'Formato';
        case 'frequency':
            return 'Frecuencia';
        case 'time':
            return 'Hora';
        case 'weekday':
            return 'Día de la semana';
        case 'monthday':
            return 'Día del mes';
        case 'notes':
            return 'Notas';
        case 'active':
            return 'Estado';
        default:
            return ucfirst($field);
    }
}

function format_difference_value(string $field, $value): string
{
    switch ($field) {
        case 'module':
            return resolve_module_label($value ?? '');
        case 'format':
            return strtolower((string)$value) === 'excel' ? 'Excel' : 'PDF';
        case 'frequency':
            $labels = [
                'daily' => 'Diario',
                'weekly' => 'Semanal',
                'biweekly' => 'Quincenal',
                'monthly' => 'Mensual',
            ];
            return $labels[strtolower((string)$value)] ?? ucfirst((string)$value);
        case 'time':
            return format_time_label((string)$value);
        case 'weekday':
            return $value === null ? '—' : weekday_name((int)$value);
        case 'monthday':
            return $value === null ? '—' : 'Día ' . (int)$value;
        case 'notes':
            $text = trim((string)$value);
            return $text === '' ? 'Sin notas' : $text;
        case 'active':
            return !empty($value) ? 'Activa' : 'Pausada';
        case 'name':
        default:
            return (string)$value;
    }
}

function describe_field_differences(array $differences): string
{
    if (empty($differences)) {
        return '';
    }
    $parts = [];
    foreach ($differences as $field => $change) {
        $before = $change['before'] ?? null;
        $after = $change['after'] ?? null;
        $label = map_difference_label($field);
        $parts[] = sprintf(
            '%s (%s → %s)',
            $label,
            format_difference_value($field, $before),
            format_difference_value($field, $after)
        );
    }
    return implode('; ', $parts);
}

function compute_automation_changes(array $current, array $proposed): array
{
    $currentMap = [];
    foreach ($current as $entry) {
        $normalized = normalize_automation_for_comparison($entry);
        if ($normalized['id'] !== '') {
            $currentMap[$normalized['id']] = $normalized;
        }
    }

    $changes = [];
    $processedIds = [];

    foreach ($proposed as $entry) {
        $normalized = normalize_automation_for_comparison($entry);
        $id = $normalized['id'];
        if ($id === '') {
            $id = sanitize_uuid('auto-' . bin2hex(random_bytes(6)));
            $normalized['id'] = $id;
        }

        $processedIds[] = $id;

        if (!isset($currentMap[$id])) {
            $changes[] = [
                'action' => 'create',
                'automation' => $normalized,
            ];
            continue;
        }

        $existing = $currentMap[$id];
        $differences = [];
        foreach (['name', 'module', 'format', 'frequency', 'time', 'weekday', 'monthday', 'notes', 'active'] as $field) {
            $before = $existing[$field];
            $after = $normalized[$field];
            if ($field === 'notes') {
                $before = trim((string)$before);
                $after = trim((string)$after);
            }
            if ($before === $after) {
                continue;
            }
            $differences[$field] = [
                'before' => $before,
                'after' => $after,
            ];
        }

        if (!empty($differences)) {
            $changes[] = [
                'action' => 'update',
                'automation' => $normalized,
                'previous' => $existing,
                'differences' => $differences,
            ];
        }
    }

    foreach ($currentMap as $id => $existing) {
        if (!in_array($id, $processedIds, true)) {
            $changes[] = [
                'action' => 'delete',
                'automation' => $existing,
            ];
        }
    }

    return $changes;
}

function describe_automation_change(array $change): string
{
    $automation = $change['automation'] ?? [];
    $name = trim((string)($automation['name'] ?? ''));
    $label = $name !== '' ? '"' . $name . '"' : 'reporte automático';
    $filters = format_automation_filters($automation);

    switch ($change['action']) {
        case 'create':
            return 'Nuevo: ' . $label . ' — ' . $filters;
        case 'update':
            $differences = describe_field_differences($change['differences'] ?? []);
            $description = 'Actualizar: ' . $label . ' — ' . $filters;
            if ($differences) {
                $description .= ' (Cambios: ' . $differences . ')';
            }
            return $description;
        case 'delete':
            return 'Eliminar: ' . $label . ' — ' . $filters;
        default:
            return $filters;
    }
}

function build_automation_request_summary(array $changes): array
{
    if (empty($changes)) {
        return [
            'summary' => 'Actualización de automatizaciones de reportes',
            'description' => 'No se detectaron cambios en las automatizaciones.',
            'userMessage' => 'No se detectaron cambios en las automatizaciones.',
        ];
    }

    $first = $changes[0];
    $automation = $first['automation'] ?? [];
    $name = trim((string)($automation['name'] ?? ''));
    $displayName = $name !== '' ? '"' . $name . '"' : 'reporte automático';

    if (count($changes) === 1) {
        switch ($first['action']) {
            case 'create':
                $summary = 'Programar reporte automático ' . $displayName;
                $userMessage = 'Tu solicitud para programar el reporte automático ' . $displayName . ' fue enviada para revisión.';
                break;
            case 'update':
                $summary = 'Actualizar reporte automático ' . $displayName;
                $userMessage = 'Tu solicitud para actualizar el reporte automático ' . $displayName . ' fue enviada para revisión.';
                break;
            case 'delete':
                $summary = 'Eliminar reporte automático ' . $displayName;
                $userMessage = 'Tu solicitud para eliminar el reporte automático ' . $displayName . ' fue enviada para revisión.';
                break;
            default:
                $summary = 'Actualizar automatizaciones de reportes';
                $userMessage = 'Tu solicitud para actualizar las automatizaciones fue enviada para revisión.';
                break;
        }
    } else {
        $summary = 'Actualizar automatizaciones de reportes (' . count($changes) . ' cambios)';
        $userMessage = 'Tu solicitud para actualizar las automatizaciones de reportes fue enviada para revisión.';
    }

    $descriptionLines = array_map(static function ($change) {
        return '• ' . describe_automation_change($change);
    }, $changes);
    $description = "Cambios solicitados:\n" . implode("\n", $descriptionLines);

    return [
        'summary' => $summary,
        'description' => $description,
        'userMessage' => $userMessage,
    ];
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

    $requestsEnabled = opti_solicitudes_habilitadas($conn);
    $isAdmin = opti_usuario_actual_es_admin();

    if (!$isAdmin && $requestsEnabled) {
        $currentAutomations = opti_obtener_reportes_automatizados($conn, $empresaId);
        $changes = compute_automation_changes($currentAutomations, $normalized);

        if (empty($changes)) {
            $conn->close();
            respond_json(200, [
                'success' => true,
                'requiresApproval' => false,
                'message' => 'No se detectaron cambios en las automatizaciones.',
                'automations' => $currentAutomations,
            ]);
        }

        $summary = build_automation_request_summary($changes);
        $solicitud = opti_registrar_solicitud($conn, [
            'id_empresa' => $empresaId,
            'modulo' => 'Reportes automáticos',
            'tipo_accion' => 'reportes_automatizados_sync',
            'resumen' => $summary['summary'],
            'descripcion' => $summary['description'],
            'payload' => [
                'empresa_id' => $empresaId,
                'automations' => $normalized,
                'changes' => $changes,
            ],
        ]);

        if (empty($solicitud['success'])) {
            $conn->close();
            respond_json(500, ['success' => false, 'message' => $solicitud['message'] ?? 'No se pudo registrar la solicitud.']);
        }

        $response = [
            'success' => true,
            'requiresApproval' => true,
            'message' => $summary['userMessage'],
            'automations' => $currentAutomations,
        ];
        if (!empty($solicitud['id'])) {
            $response['requestId'] = $solicitud['id'];
        }

        $conn->close();
        respond_json(200, $response);
    }

    $resultado = opti_sync_reportes_automatizados($conn, $empresaId, $normalized);
    if (empty($resultado['success'])) {
        $conn->close();
        respond_json(500, ['success' => false, 'message' => $resultado['message'] ?? 'No se pudieron sincronizar las automatizaciones.']);
    }

    $automations = $resultado['automations'] ?? [];
    $conn->close();

    respond_json(200, [
        'success' => true,
        'automations' => $automations,
        'requiresApproval' => false,
    ]);
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
