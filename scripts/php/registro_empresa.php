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

// Verificar si la conexión fue exitosa
if (!$conn) {
    echo json_encode(["success" => false, "message" => "Error de conexión a la base de datos."]);
    exit;
}

// Obtener los datos del formulario
$nombre_empresa = $_POST['nombre_empresa'];
$sector_empresa = $_POST['sector_empresa'];
$usuario_creador = $_POST['usuario_creador'];

// Subir el logo de la empresa
$logo_empresa = null; // Si no se sube el logo, se asigna null
if (isset($_FILES['logo_empresa']) && $_FILES['logo_empresa']['error'] === UPLOAD_ERR_OK) {
    // Validar si el archivo es una imagen válida
    $logo_empresa = 'images/logos/' . basename($_FILES['logo_empresa']['name']);
    if (!move_uploaded_file($_FILES['logo_empresa']['tmp_name'], '../../../images/logos/' . basename($_FILES['logo_empresa']['name']))) {
        echo json_encode(["success" => false, "message" => "Error al subir el logo de la empresa."]);
        exit;
    }
} else {
    // Si no hay archivo de logo, dejamos logo_empresa como null
    $logo_empresa = null;
}

// Insertar los datos en la base de datos
$sql = "INSERT INTO empresa (nombre_empresa, logo_empresa, sector_empresa, usuario_creador) 
        VALUES (?, ?, ?, ?)";
$stmt = mysqli_prepare($conn, $sql);
mysqli_stmt_bind_param($stmt, "sssi", $nombre_empresa, $logo_empresa, $sector_empresa, $usuario_creador);

// Verificar si la consulta se ejecutó correctamente
if (mysqli_stmt_execute($stmt)) {
    echo json_encode(["success" => true, "message" => "Empresa registrada con éxito"]);
} else {
    echo json_encode(["success" => false, "message" => "Error al registrar la empresa: " . mysqli_error($conn)]);
}

// Cerrar la conexión
mysqli_close($conn);
?>
