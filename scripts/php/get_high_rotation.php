<?php
header('Content-Type: application/json');

require_once __DIR__ . '/log_utils.php';
require_once __DIR__ . '/accesos_utils.php';

$empresaId = isset($_GET['id_empresa']) ? (int) $_GET['id_empresa'] : 0;
if ($empresaId <= 0) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'El parámetro id_empresa es obligatorio.'
    ]);
    exit;
}

$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";

$conn = new mysqli($servername, $db_user, $db_pass, $database);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error de conexión con la base de datos.'
    ]);
    exit;
}

$usuarioIdSesion = obtenerUsuarioIdSesion() ?? 0;
$mapaAccesos = construirMapaAccesosUsuario($conn, $usuarioIdSesion);
$filtrarPorAccesos = debeFiltrarPorAccesos($mapaAccesos);

$sql = "
    SELECT
        p.id            AS producto_id,
        p.nombre        AS producto_nombre,
        SUM(m.cantidad) AS total_unidades,
        COUNT(*)        AS total_movimientos,
        MAX(m.fecha_movimiento) AS ultima_fecha,
        z.id            AS zona_id,
        a.id            AS area_id
    FROM movimientos m
    INNER JOIN productos p ON m.producto_id = p.id
    LEFT JOIN zonas z ON p.zona_id = z.id
    LEFT JOIN areas a ON z.area_id = a.id
    WHERE
        m.empresa_id = ?
        AND m.fecha_movimiento >= (NOW() - INTERVAL 1 DAY)
    GROUP BY p.id, p.nombre, z.id, a.id
    ORDER BY total_movimientos DESC, total_unidades DESC
    LIMIT 5
";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'No se pudo preparar la consulta de rotación.'
    ]);
    $conn->close();
    exit;
}

$stmt->bind_param('i', $empresaId);
$stmt->execute();
$result = $stmt->get_result();

$productos = [];
while ($row = $result->fetch_assoc()) {
    $areaId = isset($row['area_id']) ? (int) $row['area_id'] : 0;
    $zonaId = isset($row['zona_id']) ? (int) $row['zona_id'] : 0;

    if ($filtrarPorAccesos && !usuarioPuedeVerZona($mapaAccesos, $areaId ?: null, $zonaId ?: null)) {
        continue;
    }

    $row['total_unidades'] = (int) ($row['total_unidades'] ?? 0);
    $row['total_movimientos'] = (int) ($row['total_movimientos'] ?? 0);
    $productos[] = $row;
}

$stmt->close();
$conn->close();

echo json_encode([
    'success' => true,
    'productos' => $productos
]);
