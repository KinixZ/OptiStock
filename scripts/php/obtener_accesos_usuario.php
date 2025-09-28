<?php
header('Content-Type: application/json');

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";

function jsonResponse($success, $message = '', $extra = []) {
    echo json_encode(array_merge(['success' => $success, 'message' => $message], $extra));
    exit;
}

try {
    $conn = new mysqli($servername, $db_user, $db_pass, $database);
    $conn->set_charset('utf8mb4');
} catch (mysqli_sql_exception $e) {
    jsonResponse(false, 'Error de conexión a la base de datos.');
}

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$idUsuario = isset($input['id_usuario']) ? (int) $input['id_usuario'] : 0;

if ($idUsuario <= 0) {
    jsonResponse(false, 'Identificador de usuario inválido.', ['accesos' => []]);
}

try {
    $stmt = $conn->prepare(
        'SELECT uaz.id_usuario, uaz.id_area, uaz.id_zona, a.nombre AS area_nombre, z.nombre AS zona_nombre
         FROM usuario_area_zona uaz
         INNER JOIN areas a ON uaz.id_area = a.id
         LEFT JOIN zonas z ON uaz.id_zona = z.id
         WHERE uaz.id_usuario = ?
         ORDER BY a.nombre ASC, z.nombre ASC'
    );
    $stmt->bind_param('i', $idUsuario);
    $stmt->execute();
    $resultado = $stmt->get_result();

    $accesos = [];
    while ($fila = $resultado->fetch_assoc()) {
        $idArea = (int) $fila['id_area'];
        $idZona = $fila['id_zona'] !== null ? (int) $fila['id_zona'] : null;
        $compositeId = $idUsuario . ':' . $idArea . ':' . ($idZona === null ? 'null' : $idZona);

        $accesos[] = [
            'composite_id' => $compositeId,
            'id_usuario' => $idUsuario,
            'id_area' => $idArea,
            'area' => $fila['area_nombre'],
            'id_zona' => $idZona,
            'zona' => $fila['zona_nombre']
        ];
    }
    $stmt->close();

    jsonResponse(true, '', ['accesos' => $accesos]);
} catch (mysqli_sql_exception $e) {
    error_log('Error al obtener accesos de usuario: ' . $e->getMessage());
    jsonResponse(false, 'No fue posible obtener los accesos del usuario.', ['accesos' => []]);
}
