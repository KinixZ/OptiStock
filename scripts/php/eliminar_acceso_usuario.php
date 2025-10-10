<?php
session_start();
header('Content-Type: application/json');

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";

function jsonResponse($success, $message = '', $extra = []) {
    echo json_encode(array_merge(['success' => $success, 'message' => $message], $extra));
    exit;
}

try {
    $conn = new mysqli($servername, $db_user, $db_pass, $database);
    $conn->set_charset('utf8mb4');
} catch (mysqli_sql_exception $e) {
    jsonResponse(false, 'Error de conexión a la base de datos.');
}

require_once __DIR__ . '/solicitudes_utils.php';

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$idUsuario = isset($input['id_usuario']) ? (int) $input['id_usuario'] : 0;
$idArea = isset($input['id_area']) ? (int) $input['id_area'] : 0;
$idZonaRaw = $input['id_zona'] ?? null;
$idZona = ($idZonaRaw === '' || $idZonaRaw === null) ? null : (int) $idZonaRaw;
$forzarEjecucion = !empty($input['forzar_ejecucion']);

if ($idUsuario <= 0 || $idArea <= 0) {
    jsonResponse(false, 'Datos inválidos para eliminar la asignación.');
}

$compositeId = $idUsuario . ':' . $idArea . ':' . ($idZona === null ? 'null' : $idZona);

$idEmpresa = 0;
$stmtArea = $conn->prepare('SELECT id_empresa FROM areas WHERE id = ? LIMIT 1');
if ($stmtArea) {
    $stmtArea->bind_param('i', $idArea);
    $stmtArea->execute();
    $filaArea = $stmtArea->get_result()->fetch_assoc();
    if ($filaArea) {
        $idEmpresa = (int) ($filaArea['id_empresa'] ?? 0);
    }
    $stmtArea->close();
}

if (!$forzarEjecucion) {
    $resultadoSolicitud = opti_registrar_solicitud($conn, [
        'id_empresa' => $idEmpresa ?: (int) ($input['id_empresa'] ?? 0),
        'id_solicitante' => $_SESSION['usuario_id'] ?? 0,
        'modulo' => 'Usuarios',
        'tipo_accion' => 'usuario_eliminar_acceso',
        'resumen' => 'Eliminar acceso del usuario #' . $idUsuario . ' al área #' . $idArea,
        'descripcion' => 'Solicitud para revocar acceso a área o zona.',
        'payload' => [
            'id_usuario' => $idUsuario,
            'id_area' => $idArea,
            'id_zona' => $idZona
        ]
    ]);
    opti_responder_solicitud_creada($resultadoSolicitud);
}

try {
    if ($idZona === null) {
        $stmt = $conn->prepare('DELETE FROM usuario_area_zona WHERE id_usuario = ? AND id_area = ? AND id_zona IS NULL');
        $stmt->bind_param('ii', $idUsuario, $idArea);
    } else {
        $stmt = $conn->prepare('DELETE FROM usuario_area_zona WHERE id_usuario = ? AND id_area = ? AND id_zona = ?');
        $stmt->bind_param('iii', $idUsuario, $idArea, $idZona);
    }

    $stmt->execute();
    $filasAfectadas = $stmt->affected_rows;
    $stmt->close();

    if ($filasAfectadas <= 0) {
        jsonResponse(false, 'No se encontró la asignación que intentas eliminar.', [
            'composite_id' => $compositeId,
            'id_usuario' => $idUsuario,
            'id_area' => $idArea,
            'id_zona' => $idZona
        ]);
    }

    jsonResponse(true, 'Asignación eliminada correctamente.', [
        'composite_id' => $compositeId,
        'id_usuario' => $idUsuario,
        'id_area' => $idArea,
        'id_zona' => $idZona
    ]);
} catch (mysqli_sql_exception $e) {
    error_log('Error al eliminar acceso de usuario: ' . $e->getMessage());
    jsonResponse(false, 'No fue posible eliminar la asignación solicitada.');
}
