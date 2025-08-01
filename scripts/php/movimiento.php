<?php
header('Content-Type: application/json');
$conn = new mysqli('localhost','u296155119_Admin','4Dmin123o','u296155119_OptiStock');
if ($conn->connect_error) {
  http_response_code(500);
  echo json_encode(['error'=>'Error de conexión']); exit;
}
$data = json_decode(file_get_contents('php://input'), true);
$idEmpresa   = intval($data['empresa_id'] ?? 0);
$idProducto  = intval($data['producto_id'] ?? 0);
$cantidad    = intval($data['cantidad'] ?? 0);
$tipo        = ($data['tipo']==='egreso') ? 'egreso' : 'ingreso';
if (!$idEmpresa || !$idProducto || $cantidad<=0) {
  http_response_code(400);
  echo json_encode(['error'=>'Datos inválidos']); exit;
}
// 1) Ajustar stock
$sign = ($tipo==='egreso') ? -1 : +1;
$sql = "
  UPDATE productos 
     SET stock = stock + (?*$sign), last_movimiento = NOW()
   WHERE id=? AND empresa_id=?
";
$stmt = $conn->prepare($sql);
$stmt->bind_param('iii', $cantidad, $idProducto, $idEmpresa);
$stmt->execute();
if ($stmt->affected_rows<1) {
  http_response_code(400);
  echo json_encode(['error'=>'No se actualizó stock']); exit;
}
// 2) Guardar en bitácora (opcional)
$b = $conn->prepare("
  INSERT INTO movimientos
    (producto_id, tipo, cantidad, fecha, empresa_id)
  VALUES (?,?,?,NOW(),?)
");
$b->bind_param('isii', $idProducto, $tipo, $cantidad, $idEmpresa);
$b->execute();
// OK
echo json_encode(['success'=>true]);
