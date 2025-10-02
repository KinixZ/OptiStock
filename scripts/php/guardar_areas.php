<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";

try {
    $conn = new mysqli($servername, $db_user, $db_pass, $database);
    $conn->set_charset('utf8mb4');
} catch (mysqli_sql_exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error de conexión']);
    exit;
}

require_once __DIR__ . '/log_utils.php';
require_once __DIR__ . '/accesos_utils.php';
require_once __DIR__ . '/infraestructura_utils.php';

$method = $_SERVER['REQUEST_METHOD'];

function getJsonInput() {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    return $data ?: [];
}

function requireUserId()
{
    $usuarioId = obtenerUsuarioIdSesion();
    if (!$usuarioId) {
        http_response_code(401);
        echo json_encode(['error' => 'Sesión expirada']);
        exit;
    }

    return $usuarioId;
}

function obtenerEstadisticasAreas(mysqli $conn, array $areaIds): array
{
    $areaIds = array_values(array_filter(array_map('intval', $areaIds)));
    if (!$areaIds) {
        return [];
    }

    $placeholders = implode(',', array_fill(0, count($areaIds), '?'));
    $types = str_repeat('i', count($areaIds));

    $sql = "
        SELECT
            z.area_id,
            COUNT(DISTINCT p.id) AS productos,
            COALESCE(SUM(GREATEST(p.stock, 0)), 0) AS unidades,
            COALESCE(SUM(GREATEST(p.stock, 0) * COALESCE(p.dim_x, 0) * COALESCE(p.dim_y, 0) * COALESCE(p.dim_z, 0)), 0) AS volumen_cm3
        FROM zonas z
        LEFT JOIN productos p ON p.zona_id = z.id
        WHERE z.area_id IN ($placeholders)
        GROUP BY z.area_id
    ";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$areaIds);
    $stmt->execute();
    $result = $stmt->get_result();

    $mapa = [];
    while ($row = $result->fetch_assoc()) {
        $areaId = (int) ($row['area_id'] ?? 0);
        $mapa[$areaId] = [
            'productos' => (int) ($row['productos'] ?? 0),
            'unidades' => (int) ($row['unidades'] ?? 0),
            'volumen_cm3' => (float) ($row['volumen_cm3'] ?? 0.0),
        ];
    }

    $stmt->close();

    return $mapa;
}

if ($method === 'GET') {
    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
    $empresaId = isset($_GET['empresa_id']) ? intval($_GET['empresa_id']) : 0;

    $usuarioIdSesion = obtenerUsuarioIdSesion() ?? 0;
    $mapaAccesos = construirMapaAccesosUsuario($conn, $usuarioIdSesion);
    $filtrarPorAccesos = debeFiltrarPorAccesos($mapaAccesos);

    if ($id) {
        $stmt = $conn->prepare('SELECT * FROM areas WHERE id = ?');
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $res = $stmt->get_result();
        $area = $res->fetch_assoc() ?: [];
        if ($area) {
            $total = isset($area['volumen']) ? (float) $area['volumen'] : 0.0;
            $estadisticas = obtenerEstadisticasAreas($conn, [$area['id']]);
            $extra = $estadisticas[$area['id']] ?? ['productos' => 0, 'unidades' => 0, 'volumen_cm3' => 0.0];
            $utilizada = ((float) $extra['volumen_cm3']) / 1000000.0;
            $area['capacidad_utilizada'] = $utilizada;
            $area['capacidad_disponible'] = max($total - $utilizada, 0);
            $area['porcentaje_ocupacion'] = $total > 0 ? min(100, ($utilizada / $total) * 100) : 0;
            $area['productos_registrados'] = $extra['productos'];
            $area['total_unidades'] = $extra['unidades'];
        }

        if ($filtrarPorAccesos) {
            $puedeVer = usuarioPuedeVerArea($mapaAccesos, isset($area['id']) ? (int) $area['id'] : 0);
            if (!$puedeVer) {
                http_response_code(403);
                echo json_encode(['error' => 'No tienes acceso a esta área.']);
                exit;
            }
        }

        echo json_encode($area);
    } else {
        $areas = [];
        if ($empresaId) {
            $stmt = $conn->prepare('SELECT * FROM areas WHERE id_empresa = ?');
            $stmt->bind_param('i', $empresaId);
            $stmt->execute();
            $result = $stmt->get_result();
        } else {
            $result = $conn->query('SELECT * FROM areas');
        }

        while ($row = $result->fetch_assoc()) {
            if ($filtrarPorAccesos && !usuarioPuedeVerArea($mapaAccesos, isset($row['id']) ? (int) $row['id'] : 0)) {
                continue;
            }
            $areas[] = $row;
        }

        $estadisticas = obtenerEstadisticasAreas($conn, array_column($areas, 'id'));
        foreach ($areas as &$areaItem) {
            $total = isset($areaItem['volumen']) ? (float) $areaItem['volumen'] : 0.0;
            $extra = $estadisticas[$areaItem['id']] ?? ['productos' => 0, 'unidades' => 0, 'volumen_cm3' => 0.0];
            $utilizada = ((float) $extra['volumen_cm3']) / 1000000.0;
            $areaItem['capacidad_utilizada'] = $utilizada;
            $areaItem['capacidad_disponible'] = max($total - $utilizada, 0);
            $areaItem['porcentaje_ocupacion'] = $total > 0 ? min(100, ($utilizada / $total) * 100) : 0;
            $areaItem['productos_registrados'] = $extra['productos'];
            $areaItem['total_unidades'] = $extra['unidades'];
        }
        unset($areaItem);

        echo json_encode($areas);
    }
    exit;
}

if ($method === 'POST') {
    $usuarioId = requireUserId();
    $data = getJsonInput();
    $nombre = $data['nombre'] ?? '';
    $descripcion = $data['descripcion'] ?? '';
    $ancho = floatval($data['ancho'] ?? 0);
    $alto = floatval($data['alto'] ?? 0);
    $largo = floatval($data['largo'] ?? 0);
    $volumen = $ancho * $alto * $largo;
    $empresa_id = isset($data['empresa_id']) ? intval($data['empresa_id']) : 0;
    if (!$nombre || $empresa_id <= 0 || $ancho <= 0 || $alto <= 0 || $largo <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Datos incompletos o dimensiones inválidas']);
        exit;
    }

    if (!validarCapacidadContraAlmacen($conn, $empresa_id, $volumen)) {
        http_response_code(422);
        echo json_encode(['error' => 'El volumen del área supera la capacidad máxima registrada para el almacén.']);
        exit;
    }
    $stmt = $conn->prepare('INSERT INTO areas (nombre, descripcion, ancho, alto, largo, volumen, id_empresa) VALUES (?,?,?,?,?,?,?)');
    $stmt->bind_param('ssddddi', $nombre, $descripcion, $ancho, $alto, $largo, $volumen, $empresa_id);
    $stmt->execute();

    registrarLog($conn, $usuarioId, 'Áreas', "Creación de área: {$nombre}");

    actualizarOcupacionArea($conn, $stmt->insert_id);

    echo json_encode(['id' => $stmt->insert_id]);
    exit;
}

if ($method === 'PUT') {
    $usuarioId = requireUserId();
    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
    $empresaId = isset($_GET['empresa_id']) ? intval($_GET['empresa_id']) : 0;
    $data = getJsonInput();
    $nombre = $data['nombre'] ?? '';
    $descripcion = $data['descripcion'] ?? '';
    $ancho = floatval($data['ancho'] ?? 0);
    $alto = floatval($data['alto'] ?? 0);
    $largo = floatval($data['largo'] ?? 0);
    $volumen = $ancho * $alto * $largo;
    if (!$nombre || $ancho <= 0 || $alto <= 0 || $largo <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Datos incompletos o dimensiones inválidas']);
        exit;
    }

    $empresaValidacion = $empresaId ?: (isset($data['empresa_id']) ? intval($data['empresa_id']) : 0);
    if ($empresaValidacion > 0 && !validarCapacidadContraAlmacen($conn, $empresaValidacion, $volumen)) {
        http_response_code(422);
        echo json_encode(['error' => 'El volumen del área supera la capacidad máxima registrada para el almacén.']);
        exit;
    }

    if ($id > 0) {
        $volumenZonas = obtenerVolumenTotalZonas($conn, $id);
        if ($volumen < $volumenZonas) {
            http_response_code(409);
            echo json_encode(['error' => 'El volumen del área no puede ser menor al volumen ocupado por sus zonas.']);
            exit;
        }
    }
    if ($empresaId) {
        $stmt = $conn->prepare('UPDATE areas SET nombre=?, descripcion=?, ancho=?, alto=?, largo=?, volumen=? WHERE id=? AND id_empresa=?');
        $stmt->bind_param('ssddddii', $nombre, $descripcion, $ancho, $alto, $largo, $volumen, $id, $empresaId);
    } else {
        $stmt = $conn->prepare('UPDATE areas SET nombre=?, descripcion=?, ancho=?, alto=?, largo=?, volumen=? WHERE id=?');
        $stmt->bind_param('ssddddi', $nombre, $descripcion, $ancho, $alto, $largo, $volumen, $id);
    }
    $stmt->execute();

    registrarLog($conn, $usuarioId, 'Áreas', "Actualización de área ID: {$id}");

    if ($id) {
        actualizarOcupacionArea($conn, $id);
    }

    echo json_encode(['success' => $stmt->affected_rows > 0]);
    exit;
}

if ($method === 'DELETE') {
    $usuarioId = requireUserId();
    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
    $empresaId = isset($_GET['empresa_id']) ? intval($_GET['empresa_id']) : 0;

    $zonasDesasignadas = 0;

    try {
        $conn->begin_transaction();

        if ($empresaId) {
            $stmtArea = $conn->prepare('SELECT id FROM areas WHERE id = ? AND id_empresa = ?');
            $stmtArea->bind_param('ii', $id, $empresaId);
        } else {
            $stmtArea = $conn->prepare('SELECT id FROM areas WHERE id = ?');
            $stmtArea->bind_param('i', $id);
        }

        $stmtArea->execute();
        $stmtArea->store_result();

        if ($stmtArea->num_rows === 0) {
            $stmtArea->close();
            $conn->rollback();
            http_response_code(404);
            echo json_encode(['error' => 'Área no encontrada.']);
            exit;
        }

        $stmtArea->close();

        $stmt = $conn->prepare('SELECT COUNT(*) FROM productos WHERE zona_id IN (SELECT id FROM zonas WHERE area_id = ?)');
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $stmt->bind_result($productosEnZonas);
        $stmt->fetch();
        $stmt->close();

        if ($productosEnZonas > 0) {
            $conn->rollback();
            http_response_code(409);
            echo json_encode(['error' => 'No se puede eliminar el área porque existen productos asignados en sus zonas. Reubica los productos antes de eliminar el área.']);
            exit;
        }

        $stmt = $conn->prepare('UPDATE zonas SET area_id = NULL WHERE area_id = ?');
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $zonasDesasignadas = max($stmt->affected_rows, 0);
        $stmt->close();

        if ($empresaId) {
            $stmt = $conn->prepare('DELETE FROM areas WHERE id=? AND id_empresa=?');
            $stmt->bind_param('ii', $id, $empresaId);
        } else {
            $stmt = $conn->prepare('DELETE FROM areas WHERE id=?');
            $stmt->bind_param('i', $id);
        }
        $stmt->execute();
        $stmt->close();

        $conn->commit();

        registrarLog($conn, $usuarioId, 'Áreas', "Eliminación de área ID: {$id}");

        echo json_encode(['success' => true, 'zonas_desasignadas' => $zonasDesasignadas]);
        exit;
    } catch (mysqli_sql_exception $e) {
        $conn->rollback();
        http_response_code(500);
        echo json_encode(['error' => 'Error al eliminar el área.']);
        exit;
    }
}

http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);



