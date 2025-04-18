<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');

require 'path/to/PHPMailer/src/Exception.php';
require 'path/to/PHPMailer/src/PHPMailer.php';
require 'path/to/PHPMailer/src/SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Conexión a la base de datos
$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";

$conn = mysqli_connect($servername, $db_user, $db_pass, $database);
if (!$conn) {
    echo json_encode(["success" => false, "message" => "Error de conexión a la base de datos: " . mysqli_connect_error()]);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$email = $data['email'] ?? '';

if (empty($email)) {
    echo json_encode(['success' => false, 'message' => 'El correo electrónico es obligatorio.']);
    exit;
}

// Verificar si el correo existe en la base de datos
$query = $conn->prepare("SELECT id_usuario FROM usuario WHERE correo = ?");
if (!$query) {
    echo json_encode(['success' => false, 'message' => 'Error en la consulta SQL: ' . $conn->error]);
    exit;
}
$query->bind_param("s", $email);
$query->execute();
$result = $query->get_result();

if ($result->num_rows === 0) {
    echo json_encode(['success' => false, 'message' => 'El correo no está registrado.']);
    exit;
}

$user = $result->fetch_assoc();
$userId = $user['id_usuario'];

// Generar un token seguro
try {
    $token = bin2hex(random_bytes(32));
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error al generar el token: ' . $e->getMessage()]);
    exit;
}
$expires = date('Y-m-d H:i:s', strtotime('+1 hour'));

// Guardar el token en la base de datos
$insert = $conn->prepare("INSERT INTO pass_resets (id_usuario, token, expira) VALUES (?, ?, ?)");
if (!$insert) {
    echo json_encode(['success' => false, 'message' => 'Error en la consulta de inserción: ' . $conn->error]);
    exit;
}
$insert->bind_param("iss", $userId, $token, $expires);
if (!$insert->execute()) {
    echo json_encode(['success' => false, 'message' => 'Error al insertar el token: ' . $insert->error]);
    exit;
}

// Enviar el correo con PHPMailer
$mail = new PHPMailer(true);

try {
    $mail->isSMTP();
    $mail->Host = 'smtp.gmail.com';
    $mail->SMTPAuth = true;
    $mail->Username = 'tu_correo@gmail.com';
    $mail->Password = 'tu_contraseña';
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port = 587;

    $mail->setFrom('no-reply@optistock.site', 'OptiStock');
    $mail->addAddress($email);
    $mail->Subject = "Recuperación de contraseña";
    $mail->Body = "Haz clic en el siguiente enlace para restablecer tu contraseña: https://optistock.site/pages/regis_login/login/reset_pass.html?token=$token\n\nEste enlace expirará en 1 hora.";

    $mail->send();
    echo json_encode(['success' => true, 'message' => 'Correo enviado correctamente.']);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error al enviar el correo: ' . $mail->ErrorInfo]);
}
?>