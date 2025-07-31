<?php
session_start();
header('Content-Type: application/json');

// Configurar logging
$logFile = __DIR__ . '/resend_logs.txt';
file_put_contents($logFile, "\n\n==== SOLICITUD DE REENVÍO ====\n", FILE_APPEND);
file_put_contents($logFile, "Hora: " . date('Y-m-d H:i:s') . "\n", FILE_APPEND);

// Registrar información de la sesión actual
file_put_contents($logFile, "Sesión antes del reenvío:\n" . print_r($_SESSION, true) . "\n", FILE_APPEND);

// Validar datos de entrada
$input = file_get_contents("php://input");
file_put_contents($logFile, "Datos recibidos (raw):\n$input\n", FILE_APPEND);

$data = json_decode($input, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    file_put_contents($logFile, "Error al decodificar JSON: " . json_last_error_msg() . "\n", FILE_APPEND);
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Datos no válidos"]);
    exit;
}

// Validar email
if (empty($data['email']) || !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
    file_put_contents($logFile, "Error: Email no válido\n", FILE_APPEND);
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Email no válido"]);
    exit;
}

$email = trim($data['email']);
$reason = $data['reason'] ?? 'unknown';

// Generar nuevo código (6 dígitos)
$newCode = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
file_put_contents($logFile, "Nuevo código generado: $newCode\n", FILE_APPEND);

// Guardar en sesión
$_SESSION['codigo_verificacion'] = $newCode;
$_SESSION['correo_verificacion'] = $email;
$_SESSION['codigo_generado_en'] = date('Y-m-d H:i:s');

file_put_contents($logFile, "Sesión después de actualizar:\n" . print_r($_SESSION, true) . "\n", FILE_APPEND);

// Aquí iría el código real para enviar el email
// Por ahora simulamos el envío
$emailSent = true; // Simular éxito

if ($emailSent) {
    file_put_contents($logFile, "Simulación: Email enviado a $email con código $newCode\n", FILE_APPEND);
    
    // En producción, quitar el debug_code y usar un servicio real de email
    echo json_encode([
        "success" => true,
        "message" => "Código de verificación reenviado",
        "debug" => [
            "debug_code" => $newCode, // Solo para desarrollo, quitar en producción
            "email" => $email,
            "reason" => $reason,
            "session_id" => session_id(),
            "generated_at" => $_SESSION['codigo_generado_en']
        ]
    ]);
} else {
    file_put_contents($logFile, "Error: Falló el envío del email\n", FILE_APPEND);
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Error al enviar el código de verificación",
        "debug" => [
            "email" => $email,
            "error_info" => "Simulación de fallo"
        ]
    ]);
}
?>