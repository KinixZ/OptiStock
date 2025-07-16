<?php
$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";

$conn = mysqli_connect($servername, $db_user, $db_pass, $database);
if (!$conn) {
    echo json_encode(["success" => false, "message" => "Error de conexión"]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);

$usuario_id = $data['id_usuario'] ?? null;
$nombre = $data['nombre'] ?? null;
$apellido = $data['apellido'] ?? null;
$telefono = $data['telefono'] ?? null;
$correo = $data['correo'] ?? null;
$contrasena = $data['contrasena'] ?? null; // La contraseña debe venir en texto plano, aquí la encriptamos (sha1, md5 o bcrypt recomendado)

if (!$usuario_id || !$nombre || !$apellido || !$telefono || !$correo) {
    echo json_encode(['success' => false, 'message' => 'Faltan datos obligatorios']);
    exit;
}

// Validar correo (opcional)

try {
    // Encriptar contraseña solo si viene y no vacía
    if ($contrasena && strlen($contrasena) > 0) {
        // Aquí uso sha1 solo ejemplo, para producción usar bcrypt
        $pass_hash = sha1($contrasena);
        $stmt = $conn->prepare("UPDATE usuario SET nombre = ?, apellido = ?, telefono = ?, correo = ?, contrasena = ? WHERE id_usuario = ?");
        $stmt->bind_param("sssssi", $nombre, $apellido, $telefono, $correo, $pass_hash, $usuario_id);
    } else {
        $stmt = $conn->prepare("UPDATE usuario SET nombre = ?, apellido = ?, telefono = ?, correo = ? WHERE id_usuario = ?");
        $stmt->bind_param("ssssi", $nombre, $apellido, $telefono, $correo, $usuario_id);
    }

    $stmt->execute();

    if ($stmt->affected_rows > 0) {
        echo json_encode(['success' => true, 'message' => 'Usuario actualizado']);
    } else {
        echo json_encode(['success' => false, 'message' => 'No se actualizó ningún dato']);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error: '.$e->getMessage()]);
}
