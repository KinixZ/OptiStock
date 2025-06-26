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

header('Content-Type: application/json');
$data = json_decode(file_get_contents("php://input"), true);

$campos = ['nombre', 'apellido', 'fecha_nacimiento', 'telefono', 'correo', 'contrasena', 'rol', 'id_empresa'];
foreach ($campos as $campo) {
    if (empty($data[$campo])) {
        echo json_encode(['success' => false, 'message' => "Falta el campo: $campo"]);
        exit;
    }
}

try {
    // Validar que no exista correo repetido
    $check = $pdo->prepare("SELECT id_usuario FROM usuario WHERE correo = ?");
    $check->execute([$data['correo']]);
    if ($check->fetch()) {
        echo json_encode(['success' => false, 'message' => 'Correo ya registrado.']);
        exit;
    }

    // Insertar usuario
    $stmt = $pdo->prepare("
        INSERT INTO usuario (nombre, apellido, fecha_nacimiento, telefono, correo, contrasena, rol)
        VALUES (?, ?, ?, ?, ?, SHA1(?), ?)
    ");
    $stmt->execute([
        $data['nombre'],
        $data['apellido'],
        $data['fecha_nacimiento'],
        $data['telefono'],
        $data['correo'],
        $data['contrasena'],
        $data['rol']
    ]);

    $id_usuario_nuevo = $pdo->lastInsertId();

    // Asociar con la empresa
    $relacion = $pdo->prepare("INSERT INTO usuario_empresa (id_usuario, id_empresa) VALUES (?, ?)");
    $relacion->execute([$id_usuario_nuevo, $data['id_empresa']]);

    echo json_encode(['success' => true, 'id_usuario' => $id_usuario_nuevo]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error al registrar usuario.', 'error' => $e->getMessage()]);
}
