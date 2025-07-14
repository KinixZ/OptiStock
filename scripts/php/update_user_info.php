<?php

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

$target_dir = "/images/profiles/";
$target_file = $target_dir . basename($_FILES["fotoPerfil"]["name"]);
if (move_uploaded_file($_FILES["fotoPerfil"]["tmp_name"], $_SERVER['DOCUMENT_ROOT'] . $target_file)) {
    // Actualiza la ruta en la base de datos
    $sql = "UPDATE usuario SET foto_perfil = ? WHERE id_usuario = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("si", $target_file, $id_usuario);
    $stmt->execute();
    echo json_encode(['success' => true, 'foto_perfil' => $target_file, 'message' => 'Foto actualizada correctamente']);
} else {
    echo json_encode(['success' => false, 'message' => 'Error al subir la foto']);
}
?>