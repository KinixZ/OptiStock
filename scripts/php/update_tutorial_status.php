<?php
session_start();
header('Content-Type: application/json');

$response = ['success' => false, 'message' => ''];

if (!isset($_SESSION['usuario_id'])) {
    $response['message'] = 'Sesión no válida';
    echo json_encode($response);
    exit;
}

$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";

$conn = mysqli_connect($servername, $db_user, $db_pass, $database);
if (!$conn) {
    $response['message'] = 'Error de conexión a la base de datos';
    echo json_encode($response);
    exit;
}

$usuarioId = intval($_SESSION['usuario_id']);

$stmt = mysqli_prepare($conn, "UPDATE usuario SET tutorial_visto = 1 WHERE id_usuario = ?");
if (!$stmt) {
    $response['message'] = 'Error al preparar la consulta';
    echo json_encode($response);
    mysqli_close($conn);
    exit;
}

mysqli_stmt_bind_param($stmt, "i", $usuarioId);
$success = mysqli_stmt_execute($stmt);

if ($success) {
    $_SESSION['tutorial_visto'] = 1;
    $response['success'] = true;
    $response['tutorial_visto'] = 1;
} else {
    $response['message'] = 'No se pudo actualizar el tutorial';
}

mysqli_stmt_close($stmt);
mysqli_close($conn);

echo json_encode($response);
