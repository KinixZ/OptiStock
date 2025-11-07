<?php
header('Content-Type: application/json');

$response = [
    'success' => false,
    'message' => '',
    'record' => null
];

function sanitize_permissions_list($list) {
    if (!is_array($list)) {
        return [];
    }

    $sanitized = [];
    foreach ($list as $value) {
        if (!is_string($value)) {
            $value = $value !== null ? strval($value) : '';
        }
        $value = trim($value);
        if ($value !== '' && !in_array($value, $sanitized, true)) {
            $sanitized[] = $value;
        }
    }

    return $sanitized;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $idEmpresa = isset($input['id_empresa']) ? $input['id_empresa'] : null;
    $rol = isset($input['rol']) ? trim($input['rol']) : '';
    $activos = isset($input['activos']) ? sanitize_permissions_list($input['activos']) : [];
    $conocidos = isset($input['conocidos']) && $input['conocidos'] !== null
        ? sanitize_permissions_list($input['conocidos'])
        : null;

    if ($idEmpresa === null || $idEmpresa === '') {
        throw new Exception('El identificador de la empresa es obligatorio.');
    }

    if (!is_numeric($idEmpresa)) {
        $idEmpresa = trim($idEmpresa);
        if ($idEmpresa === '') {
            throw new Exception('El identificador de la empresa es obligatorio.');
        }
    }

    if ($rol === '') {
        throw new Exception('El rol es obligatorio.');
    }

    $conn = new mysqli('localhost', 'u296155119_Admin', '4Dmin123o', 'u296155119_OptiStock');
    if ($conn->connect_error) {
        throw new Exception('Error de conexión: ' . $conn->connect_error);
    }

    $activosJson = json_encode($activos, JSON_UNESCAPED_UNICODE);
    $conocidosJson = $conocidos !== null ? json_encode($conocidos, JSON_UNESCAPED_UNICODE) : null;

    $stmt = $conn->prepare('INSERT INTO roles_permisos (id_empresa, rol, permisos_activos, permisos_conocidos, actualizado_en) VALUES (?, ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE permisos_activos = VALUES(permisos_activos), permisos_conocidos = VALUES(permisos_conocidos), actualizado_en = NOW()');
    if (!$stmt) {
        throw new Exception('No se pudo preparar la consulta de guardado.');
    }

    $stmt->bind_param('isss', $idEmpresa, $rol, $activosJson, $conocidosJson);
    $stmt->execute();
    $stmt->close();

    $stmtSelect = $conn->prepare('SELECT permisos_activos, permisos_conocidos, actualizado_en FROM roles_permisos WHERE id_empresa = ? AND rol = ? LIMIT 1');
    if (!$stmtSelect) {
        throw new Exception('No se pudo recuperar la configuración actualizada.');
    }

    $stmtSelect->bind_param('is', $idEmpresa, $rol);
    $stmtSelect->execute();
    $resultado = $stmtSelect->get_result();
    $registro = $resultado ? $resultado->fetch_assoc() : null;
    $stmtSelect->close();
    $conn->close();

    if (!$registro) {
        throw new Exception('No se pudo recuperar la configuración guardada.');
    }

    $permisosActivos = [];
    if (!empty($registro['permisos_activos'])) {
        $decoded = json_decode($registro['permisos_activos'], true);
        if (is_array($decoded)) {
            $permisosActivos = array_values(array_filter(array_map('strval', $decoded)));
        }
    }

    $permisosConocidos = null;
    if (!empty($registro['permisos_conocidos'])) {
        $decodedConocidos = json_decode($registro['permisos_conocidos'], true);
        if (is_array($decodedConocidos)) {
            $permisosConocidos = array_values(array_filter(array_map('strval', $decodedConocidos)));
        }
    }

    $timestamp = null;
    if (!empty($registro['actualizado_en'])) {
        $parsed = strtotime($registro['actualizado_en']);
        if ($parsed !== false) {
            $timestamp = $parsed * 1000;
        }
    }

    $response['success'] = true;
    $response['message'] = 'Permisos del rol guardados correctamente.';
    $response['record'] = [
        'rol' => $rol,
        'activos' => $permisosActivos,
        'conocidos' => $permisosConocidos,
        'actualizado' => $timestamp
    ];
} catch (Exception $e) {
    $response['success'] = false;
    $response['message'] = $e->getMessage();
}

echo json_encode($response);
