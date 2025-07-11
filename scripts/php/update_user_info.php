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

// Conexión DB
$servername = "localhost";
$db_user = "tu_usuario";
$db_pass = "tu_contraseña";
$database = "tu_basededatos";

$conn = new mysqli($servername, $db_user, $db_pass, $database);
if ($conn->connect_error) {
    echo json_encode(['success' => false, 'message' => 'Error de conexión']);
    exit;
}

if ($contrasena && strlen($contrasena) > 0) {
    $contrasena_hash = sha1($contrasena); // como tú usas sha1
    $sql = "UPDATE usuario SET nombre=?, apellido=?, telefono=?, contrasena=? WHERE id_usuario=?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ssssi", $nombre, $apellido, $telefono, $contrasena_hash, $id_usuario);
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
