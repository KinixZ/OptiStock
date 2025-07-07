<?php
session_start();
header('Content-Type: application/json');
ini_set('display_errors', 1);
error_reporting(E_ALL);

$response = ["success" => false, "message" => ""];

try {
    $data = json_decode(file_get_contents("php://input"), true);
    $codigoIngresado = $data['codigo'] ?? null;

    if (!$codigoIngresado) {
        throw new Exception("Código no proporcionado.");
    }

    if (!isset($_SESSION['codigo_recuperacion']) || !isset($_SESSION['correo_recuperacion'])) {
        throw new Exception("No hay sesión activa o el código expiró.");
    }

    if ((string)$codigoIngresado !== (string)$_SESSION['codigo_recuperacion']) {
        throw new Exception("Código incorrecto.");
    }

    $response["succes]()
