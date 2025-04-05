<?php
// Conexión a la base de datos
$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";
$conn = mysqli_connect($servername, $db_user, $db_pass, $database);

// Verificar conexión
if (!$conn) {
    echo json_encode(["success" => false, "message" => "Error de conexión a la base de datos."]);
    exit;
}

// Obtener datos del formulario
$nombre = $_POST['nombre'];
$apellido = $_POST['apellido'];
$correo = $_POST['correo'];
$contrasena = hash('sha1', $_POST['contrasena']); // Contraseña encriptada con SHA1

// Generar un token único para la verificación (usaremos el correo como token)
$token = $correo;  // O puedes generar un token aleatorio con bin2hex(random_bytes(16))

// Insertar el nuevo usuario en la base de datos
$sql = "INSERT INTO usuario (nombre, apellido, fecha_nacimiento, telefono, correo, contrasena, verificacion_cuenta) 
        VALUES (?, ?, ?, ?, ?, ?, 0)";
$stmt = mysqli_prepare($conn, $sql);
mysqli_stmt_bind_param($stmt, 'ssssss', $nombre, $apellido, $_POST['fecha_nacimiento'], $_POST['telefono'], $correo, $contrasena);
mysqli_stmt_execute($stmt);

// Enviar correo de verificación
$to = $correo;
$subject = "Verificación de correo";
$message = "Hola $nombre, por favor verifica tu correo haciendo clic en el siguiente enlace: \n\n";
$message .= "http://tu-dominio.com/verificacion.php?token=$token";  // URL de verificación en tu dominio

$headers = 'From: no-reply@tu-dominio.com' . "\r\n" .
           'Reply-To: no-reply@tu-dominio.com' . "\r\n" .
           'X-Mailer: PHP/' . phpversion();

if (mail($to, $subject, $message, $headers)) {
    echo "Se ha enviado un correo de verificación a $correo.";
} else {
    echo "Hubo un problema al enviar el correo de verificación.";
}

// Cerrar la conexión a la base de datos
mysqli_close($conn);
?>
