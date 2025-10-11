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
$idArea    = isset($input['id_area']) ? (int) $input['id_area'] : 0;
$forzarEjecucion = !empty($input['forzar_ejecucion']);
$compositeId = $idUsuario . ':' . $idArea . ':null';
$transaccionActiva = false;

if ($idUsuario <= 0 || $idArea <= 0) {
    jsonResponse(false, 'Datos incompletos. Selecciona al menos un área.');
}

try {
    $stmtArea = $conn->prepare('SELECT id_empresa, nombre FROM areas WHERE id = ?');
    $stmtArea->bind_param('i', $idArea);
    $stmtArea->execute();
    $areaResult = $stmtArea->get_result();
    $area = $areaResult->fetch_assoc();
    $stmtArea->close();

    if (!$area) {
        jsonResponse(false, 'El área seleccionada no existe.');
    }

    $idEmpresa = (int) $area['id_empresa'];

    $idSolicitante = opti_resolver_id_solicitante($input, [
        'id_empresa' => $idEmpresa,
        'id_usuario' => $idUsuario,
        'id_area' => $idArea
    ]);
    $idEmpresa = $idEmpresa > 0 ? $idEmpresa : opti_resolver_id_empresa($conn, $idSolicitante, $input, [
        'id_empresa' => $idEmpresa,
        'id_usuario' => $idUsuario,
        'id_area' => $idArea
    ]);

    if ($forzarEjecucion && $idSolicitante <= 0) {
        jsonResponse(false, 'No se puede aplicar la asignación porque falta el identificador del solicitante.');
    }

    $stmtUsuarioEmpresa = $conn->prepare('SELECT 1 FROM usuario_empresa WHERE id_usuario = ? AND id_empresa = ? LIMIT 1');
    $stmtUsuarioEmpresa->bind_param('ii', $idUsuario, $idEmpresa);
    $stmtUsuarioEmpresa->execute();
    $usuarioEmpresa = $stmtUsuarioEmpresa->get_result()->fetch_assoc();
    $stmtUsuarioEmpresa->close();

    if (!$usuarioEmpresa) {
        jsonResponse(false, 'El usuario no pertenece a la empresa de esta área.');
    }

    if (!$forzarEjecucion && !opti_solicitudes_habilitadas($conn)) {
        $forzarEjecucion = true;
    }

    $zonaNombre = null;

    $stmtExiste = $conn->prepare('SELECT 1 FROM usuario_area_zona WHERE id_usuario = ? AND id_area = ? AND id_zona IS NULL LIMIT 1');
    $stmtExiste->bind_param('ii', $idUsuario, $idArea);

    $stmtExiste->execute();
    $existe = $stmtExiste->get_result()->fetch_assoc();
    $stmtExiste->close();

    if ($existe) {
        jsonResponse(false, 'La asignación seleccionada ya existe.', ['composite_id' => $compositeId]);
    }

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

    if (!$forzarEjecucion) {
        $detalleUsuario = $nombreUsuario !== '' ? '"' . $nombreUsuario . '" (ID #' . $idUsuario . ')' : 'ID #' . $idUsuario;
        $detalleArea = $area['nombre'] !== '' ? '"' . $area['nombre'] . '" (ID #' . $idArea . ')' : 'ID #' . $idArea;

        $resultadoSolicitud = opti_registrar_solicitud($conn, [
            'id_empresa' => $idEmpresa,
            'id_solicitante' => $idSolicitante,
            'modulo' => 'Usuarios',
            'tipo_accion' => 'usuario_asignar_area',
            'resumen' => 'Asignar área ' . $detalleArea . ' al usuario ' . $detalleUsuario,
            'descripcion' => 'Solicitud de asignación de acceso a área.',
            'payload' => [
                'id_usuario' => $idUsuario,
                'id_area' => $idArea,
                'id_empresa' => $idEmpresa,
                'nombre_usuario' => $nombreUsuario,
                'nombre_area' => $area['nombre']
            ]
        ]);
        opti_responder_solicitud_creada($resultadoSolicitud);
    }

    $conn->begin_transaction();
    $transaccionActiva = true;

    $stmtEliminarZonas = $conn->prepare('DELETE FROM usuario_area_zona WHERE id_usuario = ? AND id_area = ? AND id_zona IS NOT NULL');
    $stmtEliminarZonas->bind_param('ii', $idUsuario, $idArea);
    $stmtEliminarZonas->execute();
    $stmtEliminarZonas->close();

    $stmtInsert = $conn->prepare('INSERT INTO usuario_area_zona (id_usuario, id_area, id_zona) VALUES (?, ?, NULL)');
    $stmtInsert->bind_param('ii', $idUsuario, $idArea);

    $stmtInsert->execute();
    $stmtInsert->close();

    $conn->commit();
    $transaccionActiva = false;

    $mensajeExito = 'Se otorgó acceso al área seleccionada.';

    $acceso = [
        'composite_id' => $compositeId,
        'id_usuario' => $idUsuario,
        'id_area' => $idArea,
        'area' => $area['nombre'],
        'id_zona' => null,
        'zona' => $zonaNombre
    ];

    jsonResponse(true, $mensajeExito, ['acceso' => $acceso]);
} catch (mysqli_sql_exception $e) {
    if (isset($conn) && $conn instanceof mysqli && $transaccionActiva) {
        $conn->rollback();
        $transaccionActiva = false;
    }

    $errorCode = (int) $e->getCode();
    if ($errorCode === 1062) {
        jsonResponse(false, 'La asignación seleccionada ya existe.', ['composite_id' => $compositeId]);
    }

    if ($errorCode === 1452) {
        jsonResponse(false, 'El área seleccionada ya no está disponible.');
    }

    error_log('Error al guardar acceso de usuario: ' . $e->getMessage());
    jsonResponse(false, 'No fue posible guardar la asignación solicitada.');
}
