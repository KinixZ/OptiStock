<?php
header('Content-Type: application/json');
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/log_utils.php';
require_once __DIR__ . '/mail_utils.php';

$response = ["success" => false, "message" => ""]; // Respuesta inicial

try {
    // 1. Leer datos del formulario
    $data = json_decode(file_get_contents("php://input"), true);

    $nombre = $data['nombre'] ?? null;
    $apellido = $data['apellido'] ?? null;
    $fecha_nacimiento = $data['fecha_nacimiento'] ?? null;
    $telefono = $data['telefono'] ?? null;
    $correo = $data['correo'] ?? null;
    $contrasena = $data['contrasena'] ?? null;

    // 2. Validar datos mínimos
    if (!$nombre || !$apellido || !$fecha_nacimiento || !$telefono || !$correo || !$contrasena) {
        throw new Exception("Datos incompletos");
    }

    // 3. Conectarse a la base de datos
    $servername = "localhost";
    $db_user    = "u296155119_Admin";
    $db_pass    = "4Dmin123o";
    $database   = "u296155119_OptiStock";

    $conn = mysqli_connect($servername, $db_user, $db_pass, $database);
    if (!$conn) {
        throw new Exception("Error de conexión: " . mysqli_connect_error());
    }

    // 4. Cifrar la contraseña
    $contrasena_hash = sha1($contrasena);

    // 5. Preparar la consulta SQL
    $sql = "INSERT INTO usuario (nombre, apellido, fecha_nacimiento, telefono, correo, contrasena)
            VALUES (?, ?, ?, ?, ?, ?)";
    $stmt = mysqli_prepare($conn, $sql);
    mysqli_stmt_bind_param($stmt, "ssssss", $nombre, $apellido, $fecha_nacimiento, $telefono, $correo, $contrasena_hash);

    // 6. Ejecutar la consulta
    if (!mysqli_stmt_execute($stmt)) {
        throw new Exception("Error al registrar el usuario: " . mysqli_error($conn));
    }

    $id_usuario = mysqli_insert_id($conn);

    // 7. Generar código de verificación
    $codigo_verificacion = mt_rand(100000, 999999);
    session_start();
    $_SESSION['codigo_verificacion'] = $codigo_verificacion;
    $_SESSION['correo_verificacion'] = $correo;

    // 8. Enviar el correo
    $mail_subject = "OPTISTOCK - Código de verificación";
    $nombreSeguro = htmlspecialchars($nombre, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $contenidoHtml = '<p style="margin:0 0 16px;">¡Hola <strong>' . $nombreSeguro . '</strong>!</p>'
        . '<p style="margin:0 0 16px;">Gracias por registrarte en OptiStock. Estamos felices de acompañarte en la gestión de tu inventario.</p>'
        . '<p style="margin:0 0 16px;">Confirma tu cuenta ingresando el siguiente código en la aplicación.</p>';
    $mail_message = generarCorreoPlantilla(
        'Verifica tu cuenta',
        $contenidoHtml,
        [
            'codigo' => $codigo_verificacion,
            'footer_text' => 'Si no creaste esta cuenta, ignora este mensaje o contáctanos.'
        ]
    );
    $mensajePlano = "Hola $nombre,\n\nGracias por registrarte en OptiStock. Tu código de verificación es: $codigo_verificacion."
        . "\n\nSi no creaste esta cuenta, ignora este mensaje.";

    if (!enviarCorreo($correo, $mail_subject, $mail_message, ['is_html' => true, 'plain_text' => $mensajePlano])) {
        throw new Exception("Error al enviar el correo de verificación.");
    }

    registrarLog($conn, $id_usuario, 'Usuarios', "Registro de usuario: $correo");

    // Respuesta de éxito
    $response["success"] = true;
    $response["message"] = "Usuario registrado correctamente. Se ha enviado un código de verificación a tu correo.";

} catch (Exception $e) {
    // Capturar errores y enviar respuesta
    $response["success"] = false;
    $response["message"] = $e->getMessage();
} finally {
    // Cerrar la conexión si existe
    if (isset($conn) && $conn) {
        mysqli_close($conn);
    }
    // Enviar la respuesta JSON
    echo json_encode($response);
}
?>