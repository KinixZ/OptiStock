<?php
// Script de prueba para enviar correo usando enviarCorreo().
// Úsalo en el servidor (desde navegador o CLI php) para diagnosticar problemas de mail().

require_once __DIR__ . '/mail_utils.php';

$dest = $argv[1] ?? ($_GET['to'] ?? null);
if (!$dest) {
    echo "Uso: php test_mail.php recipient@example.com\n";
    exit(1);
}

$subject = 'Prueba de correo OptiStock';
$message = "Mensaje de prueba enviado desde test_mail.php en " . php_uname() . "\n";

$ok = enviarCorreo($dest, $subject, $message);
if ($ok) {
    echo "ENVIADO: mail() aceptó el envío. Revisa si llegó al destinatario.\n";
} else {
    echo "ERROR: mail() devolvió false. Revisa logs/mail.log y el error_log del servidor.\n";
}

?>