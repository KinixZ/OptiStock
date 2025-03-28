<?php
// Obtener los datos del formulario
$correo = $_POST['correo'] ?? null;
$contrasena = $_POST['contrasena'] ?? null;

if (empty($correo) || empty($contrasena)) {
    echo json_encode(["success" => false, "message" => "Por favor, completa todos los campos."]);
    exit;
}

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

// Consulta SQL para verificar el correo
$sql = "SELECT * FROM usuario WHERE correo = ?";
$stmt = mysqli_prepare($conn, $sql);
mysqli_stmt_bind_param($stmt, "s", $correo);
mysqli_stmt_execute($stmt);
$result = mysqli_stmt_get_result($stmt);

// Verificar si el usuario existe
$user = mysqli_fetch_assoc($result);

if ($user) {
    // Verificar la contraseña
    if (sha1($contrasena) == $user['contrasena']) {
        // Si la contraseña es correcta, verificar si la cuenta está verificada
        if ($user['verificacion_cuenta'] == 0) {
            echo json_encode(["success" => true, "redirect" => "../regis_login/regist/regist_inter.html"]);
        } else {
            echo json_encode(["success" => true, "redirect" => "../main_menu/main_menu.html"]);
        }
    } else {
        echo json_encode(["success" => false, "message" => "La contraseña es incorrecta."]);
    }
} else {
    echo json_encode(["success" => false, "message" => "El usuario no existe."]);
}

// Cerrar la conexión
mysqli_close($conn);
?>