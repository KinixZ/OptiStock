<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
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
    // 1) Leer el JSON entrante
    $data = getJsonInput();

    // 2) Asignar variables desde $data
    $nombre          = $data['nombre'] ?? '';
    $descripcion     = $data['descripcion'] ?? '';
    $categoria_id    = isset($data['categoria_id'])    ? intval($data['categoria_id'])    : null;
    $subcategoria_id = isset($data['subcategoria_id']) ? intval($data['subcategoria_id']) : null;
    $stock           = intval($data['stock'] ?? 0);
    $precio          = floatval($data['precio_compra'] ?? 0);
    $dim_x           = isset($data['dim_x']) ? floatval($data['dim_x']) : null;
    $dim_y           = isset($data['dim_y']) ? floatval($data['dim_y']) : null;
    $dim_z           = isset($data['dim_z']) ? floatval($data['dim_z']) : null;

    // 3) Validaciones básicas
    if (!$nombre) {
        http_response_code(400);
        echo json_encode(['error' => 'Nombre requerido']);
        exit;
    }

    // 4) Preparar y ejecutar el INSERT con chequeo de errores
    $sql = '
      INSERT INTO productos
        (nombre, descripcion, categoria_id, subcategoria_id, stock, precio_compra, dim_x, dim_y, dim_z)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ';
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['error' => 'Prepare failed', 'details' => $conn->error]);
        exit;
    }

    if (!$stmt->bind_param(
        'ssiiidddd',
        $nombre, $descripcion, $categoria_id, $subcategoria_id,
        $stock, $precio, $dim_x, $dim_y, $dim_z
    )) {
        http_response_code(500);
        echo json_encode(['error' => 'bind_param failed', 'details' => $stmt->error]);
        exit;
    }

    if (!$stmt->execute()) {
        http_response_code(500);
        echo json_encode(['error' => 'Execute failed', 'details' => $stmt->error]);
        exit;
    }

    // 5) Respuesta de éxito
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
    $dim_x = isset($data['dim_x']) ? floatval($data['dim_x']) : null;
    $dim_y = isset($data['dim_y']) ? floatval($data['dim_y']) : null;
    $dim_z = isset($data['dim_z']) ? floatval($data['dim_z']) : null;
    $stmt = $conn->prepare('UPDATE productos SET nombre=?, descripcion=?, categoria_id=?, subcategoria_id=?, stock=?, precio_compra=?, dim_x=?, dim_y=?, dim_z=? WHERE id=?');
    $stmt->bind_param('ssiiiddddi', $nombre, $descripcion, $categoria_id, $subcategoria_id, $stock, $precio, $dim_x, $dim_y, $dim_z, $id);
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
