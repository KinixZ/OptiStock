<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Mostrar los datos recibidos en el formulario para depurar
var_dump($_POST); // Esto imprimirá los datos recibidos desde el formulario

// 1. Conectarse a la base de datos MySQL
$servername = "127.0.0.1";      // Host de la BD (Hostinger usa 'localhost' para MySQL)
$db_user    = "u296155119_Admin";  // Usuario de la base de datos
$db_pass    = "Admin123"; // Contraseña de la base de datos
$database   = "u296155119_OptiStock";   // Nombre de la base de datos

$conn = mysqli_connect($servername, $db_user, $db_pass, $database);
if (!$conn) {
    die("Error de conexión: " . mysqli_connect_error());
}

// 2. Datos del formulario (asumiendo método POST estándar)
$nombre   = $_POST['nombre']   ?? null;
$apellido = $_POST['apellido'] ?? null;
$fecha_nacimiento = $_POST['fecha_nacimiento'] ?? null;
$telefono = $_POST['telefono'] ?? null;
$correo   = $_POST['correo']   ?? null;
$contrasena = $_POST['contrasena'] ?? null;  // contraseña en texto plano del form

// 3. Validar datos mínimos
if (!$nombre || !$apellido || !$fecha_nacimiento || !$telefono || !$correo || !$contrasena) {
    die("Datos incompletos");
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
    echo "OK";  // Podrías devolver un JSON o redirigir a otra página de confirmación
} else {
    echo "ERROR: " . mysqli_error($conn);
}

// 7. Cerrar la conexión
mysqli_close($conn);
?>
