<?php
header("Content-Type: application/json");
$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";

$conn = mysqli_connect($servername, $db_user, $db_pass, $database);
if (!$conn) {
    echo json_encode(["success" => false, "message" => "Error de conexión a la base de datos."]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);
$id_empresa = intval($data['id_empresa']);

$query = "SELECT color_sidebar, color_topbar, orden_sidebar FROM configuracion_empresa WHERE id_empresa = ?";
$stmt = $conn->prepare($query);
$stmt->bind_param("i", $id_empresa);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    $config = $result->fetch_assoc();
    echo json_encode(["success" => true, "config" => $config]);
} else {
    echo json_encode(["success" => false, "message" => "No hay configuración registrada para esta empresa."]);
}
?>
