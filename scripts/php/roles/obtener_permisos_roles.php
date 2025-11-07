<?php
header('Content-Type: application/json');

$response = [
    'success' => false,
    'message' => '',
    'data' => []
];

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $idEmpresa = isset($input['id_empresa']) ? $input['id_empresa'] : null;

    if ($idEmpresa === null || $idEmpresa === '') {
        throw new Exception('El identificador de la empresa es obligatorio.');
    }

    if (!is_numeric($idEmpresa)) {
        $idEmpresa = trim($idEmpresa);
        if ($idEmpresa === '') {
            throw new Exception('El identificador de la empresa es obligatorio.');
        }
    }

    $conn = new mysqli('localhost', 'u296155119_Admin', '4Dmin123o', 'u296155119_OptiStock');
    if ($conn->connect_error) {
        throw new Exception('Error de conexión: ' . $conn->connect_error);
    }

    $stmt = $conn->prepare('SELECT rol, permisos_activos, permisos_conocidos, actualizado_en FROM roles_permisos WHERE id_empresa = ? ORDER BY rol');
    if (!$stmt) {
        throw new Exception('No se pudo preparar la consulta.');
    }

    $stmt->bind_param('i', $idEmpresa);
    $stmt->execute();
    $result = $stmt->get_result();

    $registros = [];
    while ($row = $result->fetch_assoc()) {
        $activos = [];
        if (!empty($row['permisos_activos'])) {
            $decoded = json_decode($row['permisos_activos'], true);
            if (is_array($decoded)) {
                $activos = array_values(array_filter(array_map('strval', $decoded)));
            }
        }

        $conocidos = null;
        if (!empty($row['permisos_conocidos'])) {
            $decodedConocidos = json_decode($row['permisos_conocidos'], true);
            if (is_array($decodedConocidos)) {
                $conocidos = array_values(array_filter(array_map('strval', $decodedConocidos)));
            }
        }

        $timestamp = null;
        if (!empty($row['actualizado_en'])) {
            $parsed = strtotime($row['actualizado_en']);
            if ($parsed !== false) {
                $timestamp = $parsed * 1000;
            }
        }

        $registros[] = [
            'rol' => $row['rol'],
            'activos' => $activos,
            'conocidos' => $conocidos,
            'actualizado' => $timestamp
        ];
    }

    $stmt->close();
    $conn->close();

    $response['success'] = true;
    $response['data'] = $registros;
    $response['message'] = $registros ? 'Configuración recuperada correctamente.' : 'No hay permisos configurados para esta empresa.';
} catch (Exception $e) {
    $response['success'] = false;
    $response['message'] = $e->getMessage();
}

echo json_encode($response);
