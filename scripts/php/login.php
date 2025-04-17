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
    $failedAttempts = $user['intentos_fallidos'];
    $lastFailedAttempt = strtotime($user['ultimo_intento']);
    $currentTime = time();

    // Bloqueo de 5 minutos
    if ($failedAttempts >= 4 && ($currentTime - $lastFailedAttempt) < 300) {
        echo json_encode([
            "success" => false,
            "message" => "Tu cuenta está bloqueada. Intenta nuevamente en 5 minutos."
        ]);
        exit;
    }

    // Verificar la contraseña
    if (sha1($contrasena) == $user['contrasena']) {
        // Restablecer intentos fallidos en caso de éxito
        $resetAttemptsSql = "UPDATE usuario SET intentos_fallidos = 0, ultimo_intento = NULL WHERE correo = ?";
        $resetStmt = mysqli_prepare($conn, $resetAttemptsSql);
        mysqli_stmt_bind_param($resetStmt, "s", $correo);
        mysqli_stmt_execute($resetStmt);

        // Verificar si la cuenta está verificada
        if ($user['verificacion_cuenta'] == 0) {
            echo json_encode(["success" => true, "redirect" => "../regist/regist_inter.html?email=" . urlencode($correo)]);
        } else {
            echo json_encode(["success" => true, "redirect" => "../../main_menu/main_menu.html"]);
        }
    } else {
        // Incrementar intentos fallidos
        $failedAttempts++;
        $updateAttemptsSql = "UPDATE usuario SET intentos_fallidos = ?, ultimo_intento = NOW() WHERE correo = ?";
        $updateStmt = mysqli_prepare($conn, $updateAttemptsSql);
        mysqli_stmt_bind_param($updateStmt, "is", $failedAttempts, $correo);

        // Verificar si la consulta se ejecutó correctamente
        if (mysqli_stmt_execute($updateStmt)) {
            if ($failedAttempts >= 4) {
                // Enviar correo de notificación
                sendEmail($correo, "Cuenta bloqueada", "Tu cuenta ha sido bloqueada por múltiples intentos fallidos. Intenta nuevamente en 5 minutos.");

                echo json_encode([
                    "success" => false,
                    "message" => "Tu cuenta ha sido bloqueada por múltiples intentos fallidos. Revisa tu correo."
                ]);
            } else {
                echo json_encode([
                    "success" => false,
                    "message" => "Contraseña incorrecta. Intentos fallidos: $failedAttempts."
                ]);
            }
        } else {
            echo json_encode([
                "success" => false,
                "message" => "Error al actualizar los intentos fallidos en la base de datos."
            ]);
        }
    }
} else {
    echo json_encode(["success" => false, "message" => "El usuario no existe."]);
}

// Cerrar la conexión
mysqli_close($conn);

// Función para enviar correos
function sendEmail($to, $subject, $body) {
    // Configuración del correo (puedes usar PHPMailer u otra biblioteca)
    $headers = "From: no-reply@optistock.site\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
    mail($to, $subject, $body, $headers);
}
?>