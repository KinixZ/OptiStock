<?php
header('Content-Type: application/json');
ini_set('display_errors', 1);
error_reporting(E_ALL);

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

// ← 1) Leemos empresa_id tanto de GET como de POST/PUT JSON
$empresa_id = 0;
if (isset($_REQUEST['empresa_id'])) {
    $empresa_id = intval($_REQUEST['empresa_id']);
} else {
    $tmp = json_decode(file_get_contents('php://input'), true);
    if (isset($tmp['empresa_id'])) {
        $empresa_id = intval($tmp['empresa_id']);
    }
}
if ($empresa_id <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'empresa_id es obligatorio']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

function getJsonInput() {
    $input = file_get_contents('php://input');
    return json_decode($input, true) ?: [];
}

if ($method === 'GET') {
    $id = intval($_GET['id'] ?? 0);
    if ($id) {
        // ← 2) Filtramos por id y empresa_id
        $stmt = $conn->prepare('SELECT * FROM subcategorias WHERE id = ? AND empresa_id = ?');
        $stmt->bind_param('ii', $id, $empresa_id);
    } else {
        // ← 3) Filtramos TODAS las subcategorias sólo de esta empresa
        $stmt = $conn->prepare('SELECT * FROM subcategorias WHERE empresa_id = ?');
        $stmt->bind_param('i', $empresa_id);
    }
    $stmt->execute();
    $res = $stmt->get_result();
    if ($id) {
        echo json_encode($res->fetch_assoc() ?: []);
    } else {
        $items = [];
        while ($row = $res->fetch_assoc()) {
            $items[] = $row;
        }
        echo json_encode($items);
    }
    exit;
}

if ($method === 'POST') {
    $data = getJsonInput();
    $categoria_id = isset($data['categoria_id']) ? intval($data['categoria_id']) : null;
    $nombre       = $data['nombre'] ?? '';
    $descripcion  = $data['descripcion'] ?? '';

    if (!$nombre) {
        http_response_code(400);
        echo json_encode(['error' => 'Nombre requerido']);
        exit;
    }

    // ← 4) INSERT con empresa_id y bind correcto
    $stmt = $conn->prepare(
        'INSERT INTO subcategorias (categoria_id, nombre, descripcion, empresa_id)
         VALUES (?, ?, ?, ?)'
    );
    $stmt->bind_param('issi',
        $categoria_id,
        $nombre,
        $descripcion,
        $empresa_id
    );
    if (!$stmt->execute()) {
        http_response_code(500);
        echo json_encode(['error'=>'Execute failed','details'=>$stmt->error]);
        exit;
    }
    echo json_encode(['id' => $stmt->insert_id]);
    exit;
}

if ($method === 'PUT') {
    $id   = intval($_GET['id'] ?? 0);
    $data = getJsonInput();
    $categoria_id = isset($data['categoria_id']) ? intval($data['categoria_id']) : null;
    $nombre       = $data['nombre'] ?? '';
    $descripcion  = $data['descripcion'] ?? '';

    // ← 5) UPDATE incluyendo empresa_id
    $stmt = $conn->prepare(
        'UPDATE subcategorias
           SET categoria_id = ?, nombre = ?, descripcion = ?
         WHERE id = ? AND empresa_id = ?'
    );
    $stmt->bind_param('issii',
        $categoria_id,
        $nombre,
        $descripcion,
        $id,
        $empresa_id
    );
    $stmt->execute();
    echo json_encode(['success' => $stmt->affected_rows > 0]);
    exit;
}

if ($method === 'DELETE') {
    $id = intval($_GET['id'] ?? 0);
    $stmt = $conn->prepare(
        'DELETE FROM subcategorias
           WHERE id = ? AND empresa_id = ?'
    );
    $stmt->bind_param('ii', $id, $empresa_id);
    $stmt->execute();
    echo json_encode(['success' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);
