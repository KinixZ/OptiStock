<?php
header('Content-Type: application/json');

$idEmpresa = isset($_GET['id_empresa']) ? (int) $_GET['id_empresa'] : 0;
$limite = isset($_GET['limite']) ? (int) $_GET['limite'] : 0;

if ($idEmpresa <= 0) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'El parámetro id_empresa es obligatorio.'
    ]);
    exit;
}

if ($limite <= 0 || $limite > 200) {
    $limite = 50;
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

$sql = "
    SELECT
        id,
        titulo,
        mensaje,
        prioridad,
        estado,
        tipo_destinatario,
        rol_destinatario,
        id_usuario_destinatario,
        ruta_destino,
        fecha_disponible_desde,
        fecha_expira,
        creado_en,
        actualizado_en
    FROM notificaciones
    WHERE id_empresa = ?
      AND estado <> 'Archivada'
    ORDER BY fecha_disponible_desde DESC
    LIMIT ?
";

$stmt = $conn->prepare($sql);

if (!$stmt) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'No se pudo preparar la consulta de historial.'
    ]);
    $conn->close();
    exit;
}

$stmt->bind_param('ii', $idEmpresa, $limite);

if (!$stmt->execute()) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'No se pudo ejecutar la consulta de historial.'
    ]);
    $stmt->close();
    $conn->close();
    exit;
}

$result = $stmt->get_result();
$notificaciones = [];

while ($row = $result->fetch_assoc()) {
    $notificaciones[] = $row;
}

$stmt->close();
$conn->close();

echo json_encode([
    'success' => true,
    'notifications' => $notificaciones,
    'total' => count($notificaciones)
]);
