<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: application/json');

$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";

$conn = mysqli_connect($servername, $db_user, $db_pass, $database);
if (!$conn) {
    echo json_encode(["success" => false, "message" => "Error de conexión"]);
    exit;
}

$id_empresa     = $_POST['id_empresa'] ?? null;
$nombre_empresa = $_POST['nombre_empresa'] ?? null;
$sector_empresa = $_POST['sector_empresa'] ?? null;

if (!$id_empresa || !$nombre_empresa || !$sector_empresa) {
    echo json_encode(['success' => false, 'message' => 'Faltan datos obligatorios']);
    exit;
}

// Obtener logo actual si existe
$stmt = $conn->prepare("SELECT logo_empresa FROM empresa WHERE id_empresa = ?");
$stmt->bind_param("i", $id_empresa);
$stmt->execute();
$stmt->bind_result($logo_actual);
$stmt->fetch();
$stmt->close();

$logo_empresa = $logo_actual;

// Si llega un archivo nuevo
if (isset($_FILES['logo_empresa']) && $_FILES['logo_empresa']['error'] === UPLOAD_ERR_OK) {
    $destDir = '../../../images/logos/';
    if (!is_dir($destDir)) {
        mkdir($destDir, 0755, true);
    }

    $allowed = ['jpg', 'jpeg', 'png', 'gif'];
    $ext = strtolower(pathinfo($_FILES['logo_empresa']['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, $allowed)) {
        echo json_encode(['success' => false, 'message' => 'Formato de logo no permitido']);
        exit;
    }

    $filename = 'logo_' . $id_empresa . '_' . time() . '.' . $ext;
    $path = $destDir . $filename;
    if (!move_uploaded_file($_FILES['logo_empresa']['tmp_name'], $path)) {
        echo json_encode(['success' => false, 'message' => 'Error al subir el logo']);
        exit;
    }
    $logo_empresa = 'images/logos/' . $filename;
}

try {
    $stmt = $conn->prepare("UPDATE empresa SET nombre_empresa = ?, logo_empresa = ?, sector_empresa = ? WHERE id_empresa = ?");
    $stmt->bind_param("sssi", $nombre_empresa, $logo_empresa, $sector_empresa, $id_empresa);
    $stmt->execute();

    if ($stmt->affected_rows > 0) {
        $resp = ['success' => true, 'message' => 'Empresa actualizada'];
        if ($logo_empresa !== $logo_actual) {
            $resp['logo_empresa'] = $logo_empresa;
        }
        echo json_encode($resp);
    } else {
        echo json_encode(['success' => false, 'message' => 'No se actualizó ningún dato']);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}
?>
