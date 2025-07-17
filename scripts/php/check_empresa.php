<?php
header('Content-Type: application/json');

/* ───────── Conexión ───────── */
$conn = mysqli_connect("localhost","u296155119_Admin","4Dmin123o","u296155119_OptiStock");
if (!$conn) {
    echo json_encode(["success"=>false,"message"=>"Error de conexión a la base de datos."]); exit;
}

/* ───────── ID de usuario ───────── */
$data = json_decode(file_get_contents("php://input"));
$usuario_id = isset($data->usuario_id) ? intval($data->usuario_id) : 0;

if (!$usuario_id) {
    echo json_encode(["success"=>false,"message"=>"ID de usuario inválido o no enviado."]); exit;
}

/* ───────── 1) Empresa creada por él ───────── */
$sql = "SELECT id_empresa, nombre_empresa
        FROM empresa
        WHERE usuario_creador = ?
        LIMIT 1";
$stmt = mysqli_prepare($conn,$sql);
mysqli_stmt_bind_param($stmt,"i",$usuario_id);
mysqli_stmt_execute($stmt);
$res = mysqli_stmt_get_result($stmt);

if ($emp = mysqli_fetch_assoc($res)) {
    echo json_encode([
        "success"        => true,
        "empresa_id"     => $emp['id_empresa'],
        "empresa_nombre" => $emp['nombre_empresa']
    ]);
    mysqli_close($conn);
    exit;
}

/* ───────── 2) Empresa afiliada (usuario_empresa) ───────── */
$sql2 = "SELECT e.id_empresa, e.nombre_empresa
         FROM usuario_empresa ue
         INNER JOIN empresa e ON ue.id_empresa = e.id_empresa
         WHERE ue.id_usuario = ?
         LIMIT 1";
$stmt2 = mysqli_prepare($conn,$sql2);
mysqli_stmt_bind_param($stmt2,"i",$usuario_id);
mysqli_stmt_execute($stmt2);
$res2 = mysqli_stmt_get_result($stmt2);

if ($emp2 = mysqli_fetch_assoc($res2)) {
    echo json_encode([
        "success"        => true,
        "empresa_id"     => $emp2['id_empresa'],
        "empresa_nombre" => $emp2['nombre_empresa']
    ]);
} else {
    echo json_encode([
        "success" => false,
        "message" => "El usuario no tiene empresa registrada ni afiliada."
    ]);
}

mysqli_close($conn);
?>
