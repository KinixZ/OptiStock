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
    if (!$nombre || $empresa_id <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Datos incompletos']);
        exit;
    }
    $stmt = $conn->prepare('INSERT INTO areas (nombre, descripcion, ancho, alto, largo, volumen, id_empresa) VALUES (?,?,?,?,?,?,?)');
    $stmt->bind_param('ssddddi', $nombre, $descripcion, $ancho, $alto, $largo, $volumen, $empresa_id);
    $stmt->execute();

    registrarLog($conn, $usuarioId, 'Áreas', "Creación de área: {$nombre}");

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
    if ($empresaId) {
        $stmt = $conn->prepare('UPDATE areas SET nombre=?, descripcion=?, ancho=?, alto=?, largo=?, volumen=? WHERE id=? AND id_empresa=?');
        $stmt->bind_param('ssddddii', $nombre, $descripcion, $ancho, $alto, $largo, $volumen, $id, $empresaId);
    } else {
        $stmt = $conn->prepare('UPDATE areas SET nombre=?, descripcion=?, ancho=?, alto=?, largo=?, volumen=? WHERE id=?');
        $stmt->bind_param('ssddddi', $nombre, $descripcion, $ancho, $alto, $largo, $volumen, $id);
    }
    $stmt->execute();

    registrarLog($conn, $usuarioId, 'Áreas', "Actualización de área ID: {$id}");

    echo json_encode(['success' => $stmt->affected_rows > 0]);
    exit;
}

if ($method === 'DELETE') {
    $usuarioId = requireUserId();
    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
    $empresaId = isset($_GET['empresa_id']) ? intval($_GET['empresa_id']) : 0;
    if ($empresaId) {
        $stmt = $conn->prepare('DELETE FROM areas WHERE id=? AND id_empresa=?');
        $stmt->bind_param('ii', $id, $empresaId);
    } else {
        $stmt = $conn->prepare('DELETE FROM areas WHERE id=?');
        $stmt->bind_param('i', $id);
    }
    $stmt->execute();

    registrarLog($conn, $usuarioId, 'Áreas', "Eliminación de área ID: {$id}");

    echo json_encode(['success' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);



