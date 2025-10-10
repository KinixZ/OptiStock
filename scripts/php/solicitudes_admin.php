<?php
header('Content-Type: application/json');

$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";

require_once __DIR__ . '/solicitudes_utils.php';

try {
    $conn = new mysqli($servername, $db_user, $db_pass, $database);
    $conn->set_charset('utf8mb4');
} catch (mysqli_sql_exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error de conexión a la base de datos.']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $estado = $_GET['estado'] ?? 'en_proceso';
    $idEmpresa = isset($_GET['id_empresa']) ? (int)$_GET['id_empresa'] : 0;

    if ($estado === 'concluidas') {
        $sql = 'SELECT h.*, u.nombre AS solicitante_nombre, u.apellido AS solicitante_apellido, r.nombre AS revisor_nombre, r.apellido AS revisor_apellido
                FROM solicitudes_cambios_historial h
                LEFT JOIN usuario u ON u.id_usuario = h.id_solicitante
                LEFT JOIN usuario r ON r.id_usuario = h.id_revisor';
        $params = [];
        $types = '';
        if ($idEmpresa > 0) {
            $sql .= ' WHERE h.id_empresa = ?';
            $types .= 'i';
            $params[] = $idEmpresa;
        }
        $sql .= ' ORDER BY h.fecha_resolucion DESC LIMIT 100';
        $stmt = $conn->prepare($sql);
        if ($types) {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $res = $stmt->get_result();
        $items = [];
        while ($row = $res->fetch_assoc()) {
            $row['payload'] = json_decode($row['payload'] ?? '[]', true) ?: [];
            $row['resultado'] = json_decode($row['resultado'] ?? '[]', true) ?: [];
            $items[] = $row;
        }
        $stmt->close();
        echo json_encode(['success' => true, 'items' => $items]);
        exit;
    }

    $sql = 'SELECT s.*, u.nombre AS solicitante_nombre, u.apellido AS solicitante_apellido
            FROM solicitudes_cambios s
            LEFT JOIN usuario u ON u.id_usuario = s.id_solicitante
            WHERE s.estado = "en_proceso"';
    $params = [];
    $types = '';

    if ($idEmpresa > 0) {
        $sql .= ' AND s.id_empresa = ?';
        $types .= 'i';
        $params[] = $idEmpresa;
    }

    $sql .= ' ORDER BY s.fecha_creacion DESC';
    $stmt = $conn->prepare($sql);
    if ($types) {
        $stmt->bind_param($types, ...$params);
    }
    $stmt->execute();
    $res = $stmt->get_result();
    $items = [];
    while ($row = $res->fetch_assoc()) {
        $row['payload'] = json_decode($row['payload'] ?? '[]', true) ?: [];
        $items[] = $row;
    }
    $stmt->close();

    echo json_encode(['success' => true, 'items' => $items]);
    exit;
}

if ($method === 'PUT' || $method === 'PATCH') {
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $idSolicitud = (int)($input['id'] ?? 0);
    $nuevoEstado = $input['estado'] ?? '';
    $comentario = trim($input['comentario'] ?? '');

    if ($idSolicitud <= 0 || !in_array($nuevoEstado, ['aceptada', 'denegada'], true)) {
        echo json_encode(['success' => false, 'message' => 'Datos inválidos para actualizar la solicitud.']);
        exit;
    }

    $idRevisor = obtenerUsuarioIdSesion();
    if (!$idRevisor) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Sesión no válida.']);
        exit;
    }

    $solicitud = opti_obtener_solicitud($conn, $idSolicitud);
    if (!$solicitud) {
        echo json_encode(['success' => false, 'message' => 'La solicitud indicada ya no está disponible.']);
        exit;
    }

    $resultado = ['success' => true];

    $conn->begin_transaction();

    try {
        if ($nuevoEstado === 'aceptada') {
            $resultado = opti_aplicar_solicitud($conn, $solicitud, $idRevisor);
            if (empty($resultado['success'])) {
                $conn->rollback();
                echo json_encode($resultado);
                exit;
            }
        } else {
            opti_descartar_archivos_pendientes($solicitud['payload']);
        }

        $ok = opti_mover_a_historial($conn, $solicitud, $nuevoEstado, $idRevisor, $comentario, $resultado);
        if (!$ok) {
            $conn->rollback();
            echo json_encode(['success' => false, 'message' => 'No se pudo actualizar el estado de la solicitud.']);
            exit;
        }

        $conn->commit();
    } catch (Throwable $e) {
        $conn->rollback();
        error_log('Error al resolver solicitud: ' . $e->getMessage());
        echo json_encode(['success' => false, 'message' => 'Ocurrió un error al procesar la solicitud.']);
        exit;
    }

    echo json_encode([
        'success' => true,
        'estado' => $nuevoEstado,
        'resultado' => $resultado
    ]);
    exit;
}

echo json_encode(['success' => false, 'message' => 'Método no permitido.']);
?>
