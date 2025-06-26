<?php
// Conexión a la base de datos
$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";

$conn = mysqli_connect($servername, $db_user, $db_pass, $database);
if (!$conn) {
    echo json_encode(["success" => false, "message" => "Error de conexión a la base de datos."]);
    exit;
}

header('Content-Type: application/json');
$input = json_decode(file_get_contents('php://input'), true);

$id_empresa = $input['id_empresa'] ?? null;

if (!$id_empresa) {
    echo json_encode(['success' => false, 'message' => 'ID de empresa no proporcionado']);
    exit;
}

try {
    $stmt = $pdo->prepare("
        SELECT u.id_usuario, u.nombre, u.apellido, u.correo, u.telefono, u.rol
        FROM usuario u
        INNER JOIN usuario_empresa ue ON u.id_usuario = ue.id_usuario
        WHERE ue.id_empresa = ? AND u.rol != 'Administrador'
    ");
    $stmt->execute([$id_empresa]);
    $usuarios = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'usuarios' => $usuarios]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error al consultar usuarios', 'error' => $e->getMessage()]);
}
