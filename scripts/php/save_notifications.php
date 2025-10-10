<?php
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Método no permitido. Usa POST.'
    ]);
    exit;
}

$payload = json_decode(file_get_contents('php://input'), true);

if (!is_array($payload)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Formato de solicitud no válido.'
    ]);
    exit;
}

$idEmpresa = isset($payload['id_empresa']) ? (int) $payload['id_empresa'] : 0;
$idUsuario = isset($payload['id_usuario']) ? (int) $payload['id_usuario'] : 0;
$notificationsInput = isset($payload['notifications']) && is_array($payload['notifications'])
    ? $payload['notifications']
    : [];

if ($idEmpresa <= 0 || empty($notificationsInput)) {
    echo json_encode([
        'success' => true,
        'stored' => 0,
        'skipped' => count($notificationsInput),
        'message' => 'No hay notificaciones para guardar.'
    ]);
    exit;
}

function normalize_string(?string $value, int $maxLength): string
{
    $text = $value !== null ? trim($value) : '';
    if ($text === '') {
        return '';
    }
    if ($maxLength > 0 && mb_strlen($text) > $maxLength) {
        $text = mb_substr($text, 0, $maxLength);
    }
    return $text;
}

function normalize_datetime($value): ?string
{
    if ($value === null || $value === '') {
        return null;
    }

    $raw = trim((string) $value);
    if ($raw === '') {
        return null;
    }

    // Intentar detectar formatos YYYY-MM-DD HH:MM:SS o YYYY-MM-DDTHH:MM:SS
    if (preg_match('/^(\d{4}-\d{2}-\d{2})(?:[T\s](\d{2}:\d{2}:\d{2}))?$/', $raw, $matches)) {
        $datePart = $matches[1];
        $timePart = $matches[2] ?? '00:00:00';
        return $datePart . ' ' . $timePart;
    }

    try {
        $date = new DateTime($raw);
        return $date->format('Y-m-d H:i:s');
    } catch (Exception $e) {
        return null;
    }
}

$prioridadesValidas = ['Baja', 'Media', 'Alta'];
$estadosValidos = ['Pendiente', 'Enviada', 'Leida', 'Archivada'];
$destinatariosValidos = ['General', 'Rol', 'Usuario'];

$notificacionesNormalizadas = [];

foreach ($notificationsInput as $notification) {
    if (!is_array($notification)) {
        continue;
    }

    $titulo = normalize_string($notification['titulo'] ?? null, 150);
    $mensaje = normalize_string($notification['mensaje'] ?? null, 2000);

    if ($titulo === '' || $mensaje === '') {
        continue;
    }

    $tipoDestinatario = $notification['tipo_destinatario'] ?? 'General';
    if (!in_array($tipoDestinatario, $destinatariosValidos, true)) {
        $tipoDestinatario = 'General';
    }

    $prioridad = $notification['prioridad'] ?? 'Media';
    if (!in_array($prioridad, $prioridadesValidas, true)) {
        $prioridad = 'Media';
    }

    $estado = $notification['estado'] ?? 'Pendiente';
    if (!in_array($estado, $estadosValidos, true)) {
        $estado = 'Pendiente';
    }

    $rolDestinatario = '';
    if ($tipoDestinatario === 'Rol') {
        $rolDestinatario = normalize_string($notification['rol_destinatario'] ?? null, 60);
    }

    $idUsuarioDestinatario = 0;
    if ($tipoDestinatario === 'Usuario') {
        $idUsuarioDestinatario = isset($notification['id_usuario_destinatario'])
            ? (int) $notification['id_usuario_destinatario']
            : 0;
        if ($idUsuarioDestinatario <= 0 && $idUsuario > 0) {
            $idUsuarioDestinatario = $idUsuario;
        }
    }

    $rutaDestino = normalize_string($notification['ruta_destino'] ?? null, 255);
    $fechaDisponible = normalize_datetime($notification['fecha_disponible_desde'] ?? null);
    if ($fechaDisponible === null) {
        $fechaDisponible = date('Y-m-d H:i:s');
    }

    $notificacionesNormalizadas[] = [
        'titulo' => $titulo,
        'mensaje' => $mensaje,
        'tipo_destinatario' => $tipoDestinatario,
        'rol_destinatario' => $rolDestinatario,
        'id_usuario_destinatario' => $idUsuarioDestinatario,
        'ruta_destino' => $rutaDestino,
        'estado' => $estado,
        'prioridad' => $prioridad,
        'fecha_disponible_desde' => $fechaDisponible
    ];
}

if (empty($notificacionesNormalizadas)) {
    echo json_encode([
        'success' => true,
        'stored' => 0,
        'skipped' => count($notificationsInput),
        'message' => 'No se encontraron notificaciones válidas para guardar.'
    ]);
    exit;
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
        'message' => 'No se pudo conectar a la base de datos.'
    ]);
    exit;
}

$conn->set_charset('utf8mb4');

$checkSql = <<<SQL
    SELECT id FROM notificaciones
     WHERE id_empresa = ?
       AND titulo = ?
       AND mensaje = ?
       AND IFNULL(ruta_destino, '') = IFNULL(?, '')
       AND IFNULL(DATE_FORMAT(fecha_disponible_desde, "%Y-%m-%d %H:%i:%s"), '') = IFNULL(DATE_FORMAT(?, "%Y-%m-%d %H:%i:%s"), '')
     LIMIT 1
SQL;

$checkStmt = $conn->prepare($checkSql);

if (!$checkStmt) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'No se pudo preparar la validación de duplicados.'
    ]);
    $conn->close();
    exit;
}

$insertSql = <<<SQL
    INSERT INTO notificaciones (
        id_empresa,
        titulo,
        mensaje,
        tipo_destinatario,
        rol_destinatario,
        id_usuario_destinatario,
        id_usuario_creador,
        ruta_destino,
        estado,
        prioridad,
        fecha_disponible_desde
    ) VALUES (
        ?, ?, ?, ?, NULLIF(?, ''), NULLIF(?, 0), NULLIF(?, 0), NULLIF(?, ''), ?, ?, ?
    )
SQL;

$insertStmt = $conn->prepare($insertSql);

if (!$insertStmt) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'No se pudo preparar el guardado de notificaciones.'
    ]);
    $checkStmt->close();
    $conn->close();
    exit;
}

$guardadas = 0;
$omitidas = 0;

foreach ($notificacionesNormalizadas as $notification) {
    $titulo = $notification['titulo'];
    $mensaje = $notification['mensaje'];
    $ruta = $notification['ruta_destino'];
    $fecha = $notification['fecha_disponible_desde'];

    $checkStmt->bind_param('issss', $idEmpresa, $titulo, $mensaje, $ruta, $fecha);

    if (!$checkStmt->execute()) {
        $omitidas++;
        continue;
    }

    $checkStmt->store_result();
    if ($checkStmt->num_rows > 0) {
        $omitidas++;
        continue;
    }

    $tipoDestinatario = $notification['tipo_destinatario'];
    $rolDestinatario = $notification['rol_destinatario'];
    $idUsuarioDestinatario = $notification['id_usuario_destinatario'];
    $estado = $notification['estado'];
    $prioridad = $notification['prioridad'];

    $insertStmt->bind_param(
        'issssiissss',
        $idEmpresa,
        $titulo,
        $mensaje,
        $tipoDestinatario,
        $rolDestinatario,
        $idUsuarioDestinatario,
        $idUsuario,
        $ruta,
        $estado,
        $prioridad,
        $fecha
    );

    if ($insertStmt->execute()) {
        $guardadas++;
    } else {
        $omitidas++;
    }
}

$checkStmt->close();
$insertStmt->close();
$conn->close();

echo json_encode([
    'success' => true,
    'stored' => $guardadas,
    'skipped' => $omitidas,
    'message' => 'Proceso completado.'
]);
