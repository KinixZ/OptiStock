<?php
session_start();
header('Content-Type: application/json; charset=UTF-8');

// Configurar logging
$logFile = __DIR__ . '/resend_logs.txt';
file_put_contents($logFile, "\n\n==== SOLICITUD DE REENVÍO ====\n", FILE_APPEND);
file_put_contents($logFile, "Hora: " . date('Y-m-d H:i:s') . "\n", FILE_APPEND);

// Registrar información de la sesión actual
file_put_contents($logFile, "Sesión antes del reenvío:\n" . print_r($_SESSION, true) . "\n", FILE_APPEND);

// 1. Leer y loguear el raw POST
$input = file_get_contents("php://input");
file_put_contents($logFile, "Datos recibidos (raw):\n$input\n", FILE_APPEND);

// 2. Decodificar JSON de entrada
$data = json_decode($input, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    file_put_contents($logFile, "Error al decodificar JSON: " . json_last_error_msg() . "\n", FILE_APPEND);
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Datos no válidos"
    ]);
    exit;
}

// 3. Validar email
$email = trim($data['email'] ?? '');
if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    file_put_contents($logFile, "Error: Email no válido: '$email'\n", FILE_APPEND);
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Email no válido"
    ]);
    exit;
}
$reason = $data['reason'] ?? 'unknown';

// 4. Generar nuevo código (6 dígitos) y guardar en sesión
$newCode = random_int(100000, 999999);
$_SESSION['codigo_verificacion']   = $newCode;
$_SESSION['correo_verificacion']   = $email;
$_SESSION['codigo_generado_en']    = date('Y-m-d H:i:s');
file_put_contents($logFile, "Nuevo código generado: $newCode para $email\n", FILE_APPEND);
file_put_contents($logFile, "Sesión después de actualizar:\n" . print_r($_SESSION, true) . "\n", FILE_APPEND);

// 5. Preparar el correo
$subject = "Tu código de verificación";
$message = <<<EOT
Hola,

Tu código de verificación es: $newCode

Si no solicitaste este código, puedes ignorar este correo.

Saludos,
El equipo de OptiStock
EOT;

$headers = [
    'From'         => 'no-reply@OptiStock.site',
    'Reply-To'     => 'no-reply@OptiStock.site',
    'MIME-Version' => '1.0',
    'Content-Type' => 'text/plain; charset=UTF-8'
];

// 6. Enviar el correo
$mailSent = mail($email, $subject, $message, implode("\r\n", $headers));

if ($mailSent) {
    file_put_contents($logFile, "Email enviado OK a $email\n", FILE_APPEND);
    echo json_encode([
        "success" => true,
        "message" => "Código de verificación reenviado"
    ]);
    exit;
} else {
    file_put_contents($logFile, "Error al enviar email a $email\n", FILE_APPEND);
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Error al enviar el correo de verificación"
    ]);
    exit;
}
?>
