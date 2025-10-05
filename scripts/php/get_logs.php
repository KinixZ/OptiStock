<?php
session_start();
header("Content-Type: application/json");

require_once __DIR__ . '/log_utils.php';
require_once __DIR__ . '/accesos_utils.php';

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

$usuarioIdSesion = obtenerUsuarioIdSesion() ?? (int) ($_SESSION['usuario_id'] ?? 0);
$mapaAccesos     = construirMapaAccesosUsuario($conn, $usuarioIdSesion);
$filtrarPorAreas = debeFiltrarPorAccesos($mapaAccesos);
$areasPermitidas = array_values(array_filter(array_map('intval', array_keys($mapaAccesos)), function ($areaId) {
    return $areaId > 0;
}));

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

if ($filtrarPorAreas && !empty($areasPermitidas)) {
    $placeholders = implode(',', array_fill(0, count($areasPermitidas), '?'));
    $sql .= " AND (NOT EXISTS (SELECT 1 FROM usuario_area_zona uaz_all WHERE uaz_all.id_usuario = u.id_usuario)
                   OR EXISTS (SELECT 1 FROM usuario_area_zona uaz_perm WHERE uaz_perm.id_usuario = u.id_usuario AND uaz_perm.id_area IN ($placeholders)))";
    $types  .= str_repeat('i', count($areasPermitidas));
    foreach ($areasPermitidas as $areaId) {
        $params[] = (int) $areaId;
    }
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
        )";

if ($filtrarPorAreas && !empty($areasPermitidas)) {
    $usuariosPlaceholders = implode(',', array_fill(0, count($areasPermitidas), '?'));
    $usuariosSql .= " AND (NOT EXISTS (SELECT 1 FROM usuario_area_zona uaz_all WHERE uaz_all.id_usuario = u.id_usuario)
                   OR EXISTS (SELECT 1 FROM usuario_area_zona uaz_perm WHERE uaz_perm.id_usuario = u.id_usuario AND uaz_perm.id_area IN ($usuariosPlaceholders)))";
}

$usuariosSql .= " ORDER BY nombre";

$usuariosStmt = $conn->prepare($usuariosSql);

$usuariosParams = [$empresaId, $empresaId];
$usuariosTypes  = 'ii';

if ($filtrarPorAreas && !empty($areasPermitidas)) {
    $usuariosTypes .= str_repeat('i', count($areasPermitidas));
    foreach ($areasPermitidas as $areaId) {
        $usuariosParams[] = (int) $areaId;
    }
}

$usuariosStmt->bind_param($usuariosTypes, ...$usuariosParams);
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
