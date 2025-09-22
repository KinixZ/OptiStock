<?php
session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/log_utils.php';

function getJsonInput() {
    $input = file_get_contents('php://input');
    return json_decode($input, true) ?: [];
}

$usuarioId = obtenerUsuarioIdSesion();
if (!$usuarioId) {
    http_response_code(401);
    echo json_encode(['error' => 'Sesión expirada. Inicia sesión nuevamente.']);
    exit;
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

$data = getJsonInput();
$empresa = intval($_REQUEST['empresa_id'] ?? $data['empresa_id'] ?? 0);
$idProd  = intval($data['producto_id'] ?? 0);
$tipo    = $data['tipo'] === 'egreso' ? 'egreso' : 'ingreso';
$cant    = max(0, intval($data['cantidad'] ?? 0));

if (!$empresa || !$idProd || $cant <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Datos incompletos']);
    exit;
}

try {
    $conn->begin_transaction();

    $insert = $conn->prepare(
        "INSERT INTO movimientos (empresa_id, producto_id, tipo, cantidad, id_usuario)
         VALUES (?, ?, ?, ?, ?)"
    );
    if (!$insert) {
        throw new Exception('No se pudo preparar el registro de movimiento.');
    }
    $insert->bind_param('iisii', $empresa, $idProd, $tipo, $cant, $usuarioId);
    if (!$insert->execute()) {
        throw new Exception('No se pudo registrar el movimiento.');
    }

    $op = $tipo === 'ingreso' ? '+' : '-';
    $update = $conn->prepare(
        "UPDATE productos
            SET stock = stock {$op} ?, last_movimiento = NOW()
          WHERE id = ? AND empresa_id = ?"
    );
    if (!$update) {
        throw new Exception('No se pudo preparar la actualización de stock.');
    }
    $update->bind_param('iii', $cant, $idProd, $empresa);
    if (!$update->execute() || $update->affected_rows === 0) {
        throw new Exception('No se pudo actualizar el stock del producto.');
    }

    $stockStmt = $conn->prepare(
        "SELECT stock FROM productos WHERE id = ? AND empresa_id = ?"
    );
    if (!$stockStmt) {
        throw new Exception('No se pudo preparar la consulta de stock actual.');
    }
    $stockStmt->bind_param('ii', $idProd, $empresa);
    $stockStmt->execute();
    $stockResult = $stockStmt->get_result();
    $producto = $stockResult ? $stockResult->fetch_assoc() : null;
    $stockActual = $producto ? (int) $producto['stock'] : null;

    $conn->commit();

    $insert->close();
    $update->close();
    $stockStmt->close();

    $detalle = ucfirst($tipo) . " de {$cant} unidad(es) del producto {$idProd}";
    registrarLog($conn, $usuarioId, 'Inventario', $detalle);

    echo json_encode([
        'success' => true,
        'stock_actual' => $stockActual,
        'tipo' => $tipo,
        'producto_id' => $idProd,
    ]);
} catch (Throwable $e) {
    error_log('guardar_movimientos: ' . $e->getMessage());
    $conn->rollback();
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage() ?: 'No se pudo registrar el movimiento']);
}

$conn->close();
