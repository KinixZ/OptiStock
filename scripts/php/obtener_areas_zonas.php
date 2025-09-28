<?php
header("Content-Type: application/json");

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
// Conexión a la base de datos (se usan las mismas credenciales que en otros scripts)
$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";

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
$resultado = [];
$accesosPorArea = [];

if ($usuarioId > 0) {
    $stmtAccesos = $conn->prepare('SELECT id_area, id_zona FROM usuario_area_zona WHERE id_usuario = ?');
    $stmtAccesos->bind_param('i', $usuarioId);
    $stmtAccesos->execute();
    $resAccesos = $stmtAccesos->get_result();

    while ($fila = $resAccesos->fetch_assoc()) {
        $areaId = (int) $fila['id_area'];
        if (!array_key_exists($areaId, $accesosPorArea)) {
            $accesosPorArea[$areaId] = [];
        }

        if ($fila['id_zona'] === null) {
            $accesosPorArea[$areaId] = null; // Acceso completo a la zona
            continue;
        }

        if (is_array($accesosPorArea[$areaId])) {
            $zonaId = (int) $fila['id_zona'];
            if (!in_array($zonaId, $accesosPorArea[$areaId], true)) {
                $accesosPorArea[$areaId][] = $zonaId;
            }
        }
    }

    $stmtAccesos->close();
}

$filtrarPorUsuario = $usuarioId > 0 && !empty($accesosPorArea);

if ($empresaId) {
    $stmtAreas = $conn->prepare('SELECT * FROM areas WHERE id_empresa = ? ORDER BY id DESC');
    $stmtAreas->bind_param('i', $empresaId);
    $stmtAreas->execute();
    $areas = $stmtAreas->get_result();
} else {
    $areas = $conn->query('SELECT * FROM areas ORDER BY id DESC');
}
while ($area = $areas->fetch_assoc()) {
    $area_id = $area['id'];
    if ($filtrarPorUsuario && !array_key_exists($area_id, $accesosPorArea)) {
        continue;
    }

    $zonasPermitidas = $filtrarPorUsuario ? $accesosPorArea[$area_id] : null;
    $zonas = [];

    // Obtener zonas asociadas a la área
    if ($empresaId) {
        $zonas_query = $conn->prepare('SELECT * FROM zonas WHERE area_id = ? AND id_empresa = ?');
        $zonas_query->bind_param('ii', $area_id, $empresaId);
    } else {
        $zonas_query = $conn->prepare('SELECT * FROM zonas WHERE area_id = ?');
        $zonas_query->bind_param('i', $area_id);
    }
    $zonas_query->execute();
    $res = $zonas_query->get_result();
    while ($zona = $res->fetch_assoc()) {
        if (is_array($zonasPermitidas) && !in_array((int) $zona['id'], $zonasPermitidas, true)) {
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
