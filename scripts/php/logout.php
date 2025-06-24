<?php
session_start();

// Elimina todas las variables de sesión
$_SESSION = [];

// Destruye la sesión completamente
session_destroy();

// Si usas cookies de sesión, también las puedes eliminar
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(
        session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}

// Redirige al login o responde JSON
// header("Location: ../../regis_login/login/login.html");
// exit;

// O responde JSON si lo haces con fetch:
echo json_encode(["success" => true, "message" => "Sesión cerrada correctamente."]);
