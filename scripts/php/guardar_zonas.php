<?php
header('Content-Type: application/json');

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

$method = $_SERVER['REQUEST_METHOD'];

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

function requireUserIdZonas()
{
    $usuarioId = obtenerUsuarioIdSesion();
    if (!$usuarioId) {
        http_response_code(401);
        echo json_encode(['error' => 'Sesión expirada']);
        exit;
    }

    return $usuarioId;
}

function getJsonInput() {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    return $data ?: [];
}

function obtenerEstadisticasZonas(mysqli $conn, array $zonaIds): array
{
    $zonaIds = array_values(array_filter(array_map('intval', $zonaIds)));
    if (!$zonaIds) {
        return [];
    }

    $placeholders = implode(',', array_fill(0, count($zonaIds), '?'));
    $types = str_repeat('i', count($zonaIds));

    $sql = "
        SELECT
            zona_id,
            COUNT(*) AS productos,
            COALESCE(SUM(GREATEST(stock, 0)), 0) AS unidades,
            COALESCE(SUM(GREATEST(stock, 0) * COALESCE(dim_x, 0) * COALESCE(dim_y, 0) * COALESCE(dim_z, 0)), 0) AS volumen_cm3
        FROM productos
        WHERE zona_id IN ($placeholders)
        GROUP BY zona_id
    ";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$zonaIds);
    $stmt->execute();
    $result = $stmt->get_result();

    $mapa = [];
    while ($row = $result->fetch_assoc()) {
        $zonaId = (int) ($row['zona_id'] ?? 0);
        $mapa[$zonaId] = [
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
        $stmt = $conn->prepare('SELECT * FROM zonas WHERE id = ?');
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $res = $stmt->get_result();
        $zona = $res->fetch_assoc() ?: [];

        if ($zona && $zona['subniveles']) {
            $zona['subniveles'] = json_decode($zona['subniveles'], true);
        }

        if ($zona) {
            $total = isset($zona['volumen']) ? (float) $zona['volumen'] : 0.0;
            $estadisticas = obtenerEstadisticasZonas($conn, [$zona['id']]);
            $extra = $estadisticas[$zona['id']] ?? ['productos' => 0, 'unidades' => 0, 'volumen_cm3' => 0.0];
            $utilizada = ((float) $extra['volumen_cm3']) / 1000000.0;
            $zona['capacidad_utilizada'] = $utilizada;
            $zona['capacidad_disponible'] = max($total - $utilizada, 0);
            $zona['porcentaje_ocupacion'] = $total > 0 ? min(100, ($utilizada / $total) * 100) : 0;
            $zona['productos_registrados'] = $extra['productos'];
            $zona['total_unidades'] = $extra['unidades'];
        }

        if ($filtrarPorAccesos) {
            $areaId = isset($zona['area_id']) ? (int) $zona['area_id'] : 0;
            $zonaId = isset($zona['id']) ? (int) $zona['id'] : 0;
            if (!usuarioPuedeVerZona($mapaAccesos, $areaId ?: null, $zonaId ?: null)) {
                http_response_code(403);
                echo json_encode(['error' => 'No tienes acceso a esta zona.']);
                exit;
            }
        }

        echo json_encode($zona);
    } else {
        $zonas = [];
        if ($empresaId) {
            $stmt = $conn->prepare('SELECT * FROM zonas WHERE id_empresa = ?');
            $stmt->bind_param('i', $empresaId);
            $stmt->execute();
            $result = $stmt->get_result();
        } else {
            $result = $conn->query('SELECT * FROM zonas');
        }

        while ($row = $result->fetch_assoc()) {
            if ($row['subniveles']) {
                $row['subniveles'] = json_decode($row['subniveles'], true);
            }

            $areaId = isset($row['area_id']) ? (int) $row['area_id'] : 0;
            $zonaId = isset($row['id']) ? (int) $row['id'] : 0;

            if ($filtrarPorAccesos && !usuarioPuedeVerZona($mapaAccesos, $areaId ?: null, $zonaId ?: null)) {
                continue;
            }

            $zonas[] = $row;
        }

        $estadisticas = obtenerEstadisticasZonas($conn, array_column($zonas, 'id'));
        foreach ($zonas as &$zonaItem) {
            $total = isset($zonaItem['volumen']) ? (float) $zonaItem['volumen'] : 0.0;
            $extra = $estadisticas[$zonaItem['id']] ?? ['productos' => 0, 'unidades' => 0, 'volumen_cm3' => 0.0];
            $utilizada = ((float) $extra['volumen_cm3']) / 1000000.0;
            $zonaItem['capacidad_utilizada'] = $utilizada;
            $zonaItem['capacidad_disponible'] = max($total - $utilizada, 0);
            $zonaItem['porcentaje_ocupacion'] = $total > 0 ? min(100, ($utilizada / $total) * 100) : 0;
            $zonaItem['productos_registrados'] = $extra['productos'];
            $zonaItem['total_unidades'] = $extra['unidades'];
        }
        unset($zonaItem);

        echo json_encode($zonas);
    }
    exit;
}

if ($method === 'POST') {
    $usuarioId = requireUserIdZonas();
    $data = getJsonInput();
    $nombre = $data['nombre'] ?? '';
    $descripcion = $data['descripcion'] ?? '';
    $ancho = floatval($data['ancho'] ?? 0);
    $alto = floatval($data['alto'] ?? 0);
    $largo = floatval($data['largo'] ?? 0);
    $volumen = $ancho * $alto * $largo;
    $tipo = $data['tipo_almacenamiento'] ?? null;
    $subniveles = isset($data['subniveles']) ? $data['subniveles'] : null;
    $area_id = isset($data['area_id']) ? intval($data['area_id']) : null;
    if ($area_id !== null && $area_id <= 0) {
        $area_id = null;
    }
    $empresa_id = isset($data['empresa_id']) ? intval($data['empresa_id']) : 0;

    if (!$nombre || $empresa_id <= 0 || $ancho <= 0 || $alto <= 0 || $largo <= 0 || !$tipo) {
        http_response_code(400);
        echo json_encode(['error' => 'Datos incompletos o dimensiones inválidas']);
        exit;
    }

    if (!validarCapacidadContraAlmacen($conn, $empresa_id, $volumen)) {
        http_response_code(422);
        echo json_encode(['error' => 'El volumen de la zona supera la capacidad máxima registrada para el almacén.']);
        exit;
    }

    if ($area_id) {
        $capacidadDisponible = obtenerCapacidadDisponibleArea($conn, $area_id);
        if ($volumen > $capacidadDisponible) {
            http_response_code(409);
            echo json_encode(['error' => 'El volumen de la zona excede la capacidad disponible en el área seleccionada.']);
            exit;
        }
    }

    $payloadZona = [
        'empresa_id' => $empresa_id,
        'nombre' => $nombre,
        'descripcion' => $descripcion,
        'ancho' => $ancho,
        'alto' => $alto,
        'largo' => $largo,
        'volumen' => $volumen,
        'tipo_almacenamiento' => $tipo,
        'subniveles' => $subniveles,
        'area_id' => $area_id
    ];

    if (opti_usuario_actual_es_admin()) {
        $resultado = opti_aplicar_zona_crear($conn, $payloadZona, $usuarioId);
        if (!headers_sent()) {
            header('Content-Type: application/json');
        }
        echo json_encode($resultado);
        exit;
    }

    $resultadoSolicitud = opti_registrar_solicitud($conn, [
        'id_empresa' => $empresa_id,
        'id_solicitante' => $usuarioId,
        'modulo' => 'Zonas',
        'tipo_accion' => 'zona_crear',
        'resumen' => 'Creación de la zona "' . $nombre . '"',
        'descripcion' => 'Solicitud de creación de zona en el almacén.',
        'payload' => $payloadZona
    ]);

    opti_responder_solicitud_creada($resultadoSolicitud);
}

if ($method === 'PUT') {
    $usuarioId = requireUserIdZonas();
    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
    $empresaId = isset($_GET['empresa_id']) ? intval($_GET['empresa_id']) : 0;
    $data = getJsonInput();
    $nombre = $data['nombre'] ?? '';
    $descripcion = $data['descripcion'] ?? '';
    $ancho = floatval($data['ancho'] ?? 0);
    $alto = floatval($data['alto'] ?? 0);
    $largo = floatval($data['largo'] ?? 0);
    $volumen = $ancho * $alto * $largo;
    $tipo = $data['tipo_almacenamiento'] ?? null;
    $subniveles = isset($data['subniveles']) ? $data['subniveles'] : null;
    $area_id = isset($data['area_id']) ? intval($data['area_id']) : null;
    if ($area_id !== null && $area_id <= 0) {
        $area_id = null;
    }

    $stmtZona = $conn->prepare('SELECT area_id, capacidad_utilizada, id_empresa FROM zonas WHERE id = ?');
    $stmtZona->bind_param('i', $id);
    $stmtZona->execute();
    $zonaActual = $stmtZona->get_result()->fetch_assoc();
    $stmtZona->close();

    if (!$zonaActual) {
        http_response_code(404);
        echo json_encode(['error' => 'Zona no encontrada']);
        exit;
    }

    $areaAnterior = isset($zonaActual['area_id']) ? (int) $zonaActual['area_id'] : null;
    $capacidadActual = isset($zonaActual['capacidad_utilizada']) ? (float) $zonaActual['capacidad_utilizada'] : 0.0;

    if (!$nombre || $ancho <= 0 || $alto <= 0 || $largo <= 0 || !$tipo) {
        http_response_code(400);
        echo json_encode(['error' => 'Datos incompletos o dimensiones inválidas']);
        exit;
    }

    $empresaValidacion = $empresaId ?: (isset($data['empresa_id']) ? intval($data['empresa_id']) : (isset($zonaActual['id_empresa']) ? (int) $zonaActual['id_empresa'] : 0));
    if ($empresaValidacion > 0 && !validarCapacidadContraAlmacen($conn, $empresaValidacion, $volumen)) {
        http_response_code(422);
        echo json_encode(['error' => 'El volumen de la zona supera la capacidad máxima registrada para el almacén.']);
        exit;
    }

    if ($volumen < $capacidadActual) {
        http_response_code(409);
        echo json_encode(['error' => 'El volumen de la zona no puede ser menor al espacio actualmente utilizado por los productos.']);
        exit;
    }

    if ($area_id) {
        $capacidadDisponible = obtenerCapacidadDisponibleArea($conn, $area_id, $id);
        if ($volumen > $capacidadDisponible) {
            http_response_code(409);
            echo json_encode(['error' => 'El volumen de la zona excede la capacidad disponible en el área seleccionada.']);
            exit;
        }
    }

    $empresaDestino = $empresaId ?: (int) ($zonaActual['id_empresa'] ?? 0);

    $payloadZona = [
        'zona_id' => $id,
        'empresa_id' => $empresaDestino,
        'nombre' => $nombre,
        'descripcion' => $descripcion,
        'ancho' => $ancho,
        'alto' => $alto,
        'largo' => $largo,
        'volumen' => $volumen,
        'tipo_almacenamiento' => $tipo,
        'subniveles' => $subniveles,
        'area_id' => $area_id,
        'area_anterior' => $areaAnterior,
        'capacidad_actual' => $capacidadActual
    ];

    if (opti_usuario_actual_es_admin()) {
        $resultado = opti_aplicar_zona_actualizar($conn, $payloadZona, $usuarioId);
        if (!headers_sent()) {
            header('Content-Type: application/json');
        }
        echo json_encode($resultado);
        exit;
    }

    $resultadoSolicitud = opti_registrar_solicitud($conn, [
        'id_empresa' => $empresaDestino,
        'id_solicitante' => $usuarioId,
        'modulo' => 'Zonas',
        'tipo_accion' => 'zona_actualizar',
        'resumen' => 'Actualización de la zona "' . $nombre . '" (ID #' . $id . ')',
        'descripcion' => 'Solicitud de modificación de zona.',
        'payload' => $payloadZona
    ]);

    opti_responder_solicitud_creada($resultadoSolicitud);
}

if ($method === 'DELETE') {
    $usuarioId = requireUserIdZonas();
    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
    $empresaId = isset($_GET['empresa_id']) ? intval($_GET['empresa_id']) : 0;

    $stmtZona = $conn->prepare('SELECT area_id, nombre FROM zonas WHERE id = ?');
    $stmtZona->bind_param('i', $id);
    $stmtZona->execute();
    $stmtZona->bind_result($areaZona, $nombreZona);
    $existe = $stmtZona->fetch();
    $stmtZona->close();

    if (!$existe) {
        http_response_code(404);
        echo json_encode(['error' => 'Zona no encontrada']);
        exit;
    }

    $nombreZona = $nombreZona ?? '';
    $tieneNombreZona = trim($nombreZona) !== '';
    if ($tieneNombreZona) {
        $resumenSolicitud = sprintf("Eliminar zona \"%s\" (ID #%d)", $nombreZona, $id);
        $descripcionSolicitud = sprintf("Solicitud de eliminación de la zona \"%s\".", $nombreZona);
    } else {
        $resumenSolicitud = sprintf('Eliminar zona ID #%d', $id);
        $descripcionSolicitud = sprintf('Solicitud de eliminación de la zona ID #%d.', $id);
    }

    $stmt = $conn->prepare('SELECT COUNT(*) FROM productos WHERE zona_id = ?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $stmt->bind_result($productosEnZona);
    $stmt->fetch();
    $stmt->close();

    if ($productosEnZona > 0) {
        http_response_code(409);
        echo json_encode(['error' => 'No se puede eliminar la zona porque tiene productos almacenados. Reasigna los productos antes de eliminarla.']);
        exit;
    }

    $stmt = $conn->prepare('SELECT COUNT(*) FROM movimientos m INNER JOIN productos p ON m.producto_id = p.id WHERE p.zona_id = ? AND m.fecha_movimiento >= DATE_SUB(NOW(), INTERVAL 30 DAY)');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $stmt->bind_result($movimientosRecientes);
    $stmt->fetch();
    $stmt->close();

    if ($movimientosRecientes > 0) {
        http_response_code(409);
        echo json_encode(['error' => 'La zona tiene movimientos recientes registrados. Espera a que se complete la trazabilidad antes de eliminarla.']);
        exit;
    }

    $empresaDestino = $empresaId;
    if ($empresaDestino <= 0) {
        $stmtEmpresa = $conn->prepare('SELECT id_empresa FROM zonas WHERE id = ?');
        $stmtEmpresa->bind_param('i', $id);
        $stmtEmpresa->execute();
        $zonaEmpresa = $stmtEmpresa->get_result()->fetch_assoc();
        $stmtEmpresa->close();
        if (!$zonaEmpresa) {
            http_response_code(404);
            echo json_encode(['error' => 'Zona no encontrada']);
            exit;
        }
        $empresaDestino = (int) ($zonaEmpresa['id_empresa'] ?? 0);
    }

    $payloadEliminar = [
        'zona_id' => $id,
        'empresa_id' => $empresaDestino,
        'area_id' => (int) $areaZona,
        'nombre_zona' => $tieneNombreZona ? $nombreZona : '',
        'productos_en_zona' => (int) $productosEnZona,
        'movimientos_recientes' => (int) $movimientosRecientes
    ];

    if (opti_usuario_actual_es_admin()) {
        $resultado = opti_aplicar_zona_eliminar($conn, $payloadEliminar, $usuarioId);
        if (!headers_sent()) {
            header('Content-Type: application/json');
        }
        echo json_encode($resultado);
        exit;
    }

    $resultadoSolicitud = opti_registrar_solicitud($conn, [
        'id_empresa' => $empresaDestino,
        'id_solicitante' => $usuarioId,
        'modulo' => 'Zonas',
        'tipo_accion' => 'zona_eliminar',
        'resumen' => $resumenSolicitud,
        'descripcion' => $descripcionSolicitud,
        'payload' => $payloadEliminar
    ]);

    opti_responder_solicitud_creada($resultadoSolicitud);
}

http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);

