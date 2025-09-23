<?php
header('Content-Type: application/json');

$empresaId = isset($_GET['id_empresa']) ? (int) $_GET['id_empresa'] : 0;
$usuarioId = isset($_GET['id_usuario']) ? (int) $_GET['id_usuario'] : 0;
$rol = isset($_GET['rol']) ? trim($_GET['rol']) : '';
$limite = isset($_GET['limite']) ? (int) $_GET['limite'] : 0;

if ($empresaId <= 0) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'El parámetro id_empresa es obligatorio.'
    ]);
    exit;
}

if ($limite <= 0 || $limite > 50) {
    $limite = 20;
}

$servername = 'localhost';
$dbUser = 'u296155119_Admin';
$dbPassword = '4Dmin123o';
$database = 'u296155119_OptiStock';

$conn = new mysqli($servername, $dbUser, $dbPassword, $database);

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error de conexión con la base de datos.'
    ]);
    exit;
}

$sql = "
    SELECT
        n.id,
        n.titulo,
        n.mensaje,
        n.tipo_destinatario,
        n.rol_destinatario,
        n.id_usuario_destinatario,
        n.id_usuario_creador,
        n.ruta_destino,
        n.estado,
        n.prioridad,
        n.fecha_disponible_desde,
        n.fecha_expira,
        n.creado_en,
        n.actualizado_en
    FROM notificaciones n
    WHERE n.id_empresa = ?
      AND n.fecha_disponible_desde <= NOW()
      AND (n.fecha_expira IS NULL OR n.fecha_expira >= NOW())
      AND n.estado <> 'Archivada'
      AND (
            n.tipo_destinatario = 'General'
         OR (n.tipo_destinatario = 'Rol' AND n.rol_destinatario = ?)
         OR (n.tipo_destinatario = 'Usuario' AND n.id_usuario_destinatario = ?)
      )
    ORDER BY FIELD(n.prioridad, 'Alta', 'Media', 'Baja'), n.fecha_disponible_desde DESC
    LIMIT ?
";

$stmt = $conn->prepare($sql);

if (!$stmt) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'No se pudo preparar la consulta de notificaciones.'
    ]);
    $conn->close();
    exit;
}

$rolParam = $rol !== '' ? $rol : null;
$stmt->bind_param('isii', $empresaId, $rolParam, $usuarioId, $limite);

if (!$stmt->execute()) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'No se pudieron ejecutar las notificaciones.'
    ]);
    $stmt->close();
    $conn->close();
    exit;
}

$result = $stmt->get_result();
$notificaciones = [];
$nuevas = 0;

while ($row = $result->fetch_assoc()) {
    $esNueva = in_array($row['estado'], ['Pendiente', 'Enviada'], true);
    if ($esNueva) {
        $nuevas++;
    }

    $row['es_nueva'] = $esNueva;
    $notificaciones[] = $row;
}

$stmt->close();
$conn->close();

echo json_encode([
    'success' => true,
    'notifications' => $notificaciones,
    'total' => count($notificaciones),
    'new' => $nuevas
]);
