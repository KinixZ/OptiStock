<?php
header("Content-Type: application/json");

$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";
$conn = mysqli_connect($servername, $db_user, $db_pass, $database);
if (!$conn) {
    echo json_encode(["success" => false, "message" => "DB fail"]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);
$id_empresa = intval($data['id_empresa']);

$sql = "SELECT u.nombre, u.apellido, u.correo, u.rol
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
