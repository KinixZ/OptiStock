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
        throw new InvalidArgumentException("Solicitud inválida.");
    }

    $email = isset($data['email']) ? trim((string) $data['email']) : '';
    if ($email === '') {
        throw new InvalidArgumentException("Correo no proporcionado.");
    }

    $conn = new mysqli("localhost", "u296155119_Admin", "4Dmin123o", "u296155119_OptiStock");

    $stmt = $conn->prepare("SELECT id_usuario, nombre FROM usuario WHERE correo = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        throw new RuntimeException("El correo no está registrado.");
    }

    $usuario = $result->fetch_assoc();
    $userId = (int) $usuario['id_usuario'];
    $nombreUsuario = $usuario['nombre'] ?? null;

    $codigo = mt_rand(100000, 999999);

    $_SESSION['codigo_recuperacion'] = $codigo;
    $_SESSION['correo_recuperacion'] = $email;

    $asunto = "OptiStock • Código de recuperación";
    $mensaje = crearCorreoCodigoOptiStock(
        'Restablece tu contraseña',
        'Recibimos una solicitud para recuperar tu acceso a OptiStock. Ingresa este código para continuar con el proceso de restablecimiento.',
        $codigo,
        'El código es válido por 10 minutos. Si no solicitaste este cambio, puedes ignorar este mensaje.',
        $nombreUsuario,
        [
            'Ve a la página de OptiStock y elige la opción "¿Olvidaste tu contraseña?".',
            'Escribe el código de seis dígitos exactamente como aparece en este correo.',
            'Crea una nueva contraseña segura y confirma el cambio.'
        ]
    );

    if (!enviarCorreo($email, $asunto, $mensaje)) {
        throw new RuntimeException("Error al enviar el correo de recuperación.");
    }

    registrarLog($conn, $userId, 'Usuarios', 'Solicitud de código de recuperación de contraseña');

    $response["success"] = true;
    $response["message"] = "El código de recuperación ha sido enviado a tu correo.";
} catch (Throwable $e) {
    error_log('pass_recuperar: ' . $e->getMessage());

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


