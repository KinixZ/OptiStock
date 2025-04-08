<?php
header('Content-Type: application/json');
ini_set('display_errors', 1);
error_reporting(E_ALL);

$response = ["success" => false, "message" => ""]; // Respuesta inicial

try {
    // Leer datos del cliente
    $data = json_decode(file_get_contents("php://input"), true);
    $email = $data['email'] ?? null;

    if (!$email) {
        throw new Exception("Correo no proporcionado.");
    }

    // Generar un nuevo código de verificación
    $codigo_verificacion = mt_rand(100000, 999999);

    // Guardar el código en la sesión
    session_start();
    $_SESSION['codigo_verificacion'] = $codigo_verificacion;
    $_SESSION['correo_verificacion'] = $email;

    // Enviar el correo
    $mail_subject = "OPTISTOCK - Reenvío de Código de Verificación";
    $mail_message = "Hola de nuevo. tu código de verificación es: $codigo_verificacion";
    $mail_headers = "From: no-reply@optistock.site";

    if (!mail($email, $mail_subject, $mail_message, $mail_headers)) {
        throw new Exception("Error al enviar el correo de verificación.");
    }

    // Respuesta de éxito
    $response["success"] = true;
    $response["message"] = "El código de verificación ha sido reenviado.";
} catch (Exception $e) {
    // Capturar errores y enviar respuesta
    $response["success"] = false;
    $response["message"] = $e->getMessage();
} finally {
    echo json_encode($response);
}
?>