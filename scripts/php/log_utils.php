<?php
/**
 * Inserta un registro en la tabla log_control.
 *
 * @param mysqli $conn       Conexión activa a la BD.
 * @param int    $idUsuario  ID del usuario que realizó la acción.
 * @param string $modulo     Nombre del módulo (e.g. "Áreas", "Zonas", "Inventario").
 * @param string $accion     Descripción corta de la acción realizada.
 */
function registrarLog($conn, $idUsuario, $modulo, $accion) {
    if (!$idUsuario) {
        return; // sin usuario no se registra
    }
    $stmt = $conn->prepare(
        "INSERT INTO log_control (id_usuario, modulo, accion, fecha, hora) VALUES (?, ?, ?, CURDATE(), CURTIME())"
    );
    $stmt->bind_param("iss", $idUsuario, $modulo, $accion);
    $stmt->execute();
    $stmt->close();
}
?>
