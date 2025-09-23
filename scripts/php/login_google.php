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
$nombre = $data->nombre ?? 'Nombre';
$apellido = $data->apellido ?? 'Apellido';
$google_id = $data->google_id ?? '';
$foto_perfil = $data->picture ?? '';

if (!$correo || !$nombre || !$apellido || !$google_id) {
    echo json_encode(["success" => false, "message" => "Datos incompletos"]);
    exit;
}

// Verificar si el usuario ya existe
$check = $conn->prepare("SELECT id_usuario, nombre, fecha_nacimiento, telefono, rol, suscripcion, tutorial_visto, foto_perfil FROM usuario WHERE correo = ?");
$check->bind_param("s", $correo);
$check->execute();
$check->store_result();

if ($check->num_rows > 0) {
    $check->bind_result($id, $nom, $fecha, $tel, $rol, $suscripcion, $tutorialVisto, $foto_perfil);
    $check->fetch();

    $completo = $fecha !== "0000-00-00" && $tel !== "0000000000";

    $_SESSION['usuario_id'] = $id;
    $_SESSION['usuario_nombre'] = $nom;
    $_SESSION['usuario_correo'] = $correo;
    $_SESSION['usuario_rol'] = $rol;
    $_SESSION['usuario_suscripcion'] = $suscripcion;
    $_SESSION['tutorial_visto'] = (int) $tutorialVisto;

    $log = $conn->prepare("INSERT INTO registro_accesos (id_usuario, accion) VALUES (?, 'Inicio')");
    if ($log) {
        $log->bind_param("i", $id);
        $log->execute();
        $log->close();
    }

    echo json_encode([
        "success" => true,
        "completo" => $completo,
        "id" => $id,
        "nombre" => $nom,
        "correo" => $correo,
        "rol" => $rol,
        "suscripcion" => $suscripcion,
        "foto_perfil" => $foto_perfil,
        "tutorial_visto" => (int) $tutorialVisto
    ]);
} else {
    // Registrar usuario nuevo (el rol se asigna automáticamente por defecto)
    $fecha = "0000-00-00";
    $tel = "0000000000";
    $pass_fake = sha1("GOOGLE-" . $google_id);

    $insert = $conn->prepare("INSERT INTO usuario (nombre, apellido, fecha_nacimiento, telefono, correo, contrasena, verificacion_cuenta) VALUES (?, ?, ?, ?, ?, ?, 1)");
    $insert->bind_param("ssssss", $nombre, $apellido, $fecha, $tel, $correo, $pass_fake);

    if ($insert->execute()) {
        $id = $insert->insert_id;

        // Obtener el rol después del insert
        $getRol = $conn->prepare("SELECT rol FROM usuario WHERE id_usuario = ?");
        $getRol->bind_param("i", $id);
        $getRol->execute();
        $getRol->bind_result($rol);
        $getRol->fetch();
        $getRol->close();

        $_SESSION['usuario_id'] = $id;
        $_SESSION['usuario_nombre'] = $nombre;
        $_SESSION['usuario_correo'] = $correo;
        $_SESSION['usuario_rol'] = $rol;
        $_SESSION['tutorial_visto'] = 0;

        $log = $conn->prepare("INSERT INTO registro_accesos (id_usuario, accion) VALUES (?, 'Inicio')");
        if ($log) {
            $log->bind_param("i", $id);
            $log->execute();
            $log->close();
        }

        echo json_encode([
            "success" => true,
            "completo" => false,
            "id" => $id,
            "nombre" => $nombre,
            "correo" => $correo,
            "rol" => $rol,
            "foto_perfil" => $foto_perfil,
            "tutorial_visto" => 0
        ]);
    } else {
        echo json_encode(["success" => false, "message" => "Error al insertar usuario", "error" => $conn->error]);
    }
}
?>
