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

header("Content-Type: application/json");

$data = json_decode(file_get_contents("php://input"));

$correo = $data->email ?? '';
$nombre = $data->nombre ?? 'Nombre';
$apellido = $data->apellido ?? 'Apellido';
$google_id = $data->google_id ?? '';

if (!$correo || !$nombre || !$apellido || !$google_id) {
    echo json_encode(["success" => false, "message" => "Datos incompletos"]);
    exit;
}

// Verificar si el usuario ya existe
$check = $conn->prepare("SELECT id_usuario, fecha_nacimiento, telefono FROM usuario WHERE correo = ?");
$check->bind_param("s", $correo);
$check->execute();
$check->store_result();

if ($check->num_rows > 0) {
    $check->bind_result($id, $fecha, $tel);
    $check->fetch();

    $completo = $fecha !== "0000-00-00" && $tel !== "0000000000";

    echo json_encode(["success" => true, "completo" => $completo]);
} else {
    // Registrar usuario nuevo
    $fecha = "0000-00-00";
    $tel = "0000000000";
    $pass_fake = sha1("GOOGLE-" . $google_id);

    $insert = $conn->prepare("INSERT INTO usuario (nombre, apellido, fecha_nacimiento, telefono, correo, contrasena, verificacion_cuenta) VALUES (?, ?, ?, ?, ?, ?, 1)");
    $insert->bind_param("ssssss", $nombre, $apellido, $fecha, $tel, $correo, $pass_fake);

    if ($insert->execute()) {
        echo json_encode(["success" => true, "completo" => false]);
    } else {
        echo json_encode(["success" => false, "message" => "Error al insertar usuario", "error" => $conn->error]);
    }
}
?>
