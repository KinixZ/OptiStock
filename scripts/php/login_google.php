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

    $idEmpresa = null;
    $empresaNombre = null;

    $stmtEmpresa = $conn->prepare("SELECT id_empresa, nombre_empresa FROM empresa WHERE usuario_creador = ? LIMIT 1");
    if ($stmtEmpresa) {
        $stmtEmpresa->bind_param("i", $id);
        $stmtEmpresa->execute();
        $resEmpresa = $stmtEmpresa->get_result();
        if ($resEmpresa && $resEmpresa->num_rows > 0) {
            $empresa = $resEmpresa->fetch_assoc();
            $idEmpresa = isset($empresa['id_empresa']) ? (int) $empresa['id_empresa'] : null;
            $empresaNombre = $empresa['nombre_empresa'] ?? null;
        }
        $stmtEmpresa->close();
    }

    if (!$idEmpresa) {
        $stmtAfiliacion = $conn->prepare("SELECT e.id_empresa, e.nombre_empresa FROM usuario_empresa ue INNER JOIN empresa e ON ue.id_empresa = e.id_empresa WHERE ue.id_usuario = ? LIMIT 1");
        if ($stmtAfiliacion) {
            $stmtAfiliacion->bind_param("i", $id);
            $stmtAfiliacion->execute();
            $resAfiliacion = $stmtAfiliacion->get_result();
            if ($resAfiliacion && $resAfiliacion->num_rows > 0) {
                $empresa = $resAfiliacion->fetch_assoc();
                $idEmpresa = isset($empresa['id_empresa']) ? (int) $empresa['id_empresa'] : null;
                $empresaNombre = $empresa['nombre_empresa'] ?? null;
            }
            $stmtAfiliacion->close();
        }
    }

    $_SESSION['id_empresa'] = $idEmpresa;
    $_SESSION['empresa_nombre'] = $empresaNombre;

    echo json_encode([
        "success" => true,
        "completo" => $completo,
        "id" => $id,
        "nombre" => $nom,
        "correo" => $correo,
        "rol" => $rol,
        "suscripcion" => $suscripcion,
        "foto_perfil" => $foto_perfil,
        "tutorial_visto" => (int) $tutorialVisto,
        "id_empresa" => $idEmpresa,
        "empresa_nombre" => $empresaNombre
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

        $_SESSION['id_empresa'] = null;
        $_SESSION['empresa_nombre'] = null;

        echo json_encode([
            "success" => true,
            "completo" => false,
            "id" => $id,
            "nombre" => $nombre,
            "correo" => $correo,
            "rol" => $rol,
            "foto_perfil" => $foto_perfil,
            "tutorial_visto" => 0,
            "suscripcion" => null,
            "id_empresa" => null,
            "empresa_nombre" => null
        ]);
    } else {
        echo json_encode(["success" => false, "message" => "Error al insertar usuario", "error" => $conn->error]);
    }
}
?>
