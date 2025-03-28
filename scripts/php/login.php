<?php
// Obtener los datos JSON del cliente
$data = json_decode(file_get_contents("php://input"));
$correo = $data->correo;
$contrasena = $data->contrasena;

$servername = "localhost";  // Host de la BD (Hostinger usa 'localhost' para MySQL)
$db_user    = "u296155119_Admin";  // Usuario de la base de datos
$db_pass    = "4Dmin123o"; // Contraseña de la base de datos
$database   = "u296155119_OptiStock";   // Nombre de la base de datos

$conn = mysqli_connect($servername, $db_user, $db_pass, $database);
if (!$conn) {
    die("Error de conexión: " . mysqli_connect_error());
}

// Consulta para verificar si el usuario existe
$sql = "SELECT * FROM usuario WHERE correo = ?";
$stmt = mysqli_prepare($conn, $sql);
mysqli_stmt_bind_param($stmt, "s", $correo);
mysqli_stmt_execute($stmt);
$result = mysqli_stmt_get_result($stmt);

// Verificar si el usuario existe
$user = mysqli_fetch_assoc($result);

if ($user) {
    // Verificar si la contraseña coincide (usando sha1 en la comparación)
    if (sha1($contrasena) == $user['contrasena']) {
        // Si la contraseña es correcta, verificar si la cuenta está verificada
        if ($user['verificacion_cuenta'] == 0) {
            // Si la cuenta no está verificada, enviar el estado de verificación
            echo json_encode(["success" => false, "verificacion_cuenta" => 0]);
        } else {
            // Si la cuenta está verificada, devolver el estado de éxito
            echo json_encode(["success" => true, "verificacion_cuenta" => 1, "user" => $user]);
        }
    } else {
        // Contraseña incorrecta
        echo json_encode(["success" => false]);
    }
} else {
    // Usuario no encontrado
    echo json_encode(["success" => false]);
}

// Cerrar la conexión
mysqli_close($conn);
?>
