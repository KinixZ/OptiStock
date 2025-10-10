<?php
header('Content-Type: application/json');
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/log_utils.php';
require_once __DIR__ . '/mail_utils.php';

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

    $stmt = $conn->prepare("SELECT id_usuario FROM usuario WHERE correo = ?");
    $stmt->bind_param('s', $email);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows === 0) {
        throw new Exception('El correo no está registrado.');
    }
    $usuario = $result->fetch_assoc();
    $userId = (int) $usuario['id_usuario'];

    $codigo_verificacion = mt_rand(100000, 999999);

    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    $_SESSION['codigo_verificacion'] = $codigo_verificacion;
    $_SESSION['correo_verificacion'] = $email;

    $mail_subject = "OPTISTOCK - Reenvío de Código de Verificación";
    $mail_message = "Hola de nuevo. tu código de verificación es: $codigo_verificacion";
    if (!enviarCorreo($email, $mail_subject, $mail_message)) {
        $detalleCorreo = obtenerUltimoErrorCorreo();
        if ($detalleCorreo) {
            throw new Exception("Error al enviar el correo de verificación. Detalle: " . $detalleCorreo);
        }
        throw new Exception("Error al enviar el correo de verificación.");
    }

    registrarLog($conn, $userId, 'Usuarios', 'Reenvío de código de verificación de cuenta');

    $response["success"] = true;
    $response["message"] = "El código de verificación ha sido reenviado.";
} catch (Exception $e) {
    $response["success"] = false;
    $response["message"] = $e->getMessage();
} finally {
    echo json_encode($response);
}

