<?php
session_start();
// Obtener los datos del formulario
$correo      = $_POST['correo']      ?? null;
$contrasena  = $_POST['contrasena']  ?? null;

if (empty($correo) || empty($contrasena)) {
    echo json_encode(["success" => false, "message" => "Por favor, completa todos los campos."]);
    exit;
}

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

// Consulta SQL para verificar el correo
$sql  = "SELECT * FROM usuario WHERE correo = ?";
$stmt = mysqli_prepare($conn, $sql);
mysqli_stmt_bind_param($stmt, "s", $correo);
mysqli_stmt_execute($stmt);
$result = mysqli_stmt_get_result($stmt);
$user   = mysqli_fetch_assoc($result);

if ($user) {
    $failedAttempts     = $user['intentos_fallidos'];
    $lastFailedAttempt  = strtotime($user['ultimo_intento']);
    $currentTime        = time();

    if ($failedAttempts >= 4 && ($currentTime - $lastFailedAttempt) < 300) {
        echo json_encode(["success"=>false,"message"=>"Tu cuenta está bloqueada. Intenta nuevamente en 5 minutos."]);
        exit;
    }

    if (sha1($contrasena) == $user['contrasena']) {

        /*─────────────────────────────────────────────
          RESET de intentos fallidos
        ─────────────────────────────────────────────*/
        $resetSql = "UPDATE usuario SET intentos_fallidos = 0, ultimo_intento = NULL WHERE correo = ?";
        $resetSt  = mysqli_prepare($conn, $resetSql);
        mysqli_stmt_bind_param($resetSt, "s", $correo);
        mysqli_stmt_execute($resetSt);

        /*─────────────────────────────────────────────
          GUARDAR DATOS EN SESIÓN
        ─────────────────────────────────────────────*/
        $_SESSION['usuario_id']          = $user['id_usuario'];
        $_SESSION['usuario_nombre']      = $user['nombre'];
        $_SESSION['usuario_correo']      = $user['correo'];
        $_SESSION['usuario_rol']         = $user['rol'];
        $_SESSION['usuario_suscripcion'] = $user['suscripcion'];
        $_SESSION['usuario_foto_perfil'] = $user['foto_perfil'];

        /*─────────────────────────────────────────────
          RESOLVER EMPRESA (Creador o Afiliado)
        ─────────────────────────────────────────────*/
        $id_empresa     = null;
        $empresa_nombre = null;
        $id_usuario     = $user['id_usuario'];

        if ($user['rol'] === 'Administrador') {
            // ¿Empresa creada por él?
            $qAdm = "SELECT id_empresa, nombre_empresa
                     FROM empresa
                     WHERE usuario_creador = ?
                     LIMIT 1";
            $sAdm = mysqli_prepare($conn, $qAdm);
            mysqli_stmt_bind_param($sAdm, "i", $id_usuario);
            mysqli_stmt_execute($sAdm);
            $rAdm = mysqli_stmt_get_result($sAdm);
            if ($e = mysqli_fetch_assoc($rAdm)) {
                $id_empresa     = $e['id_empresa'];
                $empresa_nombre = $e['nombre_empresa'];
            }
        }

        if (!$id_empresa) {
            // Buscar afiliación en usuario_empresa
            $qAf = "SELECT e.id_empresa, e.nombre_empresa
                    FROM usuario_empresa ue
                    INNER JOIN empresa e ON ue.id_empresa = e.id_empresa
                    WHERE ue.id_usuario = ?
                    LIMIT 1";
            $sAf = mysqli_prepare($conn, $qAf);
            mysqli_stmt_bind_param($sAf, "i", $id_usuario);
            mysqli_stmt_execute($sAf);
            $rAf = mysqli_stmt_get_result($sAf);
            if ($a = mysqli_fetch_assoc($rAf)) {
                $id_empresa     = $a['id_empresa'];
                $empresa_nombre = $a['nombre_empresa'];
            }
        }

        $_SESSION['id_empresa']     = $id_empresa;
        $_SESSION['empresa_nombre'] = $empresa_nombre;

        /*─────────────────────────────────────────────
          RESPUESTA JSON
        ─────────────────────────────────────────────*/
        $payload = [
            "success"        => true,
            "id_usuario"     => $user['id_usuario'],
            "nombre"         => $user['nombre'],
            "correo"         => $user['correo'],
            "rol"            => $user['rol'],
            "suscripcion"    => $user['suscripcion'],
            "foto_perfil"    => $user['foto_perfil'],
            "id_empresa"     => $id_empresa,
            "empresa_nombre" => $empresa_nombre
        ];

        if ($user['verificacion_cuenta'] == 0) {
            $payload["redirect"] = "../regist/regist_inter.html?email=" . urlencode($correo);
        } else {
            $payload["redirect"] = "../../main_menu/main_menu.html";
        }

        echo json_encode($payload);
        exit;

    } else {
        /*─────────────────────────────────────────────
          CONTRASEÑA INCORRECTA  -> incrementar intentos
        ──────────────────────────────────────────────*/
        $failedAttempts++;
        $upSql = "UPDATE usuario SET intentos_fallidos = ?, ultimo_intento = NOW() WHERE correo = ?";
        $upSt  = mysqli_prepare($conn, $upSql);
        mysqli_stmt_bind_param($upSt, "is", $failedAttempts, $correo);
        mysqli_stmt_execute($upSt);

        if ($failedAttempts >= 4) {
            sendEmail($correo, "Cuenta bloqueada", "Tu cuenta ha sido bloqueada por múltiples intentos fallidos. Intenta nuevamente en 5 minutos.");
            echo json_encode(["success"=>false,"message"=>"Tu cuenta ha sido bloqueada por múltiples intentos fallidos. Revisa tu correo."]);
        } else {
            echo json_encode(["success"=>false,"message"=>"Contraseña incorrecta. Intentos fallidos: $failedAttempts."]);
        }
        exit;
    }
} else {
    echo json_encode(["success" => false, "message" => "El usuario no existe."]);
    exit;
}

mysqli_close($conn);

/*──────────────────────────────
  Función para enviar correos
───────────────────────────────*/
function sendEmail($to, $subject, $body) {
    $headers  = "From: no-reply@optistock.site\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
    mail($to, $subject, $body, $headers);
}
?>
