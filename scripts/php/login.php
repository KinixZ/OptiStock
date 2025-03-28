<?php
// Obtener los datos del formulario
$correo = $_POST['correo'] ?? null;
$contrasena = $_POST['contrasena'] ?? null;

if (empty($correo) || empty($contrasena)) {
    // Redirigir a una página de error si los campos están vacíos
    header("Location: ../../pages/error.html");
    exit;
}

// Conexión a la base de datos
$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";

$conn = mysqli_connect($servername, $db_user, $db_pass, $database);
if (!$conn) {
    die("Error de conexión: " . mysqli_connect_error());
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
            // Redirigir a la página de verificación
            header("Location: ../../pages/regis_login/regist/regist_inter.html");
        } else {
            // Redirigir al menú principal
            header("Location: ../../pages/main_menu/main_menu.html");
        }
    } else {
        // Redirigir a una página de error si la contraseña es incorrecta
        header("Location: ../../pages/error.html");
    }
} else {
    // Redirigir a una página de error si el usuario no existe
    header("Location: ../../pages/error.html");
}

// Cerrar la conexión
mysqli_close($conn);
?>