<?php
require_once __DIR__ . '/log_utils.php';

function obtenerCapacidadMaximaAlmacen(mysqli $conn, int $empresaId): float
{
    $stmt = $conn->prepare('SELECT capacidad_maxima_m3 FROM empresa WHERE id_empresa = ?');
    $stmt->bind_param('i', $empresaId);
    $stmt->execute();
    $stmt->bind_result($capacidadMaxima);
    $stmt->fetch();
    $stmt->close();

    if ($capacidadMaxima === null) {
        return 0.0;
    }

    return (float) $capacidadMaxima;
}

function obtenerUmbralAlertaCapacidad(mysqli $conn, int $empresaId): float
{
    $stmt = $conn->prepare('SELECT umbral_alerta_capacidad FROM empresa WHERE id_empresa = ?');
    $stmt->bind_param('i', $empresaId);
    $stmt->execute();
    $stmt->bind_result($umbral);
    $stmt->fetch();
    $stmt->close();

    if ($umbral === null || (float) $umbral <= 0) {
        return 90.0;
    }

    return (float) $umbral;
}

function obtenerVolumenTotalZonas(mysqli $conn, int $areaId, ?int $zonaExcluir = null): float
{
    if ($zonaExcluir) {
        $stmt = $conn->prepare('SELECT COALESCE(SUM(volumen), 0) FROM zonas WHERE area_id = ? AND id <> ?');
        $stmt->bind_param('ii', $areaId, $zonaExcluir);
    } else {
        $stmt = $conn->prepare('SELECT COALESCE(SUM(volumen), 0) FROM zonas WHERE area_id = ?');
        $stmt->bind_param('i', $areaId);
    }
    $stmt->execute();
    $stmt->bind_result($total);
    $stmt->fetch();
    $stmt->close();

    return (float) $total;
}

function calcularOcupacionZona(mysqli $conn, int $zonaId): ?array
{
    $stmt = $conn->prepare('SELECT id, nombre, volumen, id_empresa, area_id FROM zonas WHERE id = ?');
    $stmt->bind_param('i', $zonaId);
    $stmt->execute();
    $zona = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$zona) {
        return null;
    }

    $stmt = $conn->prepare('SELECT COALESCE(SUM(GREATEST(stock,0) * COALESCE(dim_x,0) * COALESCE(dim_y,0) * COALESCE(dim_z,0)), 0), COUNT(*) FROM productos WHERE zona_id = ?');
    $stmt->bind_param('i', $zonaId);
    $stmt->execute();
    $stmt->bind_result($ocupado, $productos);
    $stmt->fetch();
    $stmt->close();

    $ocupado = (float) $ocupado;
    $total = (float) $zona['volumen'];
    $disponible = max($total - $ocupado, 0);
    $porcentaje = $total > 0 ? min(100, ($ocupado / $total) * 100) : 0;

    return [
        'zona' => $zona,
        'capacidad_utilizada' => $ocupado,
        'capacidad_disponible' => $disponible,
        'porcentaje_ocupacion' => $porcentaje,
        'productos_registrados' => (int) $productos,
    ];
}

function actualizarOcupacionZona(mysqli $conn, int $zonaId): void
{
    $datos = calcularOcupacionZona($conn, $zonaId);
    if (!$datos) {
        return;
    }

    $update = $conn->prepare('UPDATE zonas SET capacidad_utilizada = ?, porcentaje_ocupacion = ?, productos_registrados = ? WHERE id = ?');
    $update->bind_param('ddii', $datos['capacidad_utilizada'], $datos['porcentaje_ocupacion'], $datos['productos_registrados'], $zonaId);
    $update->execute();
    $update->close();

    $zona = $datos['zona'];
    if (!empty($zona['area_id'])) {
        actualizarOcupacionArea($conn, (int) $zona['area_id']);
    }

    $umbral = obtenerUmbralAlertaCapacidad($conn, (int) $zona['id_empresa']);
    if ($datos['porcentaje_ocupacion'] >= $umbral) {
        asegurarNotificacionSaturacion($conn, (int) $zona['id_empresa'], $zona['nombre'], $datos['porcentaje_ocupacion']);
    }
}

function actualizarOcupacionArea(mysqli $conn, int $areaId): void
{
    $stmt = $conn->prepare('SELECT id, nombre, volumen, id_empresa FROM areas WHERE id = ?');
    $stmt->bind_param('i', $areaId);
    $stmt->execute();
    $area = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$area) {
        return;
    }

    $stmt = $conn->prepare('SELECT COALESCE(SUM(capacidad_utilizada), 0), COALESCE(SUM(productos_registrados), 0) FROM zonas WHERE area_id = ?');
    $stmt->bind_param('i', $areaId);
    $stmt->execute();
    $stmt->bind_result($ocupado, $productos);
    $stmt->fetch();
    $stmt->close();

    $ocupado = (float) $ocupado;
    $total = (float) $area['volumen'];
    $porcentaje = $total > 0 ? min(100, ($ocupado / $total) * 100) : 0;

    $update = $conn->prepare('UPDATE areas SET capacidad_utilizada = ?, porcentaje_ocupacion = ?, productos_registrados = ? WHERE id = ?');
    $update->bind_param('ddii', $ocupado, $porcentaje, $productos, $areaId);
    $update->execute();
    $update->close();
}

function asegurarNotificacionSaturacion(mysqli $conn, int $empresaId, string $zonaNombre, float $porcentaje): void
{
    $ruta = 'area_almac_v2/gestion_areas_zonas.html';
    $like = '%' . $zonaNombre . '%';
    $stmt = $conn->prepare('SELECT id FROM notificaciones WHERE id_empresa = ? AND ruta_destino = ? AND mensaje LIKE ? AND estado IN ("Pendiente", "Enviada") LIMIT 1');
    $stmt->bind_param('iss', $empresaId, $ruta, $like);
    $stmt->execute();
    $stmt->store_result();

    if ($stmt->num_rows > 0) {
        $stmt->close();
        return;
    }
    $stmt->close();

    $titulo = 'Zona con alta ocupación';
    $mensaje = sprintf('La zona "%s" se encuentra al %.2f%% de su capacidad. Revisa las reasignaciones necesarias.', $zonaNombre, $porcentaje);

    $insert = $conn->prepare('INSERT INTO notificaciones (id_empresa, titulo, mensaje, tipo_destinatario, ruta_destino, estado, prioridad) VALUES (?, ?, ?, "General", ?, "Pendiente", "Alta")');
    $insert->bind_param('isss', $empresaId, $titulo, $mensaje, $ruta);
    $insert->execute();
    $insert->close();
}

function validarCapacidadContraAlmacen(mysqli $conn, int $empresaId, float $volumen): bool
{
    $capacidad = obtenerCapacidadMaximaAlmacen($conn, $empresaId);
    if ($capacidad <= 0) {
        return true;
    }
    return $volumen <= $capacidad;
}

function obtenerCapacidadDisponibleArea(mysqli $conn, int $areaId, ?int $zonaExcluir = null): float
{
    $stmt = $conn->prepare('SELECT volumen FROM areas WHERE id = ?');
    $stmt->bind_param('i', $areaId);
    $stmt->execute();
    $stmt->bind_result($volumenArea);
    $stmt->fetch();
    $stmt->close();

    if ($volumenArea === null) {
        return 0.0;
    }

    $totalZonas = obtenerVolumenTotalZonas($conn, $areaId, $zonaExcluir);
    return max(((float) $volumenArea) - $totalZonas, 0);
}
