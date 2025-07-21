<?php
require_once __DIR__.'/../connection.php';

try {
    $method = $_SERVER['REQUEST_METHOD'];
    $input = json_decode(file_get_contents('php://input'), true);

    $conn->beginTransaction();

    switch ($method) {
        case 'GET':
            // Obtener todas las zonas con sus subniveles
            $stmt = $conn->prepare("
                SELECT z.*, a.nombre as area_nombre 
                FROM zonas z
                LEFT JOIN areas a ON z.area_id = a.id
                ORDER BY z.nombre ASC
            ");
            $stmt->execute();
            $zonas = $stmt->fetchAll();

            // Obtener subniveles para cada zona
            foreach ($zonas as &$zona) {
                $stmt = $conn->prepare("
                    SELECT * FROM subniveles 
                    WHERE zona_id = :zona_id 
                    ORDER BY numero_subnivel ASC
                ");
                $stmt->bindParam(':zona_id', $zona['id'], PDO::PARAM_INT);
                $stmt->execute();
                $zona['subniveles'] = $stmt->fetchAll();
            }

            echo json_encode([
                'success' => true,
                'data' => $zonas,
                'message' => count($zonas) . ' zonas encontradas'
            ]);
            break;

        case 'POST':
        case 'PUT':
            // Validación de datos básicos
            $requiredFields = ['nombre', 'ancho', 'alto', 'largo', 'tipo_almacenamiento'];
            foreach ($requiredFields as $field) {
                if (empty($input[$field])) {
                    throw new Exception("El campo $field es requerido");
                }
            }

            // Preparar datos de la zona
            $zonaData = [
                'nombre' => $input['nombre'],
                'ancho' => (float)$input['ancho'],
                'alto' => (float)$input['alto'],
                'largo' => (float)$input['largo'],
                'tipo_almacenamiento' => $input['tipo_almacenamiento'],
                'area_id' => !empty($input['area_id']) ? (int)$input['area_id'] : null
            ];

            if ($method === 'POST') {
                // Crear nueva zona
                $stmt = $conn->prepare("
                    INSERT INTO zonas 
                    (nombre, area_id, ancho, alto, largo, tipo_almacenamiento) 
                    VALUES 
                    (:nombre, :area_id, :ancho, :alto, :largo, :tipo_almacenamiento)
                ");
                $stmt->execute($zonaData);
                $zonaId = $conn->lastInsertId();
            } else {
                // Actualizar zona existente
                if (empty($_GET['id'])) {
                    throw new Exception("ID de zona es requerido para actualización");
                }
                $zonaId = (int)$_GET['id'];
                
                $stmt = $conn->prepare("
                    UPDATE zonas SET 
                    nombre = :nombre, 
                    area_id = :area_id, 
                    ancho = :ancho, 
                    alto = :alto, 
                    largo = :largo, 
                    tipo_almacenamiento = :tipo_almacenamiento 
                    WHERE id = :id
                ");
                $zonaData['id'] = $zonaId;
                $stmt->execute($zonaData);

                // Eliminar subniveles existentes
                $stmt = $conn->prepare("DELETE FROM subniveles WHERE zona_id = :zona_id");
                $stmt->bindParam(':zona_id', $zonaId, PDO::PARAM_INT);
                $stmt->execute();
            }

            // Insertar subniveles
            if (!empty($input['subniveles']) && is_array($input['subniveles'])) {
                $stmt = $conn->prepare("
                    INSERT INTO subniveles 
                    (zona_id, numero_subnivel, ancho, alto, largo, distancia) 
                    VALUES 
                    (:zona_id, :numero_subnivel, :ancho, :alto, :largo, :distancia)
                ");

                foreach ($input['subniveles'] as $subnivel) {
                    $stmt->execute([
                        'zona_id' => $zonaId,
                        'numero_subnivel' => (int)$subnivel['numero_subnivel'],
                        'ancho' => (float)$subnivel['ancho'],
                        'alto' => (float)$subnivel['alto'],
                        'largo' => (float)$subnivel['largo'],
                        'distancia' => isset($subnivel['distancia']) ? (float)$subnivel['distancia'] : 0
                    ]);
                }
            }

            $conn->commit();

            echo json_encode([
                'success' => true,
                'data' => ['id' => $zonaId],
                'message' => ($method === 'POST') ? 'Zona creada exitosamente' : 'Zona actualizada correctamente'
            ]);
            break;

        case 'DELETE':
            // Eliminar zona
            if (empty($_GET['id'])) {
                throw new Exception("ID de zona es requerido");
            }

            // Las relaciones CASCADE eliminarán los subniveles automáticamente
            $stmt = $conn->prepare("DELETE FROM zonas WHERE id = :id");
            $stmt->bindParam(':id', $_GET['id'], PDO::PARAM_INT);
            $stmt->execute();

            $conn->commit();

            echo json_encode([
                'success' => true,
                'message' => 'Zona eliminada correctamente'
            ]);
            break;

        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido']);
            break;
    }
} catch (PDOException $e) {
    $conn->rollBack();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error en la base de datos',
        'error' => $e->getMessage()
    ]);
} catch (Exception $e) {
    $conn->rollBack();
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>