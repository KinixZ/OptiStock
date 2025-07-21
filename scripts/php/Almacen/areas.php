<?php
require_once __DIR__.'/../connection.php';

try {
    $method = $_SERVER['REQUEST_METHOD'];
    $input = json_decode(file_get_contents('php://input'), true);

    switch ($method) {
        case 'GET':
            // Listar todas las áreas
            $stmt = $conn->prepare("SELECT * FROM areas ORDER BY nombre ASC");
            $stmt->execute();
            $areas = $stmt->fetchAll();

            echo json_encode([
                'success' => true,
                'data' => $areas,
                'message' => count($areas) . ' áreas encontradas'
            ]);
            break;

        case 'POST':
            // Crear nueva área
            if (empty($input['nombre'])) {
                throw new Exception("El nombre del área es requerido");
            }

            $stmt = $conn->prepare("INSERT INTO areas (nombre) VALUES (:nombre)");
            $stmt->bindParam(':nombre', $input['nombre'], PDO::PARAM_STR);
            $stmt->execute();

            $nuevaArea = [
                'id' => $conn->lastInsertId(),
                'nombre' => $input['nombre']
            ];

            echo json_encode([
                'success' => true,
                'data' => $nuevaArea,
                'message' => 'Área creada exitosamente'
            ]);
            break;

        case 'PUT':
            // Actualizar área
            if (empty($_GET['id']) || empty($input['nombre'])) {
                throw new Exception("ID y nombre son requeridos");
            }

            $stmt = $conn->prepare("UPDATE areas SET nombre = :nombre WHERE id = :id");
            $stmt->bindParam(':id', $_GET['id'], PDO::PARAM_INT);
            $stmt->bindParam(':nombre', $input['nombre'], PDO::PARAM_STR);
            $stmt->execute();

            echo json_encode([
                'success' => true,
                'message' => 'Área actualizada correctamente'
            ]);
            break;

        case 'DELETE':
            // Eliminar área
            if (empty($_GET['id'])) {
                throw new Exception("ID del área es requerido");
            }

            // Primero desvincular zonas asociadas
            $stmt = $conn->prepare("UPDATE zonas SET area_id = NULL WHERE area_id = :id");
            $stmt->bindParam(':id', $_GET['id'], PDO::PARAM_INT);
            $stmt->execute();

            // Luego eliminar el área
            $stmt = $conn->prepare("DELETE FROM areas WHERE id = :id");
            $stmt->bindParam(':id', $_GET['id'], PDO::PARAM_INT);
            $stmt->execute();

            echo json_encode([
                'success' => true,
                'message' => 'Área eliminada correctamente'
            ]);
            break;

        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido']);
            break;
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error en la base de datos',
        'error' => $e->getMessage()
    ]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>