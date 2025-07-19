<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $stmt = $conn->prepare("SELECT * FROM zonas");
        $stmt->execute();
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        break;
        
    case 'POST':
        $data = json_decode(file_get_contents("php://input"), true);
        $stmt = $conn->prepare("INSERT INTO zonas (nombre, area_id) VALUES (?, ?)");
        $stmt->execute([$data['nombre'], $data['area_id']]);
        echo json_encode(['id' => $conn->lastInsertId()]);
        break;
}
?>