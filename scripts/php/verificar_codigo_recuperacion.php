<?php
session_start();
header('Content-Type: application/json');
ini_set('display_errors', 1);
error_reporting(E_ALL);

$response = ["success" => false, "message" => ""];

try {
    $input = json_decode(file_get_contents("php://input"), true);
    if (!isset($input['codigo'])) {
        throw new Exception("Código no enviado.");
    }

    $codigoIngresado = trim($input['codigo']);

    if (!isset($_SESSION['codigo_recuperacion'])) {
        throw new Exception("No hay código guardado en sesión.");
    }

    if ((string)$codigoIngresado !== (string)$_SESSION['codigo_recuperacion']) {
        throw new Exception("Código incorrecto.");
    }

    $response["success"] = true;
    $response["message"] = "Código verificado correctamente.";
} catch (Exception $e) {
    $response["success"] = false;
    $response["message"] = $e->getMessage();
} finally {
    echo json_encode($response);
}
?>
