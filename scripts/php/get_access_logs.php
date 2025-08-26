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


$sql = "SELECT ra.accion, ra.fecha, u.nombre, u.apellido, u.rol, u.foto_perfil

        FROM registro_accesos ra
        JOIN usuario u ON ra.id_usuario = u.id_usuario
        ORDER BY ra.fecha DESC
        LIMIT 5";
$result = mysqli_query($conn, $sql);

$logs = [];
while ($row = mysqli_fetch_assoc($result)) {

    $foto = $row['foto_perfil'] ?? '';
    $row['foto_perfil'] = '/' . ltrim($foto ?: 'images/profile.jpg', '/');

    $logs[] = $row;
}

mysqli_close($conn);

echo json_encode(["success" => true, "logs" => $logs]);
?>
