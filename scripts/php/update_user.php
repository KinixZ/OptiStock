<?php
session_start();

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

$usuario_id = $_POST['id_usuario'] ?? null;
$nombre     = $_POST['nombre'] ?? null;
$apellido   = $_POST['apellido'] ?? null;
$telefono   = $_POST['telefono'] ?? null;
$correo     = $_POST['correo'] ?? null;
$contrasena = $_POST['contrasena'] ?? null;

if (!$usuario_id || !$nombre || !$apellido || !$telefono || !$correo) {
    echo json_encode(['success' => false, 'message' => 'Faltan datos obligatorios']);
    exit;
}

try {
    // Actualizar datos
    if ($contrasena && strlen($contrasena) > 0) {
        $pass_hash = sha1($contrasena);
        $stmt = $conn->prepare("UPDATE usuario SET nombre = ?, apellido = ?, telefono = ?, correo = ?, contrasena = ? WHERE id_usuario = ?");
        $stmt->bind_param("sssssi", $nombre, $apellido, $telefono, $correo, $pass_hash, $usuario_id);
    } else {
        $stmt = $conn->prepare("UPDATE usuario SET nombre = ?, apellido = ?, telefono = ?, correo = ? WHERE id_usuario = ?");
        $stmt->bind_param("ssssi", $nombre, $apellido, $telefono, $correo, $usuario_id);
    }
    $stmt->execute();

    // Subir imagen si existe
    if (isset($_FILES['foto_perfil']) && $_FILES['foto_perfil']['error'] == UPLOAD_ERR_OK) {
        $allowed = ['jpg', 'jpeg', 'png', 'gif'];
        $ext = strtolower(pathinfo($_FILES['foto_perfil']['name'], PATHINFO_EXTENSION));
        if (in_array($ext, $allowed)) {
            $destDir = $_SERVER['DOCUMENT_ROOT'] . '/images/profiles/';
            if (!is_dir($destDir)) mkdir($destDir, 0755, true);
            $filename = 'perfil_' . $usuario_id . '_' . time() . '.' . $ext;
            $path = $destDir . $filename;
            if (move_uploaded_file($_FILES['foto_perfil']['tmp_name'], $path)) {
                $ruta_bd = 'images/profiles/' . $filename;
                $stmt2 = $conn->prepare("UPDATE usuario SET foto_perfil=? WHERE id_usuario=?");
                $stmt2->bind_param("si", $ruta_bd, $usuario_id);
                $stmt2->execute();
            }
        }
    }
    
    $stmt3 = $conn->prepare("SELECT foto_perfil FROM usuario WHERE id_usuario = ?");
    $stmt3->bind_param("i", $usuario_id);
    $stmt3->execute();
    $res3 = $stmt3->get_result();
    $row = $res3->fetch_assoc();
    $ruta_foto = $row ? $row['foto_perfil'] : null;

    registrarLog($conn, $_SESSION['usuario_id'] ?? 0, 'Usuarios', "Actualización de usuario: $usuario_id");

    echo json_encode([
        'success' => true,
        'foto_perfil' => $ruta_foto,
        'message' => 'Usuario actualizado'
    ]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error: '.$e->getMessage()]);
}
?>