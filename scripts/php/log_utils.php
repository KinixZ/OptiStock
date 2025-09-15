<?php
/**
 * Devuelve el identificador del usuario autenticado en sesión.
 *
 * @return int|null
 */
function obtenerUsuarioIdSesion()
{
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    return isset($_SESSION['usuario_id']) ? (int) $_SESSION['usuario_id'] : null;
}

/**
 * Inserta un registro en la tabla log_control.
 *
 * @param mysqli     $conn      Conexión activa a la BD.
 * @param int|null   $idUsuario ID del usuario que realizó la acción. Si es null, se usa la sesión actual.
 * @param string     $modulo    Nombre del módulo (e.g. "Áreas", "Zonas", "Inventario").
 * @param string     $accion    Descripción corta de la acción realizada.
 *
 * @return bool Verdadero si el registro se insertó correctamente.
 */
function registrarLog($conn, $idUsuario, $modulo, $accion)
{
    if (!($conn instanceof mysqli)) {
        return false;
    }

    if (!$idUsuario) {
        $idUsuario = obtenerUsuarioIdSesion();
    }

    if (!$idUsuario) {
        error_log('registrarLog: no se encontró usuario para registrar la acción: ' . $accion);
        return false;
    }

    $stmt = $conn->prepare(
        'INSERT INTO log_control (id_usuario, modulo, accion, fecha, hora) VALUES (?, ?, ?, CURDATE(), CURTIME())'
    );

    if (!$stmt) {
        error_log('registrarLog: error en prepare: ' . $conn->error);
        return false;
    }

    $stmt->bind_param('iss', $idUsuario, $modulo, $accion);

    $ok = false;

    try {
        $ok = $stmt->execute();
        if (!$ok) {
            error_log('registrarLog: error en execute: ' . $stmt->error);
        }
    } catch (mysqli_sql_exception $e) {
        error_log('registrarLog: excepción: ' . $e->getMessage());
        $ok = false;
    }

    $stmt->close();

    return $ok;
}
?>
