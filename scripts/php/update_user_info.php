<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['id_usuario'])) {
    echo json_encode(['success' => false, 'message' => 'No autenticado']);
    exit;
}

$id_usuario = $_SESSION['id_usuario'];

$data = json_decode(file_get_contents('php://input'), true);

$nombre = $data['nombre'] ?? null;
$apellido = $data['apellido'] ?? null;
$telefono = $data['telefono'] ?? null;
$contrasena = $data['contrasena'] ?? null; // puede venir vacío

if (!$nombre || !$apellido || !$telefono) {
    echo json_encode(['success' => false, 'message' => 'Faltan datos']);
    exit;
}

// Conexión a la base de datos
$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";

$conn = mysqli_connect($servername, $db_user, $db_pass, $database);
if (!$conn) {
    echo json_encode(["success" => false, "message" => "Error de conexión a la base de datos."]);
    exit;
}

$foto_perfil = $data['foto_perfil'] ?? null;

if ($contrasena && strlen($contrasena) > 0) {
    $sql = "UPDATE usuario SET nombre=?, apellido=?, telefono=?, contrasena=?, foto_perfil=? WHERE id_usuario=?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("sssssi", $nombre, $apellido, $telefono, $contrasena_hash, $foto_perfil, $id_usuario);
} else if ($foto_perfil) {
    $sql = "UPDATE usuario SET nombre=?, apellido=?, telefono=?, foto_perfil=? WHERE id_usuario=?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ssssi", $nombre, $apellido, $telefono, $foto_perfil, $id_usuario);
} else {
    $sql = "UPDATE usuario SET nombre=?, apellido=?, telefono=? WHERE id_usuario=?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("sssi", $nombre, $apellido, $telefono, $id_usuario);
}

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Datos actualizados']);
} else {
    echo json_encode(['success' => false, 'message' => 'Error al actualizar']);
}

$stmt->close();
$conn->close();
?>
