<?php
header("Content-Type: application/json");

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";

require_once __DIR__ . '/accesos_utils.php';

try {
    $conn = new mysqli($servername, $db_user, $db_pass, $database);
    $conn->set_charset('utf8mb4');
} catch (mysqli_sql_exception $e) {
    echo json_encode(["success" => false, "message" => "Error de conexión"]);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$empresaId = intval($data['id_empresa'] ?? 0);
$usuarioId = intval($data['id_usuario'] ?? 0);

if ($usuarioId <= 0) {
    $usuarioId = obtenerUsuarioIdSesion() ?? 0;
}

$mapaAccesos = construirMapaAccesosUsuario($conn, $usuarioId);
$filtrarPorUsuario = debeFiltrarPorAccesos($mapaAccesos);

$resultado = [];

if ($empresaId) {
    $stmtAreas = $conn->prepare('SELECT * FROM areas WHERE id_empresa = ? ORDER BY id DESC');
    $stmtAreas->bind_param('i', $empresaId);
    $stmtAreas->execute();
    $areas = $stmtAreas->get_result();
} else {
    $areas = $conn->query('SELECT * FROM areas ORDER BY id DESC');
}

while ($area = $areas->fetch_assoc()) {
    $areaId = isset($area['id']) ? (int) $area['id'] : 0;

    if ($areaId <= 0) {
        continue;
    }

    if ($filtrarPorUsuario && !usuarioPuedeVerArea($mapaAccesos, $areaId)) {
        continue;
    }

    $zonas = [];

    if ($empresaId) {
        $zonas_query = $conn->prepare('SELECT * FROM zonas WHERE area_id = ? AND id_empresa = ?');
        $zonas_query->bind_param('ii', $areaId, $empresaId);
    } else {
        $zonas_query = $conn->prepare('SELECT * FROM zonas WHERE area_id = ?');
        $zonas_query->bind_param('i', $areaId);
    }

    $zonas_query->execute();
    $res = $zonas_query->get_result();

    while ($zona = $res->fetch_assoc()) {
        $zonaId = isset($zona['id']) ? (int) $zona['id'] : 0;
        if ($zonaId <= 0) {
            continue;
        }

        if (!usuarioPuedeVerZona($mapaAccesos, $areaId, $zonaId)) {
            continue;
        }

        $zonas[] = $zona;
    }

    $resultado[] = [
        "area" => $area,
        "zonas" => $zonas
    ];
}

echo json_encode(["success" => true, "data" => $resultado]);
$conn->close();
