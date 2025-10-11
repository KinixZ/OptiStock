<?php
require_once __DIR__ . '/log_utils.php';
require_once __DIR__ . '/infraestructura_utils.php';

/**
 * Determina si las tablas necesarias para el flujo de solicitudes están disponibles.
 */
function opti_solicitudes_habilitadas(mysqli $conn)
{
    static $cache = null;

    if ($cache !== null) {
        return $cache;
    }

    try {
        $resSolicitudes = $conn->query("SHOW TABLES LIKE 'solicitudes_cambios'");
        if ($resSolicitudes === false) {
            $cache = false;
            return $cache;
        }

        $existeSolicitudes = $resSolicitudes->num_rows > 0;
        $resSolicitudes->close();

        if (!$existeSolicitudes) {
            $cache = false;
            return $cache;
        }

        $resHistorial = $conn->query("SHOW TABLES LIKE 'solicitudes_cambios_historial'");
        if ($resHistorial === false) {
            $cache = false;
            return $cache;
        }

        $cache = $resHistorial->num_rows > 0;
        $resHistorial->close();
    } catch (Throwable $e) {
        $cache = false;
    }

    if ($cache === false) {
        error_log('Sistema de solicitudes deshabilitado: tablas necesarias no disponibles.');
    }

    return $cache;
}

function opti_get_project_root()
{
    static $root = null;
    if ($root !== null) {
        return $root;
    }

    $documentRoot = $_SERVER['DOCUMENT_ROOT'] ?? '';
    if ($documentRoot && is_dir($documentRoot)) {
        $root = rtrim($documentRoot, DIRECTORY_SEPARATOR);
        return $root;
    }

    $root = realpath(__DIR__ . '/..');
    if ($root === false) {
        $root = __DIR__;
    }

    return $root;
}

function opti_normalize_path($path)
{
    $path = str_replace('\\', '/', $path ?? '');
    return preg_replace('#/{2,}#', '/', $path);
}

function opti_resolver_id_solicitante(array ...$contextos)
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        @session_start();
    }

    $sessionId = isset($_SESSION['usuario_id']) ? (int) $_SESSION['usuario_id'] : 0;
    if ($sessionId > 0) {
        return $sessionId;
    }

    $headerId = isset($_SERVER['HTTP_X_USUARIO_ID']) ? (int) $_SERVER['HTTP_X_USUARIO_ID'] : 0;
    if ($headerId > 0) {
        return $headerId;
    }

    $fuentes = $contextos;
    $fuentes[] = isset($_POST) && is_array($_POST) ? $_POST : [];
    $fuentes[] = isset($_GET) && is_array($_GET) ? $_GET : [];

    $claves = [
        'id_solicitante',
        'idSolicitante',
        'id_usuario_solicitante',
        'solicitante_id',
        'solicitanteId',
        'usuario_id',
        'usuarioId',
        'id_usuario',
        'usuario',
        'idUser'
    ];

    foreach ($fuentes as $fuente) {
        if (!is_array($fuente)) {
            continue;
        }

        foreach ($claves as $clave) {
            if (!array_key_exists($clave, $fuente)) {
                continue;
            }

            $valorBruto = $fuente[$clave];
            if (is_array($valorBruto)) {
                continue;
            }

            if (is_numeric($valorBruto)) {
                $valor = (int) $valorBruto;
            } else {
                $filtrado = preg_replace('/[^0-9\-]+/', '', (string) $valorBruto);
                $valor = (int) $filtrado;
            }

            if ($valor > 0) {
                return $valor;
            }
        }
    }

    return 0;
}

function opti_resolver_id_empresa(mysqli $conn, ?int $idSolicitante = null, array ...$contextos)
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        @session_start();
    }

    $fuentes = $contextos;
    $fuentes[] = isset($_POST) && is_array($_POST) ? $_POST : [];
    $fuentes[] = isset($_GET) && is_array($_GET) ? $_GET : [];
    $fuentes[] = isset($_SESSION) && is_array($_SESSION) ? $_SESSION : [];

    $claves = [
        'id_empresa',
        'empresa_id',
        'idEmpresa',
        'empresaId',
        'idCompany',
        'company_id'
    ];

    foreach ($fuentes as $fuente) {
        if (!is_array($fuente)) {
            continue;
        }

        foreach ($claves as $clave) {
            if (!array_key_exists($clave, $fuente)) {
                continue;
            }

            $valorBruto = $fuente[$clave];
            if (is_array($valorBruto)) {
                continue;
            }

            if (is_numeric($valorBruto)) {
                $valor = (int) $valorBruto;
            } else {
                $filtrado = preg_replace('/[^0-9\-]+/', '', (string) $valorBruto);
                $valor = (int) $filtrado;
            }

            if ($valor > 0) {
                return $valor;
            }
        }
    }

    if ($idSolicitante !== null && $idSolicitante > 0) {
        try {
            $stmt = $conn->prepare('SELECT id_empresa FROM usuario_empresa WHERE id_usuario = ? LIMIT 1');
            if ($stmt) {
                $stmt->bind_param('i', $idSolicitante);
                $stmt->execute();
                $resultado = $stmt->get_result()->fetch_assoc();
                $stmt->close();

                if ($resultado && isset($resultado['id_empresa'])) {
                    $valor = (int) $resultado['id_empresa'];
                    if ($valor > 0) {
                        return $valor;
                    }
                }
            }
        } catch (Throwable $e) {
            // Ignorar y devolver 0 como último recurso.
        }
    }

    return 0;
}

function opti_usuario_actual_es_admin()
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        @session_start();
    }

    if (!isset($_SESSION['usuario_rol'])) {
        return false;
    }

    $rol = trim((string) $_SESSION['usuario_rol']);

    return $rol !== '' && strcasecmp($rol, 'Administrador') === 0;
}

function opti_guardar_archivo_pendiente(array $file, string $categoria, string $prefijo = '')
{
    if (empty($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
        return null;
    }

    $extension = strtolower(pathinfo($file['name'] ?? '', PATHINFO_EXTENSION));
    if (!$extension) {
        return null;
    }

    $categoria = preg_replace('/[^a-z0-9_-]+/i', '_', $categoria ?: 'general');
    $prefijo = preg_replace('/[^a-z0-9_-]+/i', '_', $prefijo ?: 'archivo');

    $root = opti_get_project_root();
    $pendientesDir = $root . '/images/pending/' . $categoria;
    if (!is_dir($pendientesDir) && !mkdir($pendientesDir, 0755, true)) {
        return null;
    }

    $nombreArchivo = sprintf('%s_%s.%s', $prefijo, uniqid('', true), $extension);
    $destino = $pendientesDir . '/' . $nombreArchivo;

    if (!move_uploaded_file($file['tmp_name'], $destino)) {
        return null;
    }

    $rutaRelativa = 'images/pending/' . $categoria . '/' . $nombreArchivo;

    return [
        'ruta_relativa' => opti_normalize_path($rutaRelativa),
        'extension' => $extension,
        'nombre_original' => $file['name'] ?? $nombreArchivo,
    ];
}

function opti_eliminar_archivo(string $rutaRelativa)
{
    if (!$rutaRelativa) {
        return;
    }

    $root = opti_get_project_root();
    $ruta = $root . '/' . ltrim($rutaRelativa, '/');
    if (is_file($ruta)) {
        @unlink($ruta);
    }
}

function opti_mover_archivo_desde_pendiente(?string $rutaRelativa, string $destDir, string $nombreFinal)
{
    if (!$rutaRelativa) {
        return null;
    }

    $root = opti_get_project_root();
    $origen = $root . '/' . ltrim($rutaRelativa, '/');
    if (!is_file($origen)) {
        return null;
    }

    $destinoDir = $root . '/' . trim($destDir, '/');
    if (!is_dir($destinoDir) && !mkdir($destinoDir, 0755, true)) {
        return null;
    }

    $extension = pathinfo($nombreFinal, PATHINFO_EXTENSION);
    if (!$extension) {
        $extension = pathinfo($origen, PATHINFO_EXTENSION);
        $nombreFinal .= '.' . $extension;
    }

    $destino = $destinoDir . '/' . $nombreFinal;

    if (!rename($origen, $destino)) {
        return null;
    }

    return opti_normalize_path(trim($destDir, '/') . '/' . $nombreFinal);
}

function opti_registrar_solicitud(mysqli $conn, array $datos)
{
    $idEmpresa = (int)($datos['id_empresa'] ?? 0);
    $idSolicitante = (int)($datos['id_solicitante'] ?? 0);
    if ($idSolicitante <= 0) {
        $idSolicitante = opti_resolver_id_solicitante($datos, $datos['payload'] ?? []);
        $datos['id_solicitante'] = $idSolicitante;
    }
    if ($idEmpresa <= 0) {
        $idEmpresa = opti_resolver_id_empresa($conn, $idSolicitante, $datos, $datos['payload'] ?? []);
        $datos['id_empresa'] = $idEmpresa;
    }
    $modulo = trim($datos['modulo'] ?? 'General');
    $tipo = trim($datos['tipo_accion'] ?? 'accion');
    $resumen = trim($datos['resumen'] ?? 'Solicitud de cambio');
    $descripcion = trim($datos['descripcion'] ?? '');
    $payload = $datos['payload'] ?? [];

    if (!$idEmpresa || !$idSolicitante || !$modulo || !$tipo || !$resumen) {
        return ['success' => false, 'message' => 'Datos incompletos para registrar la solicitud.'];
    }

    $payloadJson = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($payloadJson === false) {
        return ['success' => false, 'message' => 'No fue posible serializar los datos de la solicitud.'];
    }

    $stmt = $conn->prepare('INSERT INTO solicitudes_cambios (id_empresa, id_solicitante, modulo, tipo_accion, resumen, descripcion, payload, estado) VALUES (?, ?, ?, ?, ?, ?, ?, "en_proceso")');
    if (!$stmt) {
        return ['success' => false, 'message' => 'No fue posible preparar el registro de solicitud.'];
    }

    $stmt->bind_param('iisssss', $idEmpresa, $idSolicitante, $modulo, $tipo, $resumen, $descripcion, $payloadJson);

    try {
        $stmt->execute();
        $idSolicitud = $stmt->insert_id;
        $stmt->close();
        return [
            'success' => true,
            'id' => $idSolicitud,
            'estado' => 'en_proceso'
        ];
    } catch (mysqli_sql_exception $e) {
        error_log('Error al registrar solicitud: ' . $e->getMessage());
        $stmt->close();
        return ['success' => false, 'message' => 'No fue posible registrar la solicitud.'];
    }
}

function opti_responder_solicitud_creada(array $resultado)
{
    if (!headers_sent()) {
        header('Content-Type: application/json');
    }

    if (empty($resultado['success'])) {
        echo json_encode([
            'success' => false,
            'message' => $resultado['message'] ?? 'No se pudo registrar la solicitud.'
        ]);
        exit;
    }

    echo json_encode([
        'success' => true,
        'solicitud' => [
            'id' => $resultado['id'],
            'estado' => $resultado['estado'] ?? 'en_proceso'
        ],
        'message' => 'La solicitud fue registrada y está en revisión.'
    ]);
    exit;
}

function opti_obtener_solicitud(mysqli $conn, int $id)
{
    $stmt = $conn->prepare('SELECT * FROM solicitudes_cambios WHERE id = ? LIMIT 1');
    if (!$stmt) {
        return null;
    }

    $stmt->bind_param('i', $id);
    $stmt->execute();
    $res = $stmt->get_result();
    $solicitud = $res->fetch_assoc() ?: null;
    $stmt->close();

    if ($solicitud && isset($solicitud['payload'])) {
        $payload = json_decode($solicitud['payload'], true);
        $solicitud['payload'] = is_array($payload) ? $payload : [];
    }

    return $solicitud;
}

function opti_mover_a_historial(mysqli $conn, array $solicitud, string $estadoFinal, int $idRevisor, ?string $comentario, array $resultado = [])
{
    $payloadJson = json_encode($solicitud['payload'] ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $resultadoJson = json_encode($resultado, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    $stmt = $conn->prepare('INSERT INTO solicitudes_cambios_historial (solicitud_id, id_empresa, id_solicitante, id_revisor, modulo, tipo_accion, resumen, descripcion, payload, estado, comentario, fecha_creacion, resultado)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    if (!$stmt) {
        return false;
    }

    $fechaCreacion = $solicitud['fecha_creacion'] ?? null;
    $stmt->bind_param(
        'iiiisssssssss',
        $solicitud['id'],
        $solicitud['id_empresa'],
        $solicitud['id_solicitante'],
        $idRevisor,
        $solicitud['modulo'],
        $solicitud['tipo_accion'],
        $solicitud['resumen'],
        $solicitud['descripcion'],
        $payloadJson,
        $estadoFinal,
        $comentario,
        $fechaCreacion,
        $resultadoJson
    );

    try {
        $stmt->execute();
        $stmt->close();
        $deleteStmt = $conn->prepare('DELETE FROM solicitudes_cambios WHERE id = ?');
        if ($deleteStmt) {
            $deleteStmt->bind_param('i', $solicitud['id']);
            $deleteStmt->execute();
            $deleteStmt->close();
        }
        return true;
    } catch (mysqli_sql_exception $e) {
        error_log('Error al mover solicitud al historial: ' . $e->getMessage());
        $stmt->close();
        return false;
    }
}

function opti_descartar_archivos_pendientes(array $payload)
{
    $rutas = [];
    if (isset($payload['foto_pendiente'])) {
        $rutas[] = $payload['foto_pendiente'];
    }
    if (isset($payload['logo_pendiente'])) {
        $rutas[] = $payload['logo_pendiente'];
    }
    if (isset($payload['archivos_pendientes']) && is_array($payload['archivos_pendientes'])) {
        $rutas = array_merge($rutas, $payload['archivos_pendientes']);
    }

    foreach ($rutas as $ruta) {
        opti_eliminar_archivo($ruta);
    }
}

function opti_respuesta_error($mensaje)
{
    if (!headers_sent()) {
        header('Content-Type: application/json');
    }
    echo json_encode(['success' => false, 'message' => $mensaje]);
    exit;
}

function opti_aplicar_usuario_actualizar(mysqli $conn, array $payload, int $idRevisor)
{
    $idUsuario = (int)($payload['id_usuario'] ?? 0);
    if ($idUsuario <= 0) {
        return ['success' => false, 'message' => 'La solicitud no contiene un usuario válido.'];
    }

    $nombre = trim($payload['nombre'] ?? '');
    $apellido = trim($payload['apellido'] ?? '');
    $telefono = trim($payload['telefono'] ?? '');
    $correo = trim($payload['correo'] ?? '');
    $contrasenaHash = $payload['contrasena_hash'] ?? null;
    $actualizarPassword = $contrasenaHash && strlen($contrasenaHash) > 0;

    $sql = 'UPDATE usuario SET nombre = ?, apellido = ?, telefono = ?, correo = ?';
    $types = 'ssss';
    $params = [$nombre, $apellido, $telefono, $correo];

    if ($actualizarPassword) {
        $sql .= ', contrasena = ?';
        $types .= 's';
        $params[] = $contrasenaHash;
    }

    $sql .= ' WHERE id_usuario = ?';
    $types .= 'i';
    $params[] = $idUsuario;

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        return ['success' => false, 'message' => 'No se pudo preparar la actualización del usuario.'];
    }

    $stmt->bind_param($types, ...$params);

    try {
        $stmt->execute();
        $stmt->close();
    } catch (mysqli_sql_exception $e) {
        $stmt->close();
        return ['success' => false, 'message' => 'No se pudo aplicar la actualización del usuario.'];
    }

    $rutaFinal = null;
    if (!empty($payload['foto_pendiente'])) {
        $extension = pathinfo($payload['foto_pendiente'], PATHINFO_EXTENSION) ?: 'png';
        $nombreFinal = 'perfil_' . $idUsuario . '_' . time() . '.' . $extension;
        $rutaFinal = opti_mover_archivo_desde_pendiente($payload['foto_pendiente'], 'images/profiles', $nombreFinal);
        if ($rutaFinal) {
            $stmtFoto = $conn->prepare('UPDATE usuario SET foto_perfil = ? WHERE id_usuario = ?');
            if ($stmtFoto) {
                $stmtFoto->bind_param('si', $rutaFinal, $idUsuario);
                $stmtFoto->execute();
                $stmtFoto->close();
            }
        }
    }

    registrarLog($conn, $idRevisor, 'Usuarios', 'Actualización aprobada del usuario ID ' . $idUsuario);

    return [
        'success' => true,
        'message' => 'Se aplicó la actualización del usuario.',
        'foto' => $rutaFinal
    ];
}

function opti_aplicar_usuario_estado(mysqli $conn, array $payload, int $idRevisor)
{
    $idUsuario = (int)($payload['id_usuario'] ?? 0);
    $activo = isset($payload['activo']) ? (int)$payload['activo'] : null;
    $idEmpresa = (int)($payload['id_empresa'] ?? 0);

    if ($idUsuario <= 0 || ($activo !== 0 && $activo !== 1) || $idEmpresa <= 0) {
        return ['success' => false, 'message' => 'Datos insuficientes para actualizar el estado del usuario.'];
    }

    $sql = 'UPDATE usuario u INNER JOIN usuario_empresa ue ON u.id_usuario = ue.id_usuario SET u.activo = ? WHERE u.id_usuario = ? AND ue.id_empresa = ?';

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        return ['success' => false, 'message' => 'No fue posible preparar el cambio de estado.'];
    }

    $stmt->bind_param('iii', $activo, $idUsuario, $idEmpresa);

    try {
        $stmt->execute();
        $afectados = $stmt->affected_rows;
        $stmt->close();
        if ($afectados <= 0) {
            return ['success' => false, 'message' => 'No se aplicó el cambio de estado solicitado.'];
        }
    } catch (mysqli_sql_exception $e) {
        $stmt->close();
        return ['success' => false, 'message' => 'No fue posible actualizar el estado del usuario.'];
    }

    $accion = $activo === 1 ? 'Activación' : 'Desactivación';
    registrarLog($conn, $idRevisor, 'Usuarios', $accion . ' aprobada del usuario ID ' . $idUsuario);

    return ['success' => true, 'message' => 'Estado actualizado.'];
}

function opti_aplicar_usuario_asignar_area(mysqli $conn, array $payload, int $idRevisor)
{
    $idUsuario = (int)($payload['id_usuario'] ?? 0);
    $idArea = (int)($payload['id_area'] ?? 0);

    if ($idUsuario <= 0 || $idArea <= 0) {
        return ['success' => false, 'message' => 'Datos incompletos para la asignación.'];
    }

    $stmtArea = $conn->prepare('SELECT id_empresa, nombre FROM areas WHERE id = ?');
    if (!$stmtArea) {
        return ['success' => false, 'message' => 'No fue posible verificar el área.'];
    }
    $stmtArea->bind_param('i', $idArea);
    $stmtArea->execute();
    $resultadoArea = $stmtArea->get_result()->fetch_assoc();
    $stmtArea->close();

    if (!$resultadoArea) {
        return ['success' => false, 'message' => 'El área indicada ya no existe.'];
    }

    $idEmpresa = (int)$resultadoArea['id_empresa'];

    $stmtUsuarioEmpresa = $conn->prepare('SELECT 1 FROM usuario_empresa WHERE id_usuario = ? AND id_empresa = ? LIMIT 1');
    if (!$stmtUsuarioEmpresa) {
        return ['success' => false, 'message' => 'No fue posible validar la empresa del usuario.'];
    }
    $stmtUsuarioEmpresa->bind_param('ii', $idUsuario, $idEmpresa);
    $stmtUsuarioEmpresa->execute();
    $pertenece = $stmtUsuarioEmpresa->get_result()->fetch_assoc();
    $stmtUsuarioEmpresa->close();

    if (!$pertenece) {
        return ['success' => false, 'message' => 'El usuario no pertenece a la empresa del área.'];
    }

    $stmtExiste = $conn->prepare('SELECT 1 FROM usuario_area_zona WHERE id_usuario = ? AND id_area = ? AND id_zona IS NULL LIMIT 1');
    $stmtExiste->bind_param('ii', $idUsuario, $idArea);
    $stmtExiste->execute();
    $existe = $stmtExiste->get_result()->fetch_assoc();
    $stmtExiste->close();

    if ($existe) {
        return ['success' => false, 'message' => 'La asignación ya existe.'];
    }

    $conn->begin_transaction();

    try {
        $stmtEliminar = $conn->prepare('DELETE FROM usuario_area_zona WHERE id_usuario = ? AND id_area = ? AND id_zona IS NOT NULL');
        $stmtEliminar->bind_param('ii', $idUsuario, $idArea);
        $stmtEliminar->execute();
        $stmtEliminar->close();

        $stmtInsert = $conn->prepare('INSERT INTO usuario_area_zona (id_usuario, id_area, id_zona) VALUES (?, ?, NULL)');
        $stmtInsert->bind_param('ii', $idUsuario, $idArea);
        $stmtInsert->execute();
        $stmtInsert->close();

        $conn->commit();
    } catch (mysqli_sql_exception $e) {
        $conn->rollback();
        return ['success' => false, 'message' => 'No fue posible asignar el acceso solicitado.'];
    }

    registrarLog($conn, $idRevisor, 'Usuarios', 'Asignación de área aprobada (usuario ' . $idUsuario . ', área ' . $idArea . ')');

    return ['success' => true, 'message' => 'Asignación realizada.'];
}

function opti_aplicar_usuario_eliminar_acceso(mysqli $conn, array $payload, int $idRevisor)
{
    $idUsuario = (int)($payload['id_usuario'] ?? 0);
    $idArea = (int)($payload['id_area'] ?? 0);
    $idZona = isset($payload['id_zona']) ? $payload['id_zona'] : null;
    $idZona = ($idZona === '' || $idZona === null) ? null : (int)$idZona;

    if ($idUsuario <= 0 || $idArea <= 0) {
        return ['success' => false, 'message' => 'Datos incompletos para eliminar la asignación.'];
    }

    if ($idZona === null) {
        $stmt = $conn->prepare('DELETE FROM usuario_area_zona WHERE id_usuario = ? AND id_area = ? AND id_zona IS NULL');
        $stmt->bind_param('ii', $idUsuario, $idArea);
    } else {
        $stmt = $conn->prepare('DELETE FROM usuario_area_zona WHERE id_usuario = ? AND id_area = ? AND id_zona = ?');
        $stmt->bind_param('iii', $idUsuario, $idArea, $idZona);
    }

    if (!$stmt) {
        return ['success' => false, 'message' => 'No se pudo preparar la eliminación.'];
    }

    try {
        $stmt->execute();
        $afectados = $stmt->affected_rows;
        $stmt->close();
        if ($afectados <= 0) {
            return ['success' => false, 'message' => 'La asignación ya no existe.'];
        }
    } catch (mysqli_sql_exception $e) {
        $stmt->close();
        return ['success' => false, 'message' => 'No se pudo eliminar la asignación.'];
    }

    registrarLog($conn, $idRevisor, 'Usuarios', 'Revocación de acceso aprobada (usuario ' . $idUsuario . ', área ' . $idArea . ')');

    return ['success' => true, 'message' => 'Asignación eliminada.'];
}

function opti_aplicar_usuario_eliminar(mysqli $conn, array $payload, int $idRevisor)
{
    $correo = trim($payload['correo'] ?? '');
    if ($correo === '') {
        return ['success' => false, 'message' => 'No se proporcionó el correo del usuario a eliminar.'];
    }

    $conn->begin_transaction();

    try {
        $stmtUsuario = $conn->prepare('SELECT id_usuario FROM usuario WHERE correo = ? LIMIT 1');
        $stmtUsuario->bind_param('s', $correo);
        $stmtUsuario->execute();
        $resultado = $stmtUsuario->get_result()->fetch_assoc();
        $stmtUsuario->close();

        if (!$resultado) {
            $conn->rollback();
            return ['success' => false, 'message' => 'El usuario indicado no existe.'];
        }

        $idUsuario = (int)$resultado['id_usuario'];

        $stmtDelRel = $conn->prepare('DELETE FROM usuario_empresa WHERE id_usuario = ?');
        $stmtDelRel->bind_param('i', $idUsuario);
        $stmtDelRel->execute();
        $stmtDelRel->close();

        $stmtDel = $conn->prepare('DELETE FROM usuario WHERE id_usuario = ?');
        $stmtDel->bind_param('i', $idUsuario);
        $stmtDel->execute();
        $stmtDel->close();

        $conn->commit();
    } catch (mysqli_sql_exception $e) {
        $conn->rollback();
        return ['success' => false, 'message' => 'No se pudo eliminar el usuario.'];
    }

    registrarLog($conn, $idRevisor, 'Usuarios', 'Eliminación de usuario aprobada: ' . $correo);

    return ['success' => true, 'message' => 'Usuario eliminado.'];
}

function opti_aplicar_usuario_editar(mysqli $conn, array $payload, int $idRevisor)
{
    $idUsuario = (int)($payload['id_usuario'] ?? 0);
    if ($idUsuario <= 0) {
        return ['success' => false, 'message' => 'Solicitud sin usuario válido.'];
    }

    $nombre = trim($payload['nombre'] ?? '');
    $apellido = trim($payload['apellido'] ?? '');
    $telefono = trim($payload['telefono'] ?? '');
    $fecha = $payload['fecha_nacimiento'] ?? null;
    $rol = trim($payload['rol'] ?? '');

    $stmt = $conn->prepare('UPDATE usuario SET nombre = ?, apellido = ?, telefono = ?, fecha_nacimiento = ?, rol = ? WHERE id_usuario = ?');
    if (!$stmt) {
        return ['success' => false, 'message' => 'No se pudo preparar la actualización del usuario.'];
    }

    $stmt->bind_param('sssssi', $nombre, $apellido, $telefono, $fecha, $rol, $idUsuario);

    try {
        $stmt->execute();
        $stmt->close();
    } catch (mysqli_sql_exception $e) {
        $stmt->close();
        return ['success' => false, 'message' => 'No se pudo actualizar el usuario.'];
    }

    registrarLog($conn, $idRevisor, 'Usuarios', 'Edición aprobada del usuario ID ' . $idUsuario);

    return ['success' => true, 'message' => 'Usuario actualizado.'];
}

function opti_aplicar_empresa_actualizar(mysqli $conn, array $payload, int $idRevisor)
{
    $idEmpresa = (int)($payload['id_empresa'] ?? 0);
    $nombre = trim($payload['nombre_empresa'] ?? '');
    $sector = trim($payload['sector_empresa'] ?? '');

    if ($idEmpresa <= 0 || $nombre === '' || $sector === '') {
        return ['success' => false, 'message' => 'Datos incompletos para actualizar la empresa.'];
    }

    $logoFinal = null;
    if (!empty($payload['logo_pendiente'])) {
        $extension = pathinfo($payload['logo_pendiente'], PATHINFO_EXTENSION) ?: 'png';
        $nombreFinal = 'logo_' . $idEmpresa . '_' . time() . '.' . $extension;
        $logoFinal = opti_mover_archivo_desde_pendiente($payload['logo_pendiente'], 'images/logos', $nombreFinal);
    }

    if ($logoFinal) {
        $stmt = $conn->prepare('UPDATE empresa SET nombre_empresa = ?, logo_empresa = ?, sector_empresa = ? WHERE id_empresa = ?');
        if (!$stmt) {
            return ['success' => false, 'message' => 'No se pudo preparar la actualización de la empresa.'];
        }
        $stmt->bind_param('sssi', $nombre, $logoFinal, $sector, $idEmpresa);
    } else {
        $stmt = $conn->prepare('UPDATE empresa SET nombre_empresa = ?, sector_empresa = ? WHERE id_empresa = ?');
        if (!$stmt) {
            return ['success' => false, 'message' => 'No se pudo preparar la actualización de la empresa.'];
        }
        $stmt->bind_param('ssi', $nombre, $sector, $idEmpresa);
    }

    try {
        $stmt->execute();
        $stmt->close();
    } catch (mysqli_sql_exception $e) {
        $stmt->close();
        return ['success' => false, 'message' => 'No se pudo aplicar la actualización de la empresa.'];
    }

    registrarLog($conn, $idRevisor, 'Empresa', 'Actualización aprobada de la empresa ID ' . $idEmpresa);

    return ['success' => true, 'message' => 'Empresa actualizada.', 'logo' => $logoFinal];
}

function opti_aplicar_producto_crear(mysqli $conn, array $payload, int $idRevisor)
{
    $empresaId = (int)($payload['empresa_id'] ?? 0);
    $nombre = trim($payload['nombre'] ?? '');
    if ($empresaId <= 0 || $nombre === '') {
        return ['success' => false, 'message' => 'Datos insuficientes para crear el producto.'];
    }

    $descripcion = $payload['descripcion'] ?? '';
    $categoriaId = isset($payload['categoria_id']) ? (int)$payload['categoria_id'] : null;
    $subcategoriaId = isset($payload['subcategoria_id']) ? (int)$payload['subcategoria_id'] : null;
    $stock = isset($payload['stock']) ? (int)$payload['stock'] : 0;
    $precio = isset($payload['precio_compra']) ? (float)$payload['precio_compra'] : 0.0;
    $dimX = isset($payload['dim_x']) ? (float)$payload['dim_x'] : 0.0;
    $dimY = isset($payload['dim_y']) ? (float)$payload['dim_y'] : 0.0;
    $dimZ = isset($payload['dim_z']) ? (float)$payload['dim_z'] : 0.0;
    $zonaId = isset($payload['zona_id']) ? (int)$payload['zona_id'] : null;
    if ($zonaId !== null && $zonaId <= 0) {
        $zonaId = null;
    }

    $stmtDup = $conn->prepare('SELECT COUNT(*) FROM productos WHERE LOWER(nombre) = LOWER(?) AND empresa_id = ?');
    if (!$stmtDup) {
        return ['success' => false, 'message' => 'No se pudo validar el nombre del producto.'];
    }
    $stmtDup->bind_param('si', $nombre, $empresaId);
    $stmtDup->execute();
    $stmtDup->bind_result($existe);
    $stmtDup->fetch();
    $stmtDup->close();
    if ($existe > 0) {
        return ['success' => false, 'message' => 'Ya existe un producto con ese nombre.'];
    }

    $volumenProductoCm3 = max($stock, 0) * ($dimX * $dimY * $dimZ);
    $volumenProductoM3 = $volumenProductoCm3 / 1000000.0;

    if ($zonaId && $volumenProductoM3 > 0) {
        $ocupacion = calcularOcupacionZona($conn, $zonaId);
        if ($ocupacion) {
            $disponible = $ocupacion['capacidad_disponible'];
            if ($volumenProductoM3 > $disponible) {
                return ['success' => false, 'message' => 'La zona seleccionada no tiene capacidad disponible para el producto.'];
            }
        }
    }

    $stmt = $conn->prepare(
        'INSERT INTO productos (nombre, descripcion, categoria_id, subcategoria_id, stock, precio_compra, dim_x, dim_y, dim_z, zona_id, empresa_id, last_movimiento) VALUES (?,?,?,?,?,?,?,?,?,?,?, NOW())'
    );
    if (!$stmt) {
        return ['success' => false, 'message' => 'No se pudo preparar la creación del producto.'];
    }
    $stmt->bind_param(
        'ssiiidddiii',
        $nombre,
        $descripcion,
        $categoriaId,
        $subcategoriaId,
        $stock,
        $precio,
        $dimX,
        $dimY,
        $dimZ,
        $zonaId,
        $empresaId
    );

    try {
        $stmt->execute();
        $productoId = $stmt->insert_id;
        $stmt->close();
    } catch (mysqli_sql_exception $e) {
        $stmt->close();
        return ['success' => false, 'message' => 'No se pudo crear el producto: ' . $e->getMessage()];
    }

    require_once __DIR__ . '/libs/phpqrcode/qrlib.php';
    $qrDir = __DIR__ . '/../../images/qr/';
    if (!is_dir($qrDir)) {
        @mkdir($qrDir, 0777, true);
    }
    $qrFile = $qrDir . $productoId . '.png';
    QRcode::png((string)$productoId, $qrFile, QR_ECLEVEL_L, 8, 2);
    $qrRel = 'images/qr/' . $productoId . '.png';

    $stmtQr = $conn->prepare('UPDATE productos SET codigo_qr = ? WHERE id = ?');
    if ($stmtQr) {
        $stmtQr->bind_param('si', $qrRel, $productoId);
        $stmtQr->execute();
        $stmtQr->close();
    }

    if ($zonaId) {
        actualizarOcupacionZona($conn, $zonaId);
    }

    registrarLog($conn, $idRevisor, 'Productos', 'Creación aprobada del producto "' . $nombre . '" (ID ' . $productoId . ')');

    return ['success' => true, 'id' => $productoId, 'codigo_qr' => $qrRel];
}

function opti_aplicar_producto_actualizar(mysqli $conn, array $payload, int $idRevisor)
{
    $productoId = (int)($payload['id_producto'] ?? $payload['id'] ?? 0);
    $empresaId = (int)($payload['empresa_id'] ?? 0);
    $nombre = trim($payload['nombre'] ?? '');
    if ($productoId <= 0 || $empresaId <= 0 || $nombre === '') {
        return ['success' => false, 'message' => 'Datos insuficientes para actualizar el producto.'];
    }

    $descripcion = $payload['descripcion'] ?? '';
    $categoriaId = isset($payload['categoria_id']) ? (int)$payload['categoria_id'] : null;
    $subcategoriaId = isset($payload['subcategoria_id']) ? (int)$payload['subcategoria_id'] : null;
    $stock = isset($payload['stock']) ? (int)$payload['stock'] : 0;
    $precio = isset($payload['precio_compra']) ? (float)$payload['precio_compra'] : 0.0;
    $dimX = isset($payload['dim_x']) ? (float)$payload['dim_x'] : 0.0;
    $dimY = isset($payload['dim_y']) ? (float)$payload['dim_y'] : 0.0;
    $dimZ = isset($payload['dim_z']) ? (float)$payload['dim_z'] : 0.0;
    $zonaId = isset($payload['zona_id']) ? (int)$payload['zona_id'] : null;
    if ($zonaId !== null && $zonaId <= 0) {
        $zonaId = null;
    }

    $stmtProducto = $conn->prepare('SELECT zona_id FROM productos WHERE id = ? AND empresa_id = ?');
    if (!$stmtProducto) {
        return ['success' => false, 'message' => 'No se pudo validar el producto.'];
    }
    $stmtProducto->bind_param('ii', $productoId, $empresaId);
    $stmtProducto->execute();
    $productoActual = $stmtProducto->get_result()->fetch_assoc();
    $stmtProducto->close();
    if (!$productoActual) {
        return ['success' => false, 'message' => 'El producto indicado ya no existe.'];
    }

    $stmtDup = $conn->prepare('SELECT COUNT(*) FROM productos WHERE LOWER(nombre) = LOWER(?) AND empresa_id = ? AND id <> ?');
    if (!$stmtDup) {
        return ['success' => false, 'message' => 'No se pudo validar el nombre del producto.'];
    }
    $stmtDup->bind_param('sii', $nombre, $empresaId, $productoId);
    $stmtDup->execute();
    $stmtDup->bind_result($existe);
    $stmtDup->fetch();
    $stmtDup->close();
    if ($existe > 0) {
        return ['success' => false, 'message' => 'Ya existe un producto con ese nombre.'];
    }

    $volumenProductoCm3 = max($stock, 0) * ($dimX * $dimY * $dimZ);
    $volumenProductoM3 = $volumenProductoCm3 / 1000000.0;

    $zonaAnterior = isset($productoActual['zona_id']) ? (int)$productoActual['zona_id'] : null;
    if ($zonaAnterior !== null && $zonaAnterior <= 0) {
        $zonaAnterior = null;
    }

    if ($zonaId && $volumenProductoM3 > 0) {
        $ocupacion = calcularOcupacionZona($conn, $zonaId);
        if ($ocupacion) {
            $disponible = $ocupacion['capacidad_disponible'];
            if ($zonaAnterior && $zonaAnterior === $zonaId) {
                $disponible += (float)($payload['volumen_anterior_m3'] ?? 0.0);
            }
            if ($volumenProductoM3 > $disponible) {
                return ['success' => false, 'message' => 'La zona seleccionada no tiene capacidad disponible para el producto.'];
            }
        }
    }

    $stmt = $conn->prepare(
        'UPDATE productos SET nombre = ?, descripcion = ?, categoria_id = ?, subcategoria_id = ?, stock = ?, precio_compra = ?, dim_x = ?, dim_y = ?, dim_z = ?, zona_id = ?, last_movimiento = NOW() WHERE id = ? AND empresa_id = ?'
    );
    if (!$stmt) {
        return ['success' => false, 'message' => 'No se pudo preparar la actualización del producto.'];
    }
    $stmt->bind_param(
        'ssiiiddddiii',
        $nombre,
        $descripcion,
        $categoriaId,
        $subcategoriaId,
        $stock,
        $precio,
        $dimX,
        $dimY,
        $dimZ,
        $zonaId,
        $productoId,
        $empresaId
    );

    try {
        $stmt->execute();
        $stmt->close();
    } catch (mysqli_sql_exception $e) {
        $stmt->close();
        return ['success' => false, 'message' => 'No se pudo actualizar el producto: ' . $e->getMessage()];
    }

    if ($zonaId) {
        actualizarOcupacionZona($conn, $zonaId);
    }
    if ($zonaAnterior && $zonaAnterior !== $zonaId) {
        actualizarOcupacionZona($conn, $zonaAnterior);
    }

    registrarLog($conn, $idRevisor, 'Productos', 'Actualización aprobada del producto ID ' . $productoId);

    return ['success' => true];
}

function opti_aplicar_producto_eliminar(mysqli $conn, array $payload, int $idRevisor)
{
    $productoId = (int)($payload['id_producto'] ?? 0);
    $empresaId = (int)($payload['empresa_id'] ?? 0);
    $zonaId = isset($payload['zona_id']) ? (int)$payload['zona_id'] : null;
    $forceDelete = !empty($payload['force_delete']);

    if ($productoId <= 0 || $empresaId <= 0) {
        return ['success' => false, 'message' => 'Solicitud sin producto válido.'];
    }

    $stmtMov = $conn->prepare('SELECT COUNT(*) FROM movimientos WHERE producto_id = ? AND empresa_id = ?');
    if (!$stmtMov) {
        return ['success' => false, 'message' => 'No se pudo validar los movimientos del producto.'];
    }
    $stmtMov->bind_param('ii', $productoId, $empresaId);
    $stmtMov->execute();
    $stmtMov->bind_result($movCount);
    $stmtMov->fetch();
    $stmtMov->close();

    if ($movCount > 0 && !$forceDelete) {
        return ['success' => false, 'message' => 'El producto tiene movimientos registrados y requiere confirmación para eliminarse.'];
    }

    $conn->begin_transaction();

    try {
        $movimientosEliminados = 0;
        if ($movCount > 0) {
            $stmtDelMov = $conn->prepare('DELETE FROM movimientos WHERE producto_id = ? AND empresa_id = ?');
            $stmtDelMov->bind_param('ii', $productoId, $empresaId);
            $stmtDelMov->execute();
            $movimientosEliminados = $stmtDelMov->affected_rows;
            $stmtDelMov->close();
        }

        $stmtDel = $conn->prepare('DELETE FROM productos WHERE id = ? AND empresa_id = ?');
        $stmtDel->bind_param('ii', $productoId, $empresaId);
        $stmtDel->execute();
        $eliminados = $stmtDel->affected_rows;
        $stmtDel->close();

        if ($eliminados <= 0) {
            $conn->rollback();
            return ['success' => false, 'message' => 'El producto indicado ya no existe.'];
        }

        $conn->commit();
    } catch (mysqli_sql_exception $e) {
        $conn->rollback();
        return ['success' => false, 'message' => 'No se pudo eliminar el producto: ' . $e->getMessage()];
    }

    if ($zonaId) {
        actualizarOcupacionZona($conn, $zonaId);
    }

    registrarLog($conn, $idRevisor, 'Productos', 'Eliminación aprobada del producto ID ' . $productoId);

    return ['success' => true, 'movimientos_eliminados' => $movCount > 0 ? $movCount : 0];
}

function opti_aplicar_area_crear(mysqli $conn, array $payload, int $idRevisor)
{
    $empresaId = (int)($payload['empresa_id'] ?? 0);
    $nombre = trim($payload['nombre'] ?? '');
    $ancho = isset($payload['ancho']) ? (float)$payload['ancho'] : 0.0;
    $alto = isset($payload['alto']) ? (float)$payload['alto'] : 0.0;
    $largo = isset($payload['largo']) ? (float)$payload['largo'] : 0.0;
    $descripcion = $payload['descripcion'] ?? '';

    if ($empresaId <= 0 || $nombre === '' || $ancho <= 0 || $alto <= 0 || $largo <= 0) {
        return ['success' => false, 'message' => 'Datos insuficientes para registrar el área.'];
    }

    $volumen = $ancho * $alto * $largo;
    if (!validarCapacidadContraAlmacen($conn, $empresaId, $volumen)) {
        return ['success' => false, 'message' => 'El volumen del área supera la capacidad máxima registrada para el almacén.'];
    }

    $stmt = $conn->prepare('INSERT INTO areas (nombre, descripcion, ancho, alto, largo, volumen, id_empresa) VALUES (?,?,?,?,?,?,?)');
    if (!$stmt) {
        return ['success' => false, 'message' => 'No se pudo preparar la creación del área.'];
    }
    $stmt->bind_param('ssddddi', $nombre, $descripcion, $ancho, $alto, $largo, $volumen, $empresaId);

    try {
        $stmt->execute();
        $areaId = $stmt->insert_id;
        $stmt->close();
    } catch (mysqli_sql_exception $e) {
        $stmt->close();
        return ['success' => false, 'message' => 'No se pudo crear el área: ' . $e->getMessage()];
    }

    actualizarOcupacionArea($conn, $areaId);
    registrarLog($conn, $idRevisor, 'Áreas', 'Creación aprobada del área "' . $nombre . '" (ID ' . $areaId . ')');

    return ['success' => true, 'id' => $areaId];
}

function opti_aplicar_area_actualizar(mysqli $conn, array $payload, int $idRevisor)
{
    $areaId = (int)($payload['area_id'] ?? 0);
    $empresaId = (int)($payload['empresa_id'] ?? 0);
    $nombre = trim($payload['nombre'] ?? '');
    $ancho = isset($payload['ancho']) ? (float)$payload['ancho'] : 0.0;
    $alto = isset($payload['alto']) ? (float)$payload['alto'] : 0.0;
    $largo = isset($payload['largo']) ? (float)$payload['largo'] : 0.0;
    $descripcion = $payload['descripcion'] ?? '';

    if ($areaId <= 0 || $empresaId <= 0 || $nombre === '' || $ancho <= 0 || $alto <= 0 || $largo <= 0) {
        return ['success' => false, 'message' => 'Datos insuficientes para actualizar el área.'];
    }

    $volumen = $ancho * $alto * $largo;
    if (!validarCapacidadContraAlmacen($conn, $empresaId, $volumen)) {
        return ['success' => false, 'message' => 'El volumen del área supera la capacidad máxima registrada para el almacén.'];
    }

    $volumenZonas = obtenerVolumenTotalZonas($conn, $areaId);
    if ($volumen < $volumenZonas) {
        return ['success' => false, 'message' => 'El volumen del área no puede ser menor al ocupado por sus zonas.'];
    }

    $stmt = $conn->prepare('UPDATE areas SET nombre = ?, descripcion = ?, ancho = ?, alto = ?, largo = ?, volumen = ? WHERE id = ? AND id_empresa = ?');
    if (!$stmt) {
        return ['success' => false, 'message' => 'No se pudo preparar la actualización del área.'];
    }
    $stmt->bind_param('ssddddii', $nombre, $descripcion, $ancho, $alto, $largo, $volumen, $areaId, $empresaId);

    try {
        $stmt->execute();
        $stmt->close();
    } catch (mysqli_sql_exception $e) {
        $stmt->close();
        return ['success' => false, 'message' => 'No se pudo actualizar el área: ' . $e->getMessage()];
    }

    actualizarOcupacionArea($conn, $areaId);
    registrarLog($conn, $idRevisor, 'Áreas', 'Actualización aprobada del área ID ' . $areaId);

    return ['success' => true];
}

function opti_aplicar_area_eliminar(mysqli $conn, array $payload, int $idRevisor)
{
    $areaId = (int)($payload['area_id'] ?? 0);
    $empresaId = (int)($payload['empresa_id'] ?? 0);
    if ($areaId <= 0 || $empresaId <= 0) {
        return ['success' => false, 'message' => 'Datos insuficientes para eliminar el área.'];
    }

    $stmt = $conn->prepare('SELECT COUNT(*) FROM zonas WHERE area_id = ?');
    if (!$stmt) {
        return ['success' => false, 'message' => 'No se pudo validar las zonas asociadas.'];
    }
    $stmt->bind_param('i', $areaId);
    $stmt->execute();
    $stmt->bind_result($zonasAsociadas);
    $stmt->fetch();
    $stmt->close();

    if ($zonasAsociadas > 0) {
        return ['success' => false, 'message' => 'No se puede eliminar el área porque existen zonas asociadas.'];
    }

    $stmtDel = $conn->prepare('DELETE FROM areas WHERE id = ? AND id_empresa = ?');
    if (!$stmtDel) {
        return ['success' => false, 'message' => 'No se pudo preparar la eliminación del área.'];
    }
    $stmtDel->bind_param('ii', $areaId, $empresaId);

    try {
        $stmtDel->execute();
        $eliminadas = $stmtDel->affected_rows;
        $stmtDel->close();
    } catch (mysqli_sql_exception $e) {
        $stmtDel->close();
        return ['success' => false, 'message' => 'No se pudo eliminar el área: ' . $e->getMessage()];
    }

    if ($eliminadas <= 0) {
        return ['success' => false, 'message' => 'El área indicada ya no existe.'];
    }

    registrarLog($conn, $idRevisor, 'Áreas', 'Eliminación aprobada del área ID ' . $areaId);

    return ['success' => true];
}

function opti_aplicar_zona_crear(mysqli $conn, array $payload, int $idRevisor)
{
    $empresaId = (int)($payload['empresa_id'] ?? 0);
    $nombre = trim($payload['nombre'] ?? '');
    $descripcion = $payload['descripcion'] ?? '';
    $ancho = isset($payload['ancho']) ? (float)$payload['ancho'] : 0.0;
    $alto = isset($payload['alto']) ? (float)$payload['alto'] : 0.0;
    $largo = isset($payload['largo']) ? (float)$payload['largo'] : 0.0;
    $tipo = trim($payload['tipo_almacenamiento'] ?? '');
    $areaId = isset($payload['area_id']) ? (int)$payload['area_id'] : null;
    if ($areaId !== null && $areaId <= 0) {
        $areaId = null;
    }
    $subniveles = isset($payload['subniveles']) && is_array($payload['subniveles']) ? $payload['subniveles'] : null;

    if ($empresaId <= 0 || $nombre === '' || $ancho <= 0 || $alto <= 0 || $largo <= 0 || $tipo === '') {
        return ['success' => false, 'message' => 'Datos insuficientes para registrar la zona.'];
    }

    $volumen = $ancho * $alto * $largo;
    if (!validarCapacidadContraAlmacen($conn, $empresaId, $volumen)) {
        return ['success' => false, 'message' => 'El volumen de la zona supera la capacidad máxima registrada para el almacén.'];
    }

    if ($areaId) {
        $capacidadDisponible = obtenerCapacidadDisponibleArea($conn, $areaId);
        if ($volumen > $capacidadDisponible) {
            return ['success' => false, 'message' => 'El volumen de la zona excede la capacidad disponible en el área seleccionada.'];
        }
    }

    $subnivelesJson = $subniveles ? json_encode($subniveles) : null;
    $stmt = $conn->prepare('INSERT INTO zonas (nombre, descripcion, ancho, alto, largo, volumen, tipo_almacenamiento, subniveles, area_id, id_empresa) VALUES (?,?,?,?,?,?,?,?,?,?)');
    if (!$stmt) {
        return ['success' => false, 'message' => 'No se pudo preparar la creación de la zona.'];
    }
    $stmt->bind_param('ssddddssii', $nombre, $descripcion, $ancho, $alto, $largo, $volumen, $tipo, $subnivelesJson, $areaId, $empresaId);

    try {
        $stmt->execute();
        $zonaId = $stmt->insert_id;
        $stmt->close();
    } catch (mysqli_sql_exception $e) {
        $stmt->close();
        return ['success' => false, 'message' => 'No se pudo crear la zona: ' . $e->getMessage()];
    }

    actualizarOcupacionZona($conn, $zonaId);
    registrarLog($conn, $idRevisor, 'Zonas', 'Creación aprobada de la zona "' . $nombre . '" (ID ' . $zonaId . ')');

    return ['success' => true, 'id' => $zonaId];
}

function opti_aplicar_zona_actualizar(mysqli $conn, array $payload, int $idRevisor)
{
    $zonaId = (int)($payload['zona_id'] ?? 0);
    $empresaId = (int)($payload['empresa_id'] ?? 0);
    $nombre = trim($payload['nombre'] ?? '');
    $descripcion = $payload['descripcion'] ?? '';
    $ancho = isset($payload['ancho']) ? (float)$payload['ancho'] : 0.0;
    $alto = isset($payload['alto']) ? (float)$payload['alto'] : 0.0;
    $largo = isset($payload['largo']) ? (float)$payload['largo'] : 0.0;
    $tipo = trim($payload['tipo_almacenamiento'] ?? '');
    $areaId = isset($payload['area_id']) ? (int)$payload['area_id'] : null;
    if ($areaId !== null && $areaId <= 0) {
        $areaId = null;
    }
    $areaAnterior = isset($payload['area_anterior']) ? (int)$payload['area_anterior'] : null;
    if ($areaAnterior !== null && $areaAnterior <= 0) {
        $areaAnterior = null;
    }
    $subniveles = isset($payload['subniveles']) && is_array($payload['subniveles']) ? $payload['subniveles'] : null;

    if ($zonaId <= 0 || $empresaId <= 0 || $nombre === '' || $ancho <= 0 || $alto <= 0 || $largo <= 0 || $tipo === '') {
        return ['success' => false, 'message' => 'Datos insuficientes para actualizar la zona.'];
    }

    $volumen = $ancho * $alto * $largo;
    if (!validarCapacidadContraAlmacen($conn, $empresaId, $volumen)) {
        return ['success' => false, 'message' => 'El volumen de la zona supera la capacidad máxima registrada para el almacén.'];
    }

    $capacidadActual = isset($payload['capacidad_actual']) ? (float)$payload['capacidad_actual'] : 0.0;
    if ($volumen < $capacidadActual) {
        return ['success' => false, 'message' => 'El volumen de la zona no puede ser menor al espacio ocupado actualmente.'];
    }

    if ($areaId) {
        $capacidadDisponible = obtenerCapacidadDisponibleArea($conn, $areaId, $zonaId);
        if ($volumen > $capacidadDisponible) {
            return ['success' => false, 'message' => 'El volumen de la zona excede la capacidad disponible en el área seleccionada.'];
        }
    }

    $subnivelesJson = $subniveles ? json_encode($subniveles) : null;
    $stmt = $conn->prepare('UPDATE zonas SET nombre = ?, descripcion = ?, ancho = ?, alto = ?, largo = ?, volumen = ?, tipo_almacenamiento = ?, subniveles = ?, area_id = ? WHERE id = ? AND id_empresa = ?');
    if (!$stmt) {
        return ['success' => false, 'message' => 'No se pudo preparar la actualización de la zona.'];
    }
    $stmt->bind_param('ssddddssiii', $nombre, $descripcion, $ancho, $alto, $largo, $volumen, $tipo, $subnivelesJson, $areaId, $zonaId, $empresaId);

    try {
        $stmt->execute();
        $stmt->close();
    } catch (mysqli_sql_exception $e) {
        $stmt->close();
        return ['success' => false, 'message' => 'No se pudo actualizar la zona: ' . $e->getMessage()];
    }

    actualizarOcupacionZona($conn, $zonaId);
    if ($areaAnterior && $areaAnterior !== $areaId) {
        actualizarOcupacionArea($conn, $areaAnterior);
    }

    registrarLog($conn, $idRevisor, 'Zonas', 'Actualización aprobada de la zona ID ' . $zonaId);

    return ['success' => true];
}

function opti_aplicar_zona_eliminar(mysqli $conn, array $payload, int $idRevisor)
{
    $zonaId = (int)($payload['zona_id'] ?? 0);
    $empresaId = (int)($payload['empresa_id'] ?? 0);
    $areaId = isset($payload['area_id']) ? (int)$payload['area_id'] : null;

    if ($zonaId <= 0 || $empresaId <= 0) {
        return ['success' => false, 'message' => 'Datos insuficientes para eliminar la zona.'];
    }

    $stmtProductos = $conn->prepare('SELECT COUNT(*) FROM productos WHERE zona_id = ?');
    if (!$stmtProductos) {
        return ['success' => false, 'message' => 'No se pudo validar los productos de la zona.'];
    }
    $stmtProductos->bind_param('i', $zonaId);
    $stmtProductos->execute();
    $stmtProductos->bind_result($productosEnZona);
    $stmtProductos->fetch();
    $stmtProductos->close();

    if ($productosEnZona > 0) {
        return ['success' => false, 'message' => 'No se puede eliminar la zona porque tiene productos almacenados.'];
    }

    $stmtMov = $conn->prepare('SELECT COUNT(*) FROM movimientos m INNER JOIN productos p ON m.producto_id = p.id WHERE p.zona_id = ? AND m.fecha_movimiento >= DATE_SUB(NOW(), INTERVAL 30 DAY)');
    if (!$stmtMov) {
        return ['success' => false, 'message' => 'No se pudo validar los movimientos recientes.'];
    }
    $stmtMov->bind_param('i', $zonaId);
    $stmtMov->execute();
    $stmtMov->bind_result($movimientosRecientes);
    $stmtMov->fetch();
    $stmtMov->close();

    if ($movimientosRecientes > 0) {
        return ['success' => false, 'message' => 'La zona tiene movimientos recientes registrados.'];
    }

    $stmtDel = $conn->prepare('DELETE FROM zonas WHERE id = ? AND id_empresa = ?');
    if (!$stmtDel) {
        return ['success' => false, 'message' => 'No se pudo preparar la eliminación de la zona.'];
    }
    $stmtDel->bind_param('ii', $zonaId, $empresaId);

    try {
        $stmtDel->execute();
        $eliminadas = $stmtDel->affected_rows;
        $stmtDel->close();
    } catch (mysqli_sql_exception $e) {
        $stmtDel->close();
        return ['success' => false, 'message' => 'No se pudo eliminar la zona: ' . $e->getMessage()];
    }

    if ($eliminadas <= 0) {
        return ['success' => false, 'message' => 'La zona indicada ya no existe.'];
    }

    if ($areaId) {
        actualizarOcupacionArea($conn, $areaId);
    }

    $nombreZona = trim((string)($payload['nombre_zona'] ?? ''));
    $detalleZona = $nombreZona !== '' ? ' (' . $nombreZona . ')' : '';
    registrarLog($conn, $idRevisor, 'Zonas', 'Eliminación aprobada de la zona ID ' . $zonaId . $detalleZona);

    return ['success' => true];
}

function opti_aplicar_solicitud(mysqli $conn, array $solicitud, int $idRevisor)
{
    $tipo = $solicitud['tipo_accion'] ?? '';
    $payload = $solicitud['payload'] ?? [];

    switch ($tipo) {
        case 'usuario_actualizar':
            return opti_aplicar_usuario_actualizar($conn, $payload, $idRevisor);
        case 'usuario_cambiar_estado':
            return opti_aplicar_usuario_estado($conn, $payload, $idRevisor);
        case 'usuario_asignar_area':
            return opti_aplicar_usuario_asignar_area($conn, $payload, $idRevisor);
        case 'usuario_eliminar_acceso':
            return opti_aplicar_usuario_eliminar_acceso($conn, $payload, $idRevisor);
        case 'usuario_eliminar':
            return opti_aplicar_usuario_eliminar($conn, $payload, $idRevisor);
        case 'usuario_editar_datos':
            return opti_aplicar_usuario_editar($conn, $payload, $idRevisor);
        case 'empresa_actualizar':
            return opti_aplicar_empresa_actualizar($conn, $payload, $idRevisor);
        case 'producto_crear':
            return opti_aplicar_producto_crear($conn, $payload, $idRevisor);
        case 'producto_actualizar':
            return opti_aplicar_producto_actualizar($conn, $payload, $idRevisor);
        case 'producto_eliminar':
            return opti_aplicar_producto_eliminar($conn, $payload, $idRevisor);
        case 'area_crear':
            return opti_aplicar_area_crear($conn, $payload, $idRevisor);
        case 'area_actualizar':
            return opti_aplicar_area_actualizar($conn, $payload, $idRevisor);
        case 'area_eliminar':
            return opti_aplicar_area_eliminar($conn, $payload, $idRevisor);
        case 'zona_crear':
            return opti_aplicar_zona_crear($conn, $payload, $idRevisor);
        case 'zona_actualizar':
            return opti_aplicar_zona_actualizar($conn, $payload, $idRevisor);
        case 'zona_eliminar':
            return opti_aplicar_zona_eliminar($conn, $payload, $idRevisor);
        default:
            return ['success' => false, 'message' => 'Acción de solicitud no soportada.'];
    }
}
?>
