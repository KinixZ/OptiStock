<?php
$server = "localhost";
$username = "u296155119_Admin";
$password = "Admin123";
$dbname = "u296155119_OptiStock";

// Crear conexión
try {
    $conn = new PDO("mysql:host=$server;dbname=$dbname;charset=utf8mb4", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ATTR_ERRMODE_EXCEPTION);
    $conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch(PDOException $e) {
    die(json_encode(['error' => 'Error de conexión: ' . $e->getMessage()]));
}
?>