<?php
// scripts/php/automations.php
declare(strict_types=1);
require_once __DIR__ . '/report_history.php';

function respond(array $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

try {
    $conn = db_connect();
} catch (Throwable $e) {
    respond(['success' => false, 'message' => 'No se pudo conectar a la base de datos.'], 500);
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$input = json_decode(file_get_contents('php://input') ?: 'null', true) ?: [];

if ($method === 'GET') {
    // list automatizaciones for empresa
    $empresa = isset($_GET['empresa']) ? (int) $_GET['empresa'] : 0;
    $stmt = $conn->prepare('SELECT * FROM automatizaciones WHERE id_empresa = ? ORDER BY next_run_at IS NULL, next_run_at ASC');
    $stmt->bind_param('i', $empresa);
    $stmt->execute();
    $res = $stmt->get_result();
    $items = [];
    while ($row = $res->fetch_assoc()) {
        $items[] = $row;
    }
    $stmt->close();
    $conn->close();
    respond(['success' => true, 'automations' => $items]);
}

if ($method === 'POST') {
    $action = $_GET['action'] ?? 'upsert';

    if ($action === 'delete') {
        $id = isset($input['id']) ? (string) $input['id'] : '';
        if ($id === '') {
            respond(['success' => false, 'message' => 'id inválido'], 400);
        }
        $stmt = $conn->prepare('DELETE FROM automatizaciones WHERE id = ?');
        $stmt->bind_param('s', $id);
        $stmt->execute();
        $stmt->close();
        $conn->close();
        respond(['success' => true]);
    }

    // Upsert automation
    $id = isset($input['id']) && is_string($input['id']) && $input['id'] !== '' ? $input['id'] : bin2hex(random_bytes(8));
    $empresa = isset($input['empresaId']) ? (int) $input['empresaId'] : 0;
    $name = isset($input['name']) ? (string) $input['name'] : 'Reporte automatizado';
    $module = isset($input['module']) ? (string) $input['module'] : '';
    $format = isset($input['format']) && $input['format'] === 'excel' ? 'excel' : 'pdf';
    $frequency = isset($input['frequency']) ? (string) $input['frequency'] : 'daily';
    $weekday = isset($input['weekday']) ? (int) $input['weekday'] : 1;
    $monthday = isset($input['monthday']) ? (int) $input['monthday'] : 1;
    $time = isset($input['time']) ? (string) $input['time'] : '08:00';
    $notes = isset($input['notes']) ? (string) $input['notes'] : '';
    $active = isset($input['active']) ? (int) (bool) $input['active'] : 1;

    $nextRunAt = isset($input['nextRunAt']) && $input['nextRunAt'] !== '' ? to_mysql_datetime($input['nextRunAt']) : null;

    $stmt = $conn->prepare('REPLACE INTO automatizaciones (id, id_empresa, name, module, format, frequency, weekday, monthday, time, notes, active, next_run_at, last_run_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NOW(), NOW())');
    $stmt->bind_param('sisssiiiiisss', $id, $empresa, $name, $module, $format, $frequency, $weekday, $monthday, $time, $notes, $active, $nextRunAt);
    $stmt->execute();
    $stmt->close();
    $conn->close();

    respond(['success' => true, 'id' => $id]);
}

respond(['success' => false, 'message' => 'Método no permitido'], 405);
