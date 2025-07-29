<?php
header("Content-Type: application/json");

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";

try {
    $conn = new mysqli($servername, $db_user, $db_pass, $database);
    $conn->set_charset('utf8mb4');
} catch (mysqli_sql_exception $e) {
    echo json_encode(["success" => false, "message" => "DB fail"]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);
$id_empresa = intval($data['id_empresa']);

$sql = "SELECT u.id_usuario, u.nombre, u.apellido, u.correo, u.rol, u.telefono, u.fecha_nacimiento
        FROM usuario u
        INNER JOIN usuario_empresa ue ON u.id_usuario = ue.id_usuario
        WHERE ue.id_empresa = ? AND u.rol != 'Administrador'";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $id_empresa);
$stmt->execute();
$result = $stmt->get_result();

$usuarios = [];
while ($row = $result->fetch_assoc()) {
    $usuarios[] = $row;
}
echo json_encode(["success" => true, "usuarios" => $usuarios]);
