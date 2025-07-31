<?php
header('Content-Type: application/json; charset=UTF-8');
session_start();
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Ruta para el archivo de registro
$logFile = __DIR__ . '/resend_logs.txt';

// Registrar solicitud
file_put_contents($logFile, "\n\n==== SOLICITUD DE REENVÍO ====\n", FILE_APPEND);
file_put_contents($logFile, 'Hora: ' . date('Y-m-d H:i:s') . "\n", FILE_APPEND);

// Leer y registrar la entrada RAW
$input = file_get_contents('php://input');
file_put_contents($logFile, "Datos recibidos (raw):\n$input\n", FILE_APPEND);

$data = json_decode($input, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    file_put_contents($logFile, 'Error al decodificar JSON: ' . json_last_error_msg() . "\n", FILE_APPEND);
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Datos no válidos']);
    exit;
}

$email = trim($data['email'] ?? '');
if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    file_put_contents($logFile, "Error: Email no válido: '$email'\n", FILE_APPEND);
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Email no válido']);
    exit;
}

// Generar y guardar el código
$code = random_int(100000, 999999);
$_SESSION['codigo_verificacion'] = $code;
$_SESSION['correo_verificacion'] = $email;
$_SESSION['codigo_generado_en']  = date('Y-m-d H:i:s');
file_put_contents($logFile, "Nuevo código generado: $code para $email\n", FILE_APPEND);

// Preparar correo
$subject = 'Tu código de verificación';
$message = <<<EOT
Hola,

Tu código de verificación es: $code

Si no solicitaste este código, puedes ignorar este correo.

Saludos,
El equipo de OptiStock
EOT;

$headers = [
    'From'         => 'no-reply@optistock.site',
    'Reply-To'     => 'no-reply@optistock.site',
    'MIME-Version' => '1.0',
    'Content-Type' => 'text/plain; charset=UTF-8'
];

// Enviar correo
if (mail($email, $subject, $message, implode("\r\n", $headers))) {
    file_put_contents($logFile, "Email enviado OK a $email\n", FILE_APPEND);
    echo json_encode(['success' => true, 'message' => 'Código de verificación reenviado']);
} else {
    file_put_contents($logFile, "Error al enviar email a $email\n", FILE_APPEND);
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al enviar el correo de verificación']);
}
?>

