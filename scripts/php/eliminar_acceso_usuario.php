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

$stmtUsuario = $conn->prepare('SELECT nombre, apellido FROM usuario WHERE id_usuario = ? LIMIT 1');
$nombreUsuario = '';
if ($stmtUsuario) {
    $stmtUsuario->bind_param('i', $idUsuario);
    $stmtUsuario->execute();
    $usuarioDatos = $stmtUsuario->get_result()->fetch_assoc();
    $stmtUsuario->close();
    if ($usuarioDatos) {
        $nombre = trim((string) ($usuarioDatos['nombre'] ?? ''));
        $apellido = trim((string) ($usuarioDatos['apellido'] ?? ''));
        $nombreUsuario = trim($nombre . ' ' . $apellido);
    }
}

$idEmpresa = 0;
$filaArea = null;
$stmtArea = $conn->prepare('SELECT id_empresa, nombre FROM areas WHERE id = ? LIMIT 1');
if ($stmtArea) {
    $stmtArea->bind_param('i', $idArea);
    $stmtArea->execute();
    $filaArea = $stmtArea->get_result()->fetch_assoc();
    if ($filaArea) {
        $idEmpresa = (int) ($filaArea['id_empresa'] ?? 0);
    }
    $stmtArea->close();
}

$nombreArea = trim((string) ($filaArea['nombre'] ?? ''));
$nombreZona = null;
if ($idZona !== null) {
    $stmtZona = $conn->prepare('SELECT nombre FROM zonas WHERE id = ? LIMIT 1');
    if ($stmtZona) {
        $stmtZona->bind_param('i', $idZona);
        $stmtZona->execute();
        $zonaData = $stmtZona->get_result()->fetch_assoc();
        $stmtZona->close();
        if ($zonaData) {
            $nombreZona = trim((string) ($zonaData['nombre'] ?? ''));
        }
    }
}

$idSolicitante = opti_resolver_id_solicitante($input, [
    'id_empresa' => $idEmpresa,
    'id_usuario' => $idUsuario,
    'id_area' => $idArea,
    'id_zona' => $idZona
]);
$idEmpresa = $idEmpresa > 0 ? $idEmpresa : opti_resolver_id_empresa($conn, $idSolicitante, $input, [
    'id_empresa' => $idEmpresa,
    'id_usuario' => $idUsuario,
    'id_area' => $idArea,
    'id_zona' => $idZona
]);

if (!$forzarEjecucion && opti_es_usuario_admin($conn, $idSolicitante, $input, [
    'id_empresa' => $idEmpresa,
    'id_usuario' => $idUsuario,
    'id_area' => $idArea,
    'id_zona' => $idZona
])) {
    $forzarEjecucion = true;
}

if ($forzarEjecucion && $idSolicitante <= 0) {
    jsonResponse(false, 'No se puede aplicar la revocación porque falta el identificador del solicitante.');
}

if (!$forzarEjecucion) {
    if (!opti_solicitudes_habilitadas($conn)) {
        $forzarEjecucion = true;
    }
}

if (!$forzarEjecucion) {
    $usuarioDetalle = $nombreUsuario !== '' ? '"' . $nombreUsuario . '" (ID #' . $idUsuario . ')' : 'ID #' . $idUsuario;
    if ($nombreUsuario === '' && $idUsuario <= 0) {
        $usuarioDetalle = 'usuario especificado';
    }

    if ($idZona === null) {
        $destinoNombre = $nombreArea !== '' ? '"' . $nombreArea . '" (ID #' . $idArea . ')' : 'ID #' . $idArea;
        $resumen = 'Revocar acceso del usuario ' . $usuarioDetalle . ' al área ' . $destinoNombre;
    } else {
        $destinoNombre = $nombreZona !== null && $nombreZona !== '' ? '"' . $nombreZona . '" (ID #' . $idZona . ')' : 'ID #' . $idZona;
        $resumen = 'Revocar acceso del usuario ' . $usuarioDetalle . ' a la zona ' . $destinoNombre;
    }

    $idEmpresaSolicitud = $idEmpresa ?: (int) ($input['id_empresa'] ?? 0);

    $resultadoSolicitud = opti_registrar_solicitud($conn, [
        'id_empresa' => $idEmpresaSolicitud,
        'id_solicitante' => $idSolicitante,
        'modulo' => 'Usuarios',
        'tipo_accion' => 'usuario_eliminar_acceso',
        'resumen' => $resumen,
        'descripcion' => 'Solicitud para revocar acceso a área o zona.',
        'payload' => [
            'id_usuario' => $idUsuario,
            'id_area' => $idArea,
            'id_zona' => $idZona,
            'id_empresa' => $idEmpresaSolicitud,
            'nombre_usuario' => $nombreUsuario,
            'nombre_area' => $nombreArea,
            'nombre_zona' => $nombreZona
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
