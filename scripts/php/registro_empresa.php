<?php
// Habilitar el reporte de errores
ini_set('display_errors', 1);
error_reporting(E_ALL);

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

// Obtener los datos del formulario (usuario_creador desde el frontend)
$nombre_empresa = $_POST['nombre_empresa'];
$sector_empresa = $_POST['sector_empresa'];
$usuario_creador = $_POST['usuario_creador'];  // ID del usuario que está creando la empresa

// Verificar que el ID del usuario creador sea válido
if (empty($usuario_creador)) {
    echo json_encode(["success" => false, "message" => "El ID del usuario creador no es válido."]);
    exit;
}

// Subir el logo de la empresa (opcional)
$logo_empresa = null;
if (isset($_FILES['logo_empresa']) && $_FILES['logo_empresa']['error'] === UPLOAD_ERR_OK) {
    // Generar la ruta donde se almacenará la imagen en el servidor
    $logo_empresa = 'images/logos/' . basename($_FILES['logo_empresa']['name']);
    
    // Mover el archivo cargado a la carpeta /images/logos
    if (!move_uploaded_file($_FILES['logo_empresa']['tmp_name'], '../../../images/logos/' . basename($_FILES['logo_empresa']['name']))) {
        echo json_encode(["success" => false, "message" => "Error al subir el logo de la empresa."]);
        exit;
    }
}

// Insertar los datos en la base de datos
$sql = "INSERT INTO empresa (nombre_empresa, logo_empresa, sector_empresa, usuario_creador)"
        . " VALUES (?, ?, ?, ?)";
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
