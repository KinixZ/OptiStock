<?php
require_once __DIR__ . '/../connection.php';

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
    $conn->beginTransaction();

    switch ($method) {
        case 'GET':
            // Obtener todas las zonas con sus subniveles
            $stmt = $conn->prepare("
                SELECT z.*, a.nombre as area_nombre 
                FROM zonas z
                LEFT JOIN areas a ON z.area_id = a.id
                ORDER BY z.nombre
            ");
            $stmt->execute();
            $zonas = $stmt->fetchAll();
            
            // Obtener subniveles para cada zona
            foreach ($zonas as &$zona) {
                $stmt = $conn->prepare("
                    SELECT * FROM subniveles 
                    WHERE zona_id = :zona_id 
                    ORDER BY numero_subnivel
                ");
                $stmt->bindParam(':zona_id', $zona['id'], PDO::PARAM_INT);
                $stmt->execute();
                $zona['subniveles'] = $stmt->fetchAll();
            }
            
            echo json_encode($zonas);
            break;
            
        case 'POST':
        case 'PUT':
            // Crear o actualizar zona
            $id = ($method === 'PUT') ? ($_GET['id'] ?? null) : null;
            $nombre = $data['nombre'] ?? '';
            $ancho = $data['ancho'] ?? 0;
            $alto = $data['alto'] ?? 0;
            $largo = $data['largo'] ?? 0;
            $tipo = $data['tipo_almacenamiento'] ?? '';
            $area_id = !empty($data['area_id']) ? $data['area_id'] : null;
            $subniveles = $data['subniveles'] ?? [];
            
            // Validaciones
            if (empty($nombre) || empty($tipo) || $ancho <= 0 || $alto <= 0 || $largo <= 0) {
                throw new Exception("Todos los campos principales son obligatorios con valores válidos");
            }
            
            if ($method === 'PUT' && empty($id)) {
                throw new Exception("ID es obligatorio para actualización");
            }
            
            // Insertar o actualizar zona
            if ($method === 'POST') {
                $stmt = $conn->prepare("
                    INSERT INTO zonas 
                    (nombre, area_id, ancho, alto, largo, tipo_almacenamiento) 
                    VALUES 
                    (:nombre, :area_id, :ancho, :alto, :largo, :tipo)
                ");
            } else {
                $stmt = $conn->prepare("
                    UPDATE zonas SET 
                    nombre = :nombre, 
                    area_id = :area_id, 
                    ancho = :ancho, 
                    alto = :alto, 
                    largo = :largo, 
                    tipo_almacenamiento = :tipo 
                    WHERE id = :id
                ");
                $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            }
            
            $stmt->bindParam(':nombre', $nombre, PDO::PARAM_STR);
            $stmt->bindParam(':area_id', $area_id, PDO::PARAM_INT);
            $stmt->bindParam(':ancho', $ancho);
            $stmt->bindParam(':alto', $alto);
            $stmt->bindParam(':largo', $largo);
            $stmt->bindParam(':tipo', $tipo, PDO::PARAM_STR);
            $stmt->execute();
            
            $zona_id = ($method === 'POST') ? $conn->lastInsertId() : $id;
            
            // Manejar subniveles
            if ($method === 'PUT') {
                // Eliminar subniveles antiguos
                $stmt = $conn->prepare("DELETE FROM subniveles WHERE zona_id = :zona_id");
                $stmt->bindParam(':zona_id', $zona_id, PDO::PARAM_INT);
                $stmt->execute();
            }
            
            // Insertar nuevos subniveles
            foreach ($subniveles as $subnivel) {
                $stmt = $conn->prepare("
                    INSERT INTO subniveles 
                    (zona_id, numero_subnivel, ancho, alto, largo, distancia) 
                    VALUES 
                    (:zona_id, :numero, :ancho, :alto, :largo, :distancia)
                ");
                $stmt->bindParam(':zona_id', $zona_id, PDO::PARAM_INT);
                $stmt->bindParam(':numero', $subnivel['numero_subnivel'], PDO::PARAM_INT);
                $stmt->bindParam(':ancho', $subnivel['ancho']);
                $stmt->bindParam(':alto', $subnivel['alto']);
                $stmt->bindParam(':largo', $subnivel['largo']);
                $stmt->bindParam(':distancia', $subnivel['distancia']);
                $stmt->execute();
            }
            
            $conn->commit();
            
            echo json_encode([
                'success' => true,
                'id' => $zona_id,
                'message' => ($method === 'POST') ? 'Zona creada correctamente' : 'Zona actualizada correctamente'
            ]);
            break;
            
        case 'DELETE':
            // Eliminar zona
            $id = $_GET['id'] ?? null;
            if (empty($id)) {
                throw new Exception("ID es obligatorio");
            }
            
            // Eliminar subniveles (se eliminan en cascada por la FK)
            $stmt = $conn->prepare("DELETE FROM zonas WHERE id = :id");
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt->execute();
            
            $conn->commit();
            
            echo json_encode([
                'success' => true,
                'message' => 'Zona eliminada correctamente'
            ]);
            break;
            
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Método no permitido']);
            break;
    }
} catch (PDOException $e) {
    $conn->rollBack();
    http_response_code(500);
    echo json_encode(['error' => 'Error en la base de datos: ' . $e->getMessage()]);
} catch (Exception $e) {
    $conn->rollBack();
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>