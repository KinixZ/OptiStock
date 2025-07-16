<?php
$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";

$conn = mysqli_connect($servername, $db_user, $db_pass, $database);
if (!$conn) {
    echo json_encode(["success" => false, "message" => "Error de conexión"]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);

$id_empresa = $data['id_empresa'] ?? null;
$nombre_empresa = $data['nombre_empresa'] ?? null;
$logo_empresa = $data['logo_empresa'] ?? null; // URL o path
$sector_empresa = $data['sector_empresa'] ?? null;

if (!$id_empresa || !$nombre_empresa || !$sector_empresa) {
    echo json_encode(['success' => false, 'message' => 'Faltan datos obligatorios']);
    exit;
}

try {
    $stmt = $conn->prepare("UPDATE empresa SET nombre_empresa = ?, logo_empresa = ?, sector_empresa = ? WHERE id_empresa = ?");
    $stmt->bind_param("sssi", $nombre_empresa, $logo_empresa, $sector_empresa, $id_empresa);
    $stmt->execute();

    if ($stmt->affected_rows > 0) {
        echo json_encode(['success' => true, 'message' => 'Empresa actualizada']);
    } else {
        echo json_encode(['success' => false, 'message' => 'No se actualizó ningún dato']);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error: '.$e->getMessage()]);
}
