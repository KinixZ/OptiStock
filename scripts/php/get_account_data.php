<?php
header('Content-Type: application/json');

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";

try {
    $conn = new mysqli($servername, $db_user, $db_pass, $database);
    $conn->set_charset('utf8mb4');
} catch (mysqli_sql_exception $e) {
    echo json_encode(["success" => false, "message" => "Error de conexión"]);
    exit;
}


$usuario_id = $_GET['usuario_id'] ?? $_POST['usuario_id'] ?? null;

if (!$usuario_id) {
    echo json_encode(['success' => false, 'message' => 'Falta usuario_id']);
    exit;
}

try {
    // Consulta usuario
    $stmt = $conn->prepare("SELECT id_usuario, nombre, apellido, fecha_nacimiento, telefono, correo, rol, fecha_registro, verificacion_cuenta, suscripcion, foto_perfil FROM usuario WHERE id_usuario = ?");
    $stmt->bind_param("i", $usuario_id);
    $stmt->execute();
    $res = $stmt->get_result();
    $usuario = $res->fetch_assoc();

    if (!$usuario) {
        echo json_encode(['success' => false, 'message' => 'Usuario no encontrado']);
        exit;
    }

// Buscar si el usuario es el CREADOR de la empresa
$stmt2 = $conn->prepare("SELECT id_empresa, nombre_empresa, logo_empresa, sector_empresa FROM empresa WHERE usuario_creador = ?");
$stmt2->bind_param("i", $usuario_id);
$stmt2->execute();
$res2 = $stmt2->get_result();
$empresa = $res2->fetch_assoc();

// Si NO es creador (empleado), buscar por relación en tabla intermedia
if (!$empresa) {
    $stmt3 = $conn->prepare("SELECT e.id_empresa, e.nombre_empresa, e.logo_empresa, e.sector_empresa FROM empresa e JOIN usuario_empresa ue ON e.id_empresa = ue.id_empresa WHERE ue.id_usuario = ?");
    $stmt3->bind_param("i", $usuario_id);
    $stmt3->execute();
    $res3 = $stmt3->get_result();
    $empresa = $res3->fetch_assoc();
}


    // Configuración empresa (sidebar colors, orden)
    $config = null;
    if ($empresa) {
        $stmt3 = $conn->prepare("SELECT color_sidebar, color_topbar, orden_sidebar FROM configuracion_empresa WHERE id_empresa = ?");
        $stmt3->bind_param("i", $empresa['id_empresa']);
        $stmt3->execute();
        $res3 = $stmt3->get_result();
        $config = $res3->fetch_assoc();
    }

    echo json_encode([
        'success' => true,
        'usuario' => $usuario,
        'empresa' => $empresa,
        'configuracion' => $config,
        'suscripcion' => $suscripcion
    ]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error: '.$e->getMessage()]);
}
