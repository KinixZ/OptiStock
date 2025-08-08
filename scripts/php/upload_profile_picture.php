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

$usuario_id = $_POST['usuario_id'] ?? null;
if (!$usuario_id || !isset($_FILES['foto_perfil'])) {
    echo json_encode(['success' => false, 'message' => 'Datos incompletos']);
    exit;
}

$destDir = '../../../images/profiles/';
if (!is_dir($destDir)) {
    mkdir($destDir, 0755, true);
}

// Validar extensión
$allowed = ['jpg', 'jpeg', 'png', 'gif'];
$ext = strtolower(pathinfo($_FILES['foto_perfil']['name'], PATHINFO_EXTENSION));
if (!in_array($ext, $allowed)) {
    echo json_encode(['success' => false, 'message' => 'Formato no permitido']);
    exit;
}

// Renombrar archivo
$filename = 'perfil_' . $usuario_id . '_' . time() . '.' . $ext;
$path = $destDir . $filename;

if (!move_uploaded_file($_FILES['foto_perfil']['tmp_name'], $path)) {
    echo json_encode(['success' => false, 'message' => 'Error al subir la foto']);
    exit;
}

$ruta_bd = 'images/profiles/' . $filename;
$stmt = $conn->prepare("UPDATE usuario SET foto_perfil = ? WHERE id_usuario = ?");
$stmt->bind_param('si', $ruta_bd, $usuario_id);
$stmt->execute();

if ($stmt->affected_rows > 0) {
    echo json_encode(['success' => true, 'foto' => $ruta_bd]);
} else {
    echo json_encode(['success' => false, 'message' => 'No se actualizó la foto']);
}
?>