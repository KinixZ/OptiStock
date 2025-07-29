<?php
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
    echo json_encode(["success" => false, "message" => "Error de conexión"]);
    exit;
}

$id_empresa = $_POST['id_empresa'] ?? null;
if (!$id_empresa) {
    echo json_encode(['success' => false, 'message' => 'Falta id_empresa']);
    exit;
}

try {
    $stmt = $conn->prepare("UPDATE suscripciones SET activo = 0 WHERE id_empresa = ? AND activo = 1");
    $stmt->bind_param("i", $id_empresa);
    $stmt->execute();

    if ($stmt->affected_rows > 0) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'message' => 'No se encontró suscripción activa']);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}
