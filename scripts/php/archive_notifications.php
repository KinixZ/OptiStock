<?php
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Método no permitido. Usa POST.'
    ]);
    exit;
}

$payload = json_decode(file_get_contents('php://input'), true);

if (!is_array($payload)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Formato de solicitud no válido.'
    ]);
    exit;
}

$idEmpresa = isset($payload['id_empresa']) ? (int) $payload['id_empresa'] : 0;
$idsInput = isset($payload['notification_ids']) && is_array($payload['notification_ids'])
    ? $payload['notification_ids']
    : [];

if ($idEmpresa <= 0) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'El parámetro id_empresa es obligatorio.'
    ]);
    exit;
}

$ids = [];

foreach ($idsInput as $id) {
    $parsed = (int) $id;
    if ($parsed > 0) {
        $ids[] = $parsed;
    }
}

$ids = array_values(array_unique($ids));

if (empty($ids)) {
    echo json_encode([
        'success' => true,
        'archived' => 0,
        'message' => 'No se proporcionaron notificaciones para eliminar.'
    ]);
    exit;
}

$servername = 'localhost';
$dbUser = 'u296155119_Admin';
$dbPassword = '4Dmin123o';
$database = 'u296155119_OptiStock';

$conn = new mysqli($servername, $dbUser, $dbPassword, $database);

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'No se pudo conectar a la base de datos.'
    ]);
    exit;
}

$conn->set_charset('utf8mb4');

$placeholders = implode(',', array_fill(0, count($ids), '?'));
$sql = "
    DELETE FROM notificaciones
     WHERE id_empresa = ?
       AND id IN ($placeholders)
";

$stmt = $conn->prepare($sql);

if (!$stmt) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'No se pudo preparar la consulta para eliminar notificaciones.'
    ]);
    $conn->close();
    exit;
}

$types = str_repeat('i', count($ids) + 1);
$bindParams = [$types, &$idEmpresa];

foreach ($ids as $index => $value) {
    $bindParams[] = &$ids[$index];
}

call_user_func_array([$stmt, 'bind_param'], $bindParams);

if (!$stmt->execute()) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'No se pudieron eliminar las notificaciones.'
    ]);
    $stmt->close();
    $conn->close();
    exit;
}

$archived = $stmt->affected_rows;

$stmt->close();
$conn->close();

echo json_encode([
    'success' => true,
    'archived' => $archived
]);
