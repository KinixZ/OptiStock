<?php
header('Content-Type: application/json');
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/log_utils.php';

function send_mail_simple($destinatario, $asunto, $mensaje, $fromEmail = 'no-reply@optistock.site', $fromName = 'OptiStock')
{
    $headers = '';
    $headers .= 'From: ' . sprintf('%s <%s>', $fromName, $fromEmail) . "\r\n";
    $headers .= 'Reply-To: ' . $fromEmail . "\r\n";
    $headers .= 'MIME-Version: 1.0' . "\r\n";
    $headers .= 'Content-Type: text/plain; charset=UTF-8' . "\r\n";

    $param = '-f' . escapeshellarg($fromEmail);
    $result = @mail($destinatario, $asunto, $mensaje, $headers, $param);

    $logDir = dirname(__DIR__, 2) . '/logs';
    if (!is_dir($logDir)) {
        @mkdir($logDir, 0775, true);
    }
    $logFile = $logDir . '/mail.log';
    $estado = $result ? 'OK' : 'ERROR';
    $linea = sprintf('[%s] [%s] Destinatario: %s | Asunto: %s', date('Y-m-d H:i:s'), $estado, $destinatario, $asunto);
    $linea .= PHP_EOL;
    @file_put_contents($logFile, $linea, FILE_APPEND);

    return (bool) $result;
}

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
    if (!send_mail_simple($email, $mail_subject, $mail_message)) {
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

