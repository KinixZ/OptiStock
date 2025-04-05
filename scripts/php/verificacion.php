<?php
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

if (isset($_GET['token'])) {
    $token = $_GET['token'];  // Recuperamos el correo del parámetro de la URL

    // Validar el token en la base de datos (comprobamos que el correo no esté ya verificado)
    $sql = "SELECT * FROM usuario WHERE correo = ? AND verificacion_cuenta = 0";
    $stmt = mysqli_prepare($conn, $sql);
    mysqli_stmt_bind_param($stmt, "s", $token);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);

    if (mysqli_num_rows($result) > 0) {
        // El correo no está verificado, proceder con la verificación
        $updateSql = "UPDATE usuario SET verificacion_cuenta = 1 WHERE correo = ?";
        $updateStmt = mysqli_prepare($conn, $updateSql);
        mysqli_stmt_bind_param($updateStmt, "s", $token);
        mysqli_stmt_execute($updateStmt);

        // Responder con un mensaje de éxito
        echo "Tu cuenta ha sido verificada exitosamente.";
    } else {
        echo "El enlace de verificación no es válido o ya ha sido utilizado.";
    }
} else {
    echo "No se ha proporcionado un token de verificación.";
}

// Cerrar la conexión
mysqli_close($conn);
?>
