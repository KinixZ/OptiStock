<?php
header('Content-Type: application/json');

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";

function responder($success, $message = '', $extra = []) {
    echo json_encode(array_merge(['success' => $success, 'message' => $message], $extra));
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responder(false, 'Método no permitido.');
}

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$rol = isset($input['rol']) ? trim($input['rol']) : '';
$idEmpresa = isset($input['id_empresa']) ? (int) $input['id_empresa'] : 0;

if ($rol === '') {
    responder(false, 'El rol es obligatorio.');
}

if ($idEmpresa <= 0) {
    responder(false, 'Debes indicar la empresa cuya configuración deseas restablecer.');
}

try {
    $conn = new mysqli($servername, $db_user, $db_pass, $database);
    $conn->set_charset('utf8mb4');
} catch (mysqli_sql_exception $e) {
    responder(false, 'No fue posible conectar con la base de datos.');
}

try {
    $stmt = $conn->prepare('DELETE FROM roles_permisos WHERE rol = ? AND id_empresa = ?');
    $stmt->bind_param('si', $rol, $idEmpresa);
    $stmt->execute();
    $eliminadas = $stmt->affected_rows;
    $stmt->close();
} catch (mysqli_sql_exception $e) {
    responder(false, 'No fue posible restablecer los permisos del rol.');
}

if ($eliminadas > 0) {
    responder(true, 'Configuración restablecida correctamente.', ['eliminado' => true]);
}

responder(true, 'El rol ya utilizaba la configuración predeterminada.', ['eliminado' => false]);
