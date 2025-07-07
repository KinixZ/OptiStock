<?php
session_start();
header('Content-Type: application/json');
ini_set('display_errors', 1);
error_reporting(E_ALL);

$response = ["success" => false, "message" => ""];

try {
    // Validar sesión
    if (!isset($_SESSION['correo_recuperacion'])) {
        throw new Exception("Sesión no válida. Solicita el código de recuperación de nuevo.");
    }

    // Leer nueva contraseña
    $data = json_decode(file_get_contents("php://input"), true);
    $nueva = $data['nueva'] ?? null;
    if (!$nueva) throw new Exception("Contraseña nueva no proporcionada.");

    // Hashear la contraseña (puedes usar sha1 si así está el sistema actual, pero bcrypt es mejor)
    $hashed = password_hash($nueva, PASSWORD_BCRYPT);
    $correo = $_SESSION['correo_recuperacion'];

    // Conectar a la base de datos
    $conn = new mysqli("localhost", "u296155119_Admin", "4Dmin123o", "u296155119_OptiStock");
    if ($conn->connect_error) throw new Exception("Error al conectar con la base de datos.");

    // Actualizar contraseña
    $stmt = $conn->prepare("UPDATE usuario SET contrasena = ? WHERE correo = ?");
    $stmt->bind_param("ss", $hashed, $correo);
    $stmt->execute();

    // Limpiar sesión
    unset($_SESSION['codigo_recuperacion']);
    unset($_SESSION['correo_recuperacion']);

    $response["success"] = true;
    $response["message"] = "Contraseña cambiada correctamente.";
} catch (Exception $e) {
    $response["success"] = false;
    $response["message"] = $e->getMessage();
} finally {
    echo json_encode($response);
}
?>
