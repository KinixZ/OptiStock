<?php
require_once __DIR__ . '/log_utils.php';

$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";
$conn = mysqli_connect($servername, $db_user, $db_pass, $database);

if (!$conn) {
    echo json_encode(["success" => false, "message" => "Error de conexión a la base de datos."]);
    exit;
}

$correo = $_POST['correo'];
$nombre = $_POST['nombre'];
$apellido = $_POST['apellido'];
$fecha_nacimiento = $_POST['fecha_nacimiento'];
$telefono = $_POST['telefono'];

if (!$correo || !$fecha_nacimiento || !$telefono || !$nombre) {
    die("Faltan datos");
}

$stmt = $conn->prepare("UPDATE usuario SET nombre = ?, apellido = ?, fecha_nacimiento = ?, telefono = ? WHERE correo = ?");
$stmt->bind_param("sssss", $nombre, $apellido, $fecha_nacimiento, $telefono, $correo);

if ($stmt->execute()) {
    $stmtUser = $conn->prepare("SELECT id_usuario FROM usuario WHERE correo = ?");
    $stmtUser->bind_param('s', $correo);
    $stmtUser->execute();
    $resUser = $stmtUser->get_result();
    if ($resUser && $resUser->num_rows > 0) {
        $user = $resUser->fetch_assoc();
        registrarLog($conn, (int) $user['id_usuario'], 'Usuarios', 'Actualización de datos por registro con Google');
    }

    header("Location: ../../pages/regis_login/login/login.html?msg=created");
    exit;
}

echo "Error al guardar los datos.";

