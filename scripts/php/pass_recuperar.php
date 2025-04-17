<?php
// filepath: c:\Users\Em1l1\OneDrive\Escritorio\OptiStock\scripts\php\pass_recuperar.php

header('Content-Type: application/json');
// Conexión a la base de datos
$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";

$conn = mysqli_connect($servername, $db_user, $db_pass, $database);
if (!$conn) {
    echo json_encode(["success" => false, "message" => "Error de conexión a la base de datos."]);
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
$query->bind_param("s", $email);
$query->execute();
$result = $query->get_result();

if ($result->num_rows === 0) {
    echo json_encode(['success' => false, 'message' => 'El correo no está registrado.']);
    exit;
}

$user = $result->fetch_assoc();
$userId = $user['id'];

// Generar un token seguro
$token = bin2hex(random_bytes(32));
$expires = date('Y-m-d H:i:s', strtotime('+1 hour'));

// Guardar el token en la base de datos
$insert = $conn->prepare("INSERT INTO pass_resets (id_usuario, token, expira) VALUES (?, ?, ?)");
$insert->bind_param("iss", $userId, $token, $expires);
$insert->execute();

// Enviar el correo con el enlace de recuperación
$resetLink = "https://optistock.site/pages/regis_login/login/reset_pass.html?token=$token";
$subject = "Recuperación de contraseña";
$message = "Haz clic en el siguiente enlace para restablecer tu contraseña: $resetLink\n\nEste enlace expirará en 1 hora.";
$headers = "From: no-reply@optistock.site";

if (mail($email, $subject, $message, $headers)) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'message' => 'Error al enviar el correo.']);
}
?>