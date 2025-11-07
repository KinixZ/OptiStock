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

    $stmt = $conn->prepare('SELECT id_usuario, rol FROM usuario WHERE correo = ? LIMIT 1');
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
    $idUsuario = isset($row['id_usuario']) ? (int) $row['id_usuario'] : 0;

    $idEmpresa = null;
    $empresaNombre = null;

    if ($idUsuario > 0) {
        $stmtEmpresa = $conn->prepare('SELECT id_empresa, nombre_empresa FROM empresa WHERE usuario_creador = ? LIMIT 1');
        if ($stmtEmpresa) {
            $stmtEmpresa->bind_param('i', $idUsuario);
            $stmtEmpresa->execute();
            $resEmpresa = $stmtEmpresa->get_result();
            if ($resEmpresa && $resEmpresa->num_rows > 0) {
                $empresa = $resEmpresa->fetch_assoc();
                $idEmpresa = isset($empresa['id_empresa']) ? (int) $empresa['id_empresa'] : null;
                $empresaNombre = isset($empresa['nombre_empresa']) ? $empresa['nombre_empresa'] : null;
            }
            $stmtEmpresa->close();
        }

        if (!$idEmpresa) {
            $stmtAfiliacion = $conn->prepare('SELECT e.id_empresa, e.nombre_empresa FROM usuario_empresa ue INNER JOIN empresa e ON ue.id_empresa = e.id_empresa WHERE ue.id_usuario = ? LIMIT 1');
            if ($stmtAfiliacion) {
                $stmtAfiliacion->bind_param('i', $idUsuario);
                $stmtAfiliacion->execute();
                $resAfiliacion = $stmtAfiliacion->get_result();
                if ($resAfiliacion && $resAfiliacion->num_rows > 0) {
                    $empresa = $resAfiliacion->fetch_assoc();
                    $idEmpresa = isset($empresa['id_empresa']) ? (int) $empresa['id_empresa'] : null;
                    $empresaNombre = isset($empresa['nombre_empresa']) ? $empresa['nombre_empresa'] : null;
                }
                $stmtAfiliacion->close();
            }
        }
    }

    $response['success'] = true;
    $response['rol'] = $rol;
    $response['id_empresa'] = $idEmpresa;
    $response['empresa_nombre'] = $empresaNombre;
    $response['message'] = 'Rol obtenido correctamente.';

    $stmt->close();
    $conn->close();
} catch (Exception $e) {
    $response['success'] = false;
    $response['message'] = $e->getMessage();
}

echo json_encode($response);
