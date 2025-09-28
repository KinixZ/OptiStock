<?php
header('Content-Type: application/json');

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";

function jsonResponse($success, $message = '', $extra = []) {
    echo json_encode(array_merge(['success' => $success, 'message' => $message], $extra));
    exit;
}

try {
    $conn = new mysqli($servername, $db_user, $db_pass, $database);
    $conn->set_charset('utf8mb4');
} catch (mysqli_sql_exception $e) {
    jsonResponse(false, 'Error de conexión a la base de datos.');
}

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$idAsignacion = isset($input['id_asignacion']) ? (int) $input['id_asignacion'] : 0;

if ($idAsignacion <= 0) {
    jsonResponse(false, 'Identificador de asignación inválido.');
}

try {
    $stmt = $conn->prepare('DELETE FROM usuario_area_zona WHERE id = ?');
    $stmt->bind_param('i', $idAsignacion);
    $stmt->execute();
    $filasAfectadas = $stmt->affected_rows;
    $stmt->close();

    if ($filasAfectadas <= 0) {
        jsonResponse(false, 'No se encontró la asignación que intentas eliminar.');
    }

    jsonResponse(true, 'Asignación eliminada correctamente.');
} catch (mysqli_sql_exception $e) {
    error_log('Error al eliminar acceso de usuario: ' . $e->getMessage());
    jsonResponse(false, 'No fue posible eliminar la asignación solicitada.');
}
