<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

require_once __DIR__ . '/log_utils.php';
require_once __DIR__ . '/accesos_utils.php';

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

    // Campos comunes
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

    // Validación de empresa_id
    if ($empresa_id <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'empresa_id es obligatorio']);
        exit;
    }

    // Validación mínima
    if (!$nombre) {
        http_response_code(400);
        echo json_encode(['error' => 'Nombre requerido']);
        exit;
    }

       // ─── ÚNICOS POR NOMBRE (añádelo aquí) ───────────────────────────────
    // Si es PUT, primero extrae el id:
    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;

    // Preparamos la consulta que cuenta duplicados
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
    $q->close();  // ← ¡ciérralo para liberar resultados!
    if ($cnt > 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Ya existe un producto con ese nombre']);
        exit;
    }
    // ────────────────────────────────────────────────────────────────────

    if ($method === 'POST') {
        // INSERTAR (ahora sólo una llamada a execute)
        $sql = "
        INSERT INTO productos
          (nombre, descripcion, categoria_id, subcategoria_id,
           stock, precio_compra, dim_x, dim_y, dim_z, zona_id, empresa_id, last_movimiento)
        VALUES (?,?,?,?,?,?,?,?,?,?,?, NOW())
        ";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param(
            'ssiiidddiii',
            $nombre,
            $descripcion,
            $categoria_id,
            $subcategoria_id,
            $stock,
            $precio,
            $dim_x,
            $dim_y,
            $dim_z,
            $zona_id,
            $empresa_id
        );
        if (! $stmt->execute() ) {
            http_response_code(500);
            echo json_encode(['error' => 'Execute failed', 'details' => $stmt->error]);
            exit;
        }

        $newId = $stmt->insert_id;

        registrarLog($conn, $usuarioId, 'Productos', "Creación de producto: {$nombre} (ID {$newId})");

        // Generar código QR basado en el ID del producto
        require_once __DIR__.'/libs/phpqrcode/qrlib.php';
        $qrDir = __DIR__.'/../../images/qr/';
        if(!is_dir($qrDir)){
            mkdir($qrDir,0777,true);
        }
        $qrFile = $qrDir.$newId.'.png';
        QRcode::png((string)$newId, $qrFile, QR_ECLEVEL_L, 8, 2);
        $qrRel = 'images/qr/'.$newId.'.png';

        // Guardar ruta del QR en la base de datos
        $up = $conn->prepare("UPDATE productos SET codigo_qr=? WHERE id=?");
        $up->bind_param('si', $qrRel, $newId);
        $up->execute();

        echo json_encode(['id' => $newId, 'codigo_qr' => $qrRel]);
        exit;
    } else {
        // ACTUALIZAR (igual, actualiza last_movimiento y sólo un execute)
        $sql = "
        UPDATE productos SET
          nombre=?, descripcion=?, categoria_id=?, subcategoria_id=?,
          stock=?, precio_compra=?, dim_x=?, dim_y=?, dim_z=?, zona_id=?, last_movimiento=NOW()
        WHERE id=? AND empresa_id=?
        ";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param(
            'ssiiiddddiii',
            $nombre,
            $descripcion,
            $categoria_id,
            $subcategoria_id,
            $stock,
            $precio,
            $dim_x,
            $dim_y,
            $dim_z,
            $zona_id,
            $id,
            $empresa_id
        );
        if (! $stmt->execute() ) {
            http_response_code(500);
            echo json_encode(['error' => 'Execute failed', 'details' => $stmt->error]);
            exit;
        }

        registrarLog($conn, $usuarioId, 'Productos', "Actualización de producto ID: {$id}");
        echo json_encode(['success' => $stmt->affected_rows > 0]);
        exit;
    }
}

if ($method === 'DELETE') {
    $usuarioId = requireUserIdProductos();
    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
    $stmt = $conn->prepare("DELETE FROM productos WHERE id=? AND empresa_id=?");
    $stmt->bind_param('ii', $id, $empresa_id);
    $stmt->execute();

    registrarLog($conn, $usuarioId, 'Productos', "Eliminación de producto ID: {$id}");
    echo json_encode(['success' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);

