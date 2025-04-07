<?php
session_start();

// Conexión a la base de datos
$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";
$conn = mysqli_connect($servername, $db_user, $db_pass, $database);

// Verificar conexión
if (!$conn) {
    echo json_encode(["success" => false, "message" => "Error de conexión a la base de datos."]);
    exit;
}

// Verificar si el código es correcto
if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST['correo']) && isset($_POST['codigo'])) {
    $correo = $_POST['correo'];
    $codigo_ingresado = $_POST['codigo'];

    // Comparar el código ingresado con el código almacenado en la sesión
    if (isset($_SESSION['codigo_verificacion']) && $_SESSION['codigo_verificacion'] == $codigo_ingresado) {
        // Código correcto, actualizar la cuenta como verificada
        $sql = "UPDATE usuario SET verificacion_cuenta = 1 WHERE correo = ?";
        $stmt = mysqli_prepare($conn, $sql);
        mysqli_stmt_bind_param($stmt, "s", $correo);
        mysqli_stmt_execute($stmt);

        echo json_encode(["success" => true, "message" => "Tu cuenta ha sido verificada exitosamente."]);
        
        // Limpiar la sesión después de la verificación
        unset($_SESSION['codigo_verificacion']);
        unset($_SESSION['correo']);
    } else {
        echo json_encode(["success" => false, "message" => "El código de verificación es incorrecto."]);
    }
}

mysqli_close($conn);
?>
