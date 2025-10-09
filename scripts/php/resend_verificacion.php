<?php

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as PHPMailerException;

header('Content-Type: application/json');
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/log_utils.php';
require_once __DIR__ . '/libs/PHPMailer/src/Exception.php';
require_once __DIR__ . '/libs/PHPMailer/src/PHPMailer.php';
require_once __DIR__ . '/libs/PHPMailer/src/SMTP.php';

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

    $codigo_verificacion = mt_rand(100000, 999999);

    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    $_SESSION['codigo_verificacion'] = $codigo_verificacion;
    $_SESSION['correo_verificacion'] = $email;

    $mail_subject = "OptiStock • Nuevo código de verificación";
    $mensajePlano = "Hola" . ($nombreUsuario ? ", $nombreUsuario" : '') .
        ". Tu nuevo código de verificación es: $codigo_verificacion. Recuerda que expira en 10 minutos.";

    $mail = new PHPMailer(true);
    try {
        $mail->isMail();
        $mail->CharSet = 'UTF-8';
        $mail->setFrom('no-reply@optistock.site', 'OptiStock');
        $mail->addAddress($email, $nombreUsuario ?? '');
        $mail->Subject = $mail_subject;
        $mail->Body = $mensajePlano;
        $mail->AltBody = $mensajePlano;
        $mail->send();
    } catch (PHPMailerException $mailError) {
        throw new Exception('Error al reenviar el correo de verificación: ' . $mail->ErrorInfo);
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

