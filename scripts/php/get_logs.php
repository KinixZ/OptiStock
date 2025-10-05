<?php
session_start();
header("Content-Type: application/json");

require_once __DIR__ . '/log_utils.php';
require_once __DIR__ . '/accesos_utils.php';

function normalizarListaIds(array $ids): array
{
    $filtrados = array_filter(array_map('intval', $ids), static function ($id) {
        return $id > 0;
    });

    return array_values(array_unique($filtrados));
}

function formatearUbicacionProducto(array $producto): string
{
    $partes = [];

    if (!empty($producto['zona_nombre'])) {
        $partes[] = 'Zona: ' . $producto['zona_nombre'];
    }

    if (!empty($producto['area_nombre'])) {
        $partes[] = 'Área: ' . $producto['area_nombre'];
    }

    return $partes ? implode(' · ', $partes) : '';
}

function formatearProductoConNombre(array $producto): string
{
    $nombre = trim((string)($producto['nombre'] ?? ''));
    $resultado = $nombre;

    $ubicacion = formatearUbicacionProducto($producto);
    if ($ubicacion !== '') {
        $resultado .= ' (' . $ubicacion . ')';
    }

    $descripcion = trim((string)($producto['descripcion'] ?? ''));
    if ($descripcion !== '') {
        $resultado .= ' — Descripción: ' . $descripcion;
    }

    return trim($resultado);
}

function formatearDetalleProducto(array $producto): string
{
    $partes = [];

    $ubicacion = formatearUbicacionProducto($producto);
    if ($ubicacion !== '') {
        $partes[] = $ubicacion;
    }

    $descripcion = trim((string)($producto['descripcion'] ?? ''));
    if ($descripcion !== '') {
        $partes[] = 'Descripción: ' . $descripcion;
    }

    return implode(' — ', $partes);
}

function extraerReferenciasDesdeAccion(string $accion): array
{
    $productos = [];
    $areas = [];
    $zonas = [];

    if (preg_match_all('/producto\s*(?:ID[:\s]*|#\s*|n[úu]mero\s*)?(\d+)/iu', $accion, $productoMatches)) {
        foreach ($productoMatches[1] as $id) {
            $productos[] = (int) $id;
        }
    }

    if (preg_match_all('/producto[^()]*\(\s*ID\s*(\d+)\s*\)/iu', $accion, $productoIdMatches)) {
        foreach ($productoIdMatches[1] as $id) {
            $productos[] = (int) $id;
        }
    }

    if (preg_match_all('/(área|area)\s*(?:con\s+)?(?:id|n[úu]mero|#)\s*[:#-]?\s*(\d+)/iu', $accion, $areaMatches)) {
        foreach ($areaMatches[2] as $id) {
            $areas[] = (int) $id;
        }
    }

    if (preg_match_all('/(zona)\s*(?:con\s+)?(?:id|n[úu]mero|#)\s*[:#-]?\s*(\d+)/iu', $accion, $zonaMatches)) {
        foreach ($zonaMatches[2] as $id) {
            $zonas[] = (int) $id;
        }
    }

    return [
        'productos' => $productos,
        'areas'     => $areas,
        'zonas'     => $zonas,
    ];
}

function extraerReferenciasDesdeLogs(array $logs): array
{
    $productos = [];
    $areas = [];
    $zonas = [];

    foreach ($logs as $log) {
        $accion = isset($log['accion']) && is_string($log['accion']) ? $log['accion'] : '';
        if ($accion === '') {
            continue;
        }

        $referencias = extraerReferenciasDesdeAccion($accion);
        $productos    = array_merge($productos, $referencias['productos']);
        $areas        = array_merge($areas, $referencias['areas']);
        $zonas        = array_merge($zonas, $referencias['zonas']);
    }

    return [
        'productos' => normalizarListaIds($productos),
        'areas'     => normalizarListaIds($areas),
        'zonas'     => normalizarListaIds($zonas),
    ];
}

function obtenerDatosProductos(mysqli $conn, array $ids): array
{
    $ids = normalizarListaIds($ids);
    if (empty($ids)) {
        return [];
    }

    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $types = str_repeat('i', count($ids));

    $sql = "SELECT p.id, p.nombre, p.descripcion, z.nombre AS zona_nombre, a.nombre AS area_nombre
            FROM productos p
            LEFT JOIN zonas z ON p.zona_id = z.id
            LEFT JOIN areas a ON z.area_id = a.id
            WHERE p.id IN ($placeholders)";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$ids);
    $stmt->execute();
    $result = $stmt->get_result();

    $datos = [];
    while ($row = $result->fetch_assoc()) {
        $datos[(int) $row['id']] = $row;
    }

    $stmt->close();

    return $datos;
}

function obtenerDatosAreas(mysqli $conn, array $ids): array
{
    $ids = normalizarListaIds($ids);
    if (empty($ids)) {
        return [];
    }

    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $types = str_repeat('i', count($ids));

    $sql = "SELECT id, nombre, descripcion FROM areas WHERE id IN ($placeholders)";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$ids);
    $stmt->execute();
    $result = $stmt->get_result();

    $datos = [];
    while ($row = $result->fetch_assoc()) {
        $datos[(int) $row['id']] = $row;
    }

    $stmt->close();

    return $datos;
}

function obtenerDatosZonas(mysqli $conn, array $ids): array
{
    $ids = normalizarListaIds($ids);
    if (empty($ids)) {
        return [];
    }

    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $types = str_repeat('i', count($ids));

    $sql = "SELECT z.id, z.nombre, z.descripcion, a.nombre AS area_nombre
            FROM zonas z
            LEFT JOIN areas a ON z.area_id = a.id
            WHERE z.id IN ($placeholders)";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$ids);
    $stmt->execute();
    $result = $stmt->get_result();

    $datos = [];
    while ($row = $result->fetch_assoc()) {
        $datos[(int) $row['id']] = $row;
    }

    $stmt->close();

    return $datos;
}

function enriquecerAccionConDetalles(string $accion, array $productosInfo, array $areasInfo, array $zonasInfo): string
{
    if ($accion === '') {
        return $accion;
    }

    $resultado = $accion;

    $resultado = preg_replace_callback(
        '/(producto\s*)(?:ID[:\s]*|#\s*|n[úu]mero\s*)?(\d+)/iu',
        static function ($matches) use ($productosInfo) {
            $prefijo = rtrim($matches[1]);
            $id = (int) $matches[2];

            if (!isset($productosInfo[$id])) {
                return $prefijo;
            }

            $detalle = formatearProductoConNombre($productosInfo[$id]);
            return trim($prefijo . ' ' . $detalle);
        },
        $resultado
    );

    $resultado = preg_replace_callback(
        '/(producto[^()]*)\(\s*ID\s*(\d+)\s*\)/iu',
        static function ($matches) use ($productosInfo) {
            $texto = rtrim($matches[1]);
            $id = (int) $matches[2];

            if (!isset($productosInfo[$id])) {
                return $texto;
            }

            $detalle = formatearDetalleProducto($productosInfo[$id]);
            if ($detalle === '') {
                return $texto;
            }

            return $texto . ' — ' . $detalle;
        },
        $resultado
    );

    $resultado = preg_replace_callback(
        '/(área|area)\s*(?:con\s+)?(?:id|n[úu]mero|#)\s*[:#-]?\s*(\d+)/iu',
        static function ($matches) use ($areasInfo) {
            $id = (int) $matches[2];

            if (!isset($areasInfo[$id])) {
                return 'Área sin información disponible';
            }

            $area = $areasInfo[$id];
            $descripcion = trim((string)($area['descripcion'] ?? ''));

            $texto = 'Área ' . $area['nombre'];
            if ($descripcion !== '') {
                $texto .= ' — Descripción: ' . $descripcion;
            }

            return $texto;
        },
        $resultado
    );

    $resultado = preg_replace_callback(
        '/(zona)\s*(?:con\s+)?(?:id|n[úu]mero|#)\s*[:#-]?\s*(\d+)/iu',
        static function ($matches) use ($zonasInfo) {
            $id = (int) $matches[2];

            if (!isset($zonasInfo[$id])) {
                return 'Zona sin información disponible';
            }

            $zona = $zonasInfo[$id];
            $texto = 'Zona ' . $zona['nombre'];

            $detalles = [];
            if (!empty($zona['area_nombre'])) {
                $detalles[] = 'Área: ' . $zona['area_nombre'];
            }

            $descripcion = trim((string)($zona['descripcion'] ?? ''));
            if ($descripcion !== '') {
                $detalles[] = 'Descripción: ' . $descripcion;
            }

            if ($detalles) {
                $texto .= ' — ' . implode(' · ', $detalles);
            }

            return $texto;
        },
        $resultado
    );

    $resultado = preg_replace('/\s{2,}/', ' ', trim($resultado));

    return $resultado;
}

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";

try {
    $conn = new mysqli($servername, $db_user, $db_pass, $database);
    $conn->set_charset('utf8mb4');
} catch (mysqli_sql_exception $e) {
    echo json_encode(["success" => false, "message" => "DB fail"]);
    exit;
}

$empresaId = intval($_GET['empresa'] ?? ($_SESSION['id_empresa'] ?? 0));

if ($empresaId <= 0) {
    echo json_encode(["success" => false, "message" => "Empresa no especificada."]);
    $conn->close();
    exit;
}

$modulo  = trim($_GET['modulo']  ?? '');
$usuario = trim($_GET['usuario'] ?? '');
$rol     = trim($_GET['rol']     ?? '');

$usuarioIdSesion = obtenerUsuarioIdSesion() ?? (int) ($_SESSION['usuario_id'] ?? 0);
$mapaAccesos     = construirMapaAccesosUsuario($conn, $usuarioIdSesion);
$filtrarPorAreas = debeFiltrarPorAccesos($mapaAccesos);
$areasPermitidas = array_values(array_filter(array_map('intval', array_keys($mapaAccesos)), function ($areaId) {
    return $areaId > 0;
}));

$sql = "SELECT l.fecha, l.hora, CONCAT(u.nombre,' ',u.apellido) AS usuario, u.rol, l.modulo, l.accion
        FROM log_control l
        JOIN usuario u ON l.id_usuario = u.id_usuario
        WHERE u.id_usuario IN (
            SELECT usuario_creador FROM empresa WHERE id_empresa = ?
            UNION
            SELECT id_usuario FROM usuario_empresa WHERE id_empresa = ?
        )";

$params = [$empresaId, $empresaId];
$types  = 'ii';

if ($modulo !== '') {
    $sql    .= " AND l.modulo = ?";
    $types  .= 's';
    $params[] = $modulo;
}

if ($usuario !== '') {
    $sql    .= " AND u.id_usuario = ?";
    $types  .= 'i';
    $params[] = intval($usuario);
}

if ($rol !== '') {
    $sql    .= " AND u.rol = ?";
    $types  .= 's';
    $params[] = $rol;
}

if ($filtrarPorAreas && !empty($areasPermitidas)) {
    $placeholders = implode(',', array_fill(0, count($areasPermitidas), '?'));
    $sql .= " AND (NOT EXISTS (SELECT 1 FROM usuario_area_zona uaz_all WHERE uaz_all.id_usuario = u.id_usuario)
                   OR EXISTS (SELECT 1 FROM usuario_area_zona uaz_perm WHERE uaz_perm.id_usuario = u.id_usuario AND uaz_perm.id_area IN ($placeholders)))";
    $types  .= str_repeat('i', count($areasPermitidas));
    foreach ($areasPermitidas as $areaId) {
        $params[] = (int) $areaId;
    }
}

$sql .= " ORDER BY l.fecha DESC, l.hora DESC";
$stmt = $conn->prepare($sql);
$stmt->bind_param($types, ...$params);
$stmt->execute();
$result = $stmt->get_result();

$logs = [];
while ($row = $result->fetch_assoc()) {
    $logs[] = $row;
}
$stmt->close();

$referencias = extraerReferenciasDesdeLogs($logs);
$productosInfo = obtenerDatosProductos($conn, $referencias['productos']);
$areasInfo = obtenerDatosAreas($conn, $referencias['areas']);
$zonasInfo = obtenerDatosZonas($conn, $referencias['zonas']);

foreach ($logs as &$log) {
    $accion = isset($log['accion']) && is_string($log['accion']) ? $log['accion'] : '';
    $log['accion'] = enriquecerAccionConDetalles($accion, $productosInfo, $areasInfo, $zonasInfo);
}
unset($log);

$usuariosSql = "SELECT DISTINCT u.id_usuario, CONCAT(u.nombre, ' ', u.apellido) AS nombre, u.rol
        FROM usuario u
        WHERE u.id_usuario IN (
            SELECT usuario_creador FROM empresa WHERE id_empresa = ?
            UNION
            SELECT id_usuario FROM usuario_empresa WHERE id_empresa = ?
        )";

if ($filtrarPorAreas && !empty($areasPermitidas)) {
    $usuariosPlaceholders = implode(',', array_fill(0, count($areasPermitidas), '?'));
    $usuariosSql .= " AND (NOT EXISTS (SELECT 1 FROM usuario_area_zona uaz_all WHERE uaz_all.id_usuario = u.id_usuario)
                   OR EXISTS (SELECT 1 FROM usuario_area_zona uaz_perm WHERE uaz_perm.id_usuario = u.id_usuario AND uaz_perm.id_area IN ($usuariosPlaceholders)))";
}

$usuariosSql .= " ORDER BY nombre";

$usuariosStmt = $conn->prepare($usuariosSql);

$usuariosParams = [$empresaId, $empresaId];
$usuariosTypes  = 'ii';

if ($filtrarPorAreas && !empty($areasPermitidas)) {
    $usuariosTypes .= str_repeat('i', count($areasPermitidas));
    foreach ($areasPermitidas as $areaId) {
        $usuariosParams[] = (int) $areaId;
    }
}

$usuariosStmt->bind_param($usuariosTypes, ...$usuariosParams);
$usuariosStmt->execute();
$usuariosResult = $usuariosStmt->get_result();

$usuarios = [];
while ($user = $usuariosResult->fetch_assoc()) {
    $usuarios[] = $user;
}

$usuariosStmt->close();
$conn->close();

echo json_encode([
    "success"  => true,
    "logs"     => $logs,
    "usuarios" => $usuarios
]);
