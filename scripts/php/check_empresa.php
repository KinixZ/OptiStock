<?php
// Establecer la conexión a la base de datos
$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";

$conn = mysqli_connect($servername, $db_user, $db_pass, $database);

if (!$conn) {
    echo json_encode(["success" => false, "message" => "Error de conexión a la base de datos."]);
    exit;
}

// Obtener el ID del usuario desde la solicitud
$data = json_decode(file_get_contents("php://input"));
$usuario_id = $data->usuario_id;

// Consultar si el usuario tiene una empresa registrada
$sql = "SELECT * FROM empresa WHERE usuario_creador = ?";
$stmt = mysqli_prepare($conn, $sql);
mysqli_stmt_bind_param($stmt, "i", $usuario_id);
mysqli_stmt_execute($stmt);
$result = mysqli_stmt_get_result($stmt);

// Verificar si el usuario tiene una empresa
if ($empresa = mysqli_fetch_assoc($result)) {
    echo json_encode(["success" => true, "empresa_nombre" => $empresa['nombre_empresa']]);
} else {
    echo json_encode(["success" => false, "message" => "No tienes una empresa registrada."]);
}

// Cerrar la conexión
mysqli_close($conn);
?>
