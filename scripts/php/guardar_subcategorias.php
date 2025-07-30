<?php
header('Content-Type: application/json');
session_start();
$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";

$conn = new mysqli($servername, $db_user, $db_pass, $database);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(['error' => 'Error de conexión']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

function getJsonInput() {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    return $data ?: [];
}

function getEmpresaId($fromQuery = false) {
    if ($fromQuery && isset($_GET['empresa_id'])) {
        $id = intval($_GET['empresa_id']);
        if ($id > 0) return $id;
    }
    if (isset($_SESSION['id_empresa'])) {
        return intval($_SESSION['id_empresa']);
    }
    return 0;
}

if ($method === 'GET') {
    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
    $empresaId = getEmpresaId(true);
    if ($id) {
        if ($empresaId) {
            $stmt = $conn->prepare('SELECT * FROM subcategorias WHERE id = ? AND id_empresa = ?');
            $stmt->bind_param('ii', $id, $empresaId);
        } else {
            $stmt = $conn->prepare('SELECT * FROM subcategorias WHERE id = ?');
            $stmt->bind_param('i', $id);
        }
        $stmt->execute();
        $res = $stmt->get_result();
        echo json_encode($res->fetch_assoc() ?: []);
    } else {
        $items = [];
        if ($empresaId) {
            $stmt = $conn->prepare('SELECT * FROM subcategorias WHERE id_empresa = ?');
            $stmt->bind_param('i', $empresaId);
            $stmt->execute();
            $result = $stmt->get_result();
        } else {
            $result = $conn->query('SELECT * FROM subcategorias');
        }
        while ($row = $result->fetch_assoc()) {
            $items[] = $row;
        }
        echo json_encode($items);
    }
    exit;
}

if ($method === 'POST') {
    $data = getJsonInput();
    $categoria_id = isset($data['categoria_id']) ? intval($data['categoria_id']) : null;
    $empresaId = isset($data['empresa_id']) && intval($data['empresa_id']) > 0 ? intval($data['empresa_id']) : getEmpresaId();
    $nombre = $data['nombre'] ?? '';
    $descripcion = $data['descripcion'] ?? '';
    if (!$nombre || $empresaId <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Datos incompletos']);
        exit;
    }
    $stmt = $conn->prepare('INSERT INTO subcategorias (categoria_id, id_empresa, nombre, descripcion) VALUES (?, ?, ?, ?)');
    $stmt->bind_param('iiss', $categoria_id, $empresaId, $nombre, $descripcion);
    $stmt->execute();
    echo json_encode(['id' => $stmt->insert_id]);
    exit;
}

if ($method === 'PUT') {
    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
    $empresaId = getEmpresaId(true);
    $data = getJsonInput();
    $categoria_id = isset($data['categoria_id']) ? intval($data['categoria_id']) : null;
    $nombre = $data['nombre'] ?? '';
    $descripcion = $data['descripcion'] ?? '';
    if ($empresaId) {
        $stmt = $conn->prepare('UPDATE subcategorias SET categoria_id=?, nombre=?, descripcion=? WHERE id=? AND id_empresa=?');
        $stmt->bind_param('issii', $categoria_id, $nombre, $descripcion, $id, $empresaId);
    } else {
        $stmt = $conn->prepare('UPDATE subcategorias SET categoria_id=?, nombre=?, descripcion=? WHERE id=?');
        $stmt->bind_param('issi', $categoria_id, $nombre, $descripcion, $id);
    }
    $stmt->execute();
    echo json_encode(['success' => $stmt->affected_rows > 0]);
    exit;
}

if ($method === 'DELETE') {
    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
    $empresaId = getEmpresaId(true);
    if ($empresaId) {
        $stmt = $conn->prepare('DELETE FROM subcategorias WHERE id=? AND id_empresa=?');
        $stmt->bind_param('ii', $id, $empresaId);
    } else {
        $stmt = $conn->prepare('DELETE FROM subcategorias WHERE id=?');
        $stmt->bind_param('i', $id);
    }
    $stmt->execute();
    echo json_encode(['success' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);
?>
