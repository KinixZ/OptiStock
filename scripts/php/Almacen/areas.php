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

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type");

session_start();
if (!isset($_SESSION['usuario_id'])) {
    die(json_encode(['error' => 'No autenticado']));
}

$method = $_SERVER['REQUEST_METHOD'];
$data = json_decode(file_get_contents("php://input"), true);

try {
    switch ($method) {
        case 'GET':
            // Obtener todas las áreas
            $stmt = $conn->prepare("SELECT * FROM areas ORDER BY nombre");
            $stmt->execute();
            $areas = $stmt->fetchAll();
            echo json_encode($areas);
            break;
            
        case 'POST':
            // Crear nueva área
            $nombre = $data['nombre'] ?? '';
            if (empty($nombre)) {
                throw new Exception("El nombre del área es obligatorio");
            }
            
            $stmt = $conn->prepare("INSERT INTO areas (nombre) VALUES (:nombre)");
            $stmt->bindParam(':nombre', $nombre, PDO::PARAM_STR);
            $stmt->execute();
            
            echo json_encode([
                'id' => $conn->lastInsertId(),
                'nombre' => $nombre,
                'message' => 'Área creada correctamente'
            ]);
            break;
            
        case 'PUT':
            // Actualizar área
            $id = $_GET['id'] ?? null;
            $nombre = $data['nombre'] ?? '';
            
            if (empty($id) || empty($nombre)) {
                throw new Exception("ID y nombre son obligatorios");
            }
            
            $stmt = $conn->prepare("UPDATE areas SET nombre = :nombre WHERE id = :id");
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt->bindParam(':nombre', $nombre, PDO::PARAM_STR);
            $stmt->execute();
            
            echo json_encode([
                'success' => true,
                'message' => 'Área actualizada correctamente'
            ]);
            break;
            
        case 'DELETE':
            // Eliminar área
            $id = $_GET['id'] ?? null;
            if (empty($id)) {
                throw new Exception("ID es obligatorio");
            }
            
            // Verificar si hay zonas asociadas
            $stmt = $conn->prepare("SELECT COUNT(*) as count FROM zonas WHERE area_id = :id");
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt->execute();
            $result = $stmt->fetch();
            
            if ($result['count'] > 0) {
                // Desvincular zonas en lugar de eliminar
                $stmt = $conn->prepare("UPDATE zonas SET area_id = NULL WHERE area_id = :id");
                $stmt->bindParam(':id', $id, PDO::PARAM_INT);
                $stmt->execute();
            }
            
            // Eliminar área
            $stmt = $conn->prepare("DELETE FROM areas WHERE id = :id");
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt->execute();
            
            echo json_encode([
                'success' => true,
                'message' => 'Área eliminada correctamente'
            ]);
            break;
            
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Método no permitido']);
            break;
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error en la base de datos: ' . $e->getMessage()]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>