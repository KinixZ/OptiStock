<?php
header('Content-Type: application/json');

$response = [
    'success' => false,
    'message' => '',
    'rol' => null
];

try {
    $data = json_decode(file_get_contents('php://input'), true);
    $email = isset($data['email']) ? trim($data['email']) : '';

    if ($email === '') {
        throw new Exception('Correo no proporcionado.');
    }

    $conn = new mysqli('localhost', 'u296155119_Admin', '4Dmin123o', 'u296155119_OptiStock');
    if ($conn->connect_error) {
        throw new Exception('Error de conexión: ' . $conn->connect_error);
    }

    $stmt = $conn->prepare('SELECT rol FROM usuario WHERE correo = ? LIMIT 1');
    if (!$stmt) {
        throw new Exception('No se pudo preparar la consulta.');
    }

    $stmt->bind_param('s', $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        throw new Exception('El correo no está registrado.');
    }

    $row = $result->fetch_assoc();
    $rol = isset($row['rol']) ? trim($row['rol']) : '';

    $response['success'] = true;
    $response['rol'] = $rol;
    $response['message'] = 'Rol obtenido correctamente.';

    $stmt->close();
    $conn->close();
} catch (Exception $e) {
    $response['success'] = false;
    $response['message'] = $e->getMessage();
}

echo json_encode($response);
