<?php
header("Content-Type: application/json");
require_once "../../config/conexion.php";

$resultado = [];

$areas = $conn->query("SELECT * FROM area ORDER BY id_area DESC");
while ($area = $areas->fetch_assoc()) {
    $area_id = $area['id_area'];
    $zonas = [];

    $zonas_query = $conn->prepare("SELECT * FROM zona WHERE id_area = ?");
    $zonas_query->bind_param("i", $area_id);
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
