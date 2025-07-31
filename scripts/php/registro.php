<?php
// registro.php
// -------------------------------------------------
// 1) Conexión a la base de datos
require 'db_connection.php';  // Ajusta la ruta si es necesario

// 2) Helpers de validación
function validar_password($pwd) {
    // Mínimo 8 chars, 1 mayúscula, 1 número y 1 caracter especial
    return preg_match('/^(?=.*[A-Z])(?=.*\d)(?=.*\W).{8,}$/', $pwd);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // 3) Recoger y sanitizar
    $nombre            = trim($_POST['nombre']);
    $apellido          = trim($_POST['apellido']);
    $fecha_nacimiento  = $_POST['fecha_nacimiento'];
    $telefono          = trim($_POST['telefono']);
    $correo            = filter_var($_POST['correo'], FILTER_VALIDATE_EMAIL);
    $contrasena        = $_POST['contrasena'];
    $confirmPassword   = $_POST['confirmPassword'];
    $role_id           = intval($_POST['role_id']);
    $plan_id           = intval($_POST['plan_id']);

    // 4) Validaciones básicas
    $errores = [];
    if (!$correo) {
        $errores[] = "Correo inválido.";
    }
    if (!validar_password($contrasena)) {
        $errores[] = "Contraseña no cumple requisitos de seguridad.";
    }
    if ($contrasena !== $confirmPassword) {
        $errores[] = "Las contraseñas no coinciden.";
    }
    // Si hay errores, puedes redirigir o mostrar
    if (count($errores) > 0) {
        foreach ($errores as $e) {
            echo "<p style='color:red;'>• $e</p>";
        }
        exit;
    }

    // 5) Procesar foto de perfil (opcional)
    $foto_destino = 'images/profile.jpg';  // valor por defecto
    if (
        isset($_FILES['profilePicture']) &&
        $_FILES['profilePicture']['error'] === UPLOAD_ERR_OK
    ) {
        $ext = pathinfo($_FILES['profilePicture']['name'], PATHINFO_EXTENSION);
        $nuevoNombre = uniqid('profile_') . "." . $ext;
        $directorio = __DIR__ . '/../../images/profiles/'; 
        if (!is_dir($directorio)) {
            mkdir($directorio, 0755, true);
        }
        $fullPath = $directorio . $nuevoNombre;
        if (move_uploaded_file($_FILES['profilePicture']['tmp_name'], $fullPath)) {
            $foto_destino = 'images/profiles/' . $nuevoNombre;
        }
    }

    // 6) Hash de la contraseña
    $pass_hash = sha1($contrasena);

    // 7) Insertar en la tabla usuario
    $sql = "INSERT INTO usuario 
        (nombre, apellido, fecha_nacimiento, telefono, correo, contrasena, foto_perfil, role_id, plan_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param(
        "ssssssii",
        $nombre,
        $apellido,
        $fecha_nacimiento,
        $telefono,
        $correo,
        $pass_hash,
        $foto_destino,
        $role_id,
        $plan_id
    );

    if ($stmt->execute()) {
        // Éxito: redirigir o mostrar mensaje
        header('Location: registro_success.php');
        exit;
    } else {
        echo "Error en el registro: " . $stmt->error;
    }

    // 8) Cerrar
    $stmt->close();
    $conn->close();
}
?>  