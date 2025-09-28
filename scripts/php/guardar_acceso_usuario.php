<?php
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

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$idUsuario = isset($input['id_usuario']) ? (int) $input['id_usuario'] : 0;
$idArea    = isset($input['id_area']) ? (int) $input['id_area'] : 0;
$idZonaRaw = $input['id_zona'] ?? null;
$idZona    = ($idZonaRaw === '' || $idZonaRaw === null) ? null : (int) $idZonaRaw;
$compositeId = $idUsuario . ':' . $idArea . ':' . ($idZona === null ? 'null' : $idZona);

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

    $stmtUsuarioEmpresa = $conn->prepare('SELECT 1 FROM usuario_empresa WHERE id_usuario = ? AND id_empresa = ? LIMIT 1');
    $stmtUsuarioEmpresa->bind_param('ii', $idUsuario, $idEmpresa);
    $stmtUsuarioEmpresa->execute();
    $usuarioEmpresa = $stmtUsuarioEmpresa->get_result()->fetch_assoc();
    $stmtUsuarioEmpresa->close();

    if (!$usuarioEmpresa) {
        jsonResponse(false, 'El usuario no pertenece a la empresa de esta área.');
    }

    $zonaNombre = null;
    if ($idZona !== null) {
        $stmtZona = $conn->prepare('SELECT id, area_id, nombre FROM zonas WHERE id = ? LIMIT 1');
        $stmtZona->bind_param('i', $idZona);
        $stmtZona->execute();
        $zona = $stmtZona->get_result()->fetch_assoc();
        $stmtZona->close();

        if (!$zona) {
            jsonResponse(false, 'La zona seleccionada no existe.');
        }

        if ((int) $zona['area_id'] !== $idArea) {
            jsonResponse(false, 'La zona seleccionada no pertenece al área indicada.');
        }

        $zonaNombre = $zona['nombre'];

        $stmtAccesoTotal = $conn->prepare('SELECT id FROM usuario_area_zona WHERE id_usuario = ? AND id_area = ? AND id_zona IS NULL LIMIT 1');
        $stmtAccesoTotal->bind_param('ii', $idUsuario, $idArea);
        $stmtAccesoTotal->execute();
        $accesoTotal = $stmtAccesoTotal->get_result()->fetch_assoc();
        $stmtAccesoTotal->close();

        if ($accesoTotal) {
            jsonResponse(false, 'El usuario ya tiene acceso completo a todas las zonas de esta área.');
        }
    }

    if ($idZona === null) {
        $stmtExiste = $conn->prepare('SELECT 1 FROM usuario_area_zona WHERE id_usuario = ? AND id_area = ? AND id_zona IS NULL LIMIT 1');
        $stmtExiste->bind_param('ii', $idUsuario, $idArea);
    } else {
        $stmtExiste = $conn->prepare('SELECT 1 FROM usuario_area_zona WHERE id_usuario = ? AND id_area = ? AND id_zona = ? LIMIT 1');
        $stmtExiste->bind_param('iii', $idUsuario, $idArea, $idZona);
    }

    $stmtExiste->execute();
    $existe = $stmtExiste->get_result()->fetch_assoc();
    $stmtExiste->close();

    if ($existe) {
        jsonResponse(false, 'La asignación seleccionada ya existe.', ['composite_id' => $compositeId]);
    }

    if ($idZona === null) {
        $stmtInsert = $conn->prepare('INSERT INTO usuario_area_zona (id_usuario, id_area, id_zona) VALUES (?, ?, NULL)');
        $stmtInsert->bind_param('ii', $idUsuario, $idArea);
    } else {
        $stmtInsert = $conn->prepare('INSERT INTO usuario_area_zona (id_usuario, id_area, id_zona) VALUES (?, ?, ?)');
        $stmtInsert->bind_param('iii', $idUsuario, $idArea, $idZona);
    }

    $stmtInsert->execute();
    $stmtInsert->close();

    $mensajeExito = $idZona === null
        ? 'Se otorgó acceso a todas las zonas del área seleccionada.'
        : 'Se otorgó acceso a la zona seleccionada.';

    $acceso = [
        'composite_id' => $compositeId,
        'id_usuario' => $idUsuario,
        'id_area' => $idArea,
        'area' => $area['nombre'],
        'id_zona' => $idZona,
        'zona' => $zonaNombre
    ];

    jsonResponse(true, $mensajeExito, ['acceso' => $acceso]);
} catch (mysqli_sql_exception $e) {
    error_log('Error al guardar acceso de usuario: ' . $e->getMessage());
    jsonResponse(false, 'No fue posible guardar la asignación solicitada.');
}
