<?php
session_start();
header('Content-Type: application/json');

// Habilitar reporte de errores para desarrollo
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Validar método HTTP
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Método no permitido"]);
    exit;
}

// Obtener y validar datos de entrada
$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['email']) || !isset($data['code']) || !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Datos no válidos o incompletos"]);
    exit;
}

$email = trim($data['email']);
$code = trim($data['code']);

// Verificar sesión y código
if (!isset($_SESSION['codigo_verificacion']) || !isset($_SESSION['correo_verificacion'])) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "Sesión de verificación no encontrada o expirada"]);
    exit;
}

if ($_SESSION['codigo_verificacion'] !== $code || $_SESSION['correo_verificacion'] !== $email) {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "Código de verificación incorrecto o no coincide con el email"]);
    exit;
}

// Configuración de la base de datos
$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";

$conn = mysqli_connect($servername, $db_user, $db_pass, $database);
if (!$conn) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error de conexión a la base de datos"]);
    exit;
}

// Actualizar verificación (SOLO el campo existente)
$sql = "UPDATE usuario SET verificacion_cuenta = 1 WHERE correo = ?";
$stmt = mysqli_prepare($conn, $sql);
mysqli_stmt_bind_param($stmt, "s", $email);

if (!mysqli_stmt_execute($stmt)) {
    mysqli_close($conn);
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error al verificar la cuenta"]);
    exit;
}

// Obtener datos del usuario
$sqlUser = "SELECT id_usuario, nombre, rol FROM usuario WHERE correo = ? LIMIT 1";
$stmtUser = mysqli_prepare($conn, $sqlUser);
mysqli_stmt_bind_param($stmtUser, "s", $email);

if (!mysqli_stmt_execute($stmtUser)) {
    mysqli_close($conn);
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error al obtener datos del usuario"]);
    exit;
}

$resUser = mysqli_stmt_get_result($stmtUser);

if (!$user = mysqli_fetch_assoc($resUser)) {
    mysqli_close($conn);
    http_response_code(404);
    echo json_encode(["success" => false, "message" => "Usuario no encontrado"]);
    exit;
}

// Buscar empresa asociada
$id_empresa = null;
$empresa_nombre = null;
$qEmp = "SELECT id_empresa, nombre_empresa FROM empresa WHERE usuario_creador = ? LIMIT 1";
$sEmp = mysqli_prepare($conn, $qEmp);
mysqli_stmt_bind_param($sEmp, "i", $user['id_usuario']);

if (mysqli_stmt_execute($sEmp)) {
    $rEmp = mysqli_stmt_get_result($sEmp);
    if ($e = mysqli_fetch_assoc($rEmp)) {
        $id_empresa = $e['id_empresa'];
        $empresa_nombre = $e['nombre_empresa'];
    }
}

// Guardar datos en sesión
$_SESSION['usuario_id'] = $user['id_usuario'];
$_SESSION['usuario_nombre'] = $user['nombre'];
$_SESSION['usuario_correo'] = $email;
$_SESSION['usuario_rol'] = $user['rol'];
$_SESSION['id_empresa'] = $id_empresa;
$_SESSION['empresa_nombre'] = $empresa_nombre;

// Limpiar sesión de verificación
unset($_SESSION['codigo_verificacion']);
unset($_SESSION['correo_verificacion']);

// Cerrar conexión
mysqli_close($conn);

// Respuesta exitosa
echo json_encode([
    "success" => true,
    "message" => "Cuenta verificada exitosamente",
    "id_usuario" => $user['id_usuario'],
    "nombre" => $user['nombre'],
    "correo" => $email,
    "rol" => $user['rol'],
    "id_empresa" => $id_empresa,
    "empresa_nombre" => $empresa_nombre
]);
?>