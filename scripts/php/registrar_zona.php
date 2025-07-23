<?php
header("Content-Type: application/json");
require_once "../../config/conexion.php";

$data = json_decode(file_get_contents("php://input"));

$nombre = $data->zoneName ?? '';
$id_area = $data->zoneArea ?? null;
$ancho = $data->zoneWidth ?? 0;
$alto = $data->zoneHeight ?? 0;
$largo = $data->zoneLength ?? 0;
$subniveles = $data->sublevelsCount ?? 0;
$tipo = $data->storageType ?? '';

if (!$nombre || !$id_area || !$ancho || !$alto || !$largo || !$tipo) {
    echo json_encode(["success" => false, "message" => "Faltan datos requeridos."]);
    exit;
}

$stmt = $conn->prepare("INSERT INTO zona (nombre, id_area, ancho, alto, largo, subniveles, tipo_almacenamiento) VALUES (?, ?, ?, ?, ?, ?, ?)");
$stmt->bind_param("sidddis", $nombre, $id_area, $ancho, $alto, $largo, $subniveles, $tipo);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Zona registrada con éxito."]);
} else {
    echo json_encode(["success" => false, "message" => "Error al registrar zona."]);
}

$stmt->close();
$conn->close();
