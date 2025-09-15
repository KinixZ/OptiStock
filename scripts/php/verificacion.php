<?php
session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/log_utils.php';

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['email'], $data['code'])) {
    echo json_encode(["success" => false, "message" => "Datos no válidos."]);
    exit;
}

$email = $data['email'];
$code  = $data['code'];

if (!isset($_SESSION['codigo_verificacion'], $_SESSION['correo_verificacion']) ||
    $_SESSION['codigo_verificacion'] != $code ||
    $_SESSION['correo_verificacion'] !== $email) {
    echo json_encode(["success" => false, "message" => "El código de verificación es incorrecto o ha expirado."]);
    exit;
}

$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";

$conn = mysqli_connect($servername, $db_user, $db_pass, $database);
if (!$conn) {
    echo json_encode(["success" => false, "message" => "Error de conexión"]);
    exit;
}

$stmtUsuario = $conn->prepare("SELECT id_usuario FROM usuario WHERE correo = ?");
$stmtUsuario->bind_param('s', $email);
$stmtUsuario->execute();
$resultUsuario = $stmtUsuario->get_result();
if ($resultUsuario->num_rows === 0) {
    echo json_encode(["success" => false, "message" => "Usuario no encontrado."]);
    exit;
}
$userRow = $resultUsuario->fetch_assoc();
$userId = (int) $userRow['id_usuario'];

$sql = "UPDATE usuario SET verificacion_cuenta = 1 WHERE correo = ?";
$stmt = mysqli_prepare($conn, $sql);
mysqli_stmt_bind_param($stmt, "s", $email);

if (mysqli_stmt_execute($stmt)) {
    unset($_SESSION['codigo_verificacion']);
    unset($_SESSION['correo_verificacion']);

    registrarLog($conn, $userId, 'Usuarios', 'Verificación de cuenta completada');

    echo json_encode(["success" => true, "message" => "Tu cuenta ha sido verificada exitosamente."]);
} else {
    echo json_encode(["success" => false, "message" => "Error al verificar la cuenta."]);
}

