<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['usuario_id'])) {
    echo json_encode([
        'success' => false,
        'message' => 'Sesión no válida. Inicia sesión nuevamente.'
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

function ensureRecentSearchesTable(mysqli $conn): bool
{
    $sql = "CREATE TABLE IF NOT EXISTS busquedas_recientes_empresa (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        id_empresa INT NOT NULL,
        termino VARCHAR(255) NOT NULL,
        ultima_busqueda DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        total_coincidencias INT UNSIGNED NOT NULL DEFAULT 1,
        PRIMARY KEY (id),
        UNIQUE KEY uniq_empresa_termino (id_empresa, termino),
        CONSTRAINT fk_recientes_empresa FOREIGN KEY (id_empresa) REFERENCES empresa(id_empresa) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

    return $conn->query($sql) === true;
}

function resolveEmpresaId(mysqli $conn, int $userId, int $requestedId): int
{
    if ($requestedId > 0) {
        $sql = "SELECT e.id_empresa
                FROM empresa e
                LEFT JOIN usuario_empresa ue ON ue.id_empresa = e.id_empresa
                WHERE e.id_empresa = ? AND (e.usuario_creador = ? OR ue.id_usuario = ?)
                LIMIT 1";

        if ($stmt = $conn->prepare($sql)) {
            $stmt->bind_param('iii', $requestedId, $userId, $userId);
            $stmt->execute();
            $stmt->bind_result($empresaId);
            if ($stmt->fetch()) {
                $stmt->close();
                return (int) $empresaId;
            }
            $stmt->close();
        }
    }

    $sql = "SELECT e.id_empresa
            FROM empresa e
            LEFT JOIN usuario_empresa ue ON ue.id_empresa = e.id_empresa
            WHERE e.usuario_creador = ? OR ue.id_usuario = ?
            ORDER BY e.fecha_registro DESC
            LIMIT 1";

    if ($stmt = $conn->prepare($sql)) {
        $stmt->bind_param('ii', $userId, $userId);
        $stmt->execute();
        $stmt->bind_result($empresaId);
        if ($stmt->fetch()) {
            $stmt->close();
            return (int) $empresaId;
        }
        $stmt->close();
    }

    return 0;
}

$userId = (int) $_SESSION['usuario_id'];
$requestedEmpresaId = isset($_GET['id_empresa']) ? (int) $_GET['id_empresa'] : 0;

$idEmpresa = resolveEmpresaId($conn, $userId, $requestedEmpresaId);

if ($idEmpresa <= 0) {
    $conn->close();
    echo json_encode([
        'success' => false,
        'message' => 'No se encontró una empresa asociada a tu usuario.'
    ]);
    exit;
}

if (!ensureHistoryTable($conn) || !ensureRecentSearchesTable($conn)) {
    $conn->close();
    echo json_encode([
        'success' => false,
        'message' => 'No se pudo preparar la tabla de historial de búsquedas.'
    ]);
    exit;
}

$historial = [];
$sql = "SELECT termino, ultima_busqueda
        FROM busquedas_recientes_empresa
        WHERE id_empresa = ?
        ORDER BY ultima_busqueda DESC
        LIMIT 5";

if ($stmt = $conn->prepare($sql)) {
    $stmt->bind_param('i', $idEmpresa);
    $stmt->execute();
    $result = $stmt->get_result();

    while ($row = $result->fetch_assoc()) {
        $historial[] = [
            'termino' => $row['termino'],
            'fecha_busqueda' => $row['ultima_busqueda']
        ];
    }

    $stmt->close();
}

$conn->close();

echo json_encode([
    'success' => true,
    'historial' => $historial
], JSON_UNESCAPED_UNICODE);
