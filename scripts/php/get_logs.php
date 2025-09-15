<?php
session_start();
header("Content-Type: application/json");

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";

try {
    $conn = new mysqli($servername, $db_user, $db_pass, $database);
    $conn->set_charset('utf8mb4');
} catch (mysqli_sql_exception $e) {
    echo json_encode(["success" => false, "message" => "DB fail"]);
    exit;
}

$empresaId = intval($_GET['empresa'] ?? ($_SESSION['id_empresa'] ?? 0));

if ($empresaId <= 0) {
    echo json_encode(["success" => false, "message" => "Empresa no especificada."]);
    $conn->close();
    exit;
}

$modulo  = trim($_GET['modulo']  ?? '');
$usuario = trim($_GET['usuario'] ?? '');
$rol     = trim($_GET['rol']     ?? '');

$sql = "SELECT l.fecha, l.hora, CONCAT(u.nombre,' ',u.apellido) AS usuario, u.rol, l.modulo, l.accion
        FROM log_control l
        JOIN usuario u ON l.id_usuario = u.id_usuario
        WHERE u.id_usuario IN (
            SELECT usuario_creador FROM empresa WHERE id_empresa = ?
            UNION
            SELECT id_usuario FROM usuario_empresa WHERE id_empresa = ?
        )";

$params = [$empresaId, $empresaId];
$types  = 'ii';

if ($modulo !== '') {
    $sql    .= " AND l.modulo = ?";
    $types  .= 's';
    $params[] = $modulo;
}

if ($usuario !== '') {
    $sql    .= " AND u.id_usuario = ?";
    $types  .= 'i';
    $params[] = intval($usuario);
}

if ($rol !== '') {
    $sql    .= " AND u.rol = ?";
    $types  .= 's';
    $params[] = $rol;
}

$sql .= " ORDER BY l.fecha DESC, l.hora DESC";
$stmt = $conn->prepare($sql);
$stmt->bind_param($types, ...$params);
$stmt->execute();
$result = $stmt->get_result();

$logs = [];
while ($row = $result->fetch_assoc()) {
    $logs[] = $row;
}
$stmt->close();

$usuariosSql = "SELECT DISTINCT u.id_usuario, CONCAT(u.nombre, ' ', u.apellido) AS nombre, u.rol
        FROM usuario u
        WHERE u.id_usuario IN (
            SELECT usuario_creador FROM empresa WHERE id_empresa = ?
            UNION
            SELECT id_usuario FROM usuario_empresa WHERE id_empresa = ?
        )
        ORDER BY nombre";

$usuariosStmt = $conn->prepare($usuariosSql);
$usuariosStmt->bind_param('ii', $empresaId, $empresaId);
$usuariosStmt->execute();
$usuariosResult = $usuariosStmt->get_result();

$usuarios = [];
while ($user = $usuariosResult->fetch_assoc()) {
    $usuarios[] = $user;
}

$usuariosStmt->close();
$conn->close();

echo json_encode([
    "success"  => true,
    "logs"     => $logs,
    "usuarios" => $usuarios
]);
