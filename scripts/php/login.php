<?php
session_start();

$correo     = $_POST['correo']     ?? null;
$contrasena = $_POST['contrasena'] ?? null;

if (!$correo || !$contrasena) {
    echo json_encode(["success" => false, "message" => "Por favor, completa todos los campos."]);
    exit;
}

$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";

$conn = mysqli_connect($servername, $db_user, $db_pass, $database);
if (!$conn) {
    echo json_encode(["success" => false, "message" => "Error de conexión a la base de datos."]);
    exit;
}

$sql  = "SELECT id_usuario, nombre, correo, contrasena, rol, verificacion_cuenta FROM usuario WHERE correo = ?";
$stmt = mysqli_prepare($conn, $sql);
mysqli_stmt_bind_param($stmt, "s", $correo);
mysqli_stmt_execute($stmt);
$result = mysqli_stmt_get_result($stmt);
$user   = mysqli_fetch_assoc($result);

if (!$user) {
    echo json_encode(["success" => false, "message" => "El usuario no existe."]);
    exit;
}

if (sha1($contrasena) !== $user['contrasena']) {
    echo json_encode(["success" => false, "message" => "Contraseña incorrecta."]);
    exit;
}

$_SESSION['usuario_id']     = $user['id_usuario'];
$_SESSION['usuario_nombre'] = $user['nombre'];
$_SESSION['usuario_correo'] = $user['correo'];
$_SESSION['usuario_rol']    = $user['rol'];

$id_empresa     = null;
$empresa_nombre = null;

$qEmp = "SELECT id_empresa, nombre_empresa FROM empresa WHERE usuario_creador = ? LIMIT 1";
$sEmp = mysqli_prepare($conn, $qEmp);
mysqli_stmt_bind_param($sEmp, "i", $user['id_usuario']);
mysqli_stmt_execute($sEmp);
$rEmp = mysqli_stmt_get_result($sEmp);
if ($e = mysqli_fetch_assoc($rEmp)) {
    $id_empresa     = $e['id_empresa'];
    $empresa_nombre = $e['nombre_empresa'];
}

$_SESSION['id_empresa']     = $id_empresa;
$_SESSION['empresa_nombre'] = $empresa_nombre;

$payload = [
    "success"        => true,
    "id_usuario"     => $user['id_usuario'],
    "nombre"         => $user['nombre'],
    "correo"         => $user['correo'],
    "rol"            => $user['rol'],
    "id_empresa"     => $id_empresa,
    "empresa_nombre" => $empresa_nombre
];

if ($user['verificacion_cuenta'] == 0) {
    $payload["redirect"] = "../regist/regist_inter.html?email=" . urlencode($correo);
} else {
    $payload["redirect"] = "../../main_menu/main_menu.html";
}

echo json_encode($payload);

mysqli_close($conn);
?>
