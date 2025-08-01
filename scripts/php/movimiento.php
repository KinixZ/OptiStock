<?php
header('Content-Type: application/json');
ini_set('display_errors',1); error_reporting(E_ALL);

// 1) Conexión
$conn = new mysqli("localhost","u296155119_Admin","4Dmin123o","u296155119_OptiStock");
if($conn->connect_error){
  http_response_code(500);
  echo json_encode(['error'=>'Error de conexión']);
  exit;
}

// 2) Sólo POST
if($_SERVER['REQUEST_METHOD']!=='POST'){
  http_response_code(405);
  echo json_encode(['error'=>'Método no permitido']);
  exit;
}

// 3) Leer JSON
$data = json_decode(file_get_contents('php://input'), true) ?: [];
$empresa_id  = intval($data['empresa_id']  ?? 0);
$producto_id = intval($data['producto_id'] ?? 0);
$cantidad    = intval($data['cantidad']    ?? 0);
$tipo        = $data['tipo'] ?? '';    // 'ingreso' o 'egreso'

// 4) Validar
if($empresa_id<=0 || $producto_id<=0 || $cantidad<=0 ||
   !in_array($tipo,['ingreso','egreso'], true)){
  http_response_code(400);
  echo json_encode(['error'=>'Datos inválidos']);
  exit;
}

// 5) Calcular signo
$delta = ($tipo==='ingreso') ? $cantidad : -$cantidad;

// 6) Ejecutar UPDATE
$stmt = $conn->prepare(
  "UPDATE productos
     SET stock = stock + ?, last_movimiento = NOW()
   WHERE id=? AND empresa_id=?"
);
$stmt->bind_param('iii', $delta, $producto_id, $empresa_id);
if(!$stmt->execute()){
  http_response_code(500);
  echo json_encode(['error'=>'No se pudo registrar movimiento']);
  exit;
}

// 7) Responder éxito
echo json_encode(['success'=>true]);
