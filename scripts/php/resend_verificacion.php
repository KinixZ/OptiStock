<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/json_utils.php';
require_once __DIR__ . '/log_utils.php';
require_once __DIR__ . '/mail_utils.php';

$response = ["success" => false, "message" => ""];
$restaurarErrores = inicializarRespuestaJson();

try {
    $data = json_decode(file_get_contents("php://input"), true);
    if (!is_array($data)) {
        throw new InvalidArgumentException('Solicitud inválida.');
    }

    $email = isset($data['email']) ? trim((string) $data['email']) : '';
    if ($email === '') {
        throw new InvalidArgumentException('Correo no proporcionado.');
    }

    $conn = new mysqli("localhost", "u296155119_Admin", "4Dmin123o", "u296155119_OptiStock");

    $stmt = $conn->prepare("SELECT id_usuario, nombre FROM usuario WHERE correo = ?");
    $stmt->bind_param('s', $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        throw new RuntimeException('El correo no está registrado.');
    }

    $usuario = $result->fetch_assoc();
    $userId = (int) $usuario['id_usuario'];
    $nombreUsuario = $usuario['nombre'] ?? null;

    $codigo_verificacion = mt_rand(100000, 999999);
    $_SESSION['codigo_verificacion'] = $codigo_verificacion;
    $_SESSION['correo_verificacion'] = $email;

    $mail_subject = "OptiStock • Nuevo código de verificación";
    $mail_message = crearCorreoCodigoOptiStock(
        'Nuevo código de verificación',
        'Sabemos que necesitas confirmar tu correo. Ingresa este nuevo código para completar la verificación de tu cuenta.',
        $codigo_verificacion,
        'El código expira en 10 minutos. Si no solicitaste la verificación puedes ignorar este mensaje.',
        $nombreUsuario,
        [
            'Abre la ventana de verificación de OptiStock.',
            'Escribe el código de seis dígitos exactamente como aparece en este correo.',
            'Haz clic en "Confirmar correo" para finalizar el proceso.'
        ]
    );

    if (!enviarCorreo($email, $mail_subject, $mail_message)) {
        throw new RuntimeException('Error al enviar el correo de verificación.');
    }

    registrarLog($conn, $userId, 'Usuarios', 'Reenvío de código de verificación de cuenta');

    $response["success"] = true;
    $response["message"] = "El código de verificación ha sido reenviado.";
} catch (Throwable $e) {
    error_log('resend_verificacion: ' . $e->getMessage());

    $response["success"] = false;
    if ($e instanceof InvalidArgumentException || $e instanceof RuntimeException) {
        $response["message"] = $e->getMessage();
    } else {
        $response["message"] = mensajeErrorInterno();
    }
} finally {
    if (isset($stmt) && $stmt instanceof mysqli_stmt) {
        $stmt->close();
    }

    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }

    $restaurarErrores();
    finalizarRespuestaJson($response);
}

