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
            $utilizada = isset($zona['capacidad_utilizada']) ? (float) $zona['capacidad_utilizada'] : 0.0;
            $total = isset($zona['volumen']) ? (float) $zona['volumen'] : 0.0;
            $zona['capacidad_disponible'] = max($total - $utilizada, 0);
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

            $row['capacidad_disponible'] = max(((float) ($row['volumen'] ?? 0)) - ((float) ($row['capacidad_utilizada'] ?? 0)), 0);

            $areaId = isset($row['area_id']) ? (int) $row['area_id'] : 0;
            $zonaId = isset($row['id']) ? (int) $row['id'] : 0;

            if ($filtrarPorAccesos && !usuarioPuedeVerZona($mapaAccesos, $areaId ?: null, $zonaId ?: null)) {
                continue;
            }

            $zonas[] = $row;
        }
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
    $subniveles = isset($data['subniveles']) ? json_encode($data['subniveles']) : null;
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

    $stmt = $conn->prepare('INSERT INTO zonas (nombre, descripcion, ancho, alto, largo, volumen, tipo_almacenamiento, subniveles, area_id, id_empresa) VALUES (?,?,?,?,?,?,?,?,?,?)');
    $stmt->bind_param('ssddddssii', $nombre, $descripcion, $ancho, $alto, $largo, $volumen, $tipo, $subniveles, $area_id, $empresa_id);
    $stmt->execute();

    registrarLog($conn, $usuarioId, 'Zonas', "Creación de zona: {$nombre}");

    actualizarOcupacionZona($conn, $stmt->insert_id);

    echo json_encode(['id' => $stmt->insert_id]);
    exit;
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
    $subniveles = isset($data['subniveles']) ? json_encode($data['subniveles']) : null;
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

    if ($empresaId) {
        $stmt = $conn->prepare('UPDATE zonas SET nombre=?, descripcion=?, ancho=?, alto=?, largo=?, volumen=?, tipo_almacenamiento=?, subniveles=?, area_id=? WHERE id=? AND id_empresa=?');
        $stmt->bind_param('ssddddssiii', $nombre, $descripcion, $ancho, $alto, $largo, $volumen, $tipo, $subniveles, $area_id, $id, $empresaId);
    } else {
        $stmt = $conn->prepare('UPDATE zonas SET nombre=?, descripcion=?, ancho=?, alto=?, largo=?, volumen=?, tipo_almacenamiento=?, subniveles=?, area_id=? WHERE id=?');
        $stmt->bind_param('ssddddssii', $nombre, $descripcion, $ancho, $alto, $largo, $volumen, $tipo, $subniveles, $area_id, $id);
    }
    $stmt->execute();

    registrarLog($conn, $usuarioId, 'Zonas', "Actualización de zona ID: {$id}");

    actualizarOcupacionZona($conn, $id);
    if ($areaAnterior && $areaAnterior !== $area_id) {
        actualizarOcupacionArea($conn, $areaAnterior);
    }

    echo json_encode(['success' => $stmt->affected_rows > 0]);
    exit;
}

if ($method === 'DELETE') {
    $usuarioId = requireUserIdZonas();
    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
    $empresaId = isset($_GET['empresa_id']) ? intval($_GET['empresa_id']) : 0;

    $stmtZona = $conn->prepare('SELECT area_id FROM zonas WHERE id = ?');
    $stmtZona->bind_param('i', $id);
    $stmtZona->execute();
    $stmtZona->bind_result($areaZona);
    $existe = $stmtZona->fetch();
    $stmtZona->close();

    if (!$existe) {
        http_response_code(404);
        echo json_encode(['error' => 'Zona no encontrada']);
        exit;
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

    if ($empresaId) {
        $stmt = $conn->prepare('DELETE FROM zonas WHERE id=? AND id_empresa=?');
        $stmt->bind_param('ii', $id, $empresaId);
    } else {
        $stmt = $conn->prepare('DELETE FROM zonas WHERE id=?');
        $stmt->bind_param('i', $id);
    }
    $stmt->execute();

    registrarLog($conn, $usuarioId, 'Zonas', "Eliminación de zona ID: {$id}");

    if (!empty($areaZona)) {
        actualizarOcupacionArea($conn, (int) $areaZona);
    }

    echo json_encode(['success' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);

