<?php
session_start(); // Iniciar la sesión

$data = json_decode(file_get_contents("php://input"), true);

if (isset($data['email']) && isset($data['code'])) {
    $email = $data['email'];
    $code = $data['code'];

    // Verificar si el código ingresado es correcto y si el correo coincide con el guardado en la sesión
    if (isset($_SESSION['codigo_verificacion']) && $_SESSION['codigo_verificacion'] == $code && $_SESSION['correo_verificacion'] == $email) {
        // El código es correcto, procedemos a marcar la cuenta como verificada

        // Conectarse a la base de datos
        $servername = "localhost"; // Host de la BD
        $db_user    = "u296155119_Admin";  // Usuario de la base de datos
        $db_pass    = "4Dmin123o"; // Contraseña de la base de datos
        $database   = "u296155119_OptiStock";   // Nombre de la base de datos

        $conn = mysqli_connect($servername, $db_user, $db_pass, $database);
        if (!$conn) {
            die("Error de conexión: " . mysqli_connect_error());
        }

        // 1. Actualizar la verificación de la cuenta en la base de datos
        $sql = "UPDATE usuario SET verificacion_cuenta = 1 WHERE correo = ?";

        $stmt = mysqli_prepare($conn, $sql);
        mysqli_stmt_bind_param($stmt, "s", $email);

        if (mysqli_stmt_execute($stmt)) {
            // 2. Obtener datos del usuario para iniciar la sesión automáticamente
            $sqlUser = "SELECT id_usuario, nombre, rol FROM usuario WHERE correo = ? LIMIT 1";
            $stmtUser = mysqli_prepare($conn, $sqlUser);
            mysqli_stmt_bind_param($stmtUser, "s", $email);
            mysqli_stmt_execute($stmtUser);
            $resUser = mysqli_stmt_get_result($stmtUser);

            if ($user = mysqli_fetch_assoc($resUser)) {
                // Empresa asociada si existe
                $id_empresa = null;
                $empresa_nombre = null;
                $qEmp = "SELECT id_empresa, nombre_empresa FROM empresa WHERE usuario_creador = ? LIMIT 1";
                $sEmp = mysqli_prepare($conn, $qEmp);
                mysqli_stmt_bind_param($sEmp, "i", $user['id_usuario']);
                mysqli_stmt_execute($sEmp);
                $rEmp = mysqli_stmt_get_result($sEmp);
                if ($e = mysqli_fetch_assoc($rEmp)) {
                    $id_empresa = $e['id_empresa'];
                    $empresa_nombre = $e['nombre_empresa'];
                }

                // Guardar datos de sesión
                $_SESSION['usuario_id']     = $user['id_usuario'];
                $_SESSION['usuario_nombre'] = $user['nombre'];
                $_SESSION['usuario_correo'] = $email;
                $_SESSION['usuario_rol']    = $user['rol'];
                $_SESSION['id_empresa']     = $id_empresa;
                $_SESSION['empresa_nombre'] = $empresa_nombre;

                echo json_encode([
                    "success"        => true,
                    "message"        => "Tu cuenta ha sido verificada exitosamente.",
                    "id_usuario"     => $user['id_usuario'],
                    "nombre"         => $user['nombre'],
                    "correo"         => $email,
                    "rol"            => $user['rol'],
                    "id_empresa"     => $id_empresa,
                    "empresa_nombre" => $empresa_nombre
                ]);
            } else {
                echo json_encode(["success" => false, "message" => "No se pudo obtener la información del usuario."]);
            }
        } else {
            echo json_encode(["success" => false, "message" => "Error al verificar la cuenta."]);
        }

        // Limpiar la sesión para que el código no quede almacenado
        unset($_SESSION['codigo_verificacion']);
        unset($_SESSION['correo_verificacion']);

        // Cerrar la conexión
        mysqli_close($conn);
    } else {
        echo json_encode(["success" => false, "message" => "El código de verificación es incorrecto o ha expirado."]);
    }
} else {
    echo json_encode(["success" => false, "message" => "Datos no válidos."]);
}
?>
