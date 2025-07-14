<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['usuario_id'])) {
    echo json_encode(['success'=>false,'message'=>'Sesión no válida']); exit;
}
$id_usuario = intval($_SESSION['usuario_id']);

if (!isset($_FILES['fotoPerfil'])) {
    echo json_encode(['success'=>false,'message'=>'Archivo no recibido']); exit;
}

/* Validación de tamaño y tipo */
$allowed = ['image/jpeg'=>'jpg','image/png'=>'png'];
$mime = mime_content_type($_FILES['fotoPerfil']['tmp_name']);

if (!isset($allowed[$mime])) {
    echo json_encode(['success'=>false,'message'=>'Formato no permitido (solo JPG/PNG)']); exit;
}
if ($_FILES['fotoPerfil']['size'] > 2*1024*1024) {
    echo json_encode(['success'=>false,'message'=>'Archivo excede 2 MB']); exit;
}

/* Carpeta destino */
$relDir = 'images/profiles';
$absDir = $_SERVER['DOCUMENT_ROOT'].'/'.$relDir;
if (!is_dir($absDir)) mkdir($absDir,0755,true);

$ext = $allowed[$mime];
$filename   = $id_usuario.'.'.$ext;           // 57.jpg
$destinoAbs = $absDir.'/'.$filename;
$destinoRel = '/'.$relDir.'/'.$filename;

/* Guardar archivo */
if (!move_uploaded_file($_FILES['fotoPerfil']['tmp_name'], $destinoAbs)) {
    echo json_encode(['success'=>false,'message'=>'Error guardando la foto']); exit;
}

/* Actualizar BD */
$conn = mysqli_connect("localhost","u296155119_Admin","4Dmin123o","u296155119_OptiStock");
$stmt = $conn->prepare("UPDATE usuario SET foto_perfil=? WHERE id_usuario=?");
$stmt->bind_param("si",$destinoRel,$id_usuario);
$stmt->execute();

echo json_encode(['success'=>true,'foto_perfil'=>$destinoRel,'message'=>'Foto actualizada']);
?>
