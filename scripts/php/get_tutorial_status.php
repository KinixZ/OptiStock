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

$stmt = mysqli_prepare($conn, "SELECT tutorial_visto FROM usuario WHERE id_usuario = ?");
if (!$stmt) {
    $response['message'] = 'Error al preparar la consulta';
    echo json_encode($response);
    mysqli_close($conn);
    exit;
}

mysqli_stmt_bind_param($stmt, "i", $usuarioId);
mysqli_stmt_execute($stmt);
mysqli_stmt_bind_result($stmt, $tutorialVisto);

if (mysqli_stmt_fetch($stmt)) {
    $response['success'] = true;
    $response['tutorial_visto'] = (int) $tutorialVisto;
} else {
    $response['message'] = 'Usuario no encontrado';
}

mysqli_stmt_close($stmt);
mysqli_close($conn);

echo json_encode($response);
