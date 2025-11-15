<?php
header('Content-Type: application/json');

$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";

require_once __DIR__ . '/solicitudes_utils.php';
require_once __DIR__ . '/accesos_utils.php';

function opti_normalizar_mapa_accesos(array $mapa): array
{
    $normalizado = [];

    foreach ($mapa as $areaId => $zonas) {
        $areaIdInt = (int) $areaId;
        if ($areaIdInt <= 0) {
            continue;
        }

        if ($zonas === null) {
            $normalizado[$areaIdInt] = null;
            continue;
        }

        if (!is_array($zonas) || empty($zonas)) {
            $normalizado[$areaIdInt] = [];
            continue;
        }

        $zonasValidas = [];
        foreach ($zonas as $zona) {
            $zonaInt = (int) $zona;
            if ($zonaInt > 0 && !in_array($zonaInt, $zonasValidas, true)) {
                $zonasValidas[] = $zonaInt;
            }
        }

        $normalizado[$areaIdInt] = $zonasValidas ?: [];
    }

    return $normalizado;
}

function opti_agregar_area_contexto(array &$areas, int $areaId, ?int $zonaId = null): void
{
    if ($areaId <= 0) {
        return;
    }

    $clave = (int) $areaId;

    if (!array_key_exists($clave, $areas) || $areas[$clave] === null) {
        $areas[$clave] = null;
    }

    if ($zonaId === null) {
        $areas[$clave] = null;
        return;
    }

    if ($areas[$clave] === null) {
        return;
    }

    $zonaId = (int) $zonaId;
    if ($zonaId <= 0) {
        return;
    }

    if (!in_array($zonaId, $areas[$clave], true)) {
        $areas[$clave][] = $zonaId;
    }
}

function opti_normalizar_lista_ids($valor): array
{
    $lista = is_array($valor) ? $valor : [$valor];
    $ids = [];

    foreach ($lista as $elemento) {
        if (is_array($elemento) && array_key_exists('id', $elemento)) {
            $elemento = $elemento['id'];
        }

        if (is_numeric($elemento)) {
            $numero = (int) $elemento;
        } elseif (is_string($elemento)) {
            $filtrado = preg_replace('/[^0-9-]+/', '', $elemento);
            $numero = (int) $filtrado;
        } else {
            continue;
        }

        if ($numero > 0) {
            $ids[] = $numero;
        }
    }

    return $ids;
}

function opti_resolver_area_por_zona(mysqli $conn, int $zonaId): ?int
{
    static $cache = [];

    if ($zonaId <= 0) {
        return null;
    }

    if (array_key_exists($zonaId, $cache)) {
        return $cache[$zonaId];
    }

    $stmt = $conn->prepare('SELECT area_id FROM zonas WHERE id = ? LIMIT 1');
    if (!$stmt) {
        $cache[$zonaId] = null;
        return null;
    }

    $stmt->bind_param('i', $zonaId);
    $stmt->execute();
    $stmt->bind_result($areaId);
    $areaEncontrada = $stmt->fetch() ? (int) $areaId : 0;
    $stmt->close();

    $cache[$zonaId] = $areaEncontrada > 0 ? $areaEncontrada : null;

    return $cache[$zonaId];
}

function opti_procesar_estructura_areas(mysqli $conn, $estructura, array &$areas): void
{
    if (!is_array($estructura)) {
        return;
    }

    $clavesArea = ['id_area', 'area_id', 'areaId', 'area_destino', 'area_anterior', 'area_nueva'];
    foreach ($clavesArea as $clave) {
        if (!array_key_exists($clave, $estructura)) {
            continue;
        }

        $ids = opti_normalizar_lista_ids($estructura[$clave]);
        foreach ($ids as $idArea) {
            opti_agregar_area_contexto($areas, $idArea);
        }
    }

    if (isset($estructura['area']) && is_array($estructura['area'])) {
        $ids = opti_normalizar_lista_ids($estructura['area']);
        foreach ($ids as $idArea) {
            opti_agregar_area_contexto($areas, $idArea);
        }
    }

    $clavesZona = ['id_zona', 'zona_id', 'zonaId', 'zona_destino', 'zona_anterior', 'zona_nueva'];
    foreach ($clavesZona as $clave) {
        if (!array_key_exists($clave, $estructura)) {
            continue;
        }

        $zonas = opti_normalizar_lista_ids($estructura[$clave]);
        foreach ($zonas as $zonaId) {
            $areaId = opti_resolver_area_por_zona($conn, $zonaId);
            if ($areaId) {
                opti_agregar_area_contexto($areas, $areaId, $zonaId);
            }
        }
    }

    if (isset($estructura['zona']) && is_array($estructura['zona'])) {
        $zonas = opti_normalizar_lista_ids($estructura['zona']);
        foreach ($zonas as $zonaId) {
            $areaId = opti_resolver_area_por_zona($conn, $zonaId);
            if ($areaId) {
                opti_agregar_area_contexto($areas, $areaId, $zonaId);
            }
        }
    }

    foreach ($estructura as $valor) {
        if (is_array($valor)) {
            opti_procesar_estructura_areas($conn, $valor, $areas);
        }
    }
}

function opti_extraer_contexto_areas(mysqli $conn, array $solicitud): array
{
    $areas = [];

    $payload = $solicitud['payload'] ?? [];
    if (is_string($payload)) {
        $payload = json_decode($payload, true) ?: [];
    }

    opti_procesar_estructura_areas($conn, $payload, $areas);

    if (isset($solicitud['resultado']) && is_array($solicitud['resultado'])) {
        opti_procesar_estructura_areas($conn, $solicitud['resultado'], $areas);
    }

    return opti_normalizar_mapa_accesos($areas);
}

function opti_mapas_accesos_intersectan(array $mapaA, array $mapaB): bool
{
    if (empty($mapaA) || empty($mapaB)) {
        return false;
    }

    foreach ($mapaB as $areaId => $zonasB) {
        $areaIdInt = (int) $areaId;
        if (!usuarioPuedeVerArea($mapaA, $areaIdInt)) {
            continue;
        }

        $zonasA = $mapaA[$areaIdInt] ?? [];
        if ($zonasA === null || $zonasB === null) {
            return true;
        }

        $zonasA = array_map('intval', $zonasA);
        $zonasB = array_map('intval', $zonasB);

        if (array_intersect($zonasA, $zonasB)) {
            return true;
        }
    }

    return false;
}

function opti_filtrar_solicitudes_por_accesos(mysqli $conn, array $items, ?int $usuarioIdActual): array
{
    $usuarioId = (int) $usuarioIdActual;
    if ($usuarioId <= 0) {
        return $items;
    }

    $mapaAccesos = opti_normalizar_mapa_accesos(construirMapaAccesosUsuario($conn, $usuarioId));
    if (!debeFiltrarPorAccesos($mapaAccesos)) {
        return $items;
    }

    $cacheSolicitantes = [];
    $filtradas = [];

    foreach ($items as $item) {
        if (!is_array($item)) {
            continue;
        }

        $permitido = false;
        $contextos = opti_extraer_contexto_areas($conn, $item);

        if (!empty($contextos)) {
            foreach ($contextos as $areaId => $zonas) {
                $areaIdInt = (int) $areaId;
                if (!usuarioPuedeVerArea($mapaAccesos, $areaIdInt)) {
                    continue;
                }

                if ($zonas === null) {
                    $permitido = true;
                    break;
                }

                foreach ($zonas as $zonaId) {
                    $zonaIdInt = (int) $zonaId;
                    if ($zonaIdInt > 0 && usuarioPuedeVerZona($mapaAccesos, $areaIdInt, $zonaIdInt)) {
                        $permitido = true;
                        break 2;
                    }
                }
            }
        }

        if (!$permitido) {
            $solicitanteId = isset($item['id_solicitante']) ? (int) $item['id_solicitante'] : 0;
            if ($solicitanteId > 0) {
                if (!array_key_exists($solicitanteId, $cacheSolicitantes)) {
                    $cacheSolicitantes[$solicitanteId] = opti_normalizar_mapa_accesos(
                        construirMapaAccesosUsuario($conn, $solicitanteId)
                    );
                }

                $mapaSolicitante = $cacheSolicitantes[$solicitanteId];
                if (!empty($mapaSolicitante) && opti_mapas_accesos_intersectan($mapaAccesos, $mapaSolicitante)) {
                    $permitido = true;
                }
            }
        }

        if ($permitido) {
            $filtradas[] = $item;
        }
    }

    return array_values($filtradas);
}

try {
    $conn = new mysqli($servername, $db_user, $db_pass, $database);
    $conn->set_charset('utf8mb4');
} catch (mysqli_sql_exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error de conexión a la base de datos.']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$usuarioSesionId = obtenerUsuarioIdSesion() ?? 0;

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

        $items = opti_filtrar_solicitudes_por_accesos($conn, $items, $usuarioSesionId);

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

    $items = opti_filtrar_solicitudes_por_accesos($conn, $items, $usuarioSesionId);

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
