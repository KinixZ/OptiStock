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

// Obtener los datos del formulario
$nombre = $_POST['nombre'];
$apellido = $_POST['apellido'];
$correo = $_POST['correo'];
$fecha_nacimiento = $_POST['fecha_nacimiento'];
$telefono = $_POST['telefono'];

// Validación simple
if (!$correo || !$fecha_nacimiento || !$telefono) {
    die("Faltan datos");
}

$stmt = $conn->prepare("UPDATE usuario SET nombre = ?, apellido = ?, fecha_nacimiento = ?, telefono = ?, verificacion_cuenta = '1' WHERE correo = ?");
$stmt->bind_param("sssss",$nombre, $apellido $fecha_nacimiento, $telefono, $correo);

if ($stmt->execute()) {
    echo "Datos actualizados correctamente. Puedes usar <a href='../../main_menu/main_menu.html'>tu cuenta</a>";
} else {
    echo "Error al guardar los datos.";
}
?>