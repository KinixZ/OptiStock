<?php
session_start();

// Validar si hay sesión activa
if (!isset($_SESSION['usuario_id'])) {
    header("Location: /pages/regis_login/login/login.html");
    exit;
}

// Conexión a la base de datos
$servername = "localhost";
$username = "u296155119_Admin";
$password = "4Dmin123o";
$database = "u296155119_OptiStock";

$conn = new mysqli($servername, $username, $password, $database);

if ($conn->connect_error) {
    die("Conexión fallida: " . $conn->connect_error);
}

// Ejemplo de consulta para obtener la empresa del usuario logueado
$usuario_id = $_SESSION['usuario_id'];
$sql = "SELECT * FROM empresa WHERE usuario_creador = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $usuario_id);
$stmt->execute();
$result = $stmt->get_result();

if ($empresa = $result->fetch_assoc()) {
    echo json_encode([
        "success" => true,
        "empresa" => $empresa
    ]);
} else {
    echo json_encode([
        "success" => false,
        "message" => "No se encontró empresa para este usuario."
    ]);
}

$stmt->close();
$conn->close();
?>
