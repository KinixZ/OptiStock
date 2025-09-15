<?php
header('Content-Type: application/json');
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

$method = $_SERVER['REQUEST_METHOD'];

require_once __DIR__ . '/log_utils.php';

$usuarioId = obtenerUsuarioIdSesion();
if (!$usuarioId) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Sesión no válida']);
    exit;
}

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

$id_empresa = $_POST['id_empresa'] ?? null;
$plan       = $_POST['plan'] ?? null;

if (!$id_empresa || !$plan) {
    echo json_encode(['success' => false, 'message' => 'Datos incompletos']);
    exit;
}

try {
    $stmt = $conn->prepare("INSERT INTO suscripciones (id_empresa, plan, fecha_renovacion, activo) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 MONTH), 1)");
    $stmt->bind_param("is", $id_empresa, $plan);
    $stmt->execute();

    if ($stmt->affected_rows > 0) {
        registrarLog($conn, $usuarioId, 'Suscripciones', "Actualización de plan a {$plan} para empresa {$id_empresa}");
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'message' => 'No se pudo actualizar']);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}

