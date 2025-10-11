<?php
session_start();

$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";

$conn = mysqli_connect($servername, $db_user, $db_pass, $database);
if (!$conn) {
    echo json_encode(["success" => false, "message" => "Error de conexión"]);
    exit;
}

require_once __DIR__ . '/log_utils.php';
require_once __DIR__ . '/solicitudes_utils.php';

$usuarioAccionId = obtenerUsuarioIdSesion();
if (!$usuarioAccionId) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Sesión no válida']);
    exit;
}

$usuario_id = $_POST['id_usuario'] ?? null;
$nombre     = $_POST['nombre'] ?? null;
$apellido   = $_POST['apellido'] ?? null;
$telefono   = $_POST['telefono'] ?? null;
$correo     = $_POST['correo'] ?? null;
$contrasena = $_POST['contrasena'] ?? null;
$forzarEjecucion = isset($_POST['forzar_ejecucion']) && $_POST['forzar_ejecucion'] === '1';
$fotoPendiente = $_POST['foto_pendiente'] ?? null;
$solicitudesHabilitadas = opti_solicitudes_habilitadas($conn);

if (!$usuario_id || !$nombre || !$apellido || !$telefono || !$correo) {
    echo json_encode(['success' => false, 'message' => 'Faltan datos obligatorios']);
    exit;
}

$empresaId = 0;
$stmtEmpresa = $conn->prepare('SELECT id_empresa FROM usuario_empresa WHERE id_usuario = ? LIMIT 1');
if ($stmtEmpresa) {
    $stmtEmpresa->bind_param('i', $usuario_id);
    $stmtEmpresa->execute();
    $resEmpresa = $stmtEmpresa->get_result();
    $empresaFila = $resEmpresa->fetch_assoc();
    $empresaId = (int)($empresaFila['id_empresa'] ?? 0);
    $stmtEmpresa->close();
}

if ($empresaId <= 0 && isset($_SESSION['id_empresa'])) {
    $empresaId = (int) $_SESSION['id_empresa'];
}

if ($empresaId <= 0) {
    $forzarEjecucion = true;
}

$nombreCompleto = trim($nombre . ' ' . $apellido);

$payload = [
    'id_usuario' => (int) $usuario_id,
    'nombre' => $nombre,
    'apellido' => $apellido,
    'nombre_completo' => $nombreCompleto,
    'telefono' => $telefono,
    'correo' => $correo
];

if ($contrasena && strlen(trim($contrasena)) > 0) {
    $payload['contrasena_hash'] = strlen($contrasena) === 40 && preg_match('/^[a-f0-9]+$/i', $contrasena)
        ? $contrasena
        : sha1($contrasena);
}

if (isset($_FILES['foto_perfil']) && $_FILES['foto_perfil']['error'] === UPLOAD_ERR_OK) {
    $archivoPendiente = opti_guardar_archivo_pendiente($_FILES['foto_perfil'], 'perfiles', 'perfil_' . $usuario_id);
    if ($archivoPendiente) {
        $payload['foto_pendiente'] = $archivoPendiente['ruta_relativa'];
    }
}

if (!$forzarEjecucion && opti_es_usuario_admin($conn, $usuarioAccionId, $_POST, $payload)) {
    $forzarEjecucion = true;
}

if (!$forzarEjecucion && !$solicitudesHabilitadas) {
    $forzarEjecucion = true;
}

if ($forzarEjecucion) {
    if ($fotoPendiente) {
        $payload['foto_pendiente'] = $fotoPendiente;
    }
    $resultado = opti_aplicar_usuario_actualizar($conn, $payload, $usuarioAccionId);
    echo json_encode($resultado);
    exit;
}

try {
    $resultadoSolicitud = opti_registrar_solicitud($conn, [
        'id_empresa' => $empresaId,
        'id_solicitante' => $usuarioAccionId,
        'modulo' => 'Usuarios',
        'tipo_accion' => 'usuario_actualizar',
        'resumen' => 'Actualización de datos del usuario ' .
            ($nombreCompleto !== '' ? '"' . $nombreCompleto . '" ' : '') . '(ID #' . $usuario_id . ')',
        'descripcion' => 'Actualización solicitada desde la edición de perfil.',
        'payload' => $payload
    ]);
    opti_responder_solicitud_creada($resultadoSolicitud);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error: '.$e->getMessage()]);
}
?>
