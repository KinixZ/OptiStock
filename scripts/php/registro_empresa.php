<?php
header('Content-Type: application/json');
ini_set('display_errors', 1);
error_reporting(E_ALL);

$response = ["success" => false, "message" => ""]; // Respuesta inicial

try {
    // Leer datos del formulario
    $data = $_POST;

    $nombre_empresa = $data['nombre_empresa'] ?? null;
    $sector = $data['sector'] ?? null;
    $direccion = $data['direccion'] ?? null;
    $telefono_empresa = $data['telefono_empresa'] ?? null;
    $correo_empresa = $data['correo_empresa'] ?? null;
    $logo = $_FILES['logo'] ?? null;

    // Validar datos mínimos
    if (!$nombre_empresa || !$sector || !$direccion || !$telefono_empresa || !$correo_empresa) {
        throw new Exception("Datos incompletos");
    }

    // Conectar a la base de datos
    $servername = "localhost";
    $db_user    = "u296155119_Admin";
    $db_pass    = "4Dmin123o";
    $database   = "u296155119_OptiStock";

    $conn = mysqli_connect($servername, $db_user, $db_pass, $database);
    if (!$conn) {
        throw new Exception("Error de conexión: " . mysqli_connect_error());
    }

    // Subir logo de la empresa si se proporcionó
    if ($logo) {
        $targetDir = "../../../uploads/logos/"; // Cambiar la ruta según tu estructura
        $logoName = time() . "_" . basename($logo['name']);
        $targetFile = $targetDir . $logoName;

        if (!move_uploaded_file($logo['tmp_name'], $targetFile)) {
            throw new Exception("Error al subir el logotipo.");
        }
    } else {
        $logoName = null; // Si no se proporciona logo, lo dejamos como NULL
    }

    // Preparar la consulta SQL
    $sql = "INSERT INTO empresa (nombre, sector, direccion, telefono, correo, logo)
            VALUES (?, ?, ?, ?, ?, ?)";
    $stmt = mysqli_prepare($conn, $sql);
    mysqli_stmt_bind_param($stmt, "ssssss", $nombre_empresa, $sector, $direccion, $telefono_empresa, $correo_empresa, $logoName);

    // Ejecutar la consulta
    if (!mysqli_stmt_execute($stmt)) {
        throw new Exception("Error al registrar la empresa: " . mysqli_error($conn));
    }

    // Respuesta de éxito
    $response["success"] = true;
    $response["message"] = "Empresa registrada correctamente.";

} catch (Exception $e) {
    // Capturar errores y enviar respuesta
    $response["success"] = false;
    $response["message"] = $e->getMessage();
} finally {
    // Cerrar la conexión si existe
    if (isset($conn) && $conn) {
        mysqli_close($conn);
    }
    // Enviar la respuesta JSON
    echo json_encode($response);
}
