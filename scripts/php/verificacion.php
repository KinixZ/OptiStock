<?php
// Conexión a la base de datos utilizando mysqli
$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";

// Crear conexión
$conn = mysqli_connect($servername, $db_user, $db_pass, $database);

// Verificar conexión
if (!$conn) {
    echo json_encode(["success" => false, "message" => "Error de conexión a la base de datos."]);
    exit;
}

if (isset($_GET['token'])) {
    $token = $_GET['token'];

    // Validar el token en la base de datos
    $sql = "SELECT * FROM usuario WHERE correo = ?";
    $stmt = mysqli_prepare($conn, $sql);
    mysqli_stmt_bind_param($stmt, "s", $token);  // Usamos "s" para indicar que es una cadena de texto (string)
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);

    if (mysqli_num_rows($result) > 0) {
        // El token es válido, activar la cuenta
        $usuario = mysqli_fetch_assoc($result);
        if ($usuario['verificacion_cuenta'] == 1) {
            echo "Tu cuenta ya está verificada.";
        } else {
            // Actualizar el estado de verificación a TRUE
            $updateSql = "UPDATE usuario SET verificacion_cuenta = 1 WHERE correo = ?";
            $updateStmt = mysqli_prepare($conn, $updateSql);
            mysqli_stmt_bind_param($updateStmt, "s", $token);
            mysqli_stmt_execute($updateStmt);

            echo "Tu cuenta ha sido verificada exitosamente. Ahora puedes iniciar sesión.";
        }
    } else {
        echo "El enlace de verificación no es válido o ya ha expirado.";
    }
} else {
    echo "No se ha proporcionado un token de verificación.";
}

// Cerrar conexión a la base de datos
mysqli_close($conn);
?>
