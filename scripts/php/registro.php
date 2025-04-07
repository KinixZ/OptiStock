<?php
header('Content-Type: application/json');
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Mostrar los datos recibidos en el formulario para depurar

// 2. Datos del formulario
$data = json_decode(file_get_contents("php://input"), true);

$nombre = $data['nombre'] ?? null;
$apellido = $data['apellido'] ?? null;
$fecha_nacimiento = $data['fecha_nacimiento'] ?? null;
$telefono = $data['telefono'] ?? null;
$correo = $data['correo'] ?? null;
$contrasena = $data['contrasena'] ?? null;

// 3. Validar datos mínimos
if (!$nombre || !$apellido || !$fecha_nacimiento || !$telefono || !$correo || !$contrasena) {
    echo json_encode(["success" => false, "message" => "Datos incompletos"]);
    exit;
}

// 1. Conectarse a la base de datos MySQL
$servername = "localhost"; // Host de la BD (Hostinger usa 'localhost' para MySQL)
$db_user    = "u296155119_Admin";  // Usuario de la base de datos
$db_pass    = "4Dmin123o"; // Contraseña de la base de datos
$database   = "u296155119_OptiStock";   // Nombre de la base de datos

$conn = mysqli_connect($servername, $db_user, $db_pass, $database);
if (!$conn) {
    die("Error de conexión: " . mysqli_connect_error());
}

// 4. Cifrar la contraseña con SHA1 (40 caracteres hex) antes de guardar
$contrasena_hash = sha1($contrasena);

// 5. Preparar la consulta de inserción SQL
$sql = "INSERT INTO usuario (nombre, apellido, fecha_nacimiento, telefono, correo, contrasena)
        VALUES (?, ?, ?, ?, ?, ?)";

// Usar prepared statements para mayor seguridad
$stmt = mysqli_prepare($conn, $sql);
mysqli_stmt_bind_param($stmt, "ssssss", $nombre, $apellido, $fecha_nacimiento, $telefono, $correo, $contrasena_hash);

// 6. Ejecutar la consulta e indicar resultado
if (mysqli_stmt_execute($stmt)) {
    // Si el registro es exitoso, devolver éxito
    echo json_encode(["success" => true, "message" => "Usuario registrado correctamente."]);
} else {
    // Si ocurre un error, devolver el mensaje de error
    echo json_encode(["success" => false, "message" => "Error al registrar el usuario: " . mysqli_error($conn)]);
}

// 7. Generar un código de verificación de 6 dígitos
$codigo_verificacion = mt_rand(100000, 999999); // Código de 6 dígitos

// Guardar el código en la sesión para que se pueda validar más tarde
session_start();
$_SESSION['codigo_verificacion'] = $codigo_verificacion;
$_SESSION['correo_verificacion'] = $correo; // Guardar el correo para asociarlo con el código

// 8. Enviar el código por correo
$mail_subject = "OPTISTOCK - Codigo de Verificación";
$mail_message = "Hola, $nombre. Tu código de verificación es: $codigo_verificacion";
$mail_headers = "From: optistockproject@gmail.com";

if (mail($correo, $mail_subject, $mail_message, $mail_headers)) {
    echo json_encode(["success" => true, "message" => "Usuario registrado correctamente. Se ha enviado un código de verificación a tu correo."]);
} else {
    echo json_encode(["success" => false, "message" => "Error al enviar el correo de verificación."]);
}

// Cerrar la conexión
mysqli_close($conn);
?>
