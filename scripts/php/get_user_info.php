<?php
session_start();
header('Content-Type: application/json');

// Validar si el usuario está autenticado y tiene id_usuario en sesión
if (!isset($_SESSION['id_usuario'])) {
    echo json_encode(['success' => false, 'message' => 'No autenticado']);
    exit;
}

$id_usuario = $_SESSION['id_usuario'];

// Conexión a la base de datos
$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";

$conn = mysqli_connect($servername, $db_user, $db_pass, $database);
if (!$conn) {
    echo json_encode(["success" => false, "message" => "Error de conexión a la base de datos."]);
    exit;
}

// Consulta para obtener datos del usuario actual
$sql = "SELECT nombre, apellido, correo, telefono, rol, suscripcion, foto_perfil FROM usuario WHERE id_usuario = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $id_usuario);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo json_encode(['success' => false, 'message' => 'Usuario no encontrado']);
    exit;
}

$user = $result->fetch_assoc();

echo json_encode(['success' => true, 'data' => $user]);

$stmt->close();
$conn->close();
?>
