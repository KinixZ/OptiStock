<?php
header("Content-Type: application/json");
require_once "../../config/conexion.php"; // ajusta si tu conexión está en otro lugar

$data = json_decode(file_get_contents("php://input"));
$nombre = $data->areaName ?? '';

if (!$nombre) {
    echo json_encode(["success" => false, "message" => "Nombre de área requerido."]);
    exit;
}

$stmt = $conn->prepare("INSERT INTO area (nombre) VALUES (?)");
$stmt->bind_param("s", $nombre);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Área registrada con éxito."]);
} else {
    echo json_encode(["success" => false, "message" => "Error al registrar área."]);
}

$stmt->close();
$conn->close();
