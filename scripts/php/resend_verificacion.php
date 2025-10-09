<?php
header('Content-Type: application/json');
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/log_utils.php';

$response = ["success" => false, "message" => ""];

try {
    $data = json_decode(file_get_contents("php://input"), true);
    $email = $data['email'] ?? null;

    if (!$email) {
        throw new Exception("Correo no proporcionado.");
    }

    $servername = "localhost";
    $db_user    = "u296155119_Admin";
    $db_pass    = "4Dmin123o";
    $database   = "u296155119_OptiStock";

    $conn = mysqli_connect($servername, $db_user, $db_pass, $database);
    if (!$conn) {
        throw new Exception('Error de conexión a la base de datos.');
    }

    $stmt = $conn->prepare("SELECT id_usuario, nombre FROM usuario WHERE correo = ?");
    $stmt->bind_param('s', $email);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows === 0) {
        throw new Exception('El correo no está registrado.');
    }
    $usuario = $result->fetch_assoc();
    $userId = (int) $usuario['id_usuario'];
    $nombreUsuario = $usuario['nombre'] ?? null;

    $updateVerificacion = $conn->prepare("UPDATE usuario SET verificacion_cuenta = 1 WHERE id_usuario = ?");
    if ($updateVerificacion) {
        $updateVerificacion->bind_param('i', $userId);
        $updateVerificacion->execute();
        $updateVerificacion->close();
    }

    registrarLog($conn, $userId, 'Usuarios', 'Verificación marcada manualmente (sin envío de correo)');

    $response["success"] = true;
    $response["message"] = "La verificación por correo está deshabilitada. Tu cuenta se marcó como verificada automáticamente.";
} catch (Exception $e) {
    $response["success"] = false;
    $response["message"] = $e->getMessage();
} finally {
    echo json_encode($response);
}

