<?php
session_start();
header('Content-Type: application/json');

// Conexión a la base de datos
$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";

$conn = mysqli_connect($servername, $db_user, $db_pass, $database);

if (!$conn) {
    echo json_encode(["success" => false, "message" => "Error de conexión a la base de datos."]);
    exit;
}

require_once __DIR__ . '/log_utils.php';
require_once __DIR__ . '/solicitudes_utils.php';

// Obtener datos del request
$data = json_decode(file_get_contents("php://input"), true);

$id_usuario       = intval($data['id_usuario']);
$nombre           = $data['nombre'];
$apellido         = $data['apellido'];
$telefono         = $data['telefono'];
$fecha_nacimiento = $data['fecha_nacimiento'];
$rol              = $data['rol'];
$forzarEjecucion  = !empty($data['forzar_ejecucion']);

if (!$id_usuario) {
    echo json_encode(["success" => false, "message" => "ID de usuario inválido."]);
    exit;
}

$payload = [
    'id_usuario' => $id_usuario,
    'nombre' => $nombre,
    'apellido' => $apellido,
    'telefono' => $telefono,
    'fecha_nacimiento' => $fecha_nacimiento,
    'rol' => $rol
];

if ($forzarEjecucion) {
    $resultado = opti_aplicar_usuario_editar($conn, $payload, $_SESSION['usuario_id'] ?? 0);
    echo json_encode($resultado);
    exit;
}

$idEmpresa = 0;
$stmtEmpresa = $conn->prepare('SELECT id_empresa FROM usuario_empresa WHERE id_usuario = ? LIMIT 1');
if ($stmtEmpresa) {
    $stmtEmpresa->bind_param('i', $id_usuario);
    $stmtEmpresa->execute();
    $filaEmpresa = $stmtEmpresa->get_result()->fetch_assoc();
    if ($filaEmpresa) {
        $idEmpresa = (int) ($filaEmpresa['id_empresa'] ?? 0);
    }
    $stmtEmpresa->close();
}

$resultadoSolicitud = opti_registrar_solicitud($conn, [
    'id_empresa' => $idEmpresa,
    'id_solicitante' => $_SESSION['usuario_id'] ?? 0,
    'modulo' => 'Usuarios',
    'tipo_accion' => 'usuario_editar_datos',
    'resumen' => 'Actualizar datos internos del usuario #' . $id_usuario,
    'descripcion' => 'Solicitud de edición de datos de usuario desde administración.',
    'payload' => $payload
]);

opti_responder_solicitud_creada($resultadoSolicitud);
