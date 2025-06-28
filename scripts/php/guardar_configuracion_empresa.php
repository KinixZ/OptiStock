<?php
header("Content-Type: application/json");

ini_set('display_errors', 1);
error_reporting(E_ALL);

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
$colorSidebar = $data['color_sidebar'] ?? '#1e1e2f';
$colorTopbar = $data['color_topbar'] ?? '#282c34';
$ordenSidebar = json_encode($data['orden_sidebar'] ?? []);

$query = "INSERT INTO configuracion_empresa (id_empresa, color_sidebar, color_topbar, orden_sidebar)
          VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
          color_sidebar = VALUES(color_sidebar),
          color_topbar = VALUES(color_topbar),
          orden_sidebar = VALUES(orden_sidebar)";

$stmt = $conn->prepare($query);

if (!$stmt) {
    echo json_encode(["success" => false, "message" => "Error en prepare: " . $conn->error]);
    exit;
}

$stmt->bind_param("isss", $id_empresa, $colorSidebar, $colorTopbar, $ordenSidebar);

if ($stmt->execute()) {
    echo json_encode(["success" => true]);
} else {
    echo json_encode(["success" => false, "message" => "Error al ejecutar: " . $stmt->error]);
}

?>
