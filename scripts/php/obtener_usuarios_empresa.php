<?php
header("Content-Type: application/json");

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";

try {
    $conn = new mysqli($servername, $db_user, $db_pass, $database);
    $conn->set_charset('utf8mb4');
} catch (mysqli_sql_exception $e) {
    echo json_encode(["success" => false, "message" => "DB fail"]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);
$id_empresa = intval($data['id_empresa']);

$sql = "SELECT u.id_usuario, u.nombre, u.apellido, u.correo, u.rol, u.telefono, u.fecha_nacimiento, u.foto_perfil, u.activo
        FROM usuario u
        INNER JOIN usuario_empresa ue ON u.id_usuario = ue.id_usuario
        WHERE ue.id_empresa = ? AND u.rol != 'Administrador'";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $id_empresa);
$stmt->execute();
$result = $stmt->get_result();

$usuarios = [];
$idsUsuarios = [];

while ($row = $result->fetch_assoc()) {
    $id = (int) $row['id_usuario'];
    $row['accesos'] = [];
    $usuarios[$id] = $row;
    $idsUsuarios[] = $id;
}

if ($idsUsuarios) {
    $placeholders = implode(',', array_fill(0, count($idsUsuarios), '?'));
    $tipos = str_repeat('i', count($idsUsuarios));

    $sqlAccesos = "SELECT uaz.id_usuario, uaz.id_area, uaz.id_zona, a.nombre AS area_nombre, z.nombre AS zona_nombre
        FROM usuario_area_zona uaz
        INNER JOIN areas a ON uaz.id_area = a.id
        LEFT JOIN zonas z ON uaz.id_zona = z.id
        WHERE uaz.id_usuario IN ($placeholders)
        ORDER BY a.nombre ASC, z.nombre ASC";

    $stmtAccesos = $conn->prepare($sqlAccesos);
    $stmtAccesos->bind_param($tipos, ...$idsUsuarios);
    $stmtAccesos->execute();
    $resultadoAccesos = $stmtAccesos->get_result();

    while ($acceso = $resultadoAccesos->fetch_assoc()) {
        $idUsuario = (int) $acceso['id_usuario'];
        if (!isset($usuarios[$idUsuario])) {
            continue;
        }

        $idArea = (int) $acceso['id_area'];
        $idZona = $acceso['id_zona'] !== null ? (int) $acceso['id_zona'] : null;
        $compositeId = $idUsuario . ':' . $idArea . ':' . ($idZona === null ? 'null' : $idZona);

        $usuarios[$idUsuario]['accesos'][] = [
            'composite_id' => $compositeId,
            'id_usuario' => $idUsuario,
            'id_area' => $idArea,
            'area' => $acceso['area_nombre'],
            'id_zona' => $idZona,
            'zona' => $acceso['zona_nombre']
        ];
    }

    $stmtAccesos->close();
}

echo json_encode(["success" => true, "usuarios" => array_values($usuarios)]);
