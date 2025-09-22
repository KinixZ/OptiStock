<?php
header('Content-Type: application/json');

$empresaId = isset($_GET['id_empresa']) ? (int) $_GET['id_empresa'] : 0;
if ($empresaId <= 0) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'El parámetro id_empresa es obligatorio.'
    ]);
    exit;
}

$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";

$conn = new mysqli($servername, $db_user, $db_pass, $database);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error de conexión con la base de datos.'
    ]);
    exit;
}

$sql = "
    SELECT
        m.id,
        m.tipo,
        m.cantidad,
        m.fecha_movimiento,
        m.producto_id,
        p.nombre AS producto_nombre,
        p.stock  AS stock_actual,
        z.nombre AS zona_nombre,
        a.nombre AS area_nombre,
        u.nombre AS usuario_nombre,
        u.apellido AS usuario_apellido
    FROM movimientos m
    LEFT JOIN productos p ON m.producto_id = p.id
    LEFT JOIN zonas z ON p.zona_id = z.id
    LEFT JOIN areas a ON z.area_id = a.id
    LEFT JOIN usuario u ON m.id_usuario = u.id_usuario
    WHERE m.empresa_id = ?
    ORDER BY m.fecha_movimiento DESC
    LIMIT 12
";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'No se pudo preparar la consulta de movimientos.'
    ]);
    $conn->close();
    exit;
}

$stmt->bind_param('i', $empresaId);
$stmt->execute();
$result = $stmt->get_result();

$movimientos = [];
while ($row = $result->fetch_assoc()) {
    $movimientos[] = $row;
}

$stmt->close();
$conn->close();

echo json_encode([
    'success' => true,
    'movimientos' => $movimientos
]);
