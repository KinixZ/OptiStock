<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";

try {
    $conn = new mysqli($servername, $db_user, $db_pass, $database);
    $conn->set_charset('utf8mb4');
} catch (mysqli_sql_exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error de conexión']);
    exit;
}

require_once __DIR__ . '/log_utils.php';
require_once __DIR__ . '/accesos_utils.php';
require_once __DIR__ . '/infraestructura_utils.php';
require_once __DIR__ . '/solicitudes_utils.php';

$method = $_SERVER['REQUEST_METHOD'];

function getJsonInput() {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    return $data ?: [];
}

function requireUserId()
{
    $usuarioId = obtenerUsuarioIdSesion();
    if (!$usuarioId) {
        http_response_code(401);
        echo json_encode(['error' => 'Sesión expirada']);
        exit;
    }

    return $usuarioId;
}

function obtenerEstadisticasAreas(mysqli $conn, array $areaIds): array
{
    $areaIds = array_values(array_filter(array_map('intval', $areaIds)));
    if (!$areaIds) {
        return [];
    }

    $placeholders = implode(',', array_fill(0, count($areaIds), '?'));
    $types = str_repeat('i', count($areaIds));

    $sql = "
        SELECT
            z.area_id,
            COUNT(DISTINCT p.id) AS productos,
            COALESCE(SUM(GREATEST(p.stock, 0)), 0) AS unidades,
            COALESCE(SUM(GREATEST(p.stock, 0) * COALESCE(p.dim_x, 0) * COALESCE(p.dim_y, 0) * COALESCE(p.dim_z, 0)), 0) AS volumen_cm3
        FROM zonas z
        LEFT JOIN productos p ON p.zona_id = z.id
        WHERE z.area_id IN ($placeholders)
        GROUP BY z.area_id
    ";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$areaIds);
    $stmt->execute();
    $result = $stmt->get_result();

    $mapa = [];
    while ($row = $result->fetch_assoc()) {
        $areaId = (int) ($row['area_id'] ?? 0);
        $mapa[$areaId] = [
            'productos' => (int) ($row['productos'] ?? 0),
            'unidades' => (int) ($row['unidades'] ?? 0),
            'volumen_cm3' => (float) ($row['volumen_cm3'] ?? 0.0),
        ];
    }

    $stmt->close();

    return $mapa;
}

if ($method === 'GET') {
    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
    $empresaId = isset($_GET['empresa_id']) ? intval($_GET['empresa_id']) : 0;

    $usuarioIdSesion = obtenerUsuarioIdSesion() ?? 0;
    $mapaAccesos = construirMapaAccesosUsuario($conn, $usuarioIdSesion);
    $filtrarPorAccesos = debeFiltrarPorAccesos($mapaAccesos);

    if ($id) {
        $stmt = $conn->prepare('SELECT * FROM areas WHERE id = ?');
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $res = $stmt->get_result();
        $area = $res->fetch_assoc() ?: [];
        if ($area) {
            $total = isset($area['volumen']) ? (float) $area['volumen'] : 0.0;
            $estadisticas = obtenerEstadisticasAreas($conn, [$area['id']]);
            $extra = $estadisticas[$area['id']] ?? ['productos' => 0, 'unidades' => 0, 'volumen_cm3' => 0.0];
            $utilizada = ((float) $extra['volumen_cm3']) / 1000000.0;
            $area['capacidad_utilizada'] = $utilizada;
            $area['capacidad_disponible'] = max($total - $utilizada, 0);
            $area['porcentaje_ocupacion'] = $total > 0 ? min(100, ($utilizada / $total) * 100) : 0;
            $area['productos_registrados'] = $extra['productos'];
            $area['total_unidades'] = $extra['unidades'];
        }

        if ($filtrarPorAccesos) {
            $puedeVer = usuarioPuedeVerArea($mapaAccesos, isset($area['id']) ? (int) $area['id'] : 0);
            if (!$puedeVer) {
                http_response_code(403);
                echo json_encode(['error' => 'No tienes acceso a esta área.']);
                exit;
            }
        }

        echo json_encode($area);
    } else {
        $areas = [];
        if ($empresaId) {
            $stmt = $conn->prepare('SELECT * FROM areas WHERE id_empresa = ?');
            $stmt->bind_param('i', $empresaId);
            $stmt->execute();
            $result = $stmt->get_result();
        } else {
            $result = $conn->query('SELECT * FROM areas');
        }

        while ($row = $result->fetch_assoc()) {
            if ($filtrarPorAccesos && !usuarioPuedeVerArea($mapaAccesos, isset($row['id']) ? (int) $row['id'] : 0)) {
                continue;
            }
            $areas[] = $row;
        }

        $estadisticas = obtenerEstadisticasAreas($conn, array_column($areas, 'id'));
        foreach ($areas as &$areaItem) {
            $total = isset($areaItem['volumen']) ? (float) $areaItem['volumen'] : 0.0;
            $extra = $estadisticas[$areaItem['id']] ?? ['productos' => 0, 'unidades' => 0, 'volumen_cm3' => 0.0];
            $utilizada = ((float) $extra['volumen_cm3']) / 1000000.0;
            $areaItem['capacidad_utilizada'] = $utilizada;
            $areaItem['capacidad_disponible'] = max($total - $utilizada, 0);
            $areaItem['porcentaje_ocupacion'] = $total > 0 ? min(100, ($utilizada / $total) * 100) : 0;
            $areaItem['productos_registrados'] = $extra['productos'];
            $areaItem['total_unidades'] = $extra['unidades'];
        }
        unset($areaItem);

        echo json_encode($areas);
    }
    exit;
}

if ($method === 'POST') {
    $usuarioId = requireUserId();
    $data = getJsonInput();
    $nombre = $data['nombre'] ?? '';
    $descripcion = $data['descripcion'] ?? '';
    $ancho = floatval($data['ancho'] ?? 0);
    $alto = floatval($data['alto'] ?? 0);
    $largo = floatval($data['largo'] ?? 0);
    $volumen = $ancho * $alto * $largo;
    $empresa_id = isset($data['empresa_id']) ? intval($data['empresa_id']) : 0;
    if (!$nombre || $empresa_id <= 0 || $ancho <= 0 || $alto <= 0 || $largo <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Datos incompletos o dimensiones inválidas']);
        exit;
    }

    if (!validarCapacidadContraAlmacen($conn, $empresa_id, $volumen)) {
        http_response_code(422);
        echo json_encode(['error' => 'El volumen del área supera la capacidad máxima registrada para el almacén.']);
        exit;
    }

    $solicitudData = [
        'id_empresa' => $empresa_id,
        'id_solicitante' => $usuarioId,
        'modulo' => 'Áreas',
        'tipo_accion' => 'area_crear',
        'resumen' => 'Creación del área "' . $nombre . '"',
        'descripcion' => 'Solicitud de creación de área en el almacén.',
        'payload' => [
            'empresa_id' => $empresa_id,
            'nombre' => $nombre,
            'descripcion' => $descripcion,
            'ancho' => $ancho,
            'alto' => $alto,
            'largo' => $largo,
            'volumen' => $volumen
        ]
    ];

    if (!opti_requiere_aprobacion($conn, $usuarioId, $data, $solicitudData)) {
        $resultado = opti_ejecutar_accion_inmediata($conn, $solicitudData, $usuarioId);
        echo json_encode($resultado);
        exit;
    }

    $resultadoSolicitud = opti_registrar_solicitud($conn, $solicitudData);

    opti_responder_solicitud_creada($resultadoSolicitud);
}

if ($method === 'PUT') {
    $usuarioId = requireUserId();
    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
    $empresaId = isset($_GET['empresa_id']) ? intval($_GET['empresa_id']) : 0;
    $data = getJsonInput();
    $nombre = $data['nombre'] ?? '';
    $descripcion = $data['descripcion'] ?? '';
    $ancho = floatval($data['ancho'] ?? 0);
    $alto = floatval($data['alto'] ?? 0);
    $largo = floatval($data['largo'] ?? 0);
    $volumen = $ancho * $alto * $largo;
    if (!$nombre || $ancho <= 0 || $alto <= 0 || $largo <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Datos incompletos o dimensiones inválidas']);
        exit;
    }

    $empresaValidacion = $empresaId ?: (isset($data['empresa_id']) ? intval($data['empresa_id']) : 0);
    if ($empresaValidacion > 0 && !validarCapacidadContraAlmacen($conn, $empresaValidacion, $volumen)) {
        http_response_code(422);
        echo json_encode(['error' => 'El volumen del área supera la capacidad máxima registrada para el almacén.']);
        exit;
    }

    if ($id > 0) {
        $volumenZonas = obtenerVolumenTotalZonas($conn, $id);
        if ($volumen < $volumenZonas) {
            http_response_code(409);
            echo json_encode(['error' => 'El volumen del área no puede ser menor al volumen ocupado por sus zonas.']);
            exit;
        }
    }
    $empresaDestino = $empresaId;
    if ($empresaDestino <= 0) {
        $stmtArea = $conn->prepare('SELECT id_empresa FROM areas WHERE id = ?');
        $stmtArea->bind_param('i', $id);
        $stmtArea->execute();
        $resArea = $stmtArea->get_result()->fetch_assoc();
        $stmtArea->close();
        if (!$resArea) {
            http_response_code(404);
            echo json_encode(['error' => 'Área no encontrada']);
            exit;
        }
        $empresaDestino = (int) ($resArea['id_empresa'] ?? 0);
    }

    $solicitudData = [
        'id_empresa' => $empresaDestino,
        'id_solicitante' => $usuarioId,
        'modulo' => 'Áreas',
        'tipo_accion' => 'area_actualizar',
        'resumen' => 'Actualización del área "' . $nombre . '" (ID #' . $id . ')',
        'descripcion' => 'Solicitud de modificación de área.',
        'payload' => [
            'area_id' => $id,
            'empresa_id' => $empresaDestino,
            'nombre' => $nombre,
            'descripcion' => $descripcion,
            'ancho' => $ancho,
            'alto' => $alto,
            'largo' => $largo,
            'volumen' => $volumen
        ]
    ];

    if (!opti_requiere_aprobacion($conn, $usuarioId, $data, $solicitudData)) {
        $resultado = opti_ejecutar_accion_inmediata($conn, $solicitudData, $usuarioId);
        echo json_encode($resultado);
        exit;
    }

    $resultadoSolicitud = opti_registrar_solicitud($conn, $solicitudData);

    opti_responder_solicitud_creada($resultadoSolicitud);
}

if ($method === 'DELETE') {
    $usuarioId = requireUserId();
    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
    $empresaId = isset($_GET['empresa_id']) ? intval($_GET['empresa_id']) : 0;

    $stmtAreaDatos = $conn->prepare('SELECT id_empresa, nombre FROM areas WHERE id = ?');
    $stmtAreaDatos->bind_param('i', $id);
    $stmtAreaDatos->execute();
    $areaDatos = $stmtAreaDatos->get_result()->fetch_assoc();
    $stmtAreaDatos->close();

    if (!$areaDatos) {
        http_response_code(404);
        echo json_encode(['error' => 'Área no encontrada']);
        exit;
    }

    $nombreArea = trim((string) ($areaDatos['nombre'] ?? ''));

    $stmt = $conn->prepare('SELECT COUNT(*) FROM zonas WHERE area_id = ?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $stmt->bind_result($zonasAsociadas);
    $stmt->fetch();
    $stmt->close();

    if ($zonasAsociadas > 0) {
        http_response_code(409);
        echo json_encode(['error' => 'No se puede eliminar el área porque existen zonas asociadas. Reasigna o elimina las zonas primero.']);
        exit;
    }

    $empresaDestino = $empresaId > 0 ? $empresaId : (int) ($areaDatos['id_empresa'] ?? 0);

    $solicitudData = [
        'id_empresa' => $empresaDestino,
        'id_solicitante' => $usuarioId,
        'modulo' => 'Áreas',
        'tipo_accion' => 'area_eliminar',
        'resumen' => $nombreArea !== ''
            ? 'Eliminación del área "' . $nombreArea . '" (ID #' . $id . ')'
            : 'Eliminación del área ID #' . $id,
        'descripcion' => 'Solicitud de eliminación de área.',
        'payload' => [
            'area_id' => $id,
            'empresa_id' => $empresaDestino,
            'nombre_area' => $nombreArea
        ]
    ];

    if (!opti_requiere_aprobacion($conn, $usuarioId, $_GET, $solicitudData)) {
        $resultado = opti_ejecutar_accion_inmediata($conn, $solicitudData, $usuarioId);
        echo json_encode($resultado);
        exit;
    }

    $resultadoSolicitud = opti_registrar_solicitud($conn, $solicitudData);

    opti_responder_solicitud_creada($resultadoSolicitud);
}

http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);



