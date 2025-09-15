<?php
header('Content-Type: application/json');

require_once __DIR__ . '/log_utils.php';

$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";

$conn = mysqli_connect($servername, $db_user, $db_pass, $database);
if (!$conn) {
    echo json_encode(["success" => false, "message" => "Error de conexión a la base de datos."]);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$token = $data['token'] ?? '';
$newPassword = $data['password'] ?? '';

if (empty($token) || empty($newPassword)) {
    echo json_encode(['success' => false, 'message' => 'Token y contraseña son obligatorios.']);
    exit;
}

$query = $conn->prepare("SELECT id_usuario FROM pass_resets WHERE token = ? AND expira > NOW()");
$query->bind_param("s", $token);
$query->execute();
$result = $query->get_result();

if ($result->num_rows === 0) {
    echo json_encode(['success' => false, 'message' => 'El enlace de recuperación es inválido o ha expirado.']);
    exit;
}

$user = $result->fetch_assoc();
$userId = (int) $user['id_usuario'];

$hashedPassword = password_hash($newPassword, PASSWORD_BCRYPT);
$update = $conn->prepare("UPDATE usuario SET contrasena = ? WHERE id_usuario = ?");
$update->bind_param("si", $hashedPassword, $userId);
$update->execute();

$delete = $conn->prepare("DELETE FROM pass_resets WHERE token = ?");
$delete->bind_param("s", $token);
$delete->execute();

registrarLog($conn, $userId, 'Usuarios', 'Restablecimiento de contraseña mediante token');

echo json_encode(['success' => true, 'message' => 'Contraseña restablecida con éxito.']);


