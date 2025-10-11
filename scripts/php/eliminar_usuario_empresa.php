<?php
session_start();
header('Content-Type: application/json');

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

$data = json_decode(file_get_contents("php://input"), true);
$correo = $data['correo'] ?? null;
$forzarEjecucion = !empty($data['forzar_ejecucion']);
$forzarEjecucion = $forzarEjecucion || opti_usuario_actual_es_admin();
$idEmpresa = isset($data['id_empresa']) ? (int) $data['id_empresa'] : 0;

if (!$correo) {
    echo json_encode(["success" => false, "message" => "Correo no proporcionado"]);
    exit;
}

$stmtUsuario = $conn->prepare('SELECT id_usuario, nombre, apellido FROM usuario WHERE correo = ? LIMIT 1');
$usuarioEncontrado = null;
if ($stmtUsuario) {
    $stmtUsuario->bind_param('s', $correo);
    $stmtUsuario->execute();
    $usuarioEncontrado = $stmtUsuario->get_result()->fetch_assoc();
    $stmtUsuario->close();
}

$usuarioId = $usuarioEncontrado ? (int) ($usuarioEncontrado['id_usuario'] ?? 0) : 0;
$nombreUsuario = '';
if ($usuarioEncontrado) {
    $nombre = trim((string) ($usuarioEncontrado['nombre'] ?? ''));
    $apellido = trim((string) ($usuarioEncontrado['apellido'] ?? ''));
    $nombreUsuario = trim($nombre . ' ' . $apellido);
}

$payload = [
    'correo' => $correo,
    'id_usuario' => $usuarioId,
    'nombre_usuario' => $nombreUsuario,
    'id_empresa' => $idEmpresa
];

$idSolicitante = opti_resolver_id_solicitante($data, $payload);
$idEmpresa = $idEmpresa > 0 ? $idEmpresa : opti_resolver_id_empresa($conn, $idSolicitante, $data, $payload);

if ($forzarEjecucion && $idSolicitante <= 0) {
    echo json_encode([
        'success' => false,
        'message' => 'No se puede aplicar la eliminación porque falta el identificador del solicitante.'
    ]);
    exit;
}

if (!$forzarEjecucion && !opti_solicitudes_habilitadas($conn)) {
    $forzarEjecucion = true;
}

if (!$forzarEjecucion && $idEmpresa <= 0) {
    echo json_encode([
        'success' => false,
        'message' => 'No se pudo determinar la empresa asociada a la solicitud.'
    ]);
    exit;
}

if ($forzarEjecucion) {
    $resultado = opti_aplicar_usuario_eliminar($conn, $payload, $idSolicitante);
    echo json_encode($resultado);
    exit;
}

$detalleNombre = $nombreUsuario !== '' ? '"' . $nombreUsuario . '"' : null;
$detalleId = $usuarioId > 0 ? 'ID #' . $usuarioId : null;
$partes = array_filter([$detalleNombre, $detalleId]);
$usuarioResumen = $partes ? implode(' · ', $partes) : 'con correo ' . $correo;

$resultadoSolicitud = opti_registrar_solicitud($conn, [
    'id_empresa' => $idEmpresa,
    'id_solicitante' => $idSolicitante,
    'modulo' => 'Usuarios',
    'tipo_accion' => 'usuario_eliminar',
    'resumen' => 'Eliminar usuario ' . ($partes ? $usuarioResumen . ' (correo ' . $correo . ')' : $usuarioResumen),
    'descripcion' => 'Solicitud de eliminación de cuenta de usuario.',
    'payload' => $payload
]);

opti_responder_solicitud_creada($resultadoSolicitud);

exit;
