<?php
session_start();
header('Content-Type: application/json');
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/log_utils.php';

$response = ["success" => false, "message" => ""];

try {
    $input = json_decode(file_get_contents("php://input"), true);
    if (!isset($input['codigo'])) {
        throw new Exception("Código no enviado.");
    }

    $codigoIngresado = trim($input['codigo']);

    if (!isset($_SESSION['codigo_recuperacion'], $_SESSION['correo_recuperacion'])) {
        throw new Exception("No hay código guardado en sesión.");
    }

    if ((string)$codigoIngresado !== (string)$_SESSION['codigo_recuperacion']) {
        throw new Exception("Código incorrecto.");
    }

    $servername = "localhost";
    $db_user    = "u296155119_Admin";
    $db_pass    = "4Dmin123o";
    $database   = "u296155119_OptiStock";

    $conn = mysqli_connect($servername, $db_user, $db_pass, $database);
    if ($conn) {
        $correo = $_SESSION['correo_recuperacion'];
        $stmt = $conn->prepare("SELECT id_usuario FROM usuario WHERE correo = ?");
        $stmt->bind_param('s', $correo);
        $stmt->execute();
        $result = $stmt->get_result();
        if ($result && $result->num_rows > 0) {
            $row = $result->fetch_assoc();
            registrarLog($conn, (int) $row['id_usuario'], 'Usuarios', 'Código de recuperación validado');
        }
    }

    $response["success"] = true;
    $response["message"] = "Código verificado correctamente.";
} catch (Exception $e) {
    $response["success"] = false;
    $response["message"] = $e->getMessage();
} finally {
    echo json_encode($response);
}

