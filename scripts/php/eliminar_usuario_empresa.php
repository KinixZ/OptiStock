<?php
session_start();
header('Content-Type: application/json');

$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";

$conn = mysqli_connect($servername, $db_user, $db_pass, $database);
if (!$conn) {
    echo json_encode(["success" => false, "message" => "Error de conexión"]);
    exit;
}

require_once __DIR__ . '/log_utils.php';

$data = json_decode(file_get_contents("php://input"), true);
$correo = $data['correo'] ?? null;

if (!$correo) {
    echo json_encode(["success" => false, "message" => "Correo no proporcionado"]);
    exit;
}

$conn->begin_transaction();

try {
    // 1. Obtener ID del usuario
    $stmt = $conn->prepare("SELECT id_usuario FROM usuario WHERE correo = ?");
    $stmt->bind_param("s", $correo);
    $stmt->execute();
    $result = $stmt->get_result();
    $usuario = $result->fetch_assoc();

    if (!$usuario) throw new Exception("Usuario no encontrado");

    $id_usuario = $usuario['id_usuario'];

    // 2. Eliminar de usuario_empresa
    $stmt = $conn->prepare("DELETE FROM usuario_empresa WHERE id_usuario = ?");
    $stmt->bind_param("i", $id_usuario);
    $stmt->execute();

    // 3. Eliminar de usuario
    $stmt = $conn->prepare("DELETE FROM usuario WHERE id_usuario = ?");
    $stmt->bind_param("i", $id_usuario);
    $stmt->execute();

    $conn->commit();
    registrarLog($conn, $_SESSION['usuario_id'] ?? 0, 'Usuarios', "Eliminación de usuario empresa: $correo");
    echo json_encode(["success" => true]);
} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
