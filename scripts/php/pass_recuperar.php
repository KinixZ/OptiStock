<?php
header('Content-Type: application/json');
ini_set('display_errors', 1);
error_reporting(E_ALL);
session_start(); // Muy importante para usar $_SESSION

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
    // Leer JSON del frontend
    $data = json_decode(file_get_contents("php://input"), true);
    $email = $data['email'] ?? null;

    if (!$email) {
        throw new Exception("Correo no proporcionado.");
    }

    // Conectar a la base de datos
    $conn = new mysqli("localhost", "u296155119_Admin", "4Dmin123o", "u296155119_OptiStock");
    if ($conn->connect_error) {
        throw new Exception("Error de conexión: " . $conn->connect_error);
    }

    // Verificar que el correo existe
    $stmt = $conn->prepare("SELECT id_usuario FROM usuario WHERE correo = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        throw new Exception("El correo no está registrado.");
    }

    $usuario = $result->fetch_assoc();
    $userId = (int) $usuario['id_usuario'];

    // Generar código de 6 dígitos
    $codigo = mt_rand(100000, 999999);

    // Guardar en la sesión
    $_SESSION['codigo_recuperacion'] = $codigo;
    $_SESSION['correo_recuperacion'] = $email;

    // Enviar el correo (usando mail() localmente)
    $asunto = "OPTISTOCK - Código de recuperación";
    $mensaje = "Tu código para recuperar tu contraseña es: $codigo. Es válido por 10 minutos.";
    if (!send_mail_simple($email, $asunto, $mensaje)) {
        throw new Exception("Error al enviar el correo de recuperación.");
    }

    registrarLog($conn, $userId, 'Usuarios', 'Solicitud de código de recuperación de contraseña');

    $response["success"] = true;
    $response["message"] = "El código de recuperación ha sido enviado a tu correo.";

} catch (Exception $e) {
    $response["success"] = false;
    $response["message"] = $e->getMessage();
} finally {
    echo json_encode($response);
}
?>

