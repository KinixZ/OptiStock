<?php
session_start();
$id = $_SESSION['usuario_id'] ?? null;
$_SESSION = [];
session_destroy();

if ($id) {
    $servername = "localhost";
    $db_user    = "u296155119_Admin";
    $db_pass    = "4Dmin123o";
    $database   = "u296155119_OptiStock";
    $conn = mysqli_connect($servername, $db_user, $db_pass, $database);
    if ($conn) {
        $stmt = mysqli_prepare($conn, "INSERT INTO registro_accesos (id_usuario, accion) VALUES (?, 'Cierre')");
        if ($stmt) {
            mysqli_stmt_bind_param($stmt, "i", $id);
            mysqli_stmt_execute($stmt);
            mysqli_stmt_close($stmt);
        }
        mysqli_close($conn);
    }
}

echo json_encode(["success" => true, "message" => "Sesión cerrada correctamente."]); 
?>
