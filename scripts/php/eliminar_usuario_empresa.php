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
$idEmpresa = isset($data['id_empresa']) ? (int) $data['id_empresa'] : 0;

if (!$correo) {
    echo json_encode(["success" => false, "message" => "Correo no proporcionado"]);
    exit;
}

$payload = [
    'correo' => $correo
];

if ($forzarEjecucion) {
    $resultado = opti_aplicar_usuario_eliminar($conn, $payload, $_SESSION['usuario_id'] ?? 0);
    echo json_encode($resultado);
    exit;
}

$resultadoSolicitud = opti_registrar_solicitud($conn, [
    'id_empresa' => $idEmpresa,
    'id_solicitante' => $_SESSION['usuario_id'] ?? 0,
    'modulo' => 'Usuarios',
    'tipo_accion' => 'usuario_eliminar',
    'resumen' => 'Eliminar usuario con correo ' . $correo,
    'descripcion' => 'Solicitud de eliminación de cuenta de usuario.',
    'payload' => $payload
]);

opti_responder_solicitud_creada($resultadoSolicitud);

exit;
