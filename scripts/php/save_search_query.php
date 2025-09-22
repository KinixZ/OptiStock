<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode([
        'success' => false,
        'message' => 'Método no permitido.'
    ]);
    exit;
}

if (!isset($_SESSION['usuario_id'])) {
    echo json_encode([
        'success' => false,
        'message' => 'Sesión no válida. Inicia sesión nuevamente.'
    ]);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$termino = isset($input['termino']) ? trim((string) $input['termino']) : '';
$idEmpresa = isset($input['id_empresa']) ? (int) $input['id_empresa'] : 0;
$usuarioId = (int) $_SESSION['usuario_id'];

if ($termino === '' || $idEmpresa <= 0) {
    echo json_encode([
        'success' => false,
        'message' => 'Información incompleta para registrar la búsqueda.'
    ]);
    exit;
}

$servername = "localhost";
$username   = "u296155119_Admin";
$password   = "4Dmin123o";
$database   = "u296155119_OptiStock";

$conn = new mysqli($servername, $username, $password, $database);

if ($conn->connect_error) {
    echo json_encode([
        'success' => false,
        'message' => 'Error de conexión a la base de datos.'
    ]);
    exit;
}

$conn->set_charset('utf8mb4');

function ensureHistoryTable(mysqli $conn): bool
{
    $sql = "CREATE TABLE IF NOT EXISTS historial_busquedas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_empresa INT NOT NULL,
        id_usuario INT NOT NULL,
        termino VARCHAR(255) NOT NULL,
        fecha_busqueda DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_empresa_fecha (id_empresa, fecha_busqueda),
        CONSTRAINT fk_historial_empresa FOREIGN KEY (id_empresa) REFERENCES empresa(id_empresa) ON DELETE CASCADE,
        CONSTRAINT fk_historial_usuario FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

    return $conn->query($sql) === true;
}

function usuarioPerteneceAEmpresa(mysqli $conn, int $empresaId, int $usuarioId): bool
{
    $sql = "SELECT 1
            FROM empresa e
            LEFT JOIN usuario_empresa ue ON ue.id_empresa = e.id_empresa
            WHERE e.id_empresa = ? AND (e.usuario_creador = ? OR ue.id_usuario = ?)
            LIMIT 1";

    if ($stmt = $conn->prepare($sql)) {
        $stmt->bind_param('iii', $empresaId, $usuarioId, $usuarioId);
        $stmt->execute();
        $stmt->store_result();
        $pertenece = $stmt->num_rows > 0;
        $stmt->close();
        return $pertenece;
    }

    return false;
}

if (!ensureHistoryTable($conn)) {
    $conn->close();
    echo json_encode([
        'success' => false,
        'message' => 'No se pudo preparar la tabla de historial de búsquedas.'
    ]);
    exit;
}

if (!usuarioPerteneceAEmpresa($conn, $idEmpresa, $usuarioId)) {
    $conn->close();
    echo json_encode([
        'success' => false,
        'message' => 'No tienes permisos para registrar búsquedas en esta empresa.'
    ]);
    exit;
}

$termino = mb_substr($termino, 0, 255, 'UTF-8');

if ($stmt = $conn->prepare('INSERT INTO historial_busquedas (id_empresa, id_usuario, termino) VALUES (?, ?, ?)')) {
    $stmt->bind_param('iis', $idEmpresa, $usuarioId, $termino);
    $stmt->execute();
    $stmt->close();
}

$historial = [];
$sql = "SELECT termino, fecha_busqueda
        FROM historial_busquedas
        WHERE id_empresa = ?
        ORDER BY fecha_busqueda DESC
        LIMIT 5";

if ($stmt = $conn->prepare($sql)) {
    $stmt->bind_param('i', $idEmpresa);
    $stmt->execute();
    $result = $stmt->get_result();

    while ($row = $result->fetch_assoc()) {
        $historial[] = [
            'termino' => $row['termino'],
            'fecha_busqueda' => $row['fecha_busqueda']
        ];
    }

    $stmt->close();
}

$conn->close();

echo json_encode([
    'success' => true,
    'historial' => $historial
], JSON_UNESCAPED_UNICODE);
