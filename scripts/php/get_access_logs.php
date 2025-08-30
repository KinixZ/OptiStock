<?php
header("Content-Type: application/json");

$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";

$conn = mysqli_connect($servername, $db_user, $db_pass, $database);
if (!$conn) {
    echo json_encode(["success" => false, "message" => "Error de conexión a la base de datos."]);
    exit;
}


$id_empresa = intval($_GET['id_empresa'] ?? 0);

$sql = "SELECT ra.accion, ra.fecha, u.nombre, u.apellido, u.rol, u.foto_perfil
        FROM registro_accesos ra
        JOIN usuario u ON ra.id_usuario = u.id_usuario
        LEFT JOIN usuario_empresa ue ON u.id_usuario = ue.id_usuario
        JOIN empresa e ON e.id_empresa = ?
        WHERE ue.id_empresa = e.id_empresa OR u.id_usuario = e.usuario_creador
        ORDER BY ra.fecha DESC
        LIMIT 5";

$stmt = mysqli_prepare($conn, $sql);
mysqli_stmt_bind_param($stmt, "i", $id_empresa);
mysqli_stmt_execute($stmt);
$result = mysqli_stmt_get_result($stmt);

$logs = [];
while ($row = mysqli_fetch_assoc($result)) {

    $foto = $row['foto_perfil'] ?? '';
    $row['foto_perfil'] = '/' . ltrim($foto ?: 'images/profile.jpg', '/');

    $logs[] = $row;
}

mysqli_close($conn);

echo json_encode(["success" => true, "logs" => $logs]);
?>
