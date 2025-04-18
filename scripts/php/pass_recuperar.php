<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');

$response = ["success" => false, "message" => ""]; // Respuesta inicial

try {
    // Conexión a la base de datos
    $servername = "localhost";
    $db_user    = "u296155119_Admin";
    $db_pass    = "4Dmin123o";
    $database   = "u296155119_OptiStock";

    $conn = mysqli_connect($servername, $db_user, $db_pass, $database);
    if (!$conn) {
        throw new Exception("Error de conexión a la base de datos: " . mysqli_connect_error());
    }

    // Leer datos del cliente
    $data = json_decode(file_get_contents('php://input'), true);
    $email = $data['email'] ?? '';

    if (empty($email)) {
        throw new Exception("El correo electrónico es obligatorio.");
    }

    // Verificar si el correo existe en la base de datos
    $query = $conn->prepare("SELECT id_usuario FROM usuario WHERE correo = ?");
    if (!$query) {
        throw new Exception("Error en la consulta SQL: " . $conn->error);
    }
    $query->bind_param("s", $email);
    $query->execute();
    $result = $query->get_result();

    if (!$result) {
        throw new Exception("Error al obtener el resultado: " . $conn->error);
    }

    if ($result->num_rows === 0) {
        throw new Exception("El correo no está registrado.");
    }

    $user = $result->fetch_assoc();
    $userId = $user['id_usuario'];

    // Generar un token seguro
    try {
        $token = bin2hex(random_bytes(32));
    } catch (Exception $e) {
        throw new Exception("Error al generar el token: " . $e->getMessage());
    }
    $expires = date('Y-m-d H:i:s', strtotime('+1 hour'));

    // Guardar el token en la base de datos
    $insert = $conn->prepare("INSERT INTO pass_resets (id_usuario, token, expira) VALUES (?, ?, ?)");
    if (!$insert) {
        throw new Exception("Error en la consulta de inserción: " . $conn->error);
    }
    $insert->bind_param("iss", $userId, $token, $expires);
    if (!$insert->execute()) {
        throw new Exception("Error al insertar el token: " . $insert->error);
    }

    // Enviar el correo con el enlace de recuperación
    $resetLink = "https://optistock.site/pages/regis_login/login/reset_pass.html?token=$token";
    $subject = "Recuperación de contraseña";
    $message = "Haz clic en el siguiente enlace para restablecer tu contraseña: $resetLink\n\nEste enlace expirará en 1 hora.";
    $headers = "From: no-reply@optistock.site";

    if (!mail($email, $subject, $message, $headers)) {
        throw new Exception("Error al enviar el correo.");
    }

    // Respuesta de éxito
    $response["success"] = true;
    $response["message"] = "Correo enviado correctamente.";
} catch (Exception $e) {
    // Capturar errores y enviar respuesta
    $response["success"] = false;
    $response["message"] = $e->getMessage();
} finally {
    echo json_encode($response);
}
?>