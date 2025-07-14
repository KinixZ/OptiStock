<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['usuario_id'])) {
    echo json_encode(['success'=>false,'message'=>'Sesión no válida']); exit;
}
$id_usuario = intval($_SESSION['usuario_id']);

$conn = mysqli_connect("localhost","u296155119_Admin","4Dmin123o","u296155119_OptiStock");
if (!$conn) {
    echo json_encode(['success'=>false,'message'=>'Error de conexión a la base de datos']); exit;
}

$sql = "SELECT nombre, apellido, correo, telefono, foto_perfil, suscripcion
        FROM usuario WHERE id_usuario = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $id_usuario);
$stmt->execute();
$result = $stmt->get_result();

if ($user = $result->fetch_assoc()) {
    echo json_encode(['success'=>true,'data'=>$user]);
} else {
    echo json_encode(['success'=>false,'message'=>'Usuario no encontrado']);
}

$stmt->close();
$conn->close();
?>
