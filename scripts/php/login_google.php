<?php
// Conexión a la base de datos
$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";
$conn = mysqli_connect($servername, $db_user, $db_pass, $database);

// Verificar conexión
if (!$conn) {
    echo json_encode(["success" => false, "message" => "Error de conexión a la base de datos."]);
    exit;
}

$data = json_decode(file_get_contents("php://input"));

$nombre = $data->nombre;
$apellido = $data->apellido;
$correo = $data->email;
$google_id = $data->google_id;

// Verificar si ya existe
$query = $conn->prepare("SELECT * FROM usuario WHERE correo = ?");
$query->bind_param("s", $correo);
$query->execute();
$result = $query->get_result();

if ($result->num_rows > 0) {
    echo json_encode(["success" => true, "message" => "Login exitoso"]);
} else {
    // Crear usuario con datos mínimos y contraseña falsa segura
    $fakePass = sha1("GOOGLE-" . $google_id); // Algo que no se pueda usar para login normal

    $insert = $conn->prepare("INSERT INTO usuario (nombre, apellido, fecha_nacimiento, telefono, correo, contrasena, verificacion_cuenta) VALUES (?, ?, ?, ?, ?, ?, 1)");
    $defaultFecha = "2000-01-01"; // por defecto
    $defaultTel = "0000000000"; // por defecto
    $insert->bind_param("ssssss", $nombre, $apellido, $defaultFecha, $defaultTel, $correo, $fakePass);

    if ($insert->execute()) {
        echo json_encode(["success" => true, "message" => "Usuario creado con Google"]);
    } else {
        echo json_encode(["success" => false, "message" => "Error al crear el usuario"]);
    }
}
?>
