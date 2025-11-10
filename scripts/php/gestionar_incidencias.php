<?php
header('Content-Type: application/json');

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

$servername = 'localhost';
$dbUser = 'u296155119_Admin';
$dbPassword = '4Dmin123o';
$database = 'u296155119_OptiStock';

try {
    $conn = new mysqli($servername, $dbUser, $dbPassword, $database);
    $conn->set_charset('utf8mb4');
} catch (mysqli_sql_exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'No se pudo conectar a la base de datos.']);
    exit;
}

require_once __DIR__ . '/log_utils.php';
require_once __DIR__ . '/accesos_utils.php';
require_once __DIR__ . '/infraestructura_utils.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$rawInput = file_get_contents('php://input');
$payload = json_decode($rawInput, true);
if (!is_array($payload)) {
    $payload = [];
}

$empresaId = isset($_GET['empresa_id']) ? (int) $_GET['empresa_id'] : 0;
if ($empresaId <= 0) {
    $empresaId = isset($payload['empresa_id']) ? (int) $payload['empresa_id'] : 0;
}

if ($empresaId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Debes indicar la empresa a la que pertenece la incidencia.']);
    exit;
}

$usuarioId = obtenerUsuarioIdSesion();
if (!$usuarioId) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Tu sesión expiró. Inicia sesión nuevamente.']);
    exit;
}

$mapaAccesos = construirMapaAccesosUsuario($conn, $usuarioId);
$filtrarAccesos = debeFiltrarPorAccesos($mapaAccesos);

function fetchIncidenciaPorId(mysqli $conn, int $empresaId, int $incidenciaId): ?array
{
    $sql = 'SELECT i.id, i.descripcion, i.estado, i.creado_en, i.revisado_en, i.area_id, i.zona_id, '
        . 'a.nombre AS area_nombre, z.nombre AS zona_nombre, '
        . "CONCAT_WS(' ', u.nombre, u.apellido) AS reportado_por,"
        . "CONCAT_WS(' ', r.nombre, r.apellido) AS revisado_por "
        . 'FROM incidencias_infraestructura i '
        . 'LEFT JOIN areas a ON i.area_id = a.id '
        . 'LEFT JOIN zonas z ON i.zona_id = z.id '
        . 'LEFT JOIN usuario u ON i.id_usuario_reporta = u.id_usuario '
        . 'LEFT JOIN usuario r ON i.id_usuario_revisa = r.id_usuario '
        . 'WHERE i.id_empresa = ? AND i.id = ? LIMIT 1';

    $stmt = $conn->prepare($sql);
    $stmt->bind_param('ii', $empresaId, $incidenciaId);
    $stmt->execute();
    $result = $stmt->get_result();
    $incidencia = $result->fetch_assoc() ?: null;
    $stmt->close();

    if ($incidencia) {
        $incidencia['reportado_por'] = trim((string) ($incidencia['reportado_por'] ?? '')) ?: 'Usuario sin nombre';
        if (isset($incidencia['revisado_por'])) {
            $incidencia['revisado_por'] = trim((string) $incidencia['revisado_por']);
        }
    }

    return $incidencia;
}

switch ($method) {
    case 'GET':
        $estado = isset($_GET['estado']) ? trim((string) $_GET['estado']) : 'Pendiente';
        $estado = ucfirst(strtolower($estado));
        if (!in_array($estado, ['Pendiente', 'Revisado'], true)) {
            $estado = 'Pendiente';
        }

        $areaFiltro = isset($_GET['area_id']) ? (int) $_GET['area_id'] : 0;
        $zonaFiltro = isset($_GET['zona_id']) ? (int) $_GET['zona_id'] : 0;

        $sql = 'SELECT i.id, i.descripcion, i.estado, i.creado_en, i.revisado_en, i.area_id, i.zona_id, '
            . 'a.nombre AS area_nombre, z.nombre AS zona_nombre, '
            . "CONCAT_WS(' ', u.nombre, u.apellido) AS reportado_por "
            . 'FROM incidencias_infraestructura i '
            . 'LEFT JOIN areas a ON i.area_id = a.id '
            . 'LEFT JOIN zonas z ON i.zona_id = z.id '
            . 'LEFT JOIN usuario u ON i.id_usuario_reporta = u.id_usuario '
            . 'WHERE i.id_empresa = ? AND i.estado = ?';

        $tipos = 'is';
        $parametros = [$empresaId, $estado];

        if ($areaFiltro > 0) {
            $sql .= ' AND i.area_id = ?';
            $tipos .= 'i';
            $parametros[] = $areaFiltro;
        }

        if ($zonaFiltro > 0) {
            $sql .= ' AND i.zona_id = ?';
            $tipos .= 'i';
            $parametros[] = $zonaFiltro;
        }

        $sql .= ' ORDER BY i.creado_en DESC';

        $stmt = $conn->prepare($sql);
        $stmt->bind_param($tipos, ...$parametros);
        $stmt->execute();
        $resultado = $stmt->get_result();

        $incidencias = [];
        while ($fila = $resultado->fetch_assoc()) {
            $areaId = isset($fila['area_id']) ? (int) $fila['area_id'] : 0;
            $zonaId = isset($fila['zona_id']) ? (int) $fila['zona_id'] : 0;

            if ($filtrarAccesos) {
                $puedeVer = $zonaId
                    ? usuarioPuedeVerZona($mapaAccesos, $areaId ?: null, $zonaId)
                    : usuarioPuedeVerArea($mapaAccesos, $areaId ?: null);

                if (!$puedeVer) {
                    continue;
                }
            }

            $fila['reportado_por'] = trim((string) ($fila['reportado_por'] ?? '')) ?: 'Usuario sin nombre';
            $incidencias[] = $fila;
        }
        $stmt->close();

        echo json_encode(['success' => true, 'data' => $incidencias]);
        break;

    case 'POST':
        $descripcion = trim((string) ($payload['descripcion'] ?? ''));
        $areaId = isset($payload['area_id']) ? (int) $payload['area_id'] : 0;
        $zonaId = isset($payload['zona_id']) ? (int) $payload['zona_id'] : 0;

        if ($descripcion === '') {
            echo json_encode(['success' => false, 'message' => 'Describe la incidencia antes de guardarla.']);
            break;
        }

        if ($areaId <= 0 && $zonaId <= 0) {
            echo json_encode(['success' => false, 'message' => 'Selecciona el área o zona donde ocurrió la incidencia.']);
            break;
        }

        $areaNombre = null;
        $zonaNombre = null;
        $areaRelacionada = null;

        if ($zonaId > 0) {
            $stmtZona = $conn->prepare('SELECT z.id, z.area_id, z.nombre, a.nombre AS area_nombre FROM zonas z LEFT JOIN areas a ON z.area_id = a.id WHERE z.id = ? AND z.id_empresa = ? LIMIT 1');
            $stmtZona->bind_param('ii', $zonaId, $empresaId);
            $stmtZona->execute();
            $datosZona = $stmtZona->get_result()->fetch_assoc();
            $stmtZona->close();

            if (!$datosZona) {
                echo json_encode(['success' => false, 'message' => 'La zona seleccionada no pertenece a tu empresa.']);
                break;
            }

            $areaRelacionada = isset($datosZona['area_id']) ? (int) $datosZona['area_id'] : null;
            $zonaNombre = $datosZona['nombre'] ?? '';
            $areaNombre = $datosZona['area_nombre'] ?? '';

            if ($filtrarAccesos && !usuarioPuedeVerZona($mapaAccesos, $areaRelacionada, $zonaId)) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'No tienes permiso para registrar incidencias en esta zona.']);
                break;
            }
        } else {
            $stmtArea = $conn->prepare('SELECT nombre FROM areas WHERE id = ? AND id_empresa = ? LIMIT 1');
            $stmtArea->bind_param('ii', $areaId, $empresaId);
            $stmtArea->execute();
            $datosArea = $stmtArea->get_result()->fetch_assoc();
            $stmtArea->close();

            if (!$datosArea) {
                echo json_encode(['success' => false, 'message' => 'El área seleccionada no pertenece a tu empresa.']);
                break;
            }

            $areaRelacionada = $areaId;
            $areaNombre = $datosArea['nombre'] ?? '';

            if ($filtrarAccesos && !usuarioPuedeVerArea($mapaAccesos, $areaRelacionada)) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'No tienes permiso para registrar incidencias en esta área.']);
                break;
            }
        }

        $stmtDuplicado = null;
        if ($zonaId > 0) {
            $stmtDuplicado = $conn->prepare('SELECT COUNT(*) FROM incidencias_infraestructura WHERE id_empresa = ? AND zona_id = ? AND estado = "Pendiente"');
            $stmtDuplicado->bind_param('ii', $empresaId, $zonaId);
        } else {
            $stmtDuplicado = $conn->prepare('SELECT COUNT(*) FROM incidencias_infraestructura WHERE id_empresa = ? AND zona_id IS NULL AND area_id = ? AND estado = "Pendiente"');
            $stmtDuplicado->bind_param('ii', $empresaId, $areaRelacionada);
        }
        $stmtDuplicado->execute();
        $stmtDuplicado->bind_result($incidenciasPendientes);
        $stmtDuplicado->fetch();
        $stmtDuplicado->close();

        if ($incidenciasPendientes > 0) {
            echo json_encode(['success' => false, 'message' => 'Ya existe una incidencia pendiente de revisión para esta ubicación.']);
            break;
        }

        $stmtReporte = $conn->prepare('SELECT nombre, apellido FROM usuario WHERE id_usuario = ? LIMIT 1');
        $stmtReporte->bind_param('i', $usuarioId);
        $stmtReporte->execute();
        $datosUsuario = $stmtReporte->get_result()->fetch_assoc();
        $stmtReporte->close();
        $nombreReportante = trim(($datosUsuario['nombre'] ?? '') . ' ' . ($datosUsuario['apellido'] ?? '')) ?: 'Un usuario';

        $areaParam = $areaRelacionada;
        $zonaParam = $zonaId > 0 ? $zonaId : null;

        $stmtInsert = $conn->prepare('INSERT INTO incidencias_infraestructura (id_empresa, area_id, zona_id, id_usuario_reporta, descripcion, estado, creado_en) VALUES (?, ?, ?, ?, ?, "Pendiente", NOW())');
        $stmtInsert->bind_param('iiiis', $empresaId, $areaParam, $zonaParam, $usuarioId, $descripcion);
        $stmtInsert->execute();
        $incidenciaId = $stmtInsert->insert_id;
        $stmtInsert->close();

        $objetivoTexto = $zonaId > 0
            ? sprintf('la zona "%s"', $zonaNombre ?: 'sin nombre')
            : sprintf('el área "%s"', $areaNombre ?: 'sin nombre');
        $mensajeNotificacion = sprintf('%s reportó una incidencia en %s.', $nombreReportante, $objetivoTexto);
        $rutaDestino = 'area_almac/areas_zonas.html';

        $stmtNotificacion = $conn->prepare('INSERT INTO notificaciones (id_empresa, titulo, mensaje, tipo_destinatario, ruta_destino, estado, prioridad, id_usuario_creador) VALUES (?, ?, ?, "General", ?, "Pendiente", "Media", ?)');
        $tituloNotificacion = 'Incidencia reportada';
        $stmtNotificacion->bind_param('isssi', $empresaId, $tituloNotificacion, $mensajeNotificacion, $rutaDestino, $usuarioId);
        $stmtNotificacion->execute();
        $stmtNotificacion->close();

        registrarLog($conn, $usuarioId, 'Incidencias', 'Registro de incidencia en ' . $objetivoTexto);

        $incidencia = fetchIncidenciaPorId($conn, $empresaId, $incidenciaId);

        echo json_encode([
            'success' => true,
            'message' => 'Incidencia registrada correctamente.',
            'incidencia' => $incidencia
        ]);
        break;

    case 'PUT':
        $incidenciaId = isset($_GET['id']) ? (int) $_GET['id'] : 0;
        if ($incidenciaId <= 0) {
            $incidenciaId = isset($payload['id']) ? (int) $payload['id'] : 0;
        }

        if ($incidenciaId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Selecciona una incidencia válida para actualizar.']);
            break;
        }

        $incidencia = fetchIncidenciaPorId($conn, $empresaId, $incidenciaId);
        if (!$incidencia) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'La incidencia indicada no existe.']);
            break;
        }

        $areaId = isset($incidencia['area_id']) ? (int) $incidencia['area_id'] : 0;
        $zonaId = isset($incidencia['zona_id']) ? (int) $incidencia['zona_id'] : 0;

        if ($filtrarAccesos) {
            $puedeVer = $zonaId
                ? usuarioPuedeVerZona($mapaAccesos, $areaId ?: null, $zonaId)
                : usuarioPuedeVerArea($mapaAccesos, $areaId ?: null);

            if (!$puedeVer) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'No tienes permiso para modificar esta incidencia.']);
                break;
            }
        }

        if ($incidencia['estado'] === 'Revisado') {
            echo json_encode(['success' => true, 'message' => 'La incidencia ya estaba marcada como revisada.']);
            break;
        }

        $stmtUpdate = $conn->prepare('UPDATE incidencias_infraestructura SET estado = "Revisado", revisado_en = NOW(), id_usuario_revisa = ? WHERE id = ? AND id_empresa = ?');
        $stmtUpdate->bind_param('iii', $usuarioId, $incidenciaId, $empresaId);
        $stmtUpdate->execute();
        $stmtUpdate->close();

        $objetivoTexto = $zonaId > 0
            ? sprintf('la zona "%s"', $incidencia['zona_nombre'] ?? 'sin nombre')
            : sprintf('el área "%s"', $incidencia['area_nombre'] ?? 'sin nombre');

        registrarLog($conn, $usuarioId, 'Incidencias', 'Incidencia revisada en ' . $objetivoTexto);

        echo json_encode(['success' => true, 'message' => 'Incidencia marcada como revisada.']);
        break;

    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Método no permitido.']);
        break;
}

$conn->close();
