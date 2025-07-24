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
        $stmt = $conn->prepare('SELECT * FROM productos WHERE id = ?');
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $res = $stmt->get_result();
        echo json_encode($res->fetch_assoc() ?: []);
    } else {
        $result = $conn->query('SELECT * FROM productos');
        $items = [];
        while ($row = $result->fetch_assoc()) {
            $items[] = $row;
        }
        echo json_encode($items);
    }
    exit;
}

if ($method === 'POST') {
    $data = getJsonInput();
    $nombre = $data['nombre'] ?? '';
    $descripcion = $data['descripcion'] ?? '';
    $categoria_id = isset($data['categoria_id']) ? intval($data['categoria_id']) : null;
    $subcategoria_id = isset($data['subcategoria_id']) ? intval($data['subcategoria_id']) : null;
    $stock = intval($data['stock'] ?? 0);
    $precio = floatval($data['precio_compra'] ?? 0);
    if (!$nombre) {
        http_response_code(400);
        echo json_encode(['error' => 'Nombre requerido']);
        exit;
    }
    $stmt = $conn->prepare('INSERT INTO productos (nombre, descripcion, categoria_id, subcategoria_id, stock, precio_compra) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->bind_param('ssiiid', $nombre, $descripcion, $categoria_id, $subcategoria_id, $stock, $precio);
    $stmt->execute();
    echo json_encode(['id' => $stmt->insert_id]);
    exit;
}

if ($method === 'PUT') {
    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
    $data = getJsonInput();
    $nombre = $data['nombre'] ?? '';
    $descripcion = $data['descripcion'] ?? '';
    $categoria_id = isset($data['categoria_id']) ? intval($data['categoria_id']) : null;
    $subcategoria_id = isset($data['subcategoria_id']) ? intval($data['subcategoria_id']) : null;
    $stock = intval($data['stock'] ?? 0);
    $precio = floatval($data['precio_compra'] ?? 0);
    $stmt = $conn->prepare('UPDATE productos SET nombre=?, descripcion=?, categoria_id=?, subcategoria_id=?, stock=?, precio_compra=? WHERE id=?');
    $stmt->bind_param('ssiiidi', $nombre, $descripcion, $categoria_id, $subcategoria_id, $stock, $precio, $id);
    $stmt->execute();
    echo json_encode(['success' => $stmt->affected_rows > 0]);
    exit;
}

if ($method === 'DELETE') {
    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
    $stmt = $conn->prepare('DELETE FROM productos WHERE id=?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    echo json_encode(['success' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);
?>
