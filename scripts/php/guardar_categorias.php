<?php
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

$empresa_id = isset($_REQUEST['empresa_id'])
            ? intval($_REQUEST['empresa_id'])
            : 0;
if ($empresa_id <= 0) {
  http_response_code(400);
  echo json_encode(['error'=>'empresa_id es obligatorio']);
  exit;
}




$method = $_SERVER['REQUEST_METHOD'];

function getJsonInput(){
  $raw = file_get_contents('php://input');
  return json_decode($raw, true) ?: [];
}

if ($method==='GET') {
  $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
  if ($id) {
    $stmt = $conn->prepare(
      'SELECT * FROM categorias WHERE id=? AND empresa_id=?'
    );
    $stmt->bind_param('ii',$id,$empresa_id);
  } else {
    $stmt = $conn->prepare(
      'SELECT * FROM categorias WHERE empresa_id=?'
    );
    $stmt->bind_param('i',$empresa_id);
  }
  $stmt->execute();
  $res = $stmt->get_result();
  if ($id) {
    echo json_encode($res->fetch_assoc() ?: []);
  } else {
    echo json_encode($res->fetch_all(MYSQLI_ASSOC));
  }
  exit;
}

if ($method==='POST') {
  $data = getJsonInput();
  $nombre = $data['nombre']??'';
  $descripcion = $data['descripcion']??'';
  if (!$nombre) {
    http_response_code(400);
    echo json_encode(['error'=>'Nombre requerido']);
    exit;
  }
  $stmt = $conn->prepare(
    'INSERT INTO categorias (nombre,descripcion,empresa_id) VALUES (?,?,?)'
  );
  $stmt->bind_param('ssi',$nombre,$descripcion,$empresa_id);
  $stmt->execute();
  echo json_encode(['id'=>$stmt->insert_id]);
  exit;
}

if ($method==='PUT') {
  $id   = intval($_GET['id']??0);
  $data = getJsonInput();
  $nombre = $data['nombre']??'';
  $descripcion = $data['descripcion']??'';
  $stmt = $conn->prepare(
    'UPDATE categorias SET nombre=?,descripcion=? 
     WHERE id=? AND empresa_id=?'
  );
  $stmt->bind_param('ssii',$nombre,$descripcion,$id,$empresa_id);
  $stmt->execute();
  echo json_encode(['success'=>$stmt->affected_rows>0]);
  exit;
}

if ($method==='DELETE') {
  $id = intval($_GET['id']??0);
  $stmt = $conn->prepare(
    'DELETE FROM categorias WHERE id=? AND empresa_id=?'
  );
  $stmt->bind_param('ii',$id,$empresa_id);
  $stmt->execute();
  echo json_encode(['success'=>true]);
  exit;
}

http_response_code(405);
echo json_encode(['error'=>'Método no permitido']);
?>
