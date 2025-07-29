<?php
header("Content-Type: application/json");
// Conexión a la base de datos (se usan las mismas credenciales que en otros scripts)
$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";

$conn = mysqli_connect($servername, $db_user, $db_pass, $database);
if (!$conn) {
    echo json_encode(["success" => false, "message" => "Error de conexión"]);
    exit;
}
$data = json_decode(file_get_contents('php://input'), true);
$empresaId = intval($data['id_empresa'] ?? 0);
$resultado = [];

if ($empresaId) {
    $stmtAreas = $conn->prepare('SELECT * FROM areas WHERE id_empresa = ? ORDER BY id DESC');
    $stmtAreas->bind_param('i', $empresaId);
    $stmtAreas->execute();
    $areas = $stmtAreas->get_result();
} else {
    $areas = $conn->query('SELECT * FROM areas ORDER BY id DESC');
}
while ($area = $areas->fetch_assoc()) {
    $area_id = $area['id'];
    $zonas = [];

    // Obtener zonas asociadas a la área
    if ($empresaId) {
        $zonas_query = $conn->prepare('SELECT * FROM zonas WHERE area_id = ? AND id_empresa = ?');
        $zonas_query->bind_param('ii', $area_id, $empresaId);
    } else {
        $zonas_query = $conn->prepare('SELECT * FROM zonas WHERE area_id = ?');
        $zonas_query->bind_param('i', $area_id);
    }
    $zonas_query->execute();
    $res = $zonas_query->get_result();
    while ($zona = $res->fetch_assoc()) {
        $zonas[] = $zona;
    }

    $resultado[] = [
        "area" => $area,
        "zonas" => $zonas
    ];
}

echo json_encode(["success" => true, "data" => $resultado]);
$conn->close();
