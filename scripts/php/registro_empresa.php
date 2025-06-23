<?php
// Establecer la conexión a la base de datos
$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";

$conn = mysqli_connect($servername, $db_user, $db_pass, $database);

if (!$conn) {
    echo json_encode(["success" => false, "message" => "Error de conexión a la base de datos."]);
    exit;
}

// Obtener los datos del formulario
$nombre_empresa = $_POST['nombre_empresa'];
$sector_empresa = $_POST['sector_empresa'];
$usuario_creador = $_POST['usuario_creador'];

// Subir el logo de la empresa
$logo_empresa = null;
if (isset($_FILES['logo_empresa']) && $_FILES['logo_empresa']['error'] === UPLOAD_ERR_OK) {
    $logo_empresa = 'images/logos/' . basename($_FILES['logo_empresa']['name']);
    move_uploaded_file($_FILES['logo_empresa']['tmp_name'], '../../../images/logos/' . basename($_FILES['logo_empresa']['name']));
}

// Insertar los datos en la base de datos
$sql = "INSERT INTO empresa (nombre_empresa, logo_empresa, sector_empresa, usuario_creador) 
        VALUES (?, ?, ?, ?)";
$stmt = mysqli_prepare($conn, $sql);
mysqli_stmt_bind_param($stmt, "sssi", $nombre_empresa, $logo_empresa, $sector_empresa, $usuario_creador);

if (mysqli_stmt_execute($stmt)) {
    echo json_encode(["success" => true, "message" => "Empresa registrada con éxito"]);
} else {
    echo json_encode(["success" => false, "message" => "Error al registrar la empresa: " . mysqli_error($conn)]);
}

// Cerrar la conexión
mysqli_close($conn);
?>
