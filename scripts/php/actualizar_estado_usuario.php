<?php
session_start();
header('Content-Type: application/json');

$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";

$conn = mysqli_connect($servername, $db_user, $db_pass, $database);

if (!$conn) {
    echo json_encode(["success" => false, "message" => "Error de conexión a la base de datos."]);
    exit;
}

mysqli_set_charset($conn, 'utf8mb4');

require_once __DIR__ . '/log_utils.php';
require_once __DIR__ . '/solicitudes_utils.php';

$data = json_decode(file_get_contents('php://input'), true);

$id_usuario = intval($data['id_usuario'] ?? 0);
$nuevoEstado = isset($data['activo']) ? intval($data['activo']) : null;
$id_empresa = intval($data['id_empresa'] ?? 0);
$forzarEjecucion = !empty($data['forzar_ejecucion']);
$forzarEjecucion = $forzarEjecucion || opti_usuario_actual_es_admin();

if (!$forzarEjecucion && !opti_solicitudes_habilitadas($conn)) {
    $forzarEjecucion = true;
}

if (!$id_usuario || ($nuevoEstado !== 0 && $nuevoEstado !== 1)) {
    echo json_encode(["success" => false, "message" => "Datos incompletos para actualizar el estado."]);
    exit;
}

$payload = [
    'id_usuario' => $id_usuario,
    'activo' => $nuevoEstado,
    'id_empresa' => $id_empresa
];

$idSolicitante = opti_resolver_id_solicitante($data, $payload);
$id_empresa = $id_empresa > 0 ? $id_empresa : opti_resolver_id_empresa($conn, $idSolicitante, $data, $payload);
$payload['id_empresa'] = $id_empresa;

if ($id_empresa <= 0) {
    echo json_encode([
        'success' => false,
        'message' => 'No se pudo determinar la empresa asociada al cambio solicitado.'
    ]);
    exit;
}

if ($forzarEjecucion) {
    if ($idSolicitante <= 0) {
        echo json_encode([
            'success' => false,
            'message' => 'No se puede aplicar el cambio porque falta el identificador del solicitante.'
        ]);
        exit;
    }

    $resultado = opti_aplicar_usuario_estado($conn, [
        'id_usuario' => $id_usuario,
        'activo' => $nuevoEstado,
        'id_empresa' => $id_empresa
    ], $idSolicitante);
    echo json_encode($resultado);
    exit;
}

$stmtUsuario = $conn->prepare('SELECT nombre, apellido FROM usuario WHERE id_usuario = ? LIMIT 1');
if ($stmtUsuario) {
    $stmtUsuario->bind_param('i', $id_usuario);
    $stmtUsuario->execute();
    $usuarioData = $stmtUsuario->get_result()->fetch_assoc();
    $stmtUsuario->close();
} else {
    $usuarioData = null;
}

$nombreUsuario = '';
if ($usuarioData) {
    $nombre = trim((string) ($usuarioData['nombre'] ?? ''));
    $apellido = trim((string) ($usuarioData['apellido'] ?? ''));
    $nombreUsuario = trim($nombre . ' ' . $apellido);
    if ($nombre !== '' || $apellido !== '') {
        $payload['nombre_usuario'] = $nombreUsuario !== '' ? $nombreUsuario : ($nombre ?: $apellido);
    }
}

$accionVerbo = $nuevoEstado === 1 ? 'Activar' : 'Desactivar';
$detalleUsuario = $nombreUsuario !== '' ? '"' . $nombreUsuario . '"' : 'ID #' . $id_usuario;

$resultadoSolicitud = opti_registrar_solicitud($conn, [
    'id_empresa' => $id_empresa,
    'id_solicitante' => $idSolicitante,
    'modulo' => 'Usuarios',
    'tipo_accion' => 'usuario_cambiar_estado',
    'resumen' => $accionVerbo . ' usuario ' . $detalleUsuario,
    'descripcion' => 'Cambio de estado de usuario solicitado.',
    'payload' => $payload
]);

opti_responder_solicitud_creada($resultadoSolicitud);
