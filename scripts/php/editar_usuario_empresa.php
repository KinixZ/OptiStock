<?php
session_start();
header('Content-Type: application/json');

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

require_once __DIR__ . '/log_utils.php';

// Obtener datos del request
$data = json_decode(file_get_contents("php://input"), true);

$id_usuario       = intval($data['id_usuario']);
$nombre           = $data['nombre'];
$apellido         = $data['apellido'];
$telefono         = $data['telefono'];
$fecha_nacimiento = $data['fecha_nacimiento'];
$rol              = $data['rol'];

if (!$id_usuario) {
    echo json_encode(["success" => false, "message" => "ID de usuario inválido."]);
    exit;
}

// Preparar UPDATE
$sql = "UPDATE usuario 
        SET nombre = ?, apellido = ?, telefono = ?, fecha_nacimiento = ?, rol = ?
        WHERE id_usuario = ?";

$stmt = $conn->prepare($sql);
$stmt->bind_param("sssssi", $nombre, $apellido, $telefono, $fecha_nacimiento, $rol, $id_usuario);

if ($stmt->execute()) {
    registrarLog($conn, $_SESSION['usuario_id'] ?? 0, 'Usuarios', "Edición de usuario empresa: $id_usuario");
    echo json_encode(["success" => true]);
} else {
    echo json_encode(["success" => false, "message" => "Error al actualizar el usuario."]);
}

$stmt->close();
$conn->close();
?>
