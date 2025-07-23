<?php
header('Content-Type: application/json');
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

if ($method === 'GET') {
    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
    if ($id) {
        $stmt = $conn->prepare('SELECT * FROM zonas WHERE id = ?');
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $res = $stmt->get_result();
        echo json_encode($res->fetch_assoc() ?: []);
    } else {
        $result = $conn->query('SELECT * FROM zonas');
        $zonas = [];
        while ($row = $result->fetch_assoc()) {
            $zonas[] = $row;
        }
        echo json_encode($zonas);
    }
    exit;
}

if ($method === 'POST') {
    $data = getJsonInput();
    $nombre = $data['nombre'] ?? '';
    $descripcion = $data['descripcion'] ?? '';
    $ancho = floatval($data['ancho'] ?? 0);
    $alto = floatval($data['alto'] ?? 0);
    $largo = floatval($data['largo'] ?? 0);
    $volumen = $ancho * $alto * $largo;
    $area_id = isset($data['area_id']) ? intval($data['area_id']) : null;
    if (!$nombre) {
        http_response_code(400);
        echo json_encode(['error' => 'Nombre requerido']);
        exit;
    }
    $stmt = $conn->prepare('INSERT INTO zonas (nombre, descripcion, ancho, alto, largo, volumen, area_id) VALUES (?,?,?,?,?,?,?)');
    $stmt->bind_param('ssddddi', $nombre, $descripcion, $ancho, $alto, $largo, $volumen, $area_id);
    $stmt->execute();
    echo json_encode(['id' => $stmt->insert_id]);
    exit;
}

if ($method === 'PUT') {
    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
    $data = getJsonInput();
    $nombre = $data['nombre'] ?? '';
    $descripcion = $data['descripcion'] ?? '';
    $ancho = floatval($data['ancho'] ?? 0);
    $alto = floatval($data['alto'] ?? 0);
    $largo = floatval($data['largo'] ?? 0);
    $volumen = $ancho * $alto * $largo;
    $area_id = isset($data['area_id']) ? intval($data['area_id']) : null;
    $stmt = $conn->prepare('UPDATE zonas SET nombre=?, descripcion=?, ancho=?, alto=?, largo=?, volumen=?, area_id=? WHERE id=?');
    $stmt->bind_param('ssddddii', $nombre, $descripcion, $ancho, $alto, $largo, $volumen, $area_id, $id);
    $stmt->execute();
    echo json_encode(['success' => $stmt->affected_rows > 0]);
    exit;
}

if ($method === 'DELETE') {
    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
    $stmt = $conn->prepare('DELETE FROM zonas WHERE id=?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    echo json_encode(['success' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);

