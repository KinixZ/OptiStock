<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/json_utils.php';
require_once __DIR__ . '/log_utils.php';

$response = ["success" => false, "message" => ""];
$restaurarErrores = inicializarRespuestaJson();

try {
    if (!isset($_SESSION['correo_recuperacion'])) {
        throw new RuntimeException("Sesión no válida. Solicita el código de recuperación de nuevo.");
    }

    $data = json_decode(file_get_contents("php://input"), true);
    if (!is_array($data)) {
        throw new InvalidArgumentException("Solicitud inválida.");
    }

    $nueva = isset($data['nueva']) ? trim((string) $data['nueva']) : '';
    if ($nueva === '') {
        throw new InvalidArgumentException("Contraseña nueva no proporcionada.");
    }

    $hashed = sha1($nueva);
    $correo = $_SESSION['correo_recuperacion'];

    $conn = new mysqli("localhost", "u296155119_Admin", "4Dmin123o", "u296155119_OptiStock");

    $userId = null;
    $findUser = $conn->prepare("SELECT id_usuario FROM usuario WHERE correo = ?");
    $findUser->bind_param("s", $correo);
    $findUser->execute();
    $findUser->bind_result($userId);
    $findUser->fetch();
    $findUser->close();

    if (!$userId) {
        throw new RuntimeException("No se encontró el usuario asociado al correo proporcionado.");
    }

    $stmt = $conn->prepare("UPDATE usuario SET contrasena = ? WHERE correo = ?");
    $stmt->bind_param("ss", $hashed, $correo);
    $stmt->execute();

    registrarLog($conn, $userId, 'Usuarios', 'Recuperación de contraseña completada');

    unset($_SESSION['codigo_recuperacion'], $_SESSION['correo_recuperacion']);

    $response["success"] = true;
    $response["message"] = "Contraseña cambiada correctamente.";
} catch (Throwable $e) {
    error_log('cambiar_contraseña: ' . $e->getMessage());

    $response["success"] = false;
    if ($e instanceof InvalidArgumentException || $e instanceof RuntimeException) {
        $response["message"] = $e->getMessage();
    } else {
        $response["message"] = mensajeErrorInterno();
    }
} finally {
    if (isset($findUser) && $findUser instanceof mysqli_stmt) {
        $findUser->close();
    }

    if (isset($stmt) && $stmt instanceof mysqli_stmt) {
        $stmt->close();
    }

    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }

    $restaurarErrores();
    finalizarRespuestaJson($response);
}
?>

