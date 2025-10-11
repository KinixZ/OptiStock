<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
header('Content-Type: application/json');

// Forzamos mysqli a lanzar excepciones para poder capturarlas y responder en JSON
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

$method = $_SERVER['REQUEST_METHOD'];

require_once __DIR__ . '/log_utils.php';
require_once __DIR__ . '/accesos_utils.php';
require_once __DIR__ . '/infraestructura_utils.php';
require_once __DIR__ . '/solicitudes_utils.php';

function requireUserIdProductos()
{
    $usuarioId = obtenerUsuarioIdSesion();
    if (!$usuarioId) {
        http_response_code(401);
        echo json_encode(['error' => 'Sesión expirada']);
        exit;
    }

    return $usuarioId;
}

$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";

$conn = new mysqli($servername, $db_user, $db_pass, $database);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(['error' => 'Error de conexión']);
    exit;
}

// capturamos empresa_id de GET o de JSON en un solo paso
$empresa_id = 0;
if (isset($_REQUEST['empresa_id'])) {
    $empresa_id = intval($_REQUEST['empresa_id']);
} else {
    // en POST/PUT podremos recibirlo en el cuerpo JSON
    $data_tmp = getJsonInput();
    if (isset($data_tmp['empresa_id'])) {
        $empresa_id = intval($data_tmp['empresa_id']);
    }
}
if ($empresa_id <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'empresa_id es obligatorio']);
    exit;
}

function getJsonInput()
{
    $input = file_get_contents('php://input');
    return json_decode($input, true) ?: [];
}

if ($method === 'GET') {
    $empresa_id = isset($_GET['empresa_id']) ? intval($_GET['empresa_id']) : 0;
    if ($empresa_id <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'empresa_id es obligatorio']);
        exit;
    }
    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;

    $usuarioIdSesion = obtenerUsuarioIdSesion() ?? 0;
    $mapaAccesos = construirMapaAccesosUsuario($conn, $usuarioIdSesion);
    $filtrarPorAccesos = debeFiltrarPorAccesos($mapaAccesos);

    if ($id) {
        $sql = "
          SELECT
            p.*,
            z.id   AS zona_id,   z.nombre    AS zona_nombre,
            a.id   AS area_id,   a.nombre    AS area_nombre,
            c.nombre AS categoria_nombre,
            sc.nombre AS subcategoria_nombre
          FROM productos p
          LEFT JOIN zonas   z  ON p.zona_id         = z.id
          LEFT JOIN areas   a  ON z.area_id         = a.id
          LEFT JOIN categorias    c  ON p.categoria_id    = c.id
          LEFT JOIN subcategorias sc ON p.subcategoria_id = sc.id
          WHERE p.id = ? AND p.empresa_id = ?
        ";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param('ii', $id, $empresa_id);
    } else {
        $sql = "
          SELECT
            p.*,
            z.id   AS zona_id,   z.nombre  AS zona_nombre,
            a.id   AS area_id,   a.nombre  AS area_nombre,
            c.nombre AS categoria_nombre,
            sc.nombre AS subcategoria_nombre
          FROM productos p
          LEFT JOIN zonas         z  ON p.zona_id         = z.id
          LEFT JOIN areas         a  ON z.area_id         = a.id
          LEFT JOIN categorias    c  ON p.categoria_id    = c.id
          LEFT JOIN subcategorias sc ON p.subcategoria_id = sc.id
          WHERE p.empresa_id = ?
      ";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param('i', $empresa_id);
    }

    $stmt->execute();
    $res = $stmt->get_result();

    if ($id) {
        $producto = $res->fetch_assoc() ?: [];
        if ($filtrarPorAccesos) {
            $areaId = isset($producto['area_id']) ? (int) $producto['area_id'] : 0;
            $zonaId = isset($producto['zona_id']) ? (int) $producto['zona_id'] : 0;
            if (!usuarioPuedeVerZona($mapaAccesos, $areaId ?: null, $zonaId ?: null)) {
                http_response_code(403);
                echo json_encode(['error' => 'No tienes acceso a este producto.']);
                exit;
            }
        }

        echo json_encode($producto);
    } else {
        $items = [];
        while ($row = $res->fetch_assoc()) {
            $areaId = isset($row['area_id']) ? (int) $row['area_id'] : 0;
            $zonaId = isset($row['zona_id']) ? (int) $row['zona_id'] : 0;

            if ($filtrarPorAccesos && !usuarioPuedeVerZona($mapaAccesos, $areaId ?: null, $zonaId ?: null)) {
                continue;
            }

            $items[] = $row;
        }
        echo json_encode($items);
    }
    exit;
}

if ($method === 'POST' || $method === 'PUT') {
    $usuarioId = requireUserIdProductos();
    $data = getJsonInput();

    $nombre          = $data['nombre']          ?? '';
    $descripcion     = $data['descripcion']     ?? '';
    $categoria_id    = isset($data['categoria_id'])    ? intval($data['categoria_id'])    : null;
    $subcategoria_id = isset($data['subcategoria_id']) ? intval($data['subcategoria_id']) : null;
    $stock           = intval($data['stock'] ?? 0);
    $precio          = floatval($data['precio_compra'] ?? 0);
    $dim_x           = isset($data['dim_x']) ? floatval($data['dim_x']) : null;
    $dim_y           = isset($data['dim_y']) ? floatval($data['dim_y']) : null;
    $dim_z           = isset($data['dim_z']) ? floatval($data['dim_z']) : null;
    $zona_id         = isset($data['zona_id']) ? intval($data['zona_id']) : null;
    if ($zona_id !== null && $zona_id <= 0) {
        $zona_id = null;
    }

    if ($empresa_id <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'empresa_id es obligatorio']);
        exit;
    }

    if (!$nombre) {
        http_response_code(400);
        echo json_encode(['error' => 'Nombre requerido']);
        exit;
    }

    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;

    $q = $conn->prepare(
        "SELECT COUNT(*) FROM productos
         WHERE LOWER(nombre)=LOWER(?)
           AND empresa_id=?" .
        ($method === 'PUT' ? " AND id<>?" : "")
    );
    if ($method === 'PUT') {
        $q->bind_param('sii', $nombre, $empresa_id, $id);
    } else {
        $q->bind_param('si', $nombre, $empresa_id);
    }
    $q->execute();
    $q->bind_result($cnt);
    $q->fetch();
    $q->close();
    if ($cnt > 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Ya existe un producto con ese nombre']);
        exit;
    }

    $volumenProductoCm3 = max($stock, 0) * (($dim_x ?? 0) * ($dim_y ?? 0) * ($dim_z ?? 0));
    $volumenProductoM3 = $volumenProductoCm3 / 1000000.0;

    $zonaAnterior = null;
    $volumenAnteriorM3 = 0.0;

    if ($method === 'PUT') {
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['error' => 'ID de producto inválido']);
            exit;
        }
        $stmtPrev = $conn->prepare('SELECT zona_id, COALESCE(dim_x,0) AS dim_x, COALESCE(dim_y,0) AS dim_y, COALESCE(dim_z,0) AS dim_z, GREATEST(stock,0) AS stock FROM productos WHERE id = ? AND empresa_id = ?');
        $stmtPrev->bind_param('ii', $id, $empresa_id);
        $stmtPrev->execute();
        $prevProducto = $stmtPrev->get_result()->fetch_assoc();
        $stmtPrev->close();

        if (!$prevProducto) {
            http_response_code(404);
            echo json_encode(['error' => 'Producto no encontrado']);
            exit;
        }

        $zonaAnterior = isset($prevProducto['zona_id']) ? (int) $prevProducto['zona_id'] : null;
        if ($zonaAnterior !== null && $zonaAnterior <= 0) {
            $zonaAnterior = null;
        }
        $volumenAnteriorCm3 = ((float) ($prevProducto['stock'] ?? 0)) * ((float) ($prevProducto['dim_x'] ?? 0)) * ((float) ($prevProducto['dim_y'] ?? 0)) * ((float) ($prevProducto['dim_z'] ?? 0));
        $volumenAnteriorM3 = $volumenAnteriorCm3 / 1000000.0;
    }

    if ($zona_id && $volumenProductoM3 > 0) {
        $ocupacion = calcularOcupacionZona($conn, $zona_id);
        if ($ocupacion) {
            $disponible = $ocupacion['capacidad_disponible'];
            if ($zonaAnterior && $zonaAnterior === $zona_id) {
                $disponible += $volumenAnteriorM3;
            }
            if ($volumenProductoM3 > $disponible) {
                http_response_code(409);
                echo json_encode(['error' => 'La zona seleccionada no tiene capacidad disponible para este producto.']);
                exit;
            }
        }
    }

    $payloadSolicitud = [
        'empresa_id' => $empresa_id,
        'nombre' => $nombre,
        'descripcion' => $descripcion,
        'categoria_id' => $categoria_id,
        'subcategoria_id' => $subcategoria_id,
        'stock' => $stock,
        'precio_compra' => $precio,
        'dim_x' => $dim_x,
        'dim_y' => $dim_y,
        'dim_z' => $dim_z,
        'zona_id' => $zona_id,
        'volumen_cm3' => $volumenProductoCm3
    ];

    if ($method === 'PUT') {
        $payloadSolicitud['id_producto'] = $id;
        $payloadSolicitud['zona_anterior'] = $zonaAnterior;
        $payloadSolicitud['volumen_anterior_m3'] = $volumenAnteriorM3;
    }

    $tipoAccion = $method === 'POST' ? 'producto_crear' : 'producto_actualizar';
    $detalleProducto = '"' . $nombre . '"';
    $resumen = $method === 'POST'
        ? 'Creación del producto ' . $detalleProducto
        : 'Actualización del producto ' . $detalleProducto . ' (ID #' . $id . ')';

    $solicitudData = [
        'id_empresa' => $empresa_id,
        'id_solicitante' => $usuarioId,
        'modulo' => 'Productos',
        'tipo_accion' => $tipoAccion,
        'resumen' => $resumen,
        'descripcion' => 'Solicitud registrada desde el gestor de inventario.',
        'payload' => $payloadSolicitud
    ];

    if (!opti_requiere_aprobacion($conn, $usuarioId, $data, $solicitudData, $_GET)) {
        $resultado = opti_ejecutar_accion_inmediata($conn, $solicitudData, $usuarioId);
        echo json_encode($resultado);
        exit;
    }

    $resultadoSolicitud = opti_registrar_solicitud($conn, $solicitudData);

    opti_responder_solicitud_creada($resultadoSolicitud);
}

if ($method === 'DELETE') {
    $usuarioId = requireUserIdProductos();
    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
    $forceDelete = isset($_GET['force']) ? (bool) intval($_GET['force']) : false;

    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'ID de producto inválido']);
        exit;
    }

    $stmtZona = $conn->prepare('SELECT nombre, zona_id FROM productos WHERE id = ? AND empresa_id = ?');
    $stmtZona->bind_param('ii', $id, $empresa_id);
    $stmtZona->execute();
    $stmtZona->bind_result($nombreProducto, $zonaProducto);
    $existeProducto = $stmtZona->fetch();
    $stmtZona->close();

    if (!$existeProducto) {
        http_response_code(404);
        echo json_encode(['error' => 'Producto no encontrado']);
        exit;
    }

    $stmt = $conn->prepare('SELECT COUNT(*) FROM movimientos WHERE producto_id = ? AND empresa_id = ?');
    $stmt->bind_param('ii', $id, $empresa_id);
    $stmt->execute();
    $stmt->bind_result($movCount);
    $stmt->fetch();
    $stmt->close();

    if ($movCount > 0 && !$forceDelete) {
        http_response_code(409);
        echo json_encode([
            'error' => 'No se puede eliminar el producto porque tiene movimientos registrados.',
            'movimientos' => $movCount,
            'reintentar_con_force' => true,
        ]);
        exit;
    }

    $nombreProducto = $existeProducto ? trim((string) $nombreProducto) : '';
    $solicitudData = [
        'id_empresa' => $empresa_id,
        'id_solicitante' => $usuarioId,
        'modulo' => 'Productos',
        'tipo_accion' => 'producto_eliminar',
        'resumen' => $nombreProducto !== ''
            ? 'Eliminación del producto "' . $nombreProducto . '" (ID #' . $id . ')'
            : 'Eliminación del producto ID #' . $id,
        'descripcion' => 'Solicitud de eliminación de producto.',
        'payload' => [
            'id_producto' => $id,
            'empresa_id' => $empresa_id,
            'zona_id' => (int) $zonaProducto,
            'nombre_producto' => $nombreProducto,
            'movimientos_asociados' => (int) $movCount,
            'force_delete' => $forceDelete
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

