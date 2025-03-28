<?php
header('Content-Type: application/json');
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Mostrar los datos recibidos en el formulario para depurar

// 2. Datos del formulario (asumiendo método POST estándar)
$nombre   = $_POST['nombre']   ?? null;
$apellido = $_POST['apellido'] ?? null;
$fecha_nacimiento = $_POST['fecha_nacimiento'] ?? null;
$telefono = $_POST['telefono'] ?? null;
$correo   = $_POST['correo']   ?? null;
$contrasena = $_POST['contrasena'] ?? null;  // contraseña en texto plano del form

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

// Cerrar la conexión
mysqli_close($conn);
?>
