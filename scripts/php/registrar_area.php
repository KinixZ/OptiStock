<?php
session_start();
header("Content-Type: application/json");

$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";

$conn = mysqli_connect($servername, $db_user, $db_pass, $database);
if (!$conn) {
    echo json_encode(["success" => false, "message" => "Error de conexión"]);
    exit;
}

require_once __DIR__ . '/log_utils.php';

$data   = json_decode(file_get_contents("php://input"));
$nombre = $data->areaName ?? '';

if (!$nombre) {
    echo json_encode(["success" => false, "message" => "Nombre de área requerido."]);
    exit;
}

$stmt = $conn->prepare("INSERT INTO areas (nombre) VALUES (?)");
$stmt->bind_param("s", $nombre);

if ($stmt->execute()) {
    registrarLog($conn, $_SESSION['usuario_id'] ?? 0, 'Áreas', "Creación de área: $nombre");
    echo json_encode(["success" => true, "message" => "Área registrada con éxito."]);
} else {
    echo json_encode(["success" => false, "message" => "Error al registrar área."]);
}

$stmt->close();
$conn->close();
