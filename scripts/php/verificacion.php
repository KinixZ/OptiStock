<?php
session_start();
header('Content-Type: application/json');

// Configuración de logging detallado
$logFile = __DIR__ . '/verification_logs.txt';
file_put_contents($logFile, "\n\n===== NUEVA SOLICITUD DE VERIFICACIÓN =====\n", FILE_APPEND);
file_put_contents($logFile, "Fecha/Hora: " . date('Y-m-d H:i:s') . "\n", FILE_APPEND);

// Registrar información completa de la sesión
file_put_contents($logFile, "Contenido de la sesión:\n" . print_r($_SESSION, true) . "\n", FILE_APPEND);

// Obtener y validar datos de entrada
$input = file_get_contents("php://input");
file_put_contents($logFile, "Datos recibidos (raw):\n$input\n", FILE_APPEND);

$data = json_decode($input, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    file_put_contents($logFile, "Error al decodificar JSON: " . json_last_error_msg() . "\n", FILE_APPEND);
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Datos no válidos"]);
    exit;
}

file_put_contents($logFile, "Datos decodificados:\n" . print_r($data, true) . "\n", FILE_APPEND);

// Validar campos requeridos
if (empty($data['email']) || empty($data['code'])) {
    file_put_contents($logFile, "Error: Datos incompletos\n", FILE_APPEND);
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Email y código son requeridos"]);
    exit;
}

$email = trim($data['email']);
$code = trim($data['code']);

// Verificar datos en sesión
if (empty($_SESSION['codigo_verificacion'])) {
    file_put_contents($logFile, "Error: No hay código en sesión\n", FILE_APPEND);
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "Código de verificación no generado o sesión expirada"]);
    exit;
}

if (empty($_SESSION['correo_verificacion'])) {
    file_put_contents($logFile, "Error: No hay email en sesión\n", FILE_APPEND);
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "Email de verificación no registrado"]);
    exit;
}

// Comparación detallada con logging
file_put_contents($logFile, "Comparando códigos:\n", FILE_APPEND);
file_put_contents($logFile, "Código en sesión: '" . $_SESSION['codigo_verificacion'] . "'\n", FILE_APPEND);
file_put_contents($logFile, "Código recibido: '" . $code . "'\n", FILE_APPEND);
file_put_contents($logFile, "¿Coinciden exactamente? " . ($_SESSION['codigo_verificacion'] === $code ? 'SÍ' : 'NO') . "\n", FILE_APPEND);

file_put_contents($logFile, "Comparando emails:\n", FILE_APPEND);
file_put_contents($logFile, "Email en sesión: '" . $_SESSION['correo_verificacion'] . "'\n", FILE_APPEND);
file_put_contents($logFile, "Email recibido: '" . $email . "'\n", FILE_APPEND);
file_put_contents($logFile, "¿Coinciden exactamente? " . ($_SESSION['correo_verificacion'] === $email ? 'SÍ' : 'NO') . "\n", FILE_APPEND);

if ($_SESSION['codigo_verificacion'] !== $code || $_SESSION['correo_verificacion'] !== $email) {
    file_put_contents($logFile, "Error: Verificación fallida\n", FILE_APPEND);
    http_response_code(403);
    echo json_encode([
        "success" => false,
        "message" => "Código de verificación incorrecto o no coincide con el email",
        "debug" => [
            "session_code" => $_SESSION['codigo_verificacion'],
            "received_code" => $code,
            "session_email" => $_SESSION['correo_verificacion'],
            "received_email" => $email,
            "session_id" => session_id(),
            "session_status" => session_status()
        ]
    ]);
    exit;
}

// Conexión a la base de datos
$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";

file_put_contents($logFile, "Conectando a la base de datos...\n", FILE_APPEND);

$conn = mysqli_connect($servername, $db_user, $db_pass, $database);
if (!$conn) {
    file_put_contents($logFile, "Error de conexión a BD: " . mysqli_connect_error() . "\n", FILE_APPEND);
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error de conexión a la base de datos"]);
    exit;
}

// Actualizar usuario como verificado
$sql = "UPDATE usuario SET verificacion_cuenta = 1 WHERE correo = ?";
$stmt = mysqli_prepare($conn, $sql);
mysqli_stmt_bind_param($stmt, "s", $email);

file_put_contents($logFile, "Ejecutando consulta: $sql\n", FILE_APPEND);

if (!mysqli_stmt_execute($stmt)) {
    file_put_contents($logFile, "Error al ejecutar consulta: " . mysqli_error($conn) . "\n", FILE_APPEND);
    mysqli_close($conn);
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error al verificar la cuenta"]);
    exit;
}

// Obtener datos del usuario
$sqlUser = "SELECT id_usuario, nombre, rol FROM usuario WHERE correo = ? LIMIT 1";
$stmtUser = mysqli_prepare($conn, $sqlUser);
mysqli_stmt_bind_param($stmtUser, "s", $email);

file_put_contents($logFile, "Obteniendo datos del usuario: $sqlUser\n", FILE_APPEND);

if (!mysqli_stmt_execute($stmtUser)) {
    file_put_contents($logFile, "Error al obtener usuario: " . mysqli_error($conn) . "\n", FILE_APPEND);
    mysqli_close($conn);
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error al obtener datos del usuario"]);
    exit;
}

$resUser = mysqli_stmt_get_result($stmtUser);

if (!$user = mysqli_fetch_assoc($resUser)) {
    file_put_contents($logFile, "Usuario no encontrado en BD\n", FILE_APPEND);
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

file_put_contents($logFile, "Buscando empresa asociada: $qEmp\n", FILE_APPEND);

if (mysqli_stmt_execute($sEmp)) {
    $rEmp = mysqli_stmt_get_result($sEmp);
    if ($e = mysqli_fetch_assoc($rEmp)) {
        $id_empresa = $e['id_empresa'];
        $empresa_nombre = $e['nombre_empresa'];
        file_put_contents($logFile, "Empresa encontrada: $empresa_nombre (ID: $id_empresa)\n", FILE_APPEND);
    } else {
        file_put_contents($logFile, "No se encontró empresa asociada\n", FILE_APPEND);
    }
}

// Guardar datos en sesión
$_SESSION['usuario_id'] = $user['id_usuario'];
$_SESSION['usuario_nombre'] = $user['nombre'];
$_SESSION['usuario_correo'] = $email;
$_SESSION['usuario_rol'] = $user['rol'];
$_SESSION['id_empresa'] = $id_empresa;
$_SESSION['empresa_nombre'] = $empresa_nombre;

// Limpiar datos de verificación
unset($_SESSION['codigo_verificacion']);
unset($_SESSION['correo_verificacion']);

mysqli_close($conn);

file_put_contents($logFile, "Verificación exitosa para usuario: " . $user['nombre'] . "\n", FILE_APPEND);
file_put_contents($logFile, "===================================\n", FILE_APPEND);

echo json_encode([
    "success" => true,
    "message" => "Cuenta verificada exitosamente",
    "id_usuario" => $user['id_usuario'],
    "nombre" => $user['nombre'],
    "correo" => $email,
    "rol" => $user['rol'],
    "id_empresa" => $id_empresa,
    "empresa_nombre" => $empresa_nombre,
    "session_id" => session_id()
]);
?>