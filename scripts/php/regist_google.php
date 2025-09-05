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
$correo = $_POST['correo'];
$nombre = $_POST['nombre'];
$apellido = $_POST['apellido'];
$fecha_nacimiento = $_POST['fecha_nacimiento'];
$telefono = $_POST['telefono'];

// Validación simple
if (!$correo || !$fecha_nacimiento || !$telefono || !$nombre) {
    die("Faltan datos");
}

$stmt = $conn->prepare("UPDATE usuario SET nombre = ?, apellido = ?, fecha_nacimiento = ?, telefono = ? WHERE correo = ?");
$stmt->bind_param("sssss",$nombre, $apellido, $fecha_nacimiento, $telefono, $correo);

if ($stmt->execute()) {
    header("Location: ../../pages/regis_login/login/login.html?msg=created");
    exit;
} else {
    echo "Error al guardar los datos.";
}
?>