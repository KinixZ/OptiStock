<?php
session_start();
header('Content-Type: application/json');

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

require_once __DIR__ . '/log_utils.php';

function getJsonInput() {
    $input = file_get_contents('php://input');
    return json_decode($input, true) ?: [];
}

$data = getJsonInput();
$empresa = intval($_REQUEST['empresa_id'] ?? $data['empresa_id'] ?? 0);
$idProd  = intval($data['producto_id'] ?? 0);
$tipo    = $data['tipo'] === 'egreso' ? 'egreso' : 'ingreso';
$cant    = max(0, intval($data['cantidad'] ?? 0));
if (!$empresa || !$idProd || $cant<=0) {
  http_response_code(400);
  echo json_encode(['error'=>'Datos incompletos']); exit;
}

// 1) Insertar movimiento
$stmt = $conn->prepare(
  "INSERT INTO movimientos (empresa_id,producto_id,tipo,cantidad)
   VALUES (?,?,?,?)"
);
$stmt->bind_param('iisi',$empresa,$idProd,$tipo,$cant);
$stmt->execute();

// 2) Actualizar stock y last_movimiento
$op = $tipo==='ingreso' ? '+' : '-';
$sql = "UPDATE productos
         SET stock = stock {$op} ?, last_movimiento=NOW()
         WHERE id=? AND empresa_id=?";
$stmt = $conn->prepare($sql);
$stmt->bind_param('iii',$cant,$idProd,$empresa);
$stmt->execute();

// 3) Registrar en log
$detalle = ucfirst($tipo) . " de {$cant} unidad(es) del producto {$idProd}";
registrarLog($conn, $_SESSION['usuario_id'] ?? 0, 'Inventario', $detalle);

echo json_encode(['success'=>true]);
