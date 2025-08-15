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
    echo json_encode(["success" => false, "message" => "Error de conexión a la base de datos"]);
    exit;
}

$nombre_empresa  = $_POST['nombre_empresa']  ?? '';
$sector_empresa  = $_POST['sector_empresa']  ?? '';
$usuario_creador = $_POST['usuario_creador'] ?? '';

if (!$usuario_creador) {
    echo json_encode(["success" => false, "message" => "ID de usuario inválido"]);
    exit;
}

$logo_empresa = null;
if (isset($_FILES['logo_empresa']) && $_FILES['logo_empresa']['error'] === UPLOAD_ERR_OK) {
    $destDir = $_SERVER['DOCUMENT_ROOT'] . '/images/logos/';
    if (!is_dir($destDir)) mkdir($destDir, 0755, true);

    $allowed = ['jpg', 'jpeg', 'png', 'gif'];
    $ext = strtolower(pathinfo($_FILES['logo_empresa']['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, $allowed)) {
        echo json_encode(["success" => false, "message" => "Formato de logo no permitido"]);
        exit;
    }

    $filename = 'logo_' . time() . '.' . $ext;
    if (!move_uploaded_file($_FILES['logo_empresa']['tmp_name'], $destDir . $filename)) {
        echo json_encode(["success" => false, "message" => "Error al subir el logo"]);
        exit;
    }
    $logo_empresa = '/images/logos/' . $filename;   // ruta guardada en DB
}

$sql  = "INSERT INTO empresa (nombre_empresa, logo_empresa, sector_empresa, usuario_creador)
         VALUES (?, ?, ?, ?)";
$stmt = mysqli_prepare($conn, $sql);
mysqli_stmt_bind_param($stmt, "sssi", $nombre_empresa, $logo_empresa, $sector_empresa, $usuario_creador);

if (mysqli_stmt_execute($stmt)) {
    echo json_encode(["success" => true, "logo_empresa" => $logo_empresa]);
} else {
    echo json_encode(["success" => false, "message" => "Error: " . mysqli_error($conn)]);
}
mysqli_close($conn);
?>
