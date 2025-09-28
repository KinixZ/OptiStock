<?php
require_once __DIR__ . '/log_utils.php';

/**
 * Construye un mapa de accesos (áreas y zonas) para el usuario indicado.
 *
 * @param mysqli   $conn       Conexión activa a la base de datos.
 * @param int|null $usuarioId  Identificador del usuario. Si es null o <= 0, retorna un mapa vacío.
 *
 * @return array<int, null|int[]> Mapa donde la llave es el ID del área y el valor es:
 *                                - null  => acceso completo a todas las zonas del área.
 *                                - int[] => lista de IDs de zonas permitidas dentro del área.
 */
function construirMapaAccesosUsuario(mysqli $conn, ?int $usuarioId): array
{
    if (!$usuarioId || $usuarioId <= 0) {
        return [];
    }

    $mapa = [];

    $stmt = $conn->prepare('SELECT id_area, id_zona FROM usuario_area_zona WHERE id_usuario = ?');
    if (!$stmt) {
        return $mapa;
    }

    $stmt->bind_param('i', $usuarioId);
    $stmt->execute();
    $resultado = $stmt->get_result();

    while ($fila = $resultado->fetch_assoc()) {
        $areaId = isset($fila['id_area']) ? (int) $fila['id_area'] : 0;
        if ($areaId <= 0) {
            continue;
        }

        if (!array_key_exists($areaId, $mapa)) {
            $mapa[$areaId] = [];
        }

        if ($fila['id_zona'] === null) {
            $mapa[$areaId] = null;
            continue;
        }

        if (is_array($mapa[$areaId])) {
            $zonaId = (int) $fila['id_zona'];
            if ($zonaId > 0 && !in_array($zonaId, $mapa[$areaId], true)) {
                $mapa[$areaId][] = $zonaId;
            }
        }
    }

    $stmt->close();

    return $mapa;
}

/**
 * Indica si el mapa de accesos obliga a filtrar resultados.
 */
function debeFiltrarPorAccesos(array $mapaAccesos): bool
{
    return !empty($mapaAccesos);
}

/**
 * Determina si el usuario puede ver la información de un área específica.
 */
function usuarioPuedeVerArea(array $mapaAccesos, ?int $areaId): bool
{
    if (!debeFiltrarPorAccesos($mapaAccesos) || !$areaId) {
        return true;
    }

    return array_key_exists($areaId, $mapaAccesos);
}

/**
 * Determina si el usuario puede ver la información asociada a una zona.
 */
function usuarioPuedeVerZona(array $mapaAccesos, ?int $areaId, ?int $zonaId): bool
{
    if (!debeFiltrarPorAccesos($mapaAccesos)) {
        return true;
    }

    if (!$areaId) {
        // Zonas sin área asociada quedan visibles cuando no hay un área que validar.
        return true;
    }

    if (!array_key_exists($areaId, $mapaAccesos)) {
        return false;
    }

    $zonasPermitidas = $mapaAccesos[$areaId];

    if ($zonasPermitidas === null) {
        return true;
    }

    if (!$zonaId) {
        return false;
    }

    return in_array((int) $zonaId, $zonasPermitidas, true);
}
