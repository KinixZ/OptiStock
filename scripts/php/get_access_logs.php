<?php
header("Content-Type: application/json");

$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";

$conn = mysqli_connect($servername, $db_user, $db_pass, $database);
if (!$conn) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error de conexión a la base de datos."]);
    exit;
}

$id_empresa = intval($_GET['id_empresa'] ?? 0);

$sql = "SELECT ra.accion, ra.fecha, u.nombre, u.apellido, u.rol, u.foto_perfil
        FROM registro_accesos ra
        JOIN usuario u ON ra.id_usuario = u.id_usuario
        LEFT JOIN usuario_empresa ue ON u.id_usuario = ue.id_usuario
        WHERE ue.id_empresa = ? OR u.id_usuario = (
            SELECT usuario_creador FROM empresa WHERE id_empresa = ?
        )
        ORDER BY ra.fecha DESC
        LIMIT 5";

$stmt = mysqli_prepare($conn, $sql);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error al preparar la consulta."]);
    exit;
}

mysqli_stmt_bind_param($stmt, "ii", $id_empresa, $id_empresa);
if (!mysqli_stmt_execute($stmt)) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error al ejecutar la consulta."]);
    exit;
}

$result = mysqli_stmt_get_result($stmt);

$logs = [];
while ($row = mysqli_fetch_assoc($result)) {
    $foto = $row['foto_perfil'] ?? '';
    $row['foto_perfil'] = '/' . ltrim($foto ?: 'images/profile.jpg', '/');
    $logs[] = $row;
}

mysqli_stmt_close($stmt);
mysqli_close($conn);

echo json_encode(["success" => true, "logs" => $logs]);
?>
