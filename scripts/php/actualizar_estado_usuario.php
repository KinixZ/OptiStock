<?php
session_start();
header('Content-Type: application/json');

$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";

$conn = mysqli_connect($servername, $db_user, $db_pass, $database);

if (!$conn) {
    echo json_encode(["success" => false, "message" => "Error de conexión a la base de datos."]);
    exit;
}

mysqli_set_charset($conn, 'utf8mb4');

require_once __DIR__ . '/log_utils.php';

$data = json_decode(file_get_contents('php://input'), true);

$id_usuario = intval($data['id_usuario'] ?? 0);
$nuevoEstado = isset($data['activo']) ? intval($data['activo']) : null;
$id_empresa = intval($data['id_empresa'] ?? 0);

if (!$id_usuario || ($nuevoEstado !== 0 && $nuevoEstado !== 1) || !$id_empresa) {
    echo json_encode(["success" => false, "message" => "Datos incompletos para actualizar el estado."]);
    exit;
}

$sql = "UPDATE usuario u
        INNER JOIN usuario_empresa ue ON u.id_usuario = ue.id_usuario
        SET u.activo = ?
        WHERE u.id_usuario = ? AND ue.id_empresa = ?";

$stmt = $conn->prepare($sql);

if (!$stmt) {
    echo json_encode(["success" => false, "message" => "No se pudo preparar la consulta."]);
    exit;
}

$stmt->bind_param('iii', $nuevoEstado, $id_usuario, $id_empresa);

if ($stmt->execute()) {
    if ($stmt->affected_rows > 0) {
        $accion = $nuevoEstado === 1 ? 'Activación' : 'Desactivación';
        registrarLog($conn, $_SESSION['usuario_id'] ?? 0, 'Usuarios', "$accion de usuario empresa: $id_usuario");
        echo json_encode(["success" => true]);
    } else {
        echo json_encode(["success" => false, "message" => "No se encontró el usuario o el estado ya está aplicado."]);
    }
} else {
    echo json_encode(["success" => false, "message" => "No se pudo actualizar el estado del usuario."]);
}

$stmt->close();
$conn->close();
