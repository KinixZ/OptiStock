<?php
// scripts/php/report_history.php
// Gestiona el historial de reportes utilizando almacenamiento local en el servidor
// y sincroniza los metadatos con la base de datos.

declare(strict_types=1);

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

const REPORT_RETENTION_DAYS = 60; // Se eliminan automáticamente después de ~2 meses.
const REPORT_RETENTION_SECONDS = REPORT_RETENTION_DAYS * 24 * 60 * 60;
const REPORTS_ROOT = __DIR__ . '/../../docs/report-history';
const REPORT_FILES_DIR = REPORTS_ROOT . '/files';
const AUTOMATION_RUN_TOLERANCE_SECONDS = 120; // Margen para comparar ejecuciones duplicadas.

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

function insert_report_reference(array $entry, int $empresaId, ?mysqli $externalConn = null): void
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

    $shouldClose = false;
    if ($externalConn instanceof mysqli) {
        $conn = $externalConn;
    } else {
        $conn = db_connect();
        $shouldClose = true;
    }

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
        if ($shouldClose) {
            $conn->close();
        }
    }
}

function ensure_automation_run_table(mysqli $conn): void
{
    static $ensured = false;
    if ($ensured) {
        return;
    }

    $conn->query(
        'CREATE TABLE IF NOT EXISTS reportes_automatizados_runs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            automation_uuid VARCHAR(64) NOT NULL,
            empresa_id INT NOT NULL,
            run_at DATETIME NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_automation_run (automation_uuid, empresa_id, run_at),
            KEY idx_empresa_run (empresa_id, run_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );

    $ensured = true;
}

function parse_time_parts(string $time): array
{
    $matches = [];
    if (preg_match('/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/', $time, $matches)) {
        $hours = max(0, min(23, (int) $matches[1]));
        $minutes = max(0, min(59, (int) $matches[2]));
        return [$hours, $minutes];
    }

    return [8, 0];
}

function compute_month_date(DateTimeImmutable $reference, int $day, int $hours, int $minutes): DateTimeImmutable
{
    $year = (int) $reference->format('Y');
    $month = (int) $reference->format('n');
    $lastDay = (int) (new DateTimeImmutable(sprintf('%04d-%02d-01', $year, $month)))->modify('last day of this month')->format('j');
    $safeDay = max(1, min($day, $lastDay));

    return $reference
        ->setDate($year, $month, $safeDay)
        ->setTime($hours, $minutes, 0, 0);
}

function compute_next_run_for_automation(array $automation, DateTimeImmutable $reference): ?DateTimeImmutable
{
    $frequency = (string) ($automation['frecuencia'] ?? 'daily');
    [$hours, $minutes] = parse_time_parts((string) ($automation['hora_ejecucion'] ?? '08:00:00'));
    $base = $reference->setTime($hours, $minutes, 0, 0);

    switch ($frequency) {
        case 'weekly':
            $desiredDay = max(0, min(6, (int) ($automation['dia_semana'] ?? 1)));
            $currentDay = (int) $base->format('w');
            $diff = $desiredDay - $currentDay;
            if ($diff < 0 || ($diff === 0 && $base <= $reference)) {
                $diff += 7;
            }
            return $base->modify("+{$diff} days");

        case 'biweekly':
            $day = max(1, min(31, (int) ($automation['dia_mes'] ?? 1)));
            $lastRunRaw = $automation['ultimo_ejecutado'] ?? null;
            if ($lastRunRaw) {
                try {
                    $candidate = (new DateTimeImmutable($lastRunRaw))->setTime($hours, $minutes, 0, 0);
                    while ($candidate <= $reference) {
                        $candidate = $candidate->modify('+14 days');
                    }
                    return $candidate;
                } catch (Exception $exception) {
                    // fall through to base computation
                }
            }
            $candidateBase = compute_month_date($reference, $day, $hours, $minutes);
            if ($candidateBase <= $reference) {
                return $candidateBase->modify('+14 days');
            }
            return $candidateBase;

        case 'monthly':
            $day = max(1, min(31, (int) ($automation['dia_mes'] ?? 1)));
            $candidateBase = compute_month_date($reference, $day, $hours, $minutes);
            if ($candidateBase <= $reference) {
                $nextMonth = $candidateBase->modify('first day of next month');
                $lastDayNextMonth = (int) $nextMonth->modify('last day of this month')->format('j');
                $safeDay = max(1, min($day, $lastDayNextMonth));
                return $nextMonth->setDate(
                    (int) $nextMonth->format('Y'),
                    (int) $nextMonth->format('n'),
                    $safeDay
                )->setTime($hours, $minutes, 0, 0);
            }
            return $candidateBase;

        default:
            if ($base <= $reference) {
                return $base->modify('+1 day');
            }
            return $base;
    }
}

function format_datetime_iso(?DateTimeInterface $dateTime): ?string
{
    if (!$dateTime) {
        return null;
    }

    return $dateTime->setTimezone(new DateTimeZone('UTC'))->format(DateTimeInterface::ATOM);
}

function mysql_datetime_to_iso(?string $value): ?string
{
    if ($value === null || $value === '') {
        return null;
    }

    try {
        return (new DateTimeImmutable($value))->setTimezone(new DateTimeZone('UTC'))->format(DateTimeInterface::ATOM);
    } catch (Exception $exception) {
        return null;
    }
}

function resolve_run_datetime(?string $requestedRunAt, ?string $scheduledRaw): DateTimeImmutable
{
    if ($requestedRunAt) {
        try {
            return new DateTimeImmutable($requestedRunAt);
        } catch (Exception $exception) {
            // continue with scheduled/now fallback
        }
    }

    if ($scheduledRaw) {
        try {
            return new DateTimeImmutable($scheduledRaw);
        } catch (Exception $exception) {
            // continue with now fallback
        }
    }

    return new DateTimeImmutable('now');
}

function seconds_between(DateTimeImmutable $a, DateTimeImmutable $b): int
{
    return (int) abs($a->getTimestamp() - $b->getTimestamp());
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

function random_id(): string
{
    try {
        return bin2hex(random_bytes(16));
    } catch (Exception $exception) {
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

function format_datetime_for_response(?string $value): string
{
    if ($value === null || $value === '') {
        return '';
    }

    $timestamp = strtotime($value);
    if ($timestamp === false) {
        return '';
    }

    return gmdate('c', $timestamp);
}

function map_database_row(array $row): array
{
    $storageName = (string) ($row['storage_name'] ?? '');
    $filePath = $storageName !== '' ? REPORT_FILES_DIR . '/' . basename($storageName) : '';

    $size = isset($row['file_size']) ? (int) $row['file_size'] : 0;
    if ($size <= 0 && $filePath !== '' && is_file($filePath)) {
        $filesize = filesize($filePath);
        if ($filesize !== false) {
            $size = (int) $filesize;
        }
    }

    return [
        'id' => (string) ($row['uuid'] ?? ''),
        'empresaId' => (int) ($row['id_empresa'] ?? 0),
        'originalName' => (string) ($row['original_name'] ?? ''),
        'storageName' => $storageName,
        'mimeType' => (string) ($row['mime_type'] ?? ''),
        'size' => $size,
        'createdAt' => format_datetime_for_response($row['created_at'] ?? null),
        'expiresAt' => format_datetime_for_response($row['expires_at'] ?? null),
        'source' => (string) ($row['source'] ?? ''),
        'notes' => (string) ($row['notes'] ?? ''),
    ];
}

function fetch_reports_from_database(?int $empresaId = null): array
{
    $conn = db_connect();

    try {
        $query = 'SELECT uuid, id_empresa, original_name, storage_name, mime_type, file_size, created_at, expires_at, source, notes FROM reportes_historial';
        $types = '';
        $params = [];

        if ($empresaId !== null && $empresaId > 0) {
            $query .= ' WHERE id_empresa = ?';
            $types = 'i';
            $params[] = $empresaId;
        }

        $query .= ' ORDER BY created_at DESC';

        $stmt = $conn->prepare($query);
        if ($types !== '') {
            $stmt->bind_param($types, ...$params);
        }

        $stmt->execute();
        $result = $stmt->get_result();

        $reports = [];
        while ($row = $result->fetch_assoc()) {
            $storageName = $row['storage_name'] ?? '';
            if ($storageName !== '') {
                $filePath = REPORT_FILES_DIR . '/' . basename($storageName);
                if (!is_file($filePath)) {
                    delete_report_reference($row['uuid'] ?? '');
                    continue;
                }
            }

            $reports[] = map_database_row($row);
        }

        $stmt->close();
        return $reports;
    } finally {
        $conn->close();
    }
}

function purge_expired_reports_from_database(): void
{
    try {
        $conn = db_connect();
    } catch (mysqli_sql_exception $exception) {
        error_log('No se pudo conectar a la base de datos para depurar el historial: ' . $exception->getMessage());
        return;
    }

    try {
        $stmt = $conn->prepare("SELECT uuid, storage_name FROM reportes_historial WHERE expires_at IS NOT NULL AND expires_at <> '' AND expires_at <= NOW()");
        $stmt->execute();
        $stmt->bind_result($uuid, $storageName);

        while ($stmt->fetch()) {
            remove_report_file($storageName);
        }

        $stmt->close();

        $conn->query("DELETE FROM reportes_historial WHERE expires_at IS NOT NULL AND expires_at <> '' AND expires_at <= NOW()");
    } catch (mysqli_sql_exception $exception) {
        error_log('No se pudo limpiar el historial de reportes expirados: ' . $exception->getMessage());
    } finally {
        $conn->close();
    }
}

function list_reports(): void
{
    $empresaId = isset($_GET['empresa']) ? (int) $_GET['empresa'] : 0;

    purge_expired_reports_from_database();

    try {
        $reports = fetch_reports_from_database($empresaId > 0 ? $empresaId : null);
    } catch (mysqli_sql_exception $exception) {
        respond_json(500, [
            'success' => false,
            'message' => 'No se pudo consultar el historial en la base de datos.',
        ]);
    }

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
    $automationId = isset($input['automationId']) ? trim((string) $input['automationId']) : '';
    $automationRunAtRaw = isset($input['automationRunAt']) ? (string) $input['automationRunAt'] : '';

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
    purge_expired_reports_from_database();

    $safeName = sanitize_file_name($fileName);
    $finalName = ensure_extension($safeName, $mimeType);
    $extension = pathinfo($finalName, PATHINFO_EXTENSION);
    $storageName = time() . '-' . random_id();
    if ($extension !== '') {
        $storageName .= '.' . $extension;
    }
    $filePath = REPORT_FILES_DIR . '/' . $storageName;

    $conn = null;
    $transactionStarted = false;
    $automationRunAt = null;
    $automationNextRun = null;
    $automationResponse = null;

    if ($automationId !== '') {
        try {
            $conn = db_connect();
        } catch (Throwable $exception) {
            respond_json(500, [
                'success' => false,
                'message' => 'No se pudo conectar a la base de datos para validar la automatización.',
            ]);
        }

        try {
            ensure_automation_run_table($conn);
            $conn->begin_transaction();
            $transactionStarted = true;

            $stmt = $conn->prepare('SELECT uuid, id_empresa, activo, proxima_ejecucion, ultimo_ejecutado, frecuencia, hora_ejecucion, dia_semana, dia_mes FROM reportes_automatizados WHERE uuid = ? AND id_empresa = ? FOR UPDATE');
            $stmt->bind_param('si', $automationId, $empresaId);
            $stmt->execute();
            $result = $stmt->get_result();
            $automationRow = $result->fetch_assoc() ?: null;
            $stmt->close();

            if ($automationRow === null) {
                $conn->rollback();
                $conn->close();
                respond_json(404, [
                    'success' => false,
                    'code' => 'not_found',
                    'message' => 'La automatización indicada no existe.',
                ]);
            }

            if (empty($automationRow['activo'])) {
                $automationPayload = [
                    'id' => $automationId,
                    'active' => false,
                    'lastRunAt' => mysql_datetime_to_iso($automationRow['ultimo_ejecutado'] ?? null),
                    'nextRunAt' => mysql_datetime_to_iso($automationRow['proxima_ejecucion'] ?? null),
                ];
                $conn->rollback();
                $conn->close();
                respond_json(409, [
                    'success' => false,
                    'code' => 'inactive',
                    'message' => 'La automatización está desactivada.',
                    'automation' => $automationPayload,
                ]);
            }

            $automationRunAt = resolve_run_datetime($automationRunAtRaw, $automationRow['proxima_ejecucion'] ?? null);

            $lastRunRaw = $automationRow['ultimo_ejecutado'] ?? null;
            if ($lastRunRaw) {
                try {
                    $lastRun = new DateTimeImmutable($lastRunRaw);
                    if (seconds_between($lastRun, $automationRunAt) <= AUTOMATION_RUN_TOLERANCE_SECONDS) {
                $automationPayload = [
                    'id' => $automationId,
                    'active' => !empty($automationRow['activo']),
                    'lastRunAt' => format_datetime_iso($lastRun),
                    'nextRunAt' => mysql_datetime_to_iso($automationRow['proxima_ejecucion'] ?? null),
                ];
                        $conn->rollback();
                        $conn->close();
                        respond_json(409, [
                            'success' => false,
                            'code' => 'duplicate',
                            'message' => 'El reporte automático ya fue generado para este horario.',
                            'automation' => $automationPayload,
                        ]);
                    }
                } catch (Exception $exception) {
                    // Ignorar formato inválido y continuar.
                }
            }

            $scheduledRaw = $automationRow['proxima_ejecucion'] ?? null;
            if ($scheduledRaw) {
                try {
                    $scheduledAt = new DateTimeImmutable($scheduledRaw);
                    if ($automationRunAt < $scheduledAt && seconds_between($automationRunAt, $scheduledAt) > AUTOMATION_RUN_TOLERANCE_SECONDS) {
                        $automationPayload = [
                            'id' => $automationId,
                            'active' => !empty($automationRow['activo']),
                            'lastRunAt' => mysql_datetime_to_iso($automationRow['ultimo_ejecutado'] ?? null),
                            'nextRunAt' => format_datetime_iso($scheduledAt),
                        ];
                        $conn->rollback();
                        $conn->close();
                        respond_json(409, [
                            'success' => false,
                            'code' => 'not_due',
                            'message' => 'Aún no es momento de ejecutar esta automatización.',
                            'automation' => $automationPayload,
                        ]);
                    }
                } catch (Exception $exception) {
                    // Continuar si la fecha almacenada es inválida.
                }
            }

            $runAtSql = $automationRunAt->format('Y-m-d H:i:s');
            $runStmt = $conn->prepare('INSERT INTO reportes_automatizados_runs (automation_uuid, empresa_id, run_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE run_at = run_at');
            $runStmt->bind_param('sis', $automationId, $empresaId, $runAtSql);
            $runStmt->execute();
            if ($runStmt->affected_rows === 0) {
                $runStmt->close();
                $conn->rollback();
                $conn->close();
                $automationPayload = [
                    'id' => $automationId,
                    'active' => !empty($automationRow['activo']),
                    'lastRunAt' => mysql_datetime_to_iso($automationRow['ultimo_ejecutado'] ?? null),
                    'nextRunAt' => mysql_datetime_to_iso($automationRow['proxima_ejecucion'] ?? null),
                ];
                respond_json(409, [
                    'success' => false,
                    'code' => 'duplicate',
                    'message' => 'El reporte automático ya fue generado para este horario.',
                    'automation' => $automationPayload,
                ]);
            }
            $runStmt->close();

            $automationRow['ultimo_ejecutado'] = $runAtSql;
            $automationNextRun = compute_next_run_for_automation($automationRow, $automationRunAt->modify('+1 minute'));

            $automationResponse = [
                'id' => $automationId,
                'lastRunAt' => format_datetime_iso($automationRunAt),
                'nextRunAt' => format_datetime_iso($automationNextRun),
                'active' => true,
            ];
        } catch (Throwable $exception) {
            if ($transactionStarted) {
                $conn->rollback();
            }
            if ($conn instanceof mysqli) {
                $conn->close();
            }
            respond_json(500, [
                'success' => false,
                'message' => 'No se pudo validar la automatización antes de guardar el reporte.',
            ]);
        }
    }

    if (!($conn instanceof mysqli)) {
        $conn = db_connect();
    }

    $written = file_put_contents($filePath, $binary, LOCK_EX);
    if ($written === false) {
        if ($transactionStarted && $conn instanceof mysqli) {
            $conn->rollback();
            $conn->close();
        }
        respond_json(500, [
            'success' => false,
            'message' => 'No se pudo guardar el archivo en el historial.',
        ]);
    }

    $nowIso = gmdate('c');
    $expiresIso = gmdate('c', time() + REPORT_RETENTION_SECONDS);

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
    ];

    try {
        insert_report_reference($entry, $empresaId, $conn);

        if ($automationId !== '') {
            $lastRunSql = $automationRunAt->format('Y-m-d H:i:s');
            if ($automationNextRun instanceof DateTimeImmutable) {
                $nextRunSql = $automationNextRun->format('Y-m-d H:i:s');
                $updateStmt = $conn->prepare('UPDATE reportes_automatizados SET ultimo_ejecutado = ?, proxima_ejecucion = ? WHERE uuid = ? AND id_empresa = ?');
                $updateStmt->bind_param('sssi', $lastRunSql, $nextRunSql, $automationId, $empresaId);
            } else {
                $updateStmt = $conn->prepare('UPDATE reportes_automatizados SET ultimo_ejecutado = ?, proxima_ejecucion = NULL WHERE uuid = ? AND id_empresa = ?');
                $updateStmt->bind_param('ssi', $lastRunSql, $automationId, $empresaId);
            }
            $updateStmt->execute();
            $updateStmt->close();
        }

        if ($transactionStarted) {
            $conn->commit();
        }
    } catch (Throwable $exception) {
        if ($transactionStarted) {
            $conn->rollback();
        }
        remove_report_file($storageName);
        if ($conn instanceof mysqli) {
            $conn->close();
        }
        respond_json(500, [
            'success' => false,
            'message' => 'No se pudo registrar el reporte en la base de datos.',
        ]);
    }

    if ($conn instanceof mysqli) {
        $conn->close();
    }

    respond_json(201, [
        'success' => true,
        'report' => [
            'id' => $entry['id'],
            'empresaId' => $empresaId,
            'originalName' => $entry['originalName'],
            'storageName' => $entry['storageName'],
            'mimeType' => $entry['mimeType'],
            'size' => $entry['size'],
            'createdAt' => $entry['createdAt'],
            'expiresAt' => $entry['expiresAt'],
            'source' => $entry['source'],
            'notes' => $entry['notes'],
        ],
        'retentionDays' => REPORT_RETENTION_DAYS,
        'automation' => $automationResponse,
    ]);
}

function find_report_for_download(string $uuid, int $empresaId = 0): ?array
{
    $conn = db_connect();

    try {
        $query = 'SELECT uuid, id_empresa, original_name, storage_name, mime_type FROM reportes_historial WHERE uuid = ?';
        $types = 's';
        $params = [$uuid];

        if ($empresaId > 0) {
            $query .= ' AND id_empresa = ?';
            $types .= 'i';
            $params[] = $empresaId;
        }

        $stmt = $conn->prepare($query);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc() ?: null;
        $stmt->close();

        return $row;
    } finally {
        $conn->close();
    }
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

    purge_expired_reports_from_database();

    $report = find_report_for_download($id, $empresaId);
    if ($report === null) {
        respond_json(404, [
            'success' => false,
            'message' => 'Reporte no encontrado o expirado.',
        ]);
    }

    $storageName = $report['storage_name'] ?? '';
    if ($storageName === '') {
        delete_report_reference($id);
        respond_json(410, [
            'success' => false,
            'message' => 'El archivo ya no está disponible.',
        ]);
    }

    $filePath = REPORT_FILES_DIR . '/' . basename($storageName);
    if (!is_file($filePath)) {
        delete_report_reference($id);
        respond_json(410, [
            'success' => false,
            'message' => 'El archivo ya no está disponible.',
        ]);
    }

    $fileName = basename($report['original_name'] ?? ('reporte-' . $id));
    $fileName = str_replace(chr(34), '', $fileName);

    header('Content-Type: ' . ($report['mime_type'] ?? 'application/octet-stream'));
    header('Content-Length: ' . filesize($filePath));
    header('Content-Disposition: attachment; filename="' . $fileName . '"');
    readfile($filePath);
    exit;
}

function delete_report(): void
{
    $input = json_decode(file_get_contents('php://input') ?: 'null', true);
    if (!is_array($input)) {
        respond_json(400, ['success' => false, 'message' => 'Solicitud inválida.']);
    }

    $id = isset($input['id']) ? trim((string) $input['id']) : '';
    $empresaId = isset($input['empresaId']) ? (int) $input['empresaId'] : 0;

    if ($id === '') {
        respond_json(400, ['success' => false, 'message' => 'Identificador de reporte inválido.']);
    }

    try {
        $conn = db_connect();
    } catch (mysqli_sql_exception $exception) {
        error_log('delete_report: no se pudo conectar a la BD: ' . $exception->getMessage());
        respond_json(500, ['success' => false, 'message' => 'No se pudo conectar al servidor.']);
    }

    try {
        $stmt = $conn->prepare('SELECT storage_name, original_name, id_empresa FROM reportes_historial WHERE uuid = ?');
        $stmt->bind_param('s', $id);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc() ?: null;
        $stmt->close();

        if ($row === null) {
            $conn->close();
            respond_json(404, ['success' => false, 'message' => 'Reporte no encontrado.']);
        }

        if ($empresaId > 0 && (int) ($row['id_empresa'] ?? 0) !== $empresaId) {
            $conn->close();
            respond_json(403, ['success' => false, 'message' => 'No tienes permiso para eliminar este reporte.']);
        }

        $storageName = $row['storage_name'] ?? '';
        $originalName = $row['original_name'] ?? '';

        // Remove file from storage
        if ($storageName !== '') {
            remove_report_file($storageName);
        }

        // Delete reference in the same DB connection
        try {
            $del = $conn->prepare('DELETE FROM reportes_historial WHERE uuid = ?');
            $del->bind_param('s', $id);
            $del->execute();
            $del->close();
        } catch (mysqli_sql_exception $ex) {
            error_log('delete_report: no se pudo eliminar referencia DB para ' . $id . ': ' . $ex->getMessage());
            // continue, attempt to log the action anyway
        }

        // Try to register action in log (best-effort)
        try {
            require_once __DIR__ . '/log_utils.php';
            // registrarLog expects ($conn, $idUsuario, $modulo, $accion)
            $accion = 'Eliminó reporte: ' . ($originalName ?: $id);
            @registrarLog($conn, null, 'Reportes', $accion);
        } catch (Throwable $e) {
            error_log('delete_report: no se pudo registrar en log: ' . $e->getMessage());
        }

        $conn->close();
        respond_json(200, ['success' => true, 'message' => 'Reporte eliminado correctamente.']);
    } catch (mysqli_sql_exception $exception) {
        error_log('delete_report: excepción: ' . $exception->getMessage());
        if (isset($conn) && $conn instanceof mysqli) {
            $conn->close();
        }
        respond_json(500, ['success' => false, 'message' => 'Ocurrió un error al eliminar el reporte.']);
    }

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? '';

if (defined('OPTISTOCK_REPORT_HISTORY_NO_ROUTER') && OPTISTOCK_REPORT_HISTORY_NO_ROUTER) {
    return;
}

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
    if ($action === 'delete') {
        delete_report();
    }

    // If action was delete, delete_report already exited with a response.
    if ($action !== 'delete') {
        save_report();
    }
}

http_response_code(405);
header('Allow: GET, POST, OPTIONS');
respond_json(405, [
    'success' => false,
    'message' => 'Método no permitido.',
]);
