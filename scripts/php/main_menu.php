<?php
session_start();
header('Content-Type: application/json');

// Validar si hay sesión activa
if (!isset($_SESSION['usuario_id'])) {
    echo json_encode(["success" => false, "message" => "No hay sesión activa."]);
    exit;
}

// Conexión a la base de datos
$servername = "localhost";
$username = "u296155119_Admin";
$password = "4Dmin123o";
$database = "u296155119_OptiStock";


$conn = new mysqli($servername, $username, $password, $database);
if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Error de conexión a la base de datos."]);
    exit;
}

// Ejemplo de consulta para obtener la empresa del usuario logueado
$usuario_id     = $_SESSION['usuario_id'];
$usuario_nombre = $_SESSION['usuario_nombre'];
$usuario_correo = $_SESSION['usuario_correo'];
$usuario_rol    = $_SESSION['usuario_rol'];

$sql = "SELECT id_empresa, nombre_empresa FROM empresa WHERE usuario_creador = ? LIMIT 1";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $usuario_id);
$stmt->execute();
$result = $stmt->get_result();

$empresa = $result->fetch_assoc();

$response = [
    "success"        => true,
    "usuario_id"     => $usuario_id,
    "usuario_nombre" => $usuario_nombre,
    "usuario_correo" => $usuario_correo,
    "usuario_rol"    => $usuario_rol,
    "id_empresa"     => $empresa['id_empresa']     ?? null,
    "empresa_nombre" => $empresa['nombre_empresa'] ?? null
];

echo json_encode($response);

$stmt->close();
$conn->close();
?>
