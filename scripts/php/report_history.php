<?php
// scripts/php/report_history.php
// Gestiona el historial de reportes utilizando almacenamiento local en el servidor.

declare(strict_types=1);

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

const REPORT_RETENTION_DAYS = 60; // Se eliminan automáticamente después de ~2 meses.
const REPORT_RETENTION_SECONDS = REPORT_RETENTION_DAYS * 24 * 60 * 60;
const REPORTS_ROOT = __DIR__ . '/../../docs/report-history';
const REPORT_FILES_DIR = REPORTS_ROOT . '/files';
const REPORT_INDEX_FILE = REPORTS_ROOT . '/index.json';

const DB_SERVER = 'localhost';
const DB_USER = 'u296155119_Admin';
const DB_PASSWORD = '4Dmin123o';
const DB_NAME = 'u296155119_OptiStock';

const MIME_EXTENSION_MAP = [
    'application/pdf' => '.pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' => '.xlsx',
    'application/vnd.ms-excel' => '.xls',
    'text/csv' => '.csv',
];

function respond_json(int $statusCode, array $payload): void
{
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function ensure_storage(): void
{
    if (!is_dir(REPORTS_ROOT)) {
        mkdir(REPORTS_ROOT, 0775, true);
    }
    if (!is_dir(REPORT_FILES_DIR)) {
        mkdir(REPORT_FILES_DIR, 0775, true);
    }
    if (!file_exists(REPORT_INDEX_FILE)) {
        file_put_contents(REPORT_INDEX_FILE, "[]\n", LOCK_EX);
    }
}

function read_index(): array
{
    ensure_storage();
    $raw = @file_get_contents(REPORT_INDEX_FILE);
    if ($raw === false) {
        return [];
    }

    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function write_index(array $index): void
{
    ensure_storage();
    file_put_contents(REPORT_INDEX_FILE, json_encode($index, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
}

function db_connect(): mysqli
{
    $conn = new mysqli(DB_SERVER, DB_USER, DB_PASSWORD, DB_NAME);
    $conn->set_charset('utf8mb4');
    return $conn;
}

function to_mysql_datetime(string $iso): string
{
    $timestamp = strtotime($iso);
    if ($timestamp === false) {
        $timestamp = time();
    }

    return date('Y-m-d H:i:s', $timestamp);
}

function insert_report_reference(array $entry, int $empresaId): void
{
    $uuid = (string) ($entry['id'] ?? '');
    $originalName = (string) ($entry['originalName'] ?? '');
    $storageName = (string) ($entry['storageName'] ?? '');
    $mimeType = (string) ($entry['mimeType'] ?? '');
    $size = (int) ($entry['size'] ?? 0);
    $createdAt = (string) ($entry['createdAt'] ?? '');
    $expiresAt = (string) ($entry['expiresAt'] ?? '');
    $source = trim((string) ($entry['source'] ?? ''));
    $notes = trim((string) ($entry['notes'] ?? ''));

    if ($uuid === '' || $originalName === '' || $storageName === '') {
        throw new RuntimeException('Faltan datos obligatorios para registrar el reporte.');
    }

    $conn = db_connect();

    try {
        $stmt = $conn->prepare(
            'INSERT INTO reportes_historial (
                uuid, id_empresa, original_name, storage_name, mime_type, file_size, created_at, expires_at, source, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                original_name = VALUES(original_name),
                storage_name = VALUES(storage_name),
                mime_type = VALUES(mime_type),
                file_size = VALUES(file_size),
                created_at = VALUES(created_at),
                expires_at = VALUES(expires_at),
                source = VALUES(source),
                notes = VALUES(notes)'
        );

        $createdAtSql = to_mysql_datetime($createdAt);
        $expiresAtSql = to_mysql_datetime($expiresAt);

        $stmt->bind_param(
            'sisssissss',
            $uuid,
            $empresaId,
            $originalName,
            $storageName,
            $mimeType,
            $size,
            $createdAtSql,
            $expiresAtSql,
            $source,
            $notes
        );

        $stmt->execute();
        $stmt->close();
    } finally {
        $conn->close();
    }
}

function delete_report_reference(?string $uuid): void
{
    $id = trim((string) $uuid);
    if ($id === '') {
        return;
    }

    try {
        $conn = db_connect();
    } catch (mysqli_sql_exception $exception) {
        error_log('No se pudo conectar a la base de datos para limpiar referencias de reportes: ' . $exception->getMessage());
        return;
    }

    try {
        $stmt = $conn->prepare('DELETE FROM reportes_historial WHERE uuid = ?');
        $stmt->bind_param('s', $id);
        $stmt->execute();
        $stmt->close();
    } catch (mysqli_sql_exception $exception) {
        error_log('No se pudo eliminar la referencia del reporte ' . $id . ': ' . $exception->getMessage());
    } finally {
        $conn->close();
    }
}

function remove_report_file(?string $storageName): void
{
    if (!$storageName) {
        return;
    }
    $filePath = REPORT_FILES_DIR . '/' . basename($storageName);
    if (is_file($filePath)) {
        @unlink($filePath);
    }
}

function cleanup_old_reports(?array $existing = null): array
{
    $reports = $existing ?? read_index();
    $now = time();
    $changed = false;
    $validReports = [];

    foreach ($reports as $report) {
        $createdAt = isset($report['createdAt']) ? strtotime((string) $report['createdAt']) : false;
        if ($createdAt === false) {
            $changed = true;
            remove_report_file($report['storageName'] ?? null);
            delete_report_reference($report['id'] ?? null);
            continue;
        }

        if (($now - $createdAt) >= REPORT_RETENTION_SECONDS) {
            $changed = true;
            remove_report_file($report['storageName'] ?? null);
            delete_report_reference($report['id'] ?? null);
            continue;
        }

        $validReports[] = $report;
    }

    if ($changed) {
        write_index($validReports);
    }

    return $validReports;
}

function random_id(): string
{
    try {
        return bin2hex(random_bytes(16));
    } catch (\Exception $exception) {
        $fallback = openssl_random_pseudo_bytes(16);
        if ($fallback !== false) {
            return bin2hex($fallback);
        }

        return bin2hex(pack('d', microtime(true)) . pack('d', mt_rand()));
    }
}

function sanitize_file_name(string $name): string
{
    $trimmed = trim($name);
    if ($trimmed === '') {
        return 'reporte';
    }

    $basename = basename($trimmed);
    $sanitized = preg_replace('/[\\\\\/\:*?"<>|]+/', '_', $basename);
    return $sanitized ?: 'reporte';
}

function ensure_extension(string $fileName, string $mimeType): string
{
    if (pathinfo($fileName, PATHINFO_EXTENSION)) {
        return $fileName;
    }
    $extension = MIME_EXTENSION_MAP[$mimeType] ?? '';
    return $fileName . $extension;
}

function str_limit(string $text, int $limit): string
{
    if (function_exists('mb_substr')) {
        return mb_substr($text, 0, $limit);
    }

    return substr($text, 0, $limit);
}

function list_reports(): void
{
    $empresaId = isset($_GET['empresa']) ? (int) $_GET['empresa'] : 0;
    $reports = cleanup_old_reports();

    if ($empresaId > 0) {
        $reports = array_values(array_filter(
            $reports,
            static fn ($report) => (int) ($report['empresaId'] ?? 0) === $empresaId
        ));
    }

    usort($reports, static function (array $a, array $b): int {
        $timeA = strtotime((string) ($a['createdAt'] ?? '')) ?: 0;
        $timeB = strtotime((string) ($b['createdAt'] ?? '')) ?: 0;
        return $timeB <=> $timeA;
    });

    respond_json(200, [
        'success' => true,
        'reports' => $reports,
        'retentionDays' => REPORT_RETENTION_DAYS,
    ]);
}

function save_report(): void
{
    $input = json_decode(file_get_contents('php://input') ?: 'null', true);
    if (!is_array($input)) {
        respond_json(400, [
            'success' => false,
            'message' => 'Solicitud inválida.',
        ]);
    }

    $fileName = isset($input['fileName']) ? (string) $input['fileName'] : '';
    $mimeType = isset($input['mimeType']) ? (string) $input['mimeType'] : '';
    $fileContent = isset($input['fileContent']) ? (string) $input['fileContent'] : '';
    $source = isset($input['source']) ? (string) $input['source'] : '';
    $notes = isset($input['notes']) ? (string) $input['notes'] : '';
    $empresaId = isset($input['empresaId']) ? (int) $input['empresaId'] : 0;

    if ($fileName === '' || $mimeType === '' || $fileContent === '') {
        respond_json(400, [
            'success' => false,
            'message' => 'Datos del archivo incompletos.',
        ]);
    }

    if ($empresaId <= 0) {
        respond_json(400, [
            'success' => false,
            'message' => 'Debes indicar una empresa válida para asociar el reporte.',
        ]);
    }

    $base64 = $fileContent;
    $markerPos = strpos($base64, 'base64,');
    if ($markerPos !== false) {
        $base64 = substr($base64, $markerPos + 7);
    }

    $binary = base64_decode($base64, true);
    if ($binary === false || $binary === '') {
        respond_json(400, [
            'success' => false,
            'message' => 'No se pudo procesar el archivo enviado.',
        ]);
    }

    ensure_storage();

    $safeName = sanitize_file_name($fileName);
    $finalName = ensure_extension($safeName, $mimeType);
    $extension = pathinfo($finalName, PATHINFO_EXTENSION);
    $storageName = time() . '-' . random_id();
    if ($extension !== '') {
        $storageName .= '.' . $extension;
    }
    $filePath = REPORT_FILES_DIR . '/' . $storageName;

    $written = file_put_contents($filePath, $binary, LOCK_EX);
    if ($written === false) {
        respond_json(500, [
            'success' => false,
            'message' => 'No se pudo guardar el archivo en el historial.',
        ]);
    }

    $nowIso = gmdate('c');
    $expiresIso = gmdate('c', time() + REPORT_RETENTION_SECONDS);

    $reports = cleanup_old_reports();
    $entry = [
        'id' => random_id(),
        'originalName' => $finalName,
        'mimeType' => $mimeType,
        'storageName' => $storageName,
        'size' => strlen($binary),
        'createdAt' => $nowIso,
        'expiresAt' => $expiresIso,
        'source' => str_limit($source, 120),
        'notes' => str_limit($notes, 240),
        'empresaId' => $empresaId,
    ];

    try {
        insert_report_reference($entry, $empresaId);
    } catch (Throwable $exception) {
        remove_report_file($storageName);
        respond_json(500, [
            'success' => false,
            'message' => 'No se pudo registrar el reporte en la base de datos.',
        ]);
    }

    $reports[] = $entry;
    write_index($reports);

    respond_json(201, [
        'success' => true,
        'report' => $entry,
        'retentionDays' => REPORT_RETENTION_DAYS,
    ]);
}

function download_report(): void
{
    $id = isset($_GET['id']) ? (string) $_GET['id'] : '';
    $empresaId = isset($_GET['empresa']) ? (int) $_GET['empresa'] : 0;
    if ($id === '') {
        respond_json(400, [
            'success' => false,
            'message' => 'Identificador de reporte inválido.',
        ]);
    }

    $reports = cleanup_old_reports();
    foreach ($reports as $report) {
        if (($report['id'] ?? '') !== $id) {
            continue;
        }

        if ($empresaId > 0 && (int) ($report['empresaId'] ?? 0) !== $empresaId) {
            continue;
        }

        $storageName = $report['storageName'] ?? '';
        $filePath = REPORT_FILES_DIR . '/' . basename($storageName);
        if (!is_file($filePath)) {
            // Si el archivo ya no existe, limpiamos el índice.
            $remaining = array_filter($reports, static fn ($item) => ($item['id'] ?? '') !== $id);
            write_index(array_values($remaining));
            delete_report_reference($id);
            respond_json(410, [
                'success' => false,
                'message' => 'El archivo ya no está disponible.',
            ]);
        }

        $fileName = basename($report['originalName'] ?? ('reporte-' . $id));
        $fileName = str_replace(chr(34), '', $fileName);
        header('Content-Type: ' . ($report['mimeType'] ?? 'application/octet-stream'));
        header('Content-Length: ' . filesize($filePath));
        header('Content-Disposition: attachment; filename="' . $fileName . '"');
        readfile($filePath);
        exit;
    }

    respond_json(404, [
        'success' => false,
        'message' => 'Reporte no encontrado o expirado.',
    ]);
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? '';

if ($method === 'OPTIONS') {
    header('Allow: GET, POST, OPTIONS');
    exit;
}

if ($method === 'GET' && $action === 'download') {
    download_report();
}

if ($method === 'GET') {
    list_reports();
}

if ($method === 'POST') {
    save_report();
}

http_response_code(405);
header('Allow: GET, POST, OPTIONS');
respond_json(405, [
    'success' => false,
    'message' => 'Método no permitido.',
]);
