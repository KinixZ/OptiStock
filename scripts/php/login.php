<?php
$data = json_decode(file_get_contents("php://input"));
$correo = $data->correo;
$contrasena = $data->contrasena;

$servername = "localhost"; // Host de la BD (Hostinger usa 'localhost' para MySQL)
$db_user    = "u296155119_Admin";  // Usuario de la base de datos
$db_pass    = "4Dmin123o"; // Contraseña de la base de datos
$database   = "u296155119_OptiStock";   // Nombre de la base de datos

$conn = mysqli_connect($servername, $db_user, $db_pass, $database);
if (!$conn) {
    die("Error de conexión: " . mysqli_connect_error());
}

// Ejemplo de validación de login en PHP
$sql = "SELECT * FROM usuario WHERE correo = ? AND contrasena = ?";
$stmt = mysqli_prepare($conn, $sql);
mysqli_stmt_bind_param($stmt, "ss", $correo, $contrasena_hash);
mysqli_stmt_execute($stmt);
$result = mysqli_stmt_get_result($stmt);

$user = mysqli_fetch_assoc($result);

if ($user && sha1($contrasena) == $user['contrasena']) {
    // Si el usuario existe y la contraseña es correcta
    echo json_encode([
        'success' => true,
        'verificacion_cuenta' => $user['verificacion_cuenta'] // Retornar el estado de verificación
    ]);
} else {
    echo json_encode(['success' => false]);
}

if ($user) {
    if ($user['verificacion_cuenta'] == 0) {
        // La cuenta no está verificada, redirigir a la página de verificación
        echo json_encode(["success" => false, "verificacion_cuenta" => 0]);
    } else {
        // La cuenta está verificada, continuar el login
        echo json_encode(["success" => true, "user" => $user]);
    }
} else {
    echo json_encode(["success" => false]);
}
?>