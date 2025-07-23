<?php
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

if ($method === 'GET') {
    $result = $conn->query("SELECT * FROM zonas");
    $zonas = [];
    while ($row = $result->fetch_assoc()) {
        $row['subniveles'] = $row['subniveles'] ? json_decode($row['subniveles'], true) : [];
        $zonas[] = $row;
    }
    echo json_encode($zonas);
    exit;
}

if ($method === 'POST') {
    $nombre = $_POST['nombre'] ?? '';
    $ancho = floatval($_POST['ancho'] ?? 0);
    $alto = floatval($_POST['alto'] ?? 0);
    $largo = floatval($_POST['largo'] ?? 0);
    $tipo = $_POST['tipo_almacenamiento'] ?? '';
    $area_id = $_POST['area_id'] ?? null;
    $subniveles = isset($_POST['subniveles']) ? $_POST['subniveles'] : json_encode([]);

    if (!$nombre || !$tipo || !$ancho || !$alto || !$largo) {
        http_response_code(400);
        echo json_encode(['error' => 'Datos incompletos']);
        exit;
    }
    $stmt = $conn->prepare("INSERT INTO zonas (nombre, ancho, alto, largo, tipo_almacenamiento, area_id, subniveles) VALUES (?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("sdddsss", $nombre, $ancho, $alto, $largo, $tipo, $area_id, $subniveles);
    $stmt->execute();
    $id = $stmt->insert_id;
    echo json_encode(['id' => $id, 'nombre' => $nombre]);
    exit;
}

if ($method === 'DELETE') {
    $id = intval($_GET['id'] ?? 0);
    $stmt = $conn->prepare("DELETE FROM zonas WHERE id=?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    echo json_encode(['success' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);