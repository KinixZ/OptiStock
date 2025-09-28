<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

$servername = "localhost";
$username   = "u296155119_Admin";
$password   = "4Dmin123o";
$database   = "u296155119_OptiStock";

$conn = new mysqli($servername, $username, $password, $database);

require_once __DIR__ . '/accesos_utils.php';

if ($conn->connect_error) {
    echo json_encode([
        'success' => false,
        'message' => 'Error de conexión a la base de datos.'
    ]);
    exit;
}

$conn->set_charset('utf8mb4');

if (!isset($_SESSION['usuario_id'])) {
    echo json_encode([
        'success' => false,
        'message' => 'Sesión no válida. Inicia sesión nuevamente.'
    ]);
    $conn->close();
    exit;
}

$userId = (int) $_SESSION['usuario_id'];
$idEmpresa = isset($_GET['id_empresa']) ? (int) $_GET['id_empresa'] : 0;

if ($idEmpresa <= 0) {
    $empresaStmt = $conn->prepare(
        "SELECT e.id_empresa
         FROM empresa e
         LEFT JOIN usuario_empresa ue ON ue.id_empresa = e.id_empresa
         WHERE e.usuario_creador = ? OR ue.id_usuario = ?
         ORDER BY e.fecha_registro DESC
         LIMIT 1"
    );

    if ($empresaStmt) {
        $empresaStmt->bind_param('ii', $userId, $userId);
        $empresaStmt->execute();
        $empresaStmt->bind_result($empresaId);
        if ($empresaStmt->fetch()) {
            $idEmpresa = (int) $empresaId;
        }
        $empresaStmt->close();
    }
}

if ($idEmpresa <= 0) {
    echo json_encode([
        'success' => false,
        'message' => 'No se encontró una empresa asociada a tu usuario.'
    ]);
    $conn->close();
    exit;
}

$mapaAccesos = construirMapaAccesosUsuario($conn, $userId);
$filtrarPorAccesos = debeFiltrarPorAccesos($mapaAccesos);

function sanitizeText(?string $value): string {
    return htmlspecialchars($value ?? '', ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function formatDateTime(?string $value): string {
    if (!$value) {
        return '';
    }

    try {
        $date = new DateTime($value);
        return $date->format('d/m/Y H:i');
    } catch (Exception $e) {
        return $value;
    }
}

$results = [];

$productosSql = "SELECT p.id, p.nombre, p.descripcion, p.stock, p.last_movimiento, p.last_tipo,
                        z.nombre AS zona_nombre, z.id AS zona_id, a.id AS area_id
                 FROM productos p
                 LEFT JOIN zonas z ON z.id = p.zona_id
                 LEFT JOIN areas a ON a.id = z.area_id
                 WHERE p.empresa_id = ?
                 ORDER BY p.nombre ASC";

if ($productosStmt = $conn->prepare($productosSql)) {
    $productosStmt->bind_param('i', $idEmpresa);
    $productosStmt->execute();
    $productosResult = $productosStmt->get_result();

    while ($row = $productosResult->fetch_assoc()) {
        $areaId = isset($row['area_id']) ? (int) $row['area_id'] : 0;
        $zonaId = isset($row['zona_id']) ? (int) $row['zona_id'] : 0;

        if ($filtrarPorAccesos && !usuarioPuedeVerZona($mapaAccesos, $areaId ?: null, $zonaId ?: null)) {
            continue;
        }

        $descripcionPartes = [];
        $descripcionPartes[] = 'Stock: ' . (int) $row['stock'] . ' unidades';
        if (!empty($row['zona_nombre'])) {
            $descripcionPartes[] = 'Zona ' . sanitizeText($row['zona_nombre']);
        }
        if (!empty($row['last_movimiento'])) {
            $descripcionPartes[] = 'Último movimiento ' . formatDateTime($row['last_movimiento']);
        }

        $descripcion = implode(' · ', array_filter($descripcionPartes));
        if (!$descripcion && !empty($row['descripcion'])) {
            $descripcion = sanitizeText($row['descripcion']);
        }

        $results[] = [
            'categoria' => 'Productos',
            'titulo' => sanitizeText($row['nombre']),
            'descripcion' => $descripcion,
            'accion' => 'Ver en inventario',
            'url' => '../gest_inve/inventario_basico.html'
        ];
    }

    $productosStmt->close();
}

$movimientosSql = "SELECT m.id, m.tipo, m.cantidad, m.fecha_movimiento, p.nombre AS producto_nombre,
                          z.id AS zona_id, a.id AS area_id
                   FROM movimientos m
                   LEFT JOIN productos p ON p.id = m.producto_id
                   LEFT JOIN zonas z ON p.zona_id = z.id
                   LEFT JOIN areas a ON z.area_id = a.id
                   WHERE m.empresa_id = ?
                   ORDER BY m.fecha_movimiento DESC
                   LIMIT 50";

if ($movimientosStmt = $conn->prepare($movimientosSql)) {
    $movimientosStmt->bind_param('i', $idEmpresa);
    $movimientosStmt->execute();
    $movimientosResult = $movimientosStmt->get_result();

    while ($row = $movimientosResult->fetch_assoc()) {
        $areaId = isset($row['area_id']) ? (int) $row['area_id'] : 0;
        $zonaId = isset($row['zona_id']) ? (int) $row['zona_id'] : 0;

        if ($filtrarPorAccesos && !usuarioPuedeVerZona($mapaAccesos, $areaId ?: null, $zonaId ?: null)) {
            continue;
        }

        $titulo = ucfirst($row['tipo'] ?? 'movimiento') . ' #' . str_pad((string) $row['id'], 4, '0', STR_PAD_LEFT);
        $descripcionPartes = [];

        if (!empty($row['producto_nombre'])) {
            $descripcionPartes[] = 'Producto: ' . sanitizeText($row['producto_nombre']);
        }

        $descripcionPartes[] = 'Cantidad: ' . (int) $row['cantidad'];

        if (!empty($row['fecha_movimiento'])) {
            $descripcionPartes[] = formatDateTime($row['fecha_movimiento']);
        }

        $results[] = [
            'categoria' => 'Movimientos',
            'titulo' => sanitizeText($titulo),
            'descripcion' => implode(' · ', array_filter($descripcionPartes)),
            'accion' => 'Revisar movimiento',
            'url' => '../control_log/log.html'
        ];
    }

    $movimientosStmt->close();
}

$usuariosSql = "SELECT DISTINCT u.id_usuario, u.nombre, u.apellido, u.rol, u.correo
                FROM usuario u
                LEFT JOIN usuario_empresa ue ON ue.id_usuario = u.id_usuario
                LEFT JOIN empresa e ON e.usuario_creador = u.id_usuario
                WHERE ue.id_empresa = ? OR e.id_empresa = ?
                ORDER BY u.nombre ASC, u.apellido ASC";

if ($usuariosStmt = $conn->prepare($usuariosSql)) {
    $usuariosStmt->bind_param('ii', $idEmpresa, $idEmpresa);
    $usuariosStmt->execute();
    $usuariosResult = $usuariosStmt->get_result();

    while ($row = $usuariosResult->fetch_assoc()) {
        $nombreCompleto = trim(($row['nombre'] ?? '') . ' ' . ($row['apellido'] ?? ''));
        $descripcionPartes = [];
        if (!empty($row['rol'])) {
            $descripcionPartes[] = 'Rol: ' . sanitizeText($row['rol']);
        }
        if (!empty($row['correo'])) {
            $descripcionPartes[] = sanitizeText($row['correo']);
        }

        $results[] = [
            'categoria' => 'Usuarios',
            'titulo' => sanitizeText($nombreCompleto ?: 'Usuario sin nombre'),
            'descripcion' => implode(' · ', $descripcionPartes),
            'accion' => 'Gestionar usuario',
            'url' => '../admin_usuar/administracion_usuarios.html'
        ];
    }

    $usuariosStmt->close();
}

$areasSql = "SELECT id, nombre, descripcion, volumen FROM areas WHERE id_empresa = ? ORDER BY nombre ASC";
if ($areasStmt = $conn->prepare($areasSql)) {
    $areasStmt->bind_param('i', $idEmpresa);
    $areasStmt->execute();
    $areasResult = $areasStmt->get_result();

    while ($row = $areasResult->fetch_assoc()) {
        if ($filtrarPorAccesos && !usuarioPuedeVerArea($mapaAccesos, isset($row['id']) ? (int) $row['id'] : 0)) {
            continue;
        }

        $descripcionPartes = [];
        if (!empty($row['descripcion'])) {
            $descripcionPartes[] = sanitizeText($row['descripcion']);
        }
        if (!empty($row['volumen'])) {
            $descripcionPartes[] = 'Volumen: ' . sanitizeText($row['volumen']);
        }

        $results[] = [
            'categoria' => 'Áreas',
            'titulo' => sanitizeText($row['nombre']),
            'descripcion' => implode(' · ', array_filter($descripcionPartes)),
            'accion' => 'Gestionar áreas',
            'url' => '../area_almac_v2/gestion_areas_zonas.html'
        ];
    }

    $areasStmt->close();
}

$zonasSql = "SELECT id, area_id, nombre, descripcion, tipo_almacenamiento FROM zonas WHERE id_empresa = ? ORDER BY nombre ASC";
if ($zonasStmt = $conn->prepare($zonasSql)) {
    $zonasStmt->bind_param('i', $idEmpresa);
    $zonasStmt->execute();
    $zonasResult = $zonasStmt->get_result();

    while ($row = $zonasResult->fetch_assoc()) {
        $areaId = isset($row['area_id']) ? (int) $row['area_id'] : 0;
        $zonaId = isset($row['id']) ? (int) $row['id'] : 0;

        if ($filtrarPorAccesos && !usuarioPuedeVerZona($mapaAccesos, $areaId ?: null, $zonaId ?: null)) {
            continue;
        }

        $descripcionPartes = [];
        if (!empty($row['descripcion'])) {
            $descripcionPartes[] = sanitizeText($row['descripcion']);
        }
        if (!empty($row['tipo_almacenamiento'])) {
            $descripcionPartes[] = 'Tipo: ' . sanitizeText($row['tipo_almacenamiento']);
        }

        $results[] = [
            'categoria' => 'Zonas',
            'titulo' => sanitizeText($row['nombre']),
            'descripcion' => implode(' · ', array_filter($descripcionPartes)),
            'accion' => 'Gestionar zonas',
            'url' => '../area_almac_v2/gestion_areas_zonas.html'
        ];
    }

    $zonasStmt->close();
}

$conn->close();

echo json_encode([
    'success' => true,
    'results' => $results
], JSON_UNESCAPED_UNICODE);
