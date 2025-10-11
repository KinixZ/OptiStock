<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: application/json');

require_once __DIR__ . '/log_utils.php';
require_once __DIR__ . '/solicitudes_utils.php';

$usuarioId = obtenerUsuarioIdSesion();
if (!$usuarioId) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "Sesión no válida"]);
    exit;
}

$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";

$conn = mysqli_connect($servername, $db_user, $db_pass, $database);
if (!$conn) {
    echo json_encode(["success" => false, "message" => "Error de conexión"]);
    exit;
}

$id_empresa     = $_POST['id_empresa']     ?? null;
$nombre_empresa = $_POST['nombre_empresa'] ?? null;
$sector_empresa = $_POST['sector_empresa'] ?? null;
$forzarEjecucion = isset($_POST['forzar_ejecucion']) && $_POST['forzar_ejecucion'] === '1';
$forzarEjecucion = $forzarEjecucion || opti_usuario_actual_es_admin();
$logoPendiente = $_POST['logo_pendiente'] ?? null;

if (!$id_empresa || !$nombre_empresa || !$sector_empresa) {
    echo json_encode(["success" => false, "message" => "Faltan datos obligatorios"]);
    exit;
}

// Logo actual
$stmt = $conn->prepare("SELECT logo_empresa FROM empresa WHERE id_empresa = ?");
$stmt->bind_param("i", $id_empresa);
$stmt->execute();
$stmt->bind_result($logo_actual);
$stmt->fetch();
$stmt->close();
$logo_empresa = $logo_actual;

// Logo nuevo (opcional)
if (isset($_FILES['logo_empresa']) && $_FILES['logo_empresa']['error'] === UPLOAD_ERR_OK && !$forzarEjecucion) {
    $archivoPendiente = opti_guardar_archivo_pendiente($_FILES['logo_empresa'], 'logos', 'logo_' . $id_empresa);
    if (!$archivoPendiente) {
        echo json_encode(["success" => false, "message" => "No se pudo preparar el logo para revisión"]);
        exit;
    }
    $logoPendiente = $archivoPendiente['ruta_relativa'];
}

if ($forzarEjecucion) {
    $payload = [
        'id_empresa' => (int) $id_empresa,
        'nombre_empresa' => $nombre_empresa,
        'sector_empresa' => $sector_empresa,
    ];
    if ($logoPendiente) {
        $payload['logo_pendiente'] = $logoPendiente;
    }
    $resultado = opti_aplicar_empresa_actualizar($conn, $payload, $usuarioId);
    echo json_encode($resultado);
    exit;
}

$payload = [
    'id_empresa' => (int) $id_empresa,
    'nombre_empresa' => $nombre_empresa,
    'sector_empresa' => $sector_empresa
];
if ($logoPendiente) {
    $payload['logo_pendiente'] = $logoPendiente;
}

$resultadoSolicitud = opti_registrar_solicitud($conn, [
    'id_empresa' => (int) $id_empresa,
    'id_solicitante' => $usuarioId,
    'modulo' => 'Empresa',
    'tipo_accion' => 'empresa_actualizar',
    'resumen' => 'Actualización de la empresa "' . $nombre_empresa . '" (ID #' . $id_empresa . ')',
    'descripcion' => 'Solicitud de actualización de datos de empresa.',
    'payload' => $payload
]);

opti_responder_solicitud_creada($resultadoSolicitud);
?>

