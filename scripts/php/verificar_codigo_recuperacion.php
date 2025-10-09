<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/json_utils.php';
require_once __DIR__ . '/log_utils.php';

$response = ["success" => false, "message" => ""];
$restaurarErrores = inicializarRespuestaJson();

try {
    $input = json_decode(file_get_contents("php://input"), true);
    if (!is_array($input) || !isset($input['codigo'])) {
        throw new InvalidArgumentException("Código no enviado.");
    }

    $codigoIngresado = trim((string) $input['codigo']);

    if (!isset($_SESSION['codigo_recuperacion'], $_SESSION['correo_recuperacion'])) {
        throw new RuntimeException("No hay código guardado en sesión.");
    }

    if ($codigoIngresado === '' || (string) $codigoIngresado !== (string) $_SESSION['codigo_recuperacion']) {
        throw new RuntimeException("Código incorrecto.");
    }

    $conn = new mysqli("localhost", "u296155119_Admin", "4Dmin123o", "u296155119_OptiStock");

    $correo = $_SESSION['correo_recuperacion'];
    $stmt = $conn->prepare("SELECT id_usuario FROM usuario WHERE correo = ?");
    $stmt->bind_param('s', $correo);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result && $result->num_rows > 0) {
        $row = $result->fetch_assoc();
        registrarLog($conn, (int) $row['id_usuario'], 'Usuarios', 'Código de recuperación validado');
    }

    $response["success"] = true;
    $response["message"] = "Código verificado correctamente.";
} catch (Throwable $e) {
    error_log('verificar_codigo_recuperacion: ' . $e->getMessage());

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

