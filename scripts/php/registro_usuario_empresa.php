<?php
session_start();
header('Content-Type: application/json');

$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";
$conn = mysqli_connect($servername, $db_user, $db_pass, $database);

if (!$conn) {
    echo json_encode(["success" => false, "message" => "Error de conexión"]);
    exit;
}

require_once __DIR__ . '/log_utils.php';

$data = json_decode(file_get_contents("php://input"), true);

$nombre = $data['nombre'];
$apellido = $data['apellido'];
$nacimiento = $data['fecha_nacimiento'];
$telefono = $data['telefono'];
$correo = $data['correo'];
$rol = $data['rol']; // Aunque no se usa en la inserción, se puede guardar si es necesario
$contrasena = sha1($data['contrasena']);
$id_empresa = intval($data['id_empresa']);

$perfiles = [
    'Administrador' => 'images/profile.jpg',
    'Almacenista'   => 'images/almacenista.jpg',
    'Etiquetador'   => 'images/etiquetador.jpg',
    'Mantenimiento' => 'images/mantenimiento.jpg',
    'Supervisor'    => 'images/supervisor.jpg'
];
$foto_perfil = $perfiles[$rol] ?? 'images/profile.jpg';

$query1 = "INSERT INTO usuario (nombre, apellido, fecha_nacimiento, telefono, correo, contrasena, rol, foto_perfil, verificacion_cuenta)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)";
$stmt1 = $conn->prepare($query1);
$stmt1->bind_param("ssssssss", $nombre, $apellido, $nacimiento, $telefono, $correo, $contrasena, $rol, $foto_perfil);

if ($stmt1->execute()) {
    $id_usuario = $stmt1->insert_id;
    $query2 = "INSERT INTO usuario_empresa (id_usuario, id_empresa) VALUES (?, ?)";
    $stmt2 = $conn->prepare($query2);
    $stmt2->bind_param("ii", $id_usuario, $id_empresa);
    if ($stmt2->execute()) {
        registrarLog($conn, $_SESSION['usuario_id'] ?? 0, 'Usuarios', "Registro de usuario empresa: $correo");
        echo json_encode(["success" => true]);
    } else {
        echo json_encode(["success" => false, "message" => "Error al vincular con empresa"]);
    }
} else {
    echo json_encode(["success" => false, "message" => "Correo duplicado o error al registrar"]);
}
