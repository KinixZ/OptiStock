<?php
$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";

$conn = mysqli_connect($servername, $db_user, $db_pass, $database);
if (!$conn) {
    echo json_encode(["success" => false, "message" => "Error de conexión"]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);

$id_empresa = $data['id_empresa'] ?? null;
$color_sidebar = $data['color_sidebar'] ?? null;
$color_topbar = $data['color_topbar'] ?? null;
$orden_sidebar = $data['orden_sidebar'] ?? null; // JSON string o array JSON

if (!$id_empresa || !$color_sidebar || !$color_topbar || !$orden_sidebar) {
    echo json_encode(['success' => false, 'message' => 'Faltan datos obligatorios']);
    exit;
}

try {
    // Convertir orden_sidebar a JSON si es array
    if (is_array($orden_sidebar)) {
        $orden_sidebar = json_encode($orden_sidebar);
    }

    $stmt = $conn->prepare("UPDATE configuracion_empresa SET color_sidebar = ?, color_topbar = ?, orden_sidebar = ? WHERE id_empresa = ?");
    $stmt->bind_param("sssi", $color_sidebar, $color_topbar, $orden_sidebar, $id_empresa);
    $stmt->execute();

    if ($stmt->affected_rows > 0) {
        echo json_encode(['success' => true, 'message' => 'Configuración actualizada']);
    } else {
        echo json_encode(['success' => false, 'message' => 'No se actualizó ningún dato']);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error: '.$e->getMessage()]);
}
