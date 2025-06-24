<?php
session_start();
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
$nombreGoogle = $data->nombre ?? '';
$apellidoGoogle = $data->apellido ?? '';
$google_id = $data->google_id ?? '';

if (!$correo || !$nombreGoogle || !$apellidoGoogle || !$google_id) {
    echo json_encode(["success" => false, "message" => "Datos incompletos"]);
    exit;
}

// Verificar si el usuario ya existe
$check = $conn->prepare("SELECT id_usuario, nombre, apellido, fecha_nacimiento, telefono, rol FROM usuario WHERE correo = ?");
$check->bind_param("s", $correo);
$check->execute();
$check->store_result();

if ($check->num_rows > 0) {
    $check->bind_result($id, $nombreDB, $apellidoDB, $fecha, $tel, $rol);
    $check->fetch();

    $completo = $fecha !== "0000-00-00" && $tel !== "0000000000";

    $_SESSION['usuario_id'] = $id;
    $_SESSION['usuario_nombre'] = $nombreDB . ' ' . $apellidoDB;
    $_SESSION['usuario_correo'] = $correo;
    $_SESSION['usuario_rol'] = $rol;

    echo json_encode([
        "success" => true,
        "completo" => $completo,
        "id" => $id,
        "rol" => $rol,
        "nombre" => $nombreDB . ' ' . $apellidoDB
    ]);
} else {
    // Registrar usuario nuevo
    $fecha = "0000-00-00";
    $tel = "0000000000";
    $pass_fake = sha1("GOOGLE-" . $google_id);

    $insert = $conn->prepare("INSERT INTO usuario (nombre, apellido, fecha_nacimiento, telefono, correo, contrasena, verificacion_cuenta) VALUES (?, ?, ?, ?, ?, ?, 1)");
    $insert->bind_param("ssssss", $nombreGoogle, $apellidoGoogle, $fecha, $tel, $correo, $pass_fake);

    if ($insert->execute()) {
        $id = $insert->insert_id;

        // Obtener rol desde la DB
        $getRol = $conn->prepare("SELECT rol FROM usuario WHERE id_usuario = ?");
        $getRol->bind_param("i", $id);
        $getRol->execute();
        $getRol->bind_result($rol);
        $getRol->fetch();
        $getRol->close();

        $_SESSION['usuario_id'] = $id;
        $_SESSION['usuario_nombre'] = $nombreGoogle . ' ' . $apellidoGoogle;
        $_SESSION['usuario_correo'] = $correo;
        $_SESSION['usuario_rol'] = $rol;

        echo json_encode([
            "success" => true,
            "completo" => false,
            "id" => $id,
            "rol" => $rol,
            "nombre" => $nombreGoogle . ' ' . $apellidoGoogle
        ]);
    } else {
        echo json_encode(["success" => false, "message" => "Error al insertar usuario", "error" => $conn->error]);
    }
}
?>
