<?php
header("Content-Type: application/json");

$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";
$conn = mysqli_connect($servername, $db_user, $db_pass, $database);
if (!$conn) {
    echo json_encode(["success" => false, "message" => "DB fail"]);
    exit;
}

$modulo  = $_GET['modulo']  ?? '';
$usuario = $_GET['usuario'] ?? '';
$rol     = $_GET['rol']     ?? '';

$sql = "SELECT l.fecha, l.hora, CONCAT(u.nombre,' ',u.apellido) AS usuario, u.rol, l.modulo, l.accion
        FROM log_control l
        JOIN usuario u ON l.id_usuario = u.id_usuario
        WHERE 1";
$params = [];
$types  = '';

if ($modulo !== '') {
    $sql .= " AND l.modulo = ?";
    $types .= 's';
    $params[] = $modulo;
}
if ($usuario !== '') {
    $sql .= " AND u.id_usuario = ?";
    $types .= 'i';
    $params[] = intval($usuario);
}
if ($rol !== '') {
    $sql .= " AND u.rol = ?";
    $types .= 's';
    $params[] = $rol;
}

$sql .= " ORDER BY l.fecha DESC, l.hora DESC";
$stmt = $conn->prepare($sql);
if ($types) {
    $stmt->bind_param($types, ...$params);
}
$stmt->execute();
$result = $stmt->get_result();

$logs = [];
while ($row = $result->fetch_assoc()) {
    $logs[] = $row;
}

echo json_encode(["success" => true, "logs" => $logs]);
$conn->close();
?>
