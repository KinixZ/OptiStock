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

// Cambia aquí: usa $_POST y $_FILES
$id_empresa     = $_POST['id_empresa'] ?? null;
$nombre_empresa = $_POST['nombre_empresa'] ?? null;
$sector_empresa = $_POST['sector_empresa'] ?? null;

// Manejo de logo (opcional)
$logo_empresa = null;
if (isset($_FILES['logo_empresa']) && $_FILES['logo_empresa']['error'] == UPLOAD_ERR_OK) {
    $target = "uploads/" . basename($_FILES['logo_empresa']['name']);
    move_uploaded_file($_FILES['logo_empresa']['tmp_name'], $target);
    $logo_empresa = $target;
} else {
    // Si no se subió nuevo logo, puedes mantener el anterior (opcional)
    $logo_empresa = $_POST['logo_empresa'] ?? null;
}

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
?>