<?php
header('Content-Type: application/json');
ini_set('display_errors', 1);
error_reporting(E_ALL);
session_start(); // Muy importante para usar $_SESSION

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

    // Generar código de 6 dígitos
    $codigo = mt_rand(100000, 999999);

    // Guardar en la sesión
    $_SESSION['codigo_recuperacion'] = $codigo;
    $_SESSION['correo_recuperacion'] = $email;

    // Enviar el correo
    $asunto = "OPTISTOCK - Código de recuperación";
    $mensaje = "Tu código para recuperar tu contraseña es: $codigo. Es válido por 10 minutos.";
    $cabeceras = "From: no-reply@optistock.site";

    if (!mail($email, $asunto, $mensaje, $cabeceras)) {
        throw new Exception("Error al enviar el correo de recuperación.");
    }

    $response["success"] = true;
    $response["message"] = "El código de recuperación ha sido enviado a tu correo.";

} catch (Exception $e) {
    $response["success"] = false;
    $response["message"] = $e->getMessage();
} finally {
    echo json_encode($response);
}
?>
