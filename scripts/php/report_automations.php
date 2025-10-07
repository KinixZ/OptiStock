<?php
// scripts/php/report_automations.php
// Gestiona la configuración y ejecución de reportes automáticos.

declare(strict_types=1);

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

const REPORT_RETENTION_DAYS = 60;
const REPORT_RETENTION_SECONDS = REPORT_RETENTION_DAYS * 24 * 60 * 60;
const REPORTS_ROOT = __DIR__ . '/../../docs/report-history';
const REPORT_FILES_DIR = REPORTS_ROOT . '/files';

const DB_SERVER = 'localhost';
const DB_USER = 'u296155119_Admin';
const DB_PASSWORD = '4Dmin123o';
const DB_NAME = 'u296155119_OptiStock';

const MAX_AUTOMATION_CATCHUP = 4;

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

function sanitize_text(?string $text, int $maxLength = 120): string
{
    $value = trim((string) $text);
    if ($value === '') {
        return '';
    }

    if (function_exists('mb_substr')) {
        $value = mb_substr($value, 0, $maxLength);
    } else {
        $value = substr($value, 0, $maxLength);
    }

    return $value;
}

function sanitize_time(?string $time): string
{
    if (!$time) {
        return '08:00';
    }
    $parts = explode(':', $time);
    $hours = isset($parts[0]) ? max(0, min(23, (int) $parts[0])) : 8;
    $minutes = isset($parts[1]) ? max(0, min(59, (int) $parts[1])) : 0;
    return sprintf('%02d:%02d', $hours, $minutes);
}

function clamp_int(int $value, int $min, int $max): int
{
    return max($min, min($max, $value));
}

function to_mysql_datetime(DateTimeInterface $date): string
{
    return $date->format('Y-m-d H:i:s');
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

function ensure_extension(string $fileName, string $extension): string
{
    if (pathinfo($fileName, PATHINFO_EXTENSION)) {
        return $fileName;
    }
    return $fileName . $extension;
}

function parse_time_parts(string $time): array
{
    $parts = explode(':', $time);
    $hours = isset($parts[0]) ? clamp_int((int) $parts[0], 0, 23) : 8;
    $minutes = isset($parts[1]) ? clamp_int((int) $parts[1], 0, 59) : 0;
    return [$hours, $minutes];
}

function compute_month_date(int $year, int $month, int $day, int $hour, int $minute): DateTimeImmutable
{
    $date = DateTimeImmutable::createFromFormat('!Y-n-j H:i', sprintf('%d-%d-1 %02d:%02d', $year, $month, $hour, $minute));
    if ($date === false) {
        $date = new DateTimeImmutable('now');
    }
    $lastDay = (int) $date->format('t');
    $safeDay = clamp_int($day, 1, $lastDay);
    return $date->setDate((int) $date->format('Y'), (int) $date->format('n'), $safeDay);
}

function compute_next_run(
    string $frequency,
    string $time,
    ?int $weekday,
    ?int $monthday,
    ?DateTimeImmutable $lastRun = null,
    ?DateTimeImmutable $reference = null
): DateTimeImmutable {
    $referenceDate = $reference ?: new DateTimeImmutable('now');
    [$hours, $minutes] = parse_time_parts($time);
    $now = $referenceDate->setTime((int) $referenceDate->format('H'), (int) $referenceDate->format('i'), 0);
    $base = $now->setTime($hours, $minutes, 0);
    $normalizedFrequency = strtolower($frequency);

    if ($normalizedFrequency === 'weekly') {
        $targetDay = clamp_int((int) ($weekday ?? 1), 0, 6);
        $currentDay = (int) $base->format('w');
        $diff = ($targetDay - $currentDay + 7) % 7;
        if ($diff === 0 && $base <= $now) {
            $diff = 7;
        }
        return $base->modify('+' . $diff . ' days');
    }

    if ($normalizedFrequency === 'biweekly') {
        $targetDay = clamp_int((int) ($weekday ?? 1), 0, 6);
        $currentDay = (int) $base->format('w');
        $diff = ($targetDay - $currentDay + 7) % 7;
        if ($diff === 0 && $base <= $now) {
            $diff = 7;
        }
        $candidate = $base->modify('+' . $diff . ' days');

        if ($lastRun instanceof DateTimeImmutable) {
            $minimum = $lastRun->modify('+14 days');
            while ($candidate < $minimum) {
                $candidate = $candidate->modify('+7 days');
            }
        }

        while ($candidate <= $now) {
            $candidate = $candidate->modify('+14 days');
        }

        return $candidate;
    }

    if ($normalizedFrequency === 'monthly') {
        $targetDay = clamp_int((int) ($monthday ?? 1), 1, 31);
        $candidate = compute_month_date((int) $now->format('Y'), (int) $now->format('n'), $targetDay, $hours, $minutes);
        if ($candidate <= $now) {
            $candidate = compute_month_date((int) $now->format('Y'), (int) $now->format('n') + 1, $targetDay, $hours, $minutes);
        }
        return $candidate;
    }

    $candidate = $base;
    if ($candidate <= $now) {
        $candidate = $candidate->modify('+1 day');
    }
    return $candidate;
}

function format_frequency_label(array $automation): string
{
    $time = sanitize_time((string) ($automation['time'] ?? $automation['hora'] ?? '08:00'));
    [$hours, $minutes] = parse_time_parts($time);
    $timeLabel = sprintf('%02d:%02d', $hours, $minutes);
    $frequency = strtolower((string) ($automation['frequency'] ?? $automation['frecuencia'] ?? 'daily'));

    if ($frequency === 'weekly') {
        $names = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        $dayIndex = clamp_int((int) ($automation['weekday'] ?? $automation['dia_semana'] ?? 1), 0, 6);
        return 'Semanal · ' . $names[$dayIndex] . ' · ' . $timeLabel;
    }

    if ($frequency === 'biweekly') {
        $names = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        $dayIndex = clamp_int((int) ($automation['weekday'] ?? $automation['dia_semana'] ?? 1), 0, 6);
        return 'Quincenal · ' . $names[$dayIndex] . ' · ' . $timeLabel;
    }

    if ($frequency === 'monthly') {
        $day = clamp_int((int) ($automation['monthday'] ?? $automation['dia_mes'] ?? 1), 1, 31);
        return 'Mensual · Día ' . $day . ' · ' . $timeLabel;
    }

    return 'Diario · ' . $timeLabel;
}

function format_execution_label(DateTimeImmutable $date): string
{
    try {
        $formatter = new IntlDateFormatter('es_MX', IntlDateFormatter::FULL, IntlDateFormatter::SHORT);
        return $formatter->format($date);
    } catch (Throwable $exception) {
        return $date->format('d/m/Y H:i');
    }
}

function generate_automation_csv(array $automation, DateTimeImmutable $executedAt): array
{
    $rows = [
        ['Nombre del reporte', $automation['name'] ?? $automation['nombre'] ?? 'Reporte automatizado'],
        ['Módulo', $automation['module'] ?? $automation['modulo'] ?? 'No especificado'],
        ['Generado automáticamente', format_execution_label($executedAt)],
        ['Frecuencia', format_frequency_label($automation)],
        ['Notas', $automation['notes'] ?? $automation['notas'] ?? '']
    ];

    $lines = [];
    foreach ($rows as $row) {
        $encoded = array_map(static function ($cell) {
            $value = str_replace('"', '""', (string) $cell);
            return '"' . $value . '"';
        }, $row);
        $lines[] = implode(',', $encoded);
    }

    $content = implode("\r\n", $lines);
    return [
        'content' => $content,
        'mime' => 'text/csv',
        'extension' => 'csv'
    ];
}

function generate_automation_pdf(array $automation, DateTimeImmutable $executedAt): array
{
    $lines = [
        $automation['name'] ?? $automation['nombre'] ?? 'Reporte automatizado',
        '',
        'Generado automáticamente el ' . format_execution_label($executedAt)
    ];

    if (!empty($automation['module'] ?? $automation['modulo'])) {
        $lines[] = 'Módulo origen: ' . ($automation['module'] ?? $automation['modulo']);
    }

    $lines[] = 'Frecuencia: ' . format_frequency_label($automation);

    if (!empty($automation['notes'] ?? $automation['notas'])) {
        $lines[] = 'Notas: ' . ($automation['notes'] ?? $automation['notas']);
    }

    $filtered = array_values(array_filter($lines, static fn ($line) => $line !== null && $line !== ''));

    $sanitized = array_map(static function ($line) {
        $value = (string) $line;
        $value = str_replace('\\', '\\', $value);
        $value = str_replace('(', '\\(', $value);
        $value = str_replace(')', '\\)', $value);
        return $value;
    }, $filtered);

    $stream = 'BT /F1 16 Tf 72 760 Td ';
    foreach ($sanitized as $index => $line) {
        if ($index === 0) {
            $stream .= '(' . $line . ') Tj';
        } else {
            $stream .= ' T* (' . $line . ') Tj';
        }
    }
    $stream .= ' ET';

    $offsets = [];
    $pdf = "%PDF-1.4\n";

    $addObject = static function (string $content) use (&$pdf, &$offsets): void {
        $offsets[] = strlen($pdf);
        $pdf .= $content;
    };

    $addObject('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
    $addObject('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
    $addObject('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n');
    $addObject(sprintf('4 0 obj\n<< /Length %d >>\nstream\n%s\nendstream\nendobj\n', strlen($stream), $stream));
    $addObject('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');

    $xrefOffset = strlen($pdf);
    $pdf .= "xref\n0 6\n0000000000 65535 f \n";
    foreach ($offsets as $offset) {
        $pdf .= sprintf("%010d 00000 n \n", $offset);
    }
    $pdf .= "trailer\n<< /Root 1 0 R /Size 6 >>\nstartxref\n" . $xrefOffset . "\n%%EOF";

    return [
        'content' => $pdf,
        'mime' => 'application/pdf',
        'extension' => 'pdf'
    ];
}

function create_automation_file(array $automation, DateTimeImmutable $executedAt): array
{
    $format = strtolower((string) ($automation['format'] ?? $automation['formato'] ?? 'pdf'));
    if ($format === 'excel') {
        return generate_automation_csv($automation, $executedAt);
    }
    return generate_automation_pdf($automation, $executedAt);
}

function insert_report_reference(mysqli $conn, array $entry, int $empresaId): void
{
    $uuid = (string) ($entry['id'] ?? '');
    $originalName = (string) ($entry['originalName'] ?? '');
    $storageName = (string) ($entry['storageName'] ?? '');
    $mimeType = (string) ($entry['mimeType'] ?? 'application/octet-stream');
    $size = (int) ($entry['size'] ?? 0);
    $createdAt = $entry['createdAt'] ?? new DateTimeImmutable('now');
    $expiresAt = $entry['expiresAt'] ?? $createdAt->modify('+' . REPORT_RETENTION_DAYS . ' days');
    $source = sanitize_text($entry['source'] ?? '', 120);
    $notes = sanitize_text($entry['notes'] ?? '', 200);

    if ($uuid === '' || $originalName === '' || $storageName === '') {
        throw new RuntimeException('Faltan datos para registrar el reporte generado automáticamente.');
    }

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

    $stmt->bind_param(
        'sisssissss',
        $uuid,
        $empresaId,
        $originalName,
        $storageName,
        $mimeType,
        $size,
        to_mysql_datetime($createdAt),
        to_mysql_datetime($expiresAt),
        $source,
        $notes
    );

    $stmt->execute();
    $stmt->close();
}

function store_generated_report(mysqli $conn, array $automation, DateTimeImmutable $executedAt): array
{
    ensure_storage();
    $file = create_automation_file($automation, $executedAt);
    $extension = $file['extension'] ?? (($automation['format'] ?? $automation['formato'] ?? '') === 'excel' ? 'csv' : 'pdf');
    $uuid = random_id();
    $fileNameDate = $executedAt->format('Y-m-d H-i');
    $safeName = sanitize_file_name(($automation['name'] ?? $automation['nombre'] ?? 'Reporte automatizado') . ' - ' . $fileNameDate);
    $originalName = ensure_extension($safeName, '.' . $extension);
    $storageName = $uuid . '.' . $extension;
    $filePath = REPORT_FILES_DIR . '/' . $storageName;

    $content = (string) ($file['content'] ?? '');
    if (file_put_contents($filePath, $content) === false) {
        throw new RuntimeException('No se pudo guardar el archivo generado automáticamente.');
    }

    $entry = [
        'id' => $uuid,
        'originalName' => $originalName,
        'storageName' => $storageName,
        'mimeType' => $file['mime'] ?? 'application/octet-stream',
        'size' => strlen($content),
        'createdAt' => $executedAt,
        'expiresAt' => $executedAt->modify('+' . REPORT_RETENTION_DAYS . ' days'),
        'source' => empty($automation['module'] ?? $automation['modulo']) ? 'Automatización' : ('Automatización · ' . ($automation['module'] ?? $automation['modulo'])),
        'notes' => empty($automation['notes'] ?? $automation['notas']) ? 'Generado automáticamente' : ('Notas: ' . ($automation['notes'] ?? $automation['notas']))
    ];

    $empresaId = isset($automation['empresaId']) ? (int) $automation['empresaId'] : (int) ($automation['id_empresa'] ?? 0);
    insert_report_reference($conn, $entry, $empresaId);

    return [
        'uuid' => $uuid,
        'originalName' => $originalName,
        'createdAt' => $executedAt->format(DateTimeInterface::ATOM)
    ];
}

function format_automation_row(array $row): array
{
    return [
        'id' => (string) ($row['id'] ?? ''),
        'empresaId' => (int) ($row['id_empresa'] ?? 0),
        'name' => $row['nombre'] ?? 'Reporte automatizado',
        'module' => $row['modulo'] ?? '',
        'format' => $row['formato'] ?? 'pdf',
        'frequency' => $row['frecuencia'] ?? 'daily',
        'time' => $row['hora'] ?? '08:00',
        'weekday' => isset($row['dia_semana']) ? (int) $row['dia_semana'] : 1,
        'monthday' => isset($row['dia_mes']) ? (int) $row['dia_mes'] : 1,
        'notes' => $row['notas'] ?? '',
        'active' => (bool) ($row['activo'] ?? true),
        'nextRunAt' => $row['proxima_ejecucion'] ?? null,
        'lastRunAt' => $row['ultima_ejecucion'] ?? null,
        'createdAt' => $row['creado_en'] ?? null,
        'updatedAt' => $row['actualizado_en'] ?? null
    ];
}

function fetch_automations(int $empresaId): array
{
    $conn = db_connect();

    try {
        $stmt = $conn->prepare(
            'SELECT id, id_empresa, nombre, modulo, formato, frecuencia, hora, dia_semana, dia_mes, notas, activo, proxima_ejecucion, ultima_ejecucion, creado_en, actualizado_en
             FROM reportes_automatizaciones
             WHERE id_empresa = ?
             ORDER BY (proxima_ejecucion IS NULL), proxima_ejecucion ASC, id DESC'
        );
        $stmt->bind_param('i', $empresaId);
        $stmt->execute();
        $result = $stmt->get_result();
        $rows = [];
        while ($row = $result->fetch_assoc()) {
            $rows[] = format_automation_row($row);
        }
        $stmt->close();
        return $rows;
    } finally {
        $conn->close();
    }
}

function fetch_automation(mysqli $conn, int $id, int $empresaId): ?array
{
    $stmt = $conn->prepare(
        'SELECT id, id_empresa, nombre, modulo, formato, frecuencia, hora, dia_semana, dia_mes, notas, activo, proxima_ejecucion, ultima_ejecucion, creado_en, actualizado_en
         FROM reportes_automatizaciones
         WHERE id = ? AND id_empresa = ?'
    );
    $stmt->bind_param('ii', $id, $empresaId);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc() ?: null;
    $stmt->close();
    return $row ? format_automation_row($row) : null;
}

function save_automation(array $payload): void
{
    $empresaId = isset($payload['empresaId']) ? (int) $payload['empresaId'] : 0;
    if ($empresaId <= 0) {
        respond_json(400, ['success' => false, 'message' => 'Empresa inválida para guardar la automatización.']);
    }

    $id = isset($payload['id']) ? (int) $payload['id'] : 0;
    $name = sanitize_text($payload['name'] ?? $payload['nombre'] ?? '', 120);
    if ($name === '') {
        respond_json(400, ['success' => false, 'message' => 'Especifica un nombre para la automatización.']);
    }
    $module = sanitize_text($payload['module'] ?? $payload['modulo'] ?? '', 120);
    $format = strtolower(sanitize_text($payload['format'] ?? $payload['formato'] ?? 'pdf', 10));
    if (!in_array($format, ['pdf', 'excel'], true)) {
        $format = 'pdf';
    }
    $frequencyKey = strtolower(sanitize_text($payload['frequency'] ?? $payload['frecuencia'] ?? 'daily', 20));
    $frequencyMap = [
        'daily' => 'daily',
        'diario' => 'daily',
        'weekly' => 'weekly',
        'semanal' => 'weekly',
        'biweekly' => 'biweekly',
        'quincenal' => 'biweekly',
        'monthly' => 'monthly',
        'mensual' => 'monthly'
    ];
    $frequency = $frequencyMap[$frequencyKey] ?? 'daily';
    $time = sanitize_time($payload['time'] ?? $payload['hora'] ?? '08:00');
    $weekday = clamp_int((int) ($payload['weekday'] ?? $payload['dia_semana'] ?? 1), 0, 6);
    $monthday = clamp_int((int) ($payload['monthday'] ?? $payload['dia_mes'] ?? 1), 1, 31);
    $notes = sanitize_text($payload['notes'] ?? $payload['notas'] ?? '', 200);
    $active = !empty($payload['active']) && $payload['active'] !== 'false' && $payload['active'] !== '0';

    $conn = db_connect();

    try {
        if ($id > 0) {
            $existing = fetch_automation($conn, $id, $empresaId);
            if (!$existing) {
                respond_json(404, ['success' => false, 'message' => 'La automatización no existe.']);
            }

            $lastRun = null;
            if (!empty($existing['lastRunAt'])) {
                $lastRun = new DateTimeImmutable((string) $existing['lastRunAt']);
            }

            $nextRun = $active ? compute_next_run($frequency, $time, $weekday, $monthday, $lastRun) : null;

            $stmt = $conn->prepare(
                'UPDATE reportes_automatizaciones
                 SET nombre = ?, modulo = ?, formato = ?, frecuencia = ?, hora = ?, dia_semana = ?, dia_mes = ?, notas = ?, activo = ?, proxima_ejecucion = ?, actualizado_en = NOW()
                 WHERE id = ? AND id_empresa = ?'
            );

            $nextRunSql = $nextRun ? to_mysql_datetime($nextRun) : null;
            $activeInt = $active ? 1 : 0;
            $stmt->bind_param(
                'sssssiisisii',
                $name,
                $module,
                $format,
                $frequency,
                $time,
                $weekday,
                $monthday,
                $notes,
                $activeInt,
                $nextRunSql,
                $id,
                $empresaId
            );
            $stmt->execute();
            $stmt->close();

            $automation = fetch_automation($conn, $id, $empresaId);
            respond_json(200, ['success' => true, 'automation' => $automation, 'generatedReports' => []]);
        }

        $nextRun = $active ? compute_next_run($frequency, $time, $weekday, $monthday) : null;

        $stmt = $conn->prepare(
            'INSERT INTO reportes_automatizaciones (
                id_empresa, nombre, modulo, formato, frecuencia, hora, dia_semana, dia_mes, notas, activo, proxima_ejecucion, ultima_ejecucion, creado_en, actualizado_en
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NOW(), NOW())'
        );
        $activeInt = $active ? 1 : 0;
        $nextRunSql = $nextRun ? to_mysql_datetime($nextRun) : null;
        $stmt->bind_param(
            'isssssiisis',
            $empresaId,
            $name,
            $module,
            $format,
            $frequency,
            $time,
            $weekday,
            $monthday,
            $notes,
            $activeInt,
            $nextRunSql
        );
        $stmt->execute();
        $newId = (int) $stmt->insert_id;
        $stmt->close();

        $automation = fetch_automation($conn, $newId, $empresaId);
        respond_json(201, ['success' => true, 'automation' => $automation, 'generatedReports' => []]);
    } catch (mysqli_sql_exception $exception) {
        error_log('save_automation: ' . $exception->getMessage());
        respond_json(500, ['success' => false, 'message' => 'No se pudo guardar la automatización.']);
    } finally {
        $conn->close();
    }
}

function delete_automation(array $payload): void
{
    $empresaId = isset($payload['empresaId']) ? (int) $payload['empresaId'] : 0;
    $id = isset($payload['id']) ? (int) $payload['id'] : 0;
    if ($empresaId <= 0 || $id <= 0) {
        respond_json(400, ['success' => false, 'message' => 'Solicitud inválida para eliminar la automatización.']);
    }

    $conn = db_connect();

    try {
        $stmt = $conn->prepare('DELETE FROM reportes_automatizaciones WHERE id = ? AND id_empresa = ?');
        $stmt->bind_param('ii', $id, $empresaId);
        $stmt->execute();
        $affected = $stmt->affected_rows;
        $stmt->close();

        if ($affected === 0) {
            respond_json(404, ['success' => false, 'message' => 'La automatización no existe.']);
        }

        respond_json(200, ['success' => true]);
    } catch (mysqli_sql_exception $exception) {
        error_log('delete_automation: ' . $exception->getMessage());
        respond_json(500, ['success' => false, 'message' => 'No se pudo eliminar la automatización.']);
    } finally {
        $conn->close();
    }
}

function toggle_automation(array $payload): void
{
    $empresaId = isset($payload['empresaId']) ? (int) $payload['empresaId'] : 0;
    $id = isset($payload['id']) ? (int) $payload['id'] : 0;
    if ($empresaId <= 0 || $id <= 0) {
        respond_json(400, ['success' => false, 'message' => 'Solicitud inválida para actualizar la automatización.']);
    }

    $desiredActive = !empty($payload['active']) && $payload['active'] !== 'false' && $payload['active'] !== '0';

    $conn = db_connect();

    try {
        $automation = fetch_automation($conn, $id, $empresaId);
        if (!$automation) {
            respond_json(404, ['success' => false, 'message' => 'La automatización no existe.']);
        }

        $lastRun = null;
        if (!empty($automation['lastRunAt'])) {
            $lastRun = new DateTimeImmutable((string) $automation['lastRunAt']);
        }

        $nextRun = $desiredActive
            ? compute_next_run((string) $automation['frequency'], (string) $automation['time'], (int) $automation['weekday'], (int) $automation['monthday'], $lastRun)
            : null;
        $nextRunSql = $nextRun ? to_mysql_datetime($nextRun) : null;
        $activeInt = $desiredActive ? 1 : 0;

        $stmt = $conn->prepare('UPDATE reportes_automatizaciones SET activo = ?, proxima_ejecucion = ?, actualizado_en = NOW() WHERE id = ? AND id_empresa = ?');
        $stmt->bind_param('isii', $activeInt, $nextRunSql, $id, $empresaId);
        $stmt->execute();
        $stmt->close();

        $automation = fetch_automation($conn, $id, $empresaId);
        respond_json(200, ['success' => true, 'automation' => $automation, 'generatedReports' => []]);
    } catch (mysqli_sql_exception $exception) {
        error_log('toggle_automation: ' . $exception->getMessage());
        respond_json(500, ['success' => false, 'message' => 'No se pudo actualizar la automatización.']);
    } finally {
        $conn->close();
    }
}

function run_single_automation(array $payload): void
{
    $empresaId = isset($payload['empresaId']) ? (int) $payload['empresaId'] : 0;
    $id = isset($payload['id']) ? (int) $payload['id'] : 0;
    if ($empresaId <= 0 || $id <= 0) {
        respond_json(400, ['success' => false, 'message' => 'Solicitud inválida para ejecutar la automatización.']);
    }

    $conn = db_connect();

    try {
        $automation = fetch_automation($conn, $id, $empresaId);
        if (!$automation) {
            respond_json(404, ['success' => false, 'message' => 'La automatización no existe.']);
        }

        $executedAt = new DateTimeImmutable('now');
        $automation['empresaId'] = $empresaId;
        $report = store_generated_report($conn, $automation, $executedAt);

        $nextRun = compute_next_run(
            (string) $automation['frequency'],
            (string) $automation['time'],
            (int) $automation['weekday'],
            (int) $automation['monthday'],
            $executedAt,
            $executedAt->modify('+1 minute')
        );

        $stmt = $conn->prepare('UPDATE reportes_automatizaciones SET ultima_ejecucion = ?, proxima_ejecucion = ?, actualizado_en = NOW() WHERE id = ? AND id_empresa = ?');
        $stmt->bind_param(
            'ssii',
            to_mysql_datetime($executedAt),
            to_mysql_datetime($nextRun),
            $id,
            $empresaId
        );
        $stmt->execute();
        $stmt->close();

        $automation = fetch_automation($conn, $id, $empresaId);
        respond_json(200, ['success' => true, 'automation' => $automation, 'generatedReports' => [$report]]);
    } catch (Throwable $exception) {
        error_log('run_single_automation: ' . $exception->getMessage());
        respond_json(500, ['success' => false, 'message' => 'No se pudo generar el reporte automático.']);
    } finally {
        $conn->close();
    }
}

function run_due_automations(array $payload): void
{
    $empresaId = isset($payload['empresaId']) ? (int) $payload['empresaId'] : 0;
    $conn = db_connect();
    $now = new DateTimeImmutable('now');
    $nowSql = to_mysql_datetime($now);

    try {
        $query = 'SELECT id, id_empresa, nombre, modulo, formato, frecuencia, hora, dia_semana, dia_mes, notas, activo, proxima_ejecucion, ultima_ejecucion, creado_en, actualizado_en
                  FROM reportes_automatizaciones
                  WHERE activo = 1 AND proxima_ejecucion IS NOT NULL AND proxima_ejecucion <= ?';
        if ($empresaId > 0) {
            $query .= ' AND id_empresa = ?';
        }
        $query .= ' ORDER BY proxima_ejecucion ASC';

        $stmt = $empresaId > 0 ? $conn->prepare($query) : $conn->prepare($query);
        if ($empresaId > 0) {
            $stmt->bind_param('si', $nowSql, $empresaId);
        } else {
            $stmt->bind_param('s', $nowSql);
        }
        $stmt->execute();
        $result = $stmt->get_result();
        $rows = [];
        while ($row = $result->fetch_assoc()) {
            $rows[] = $row;
        }
        $stmt->close();

        $generated = [];
        $updatedIds = [];

        foreach ($rows as $row) {
            $automation = format_automation_row($row);
            $iterations = 0;
            $lastRun = null;

            while (!empty($automation['nextRunAt'])) {
                $nextRun = new DateTimeImmutable((string) $automation['nextRunAt']);
                if ($nextRun > $now) {
                    break;
                }

                $generated[] = store_generated_report($conn, $automation, $nextRun);
                $lastRun = $nextRun;
                $automation['lastRunAt'] = to_mysql_datetime($nextRun);
                $nextRunDate = compute_next_run(
                    (string) $automation['frequency'],
                    (string) $automation['time'],
                    (int) $automation['weekday'],
                    (int) $automation['monthday'],
                    $nextRun,
                    $nextRun->modify('+1 minute')
                );
                $automation['nextRunAt'] = $nextRunDate->format(DateTimeInterface::ATOM);

                $iterations++;
                if ($iterations >= MAX_AUTOMATION_CATCHUP) {
                    break;
                }
            }

            $stmt = $conn->prepare('UPDATE reportes_automatizaciones SET ultima_ejecucion = ?, proxima_ejecucion = ?, actualizado_en = NOW() WHERE id = ? AND id_empresa = ?');
            $lastRunSql = $lastRun ? to_mysql_datetime($lastRun) : $row['ultima_ejecucion'];
            $nextRunSql = isset($automation['nextRunAt']) ? to_mysql_datetime(new DateTimeImmutable($automation['nextRunAt'])) : null;
            $stmt->bind_param(
                'ssii',
                $lastRunSql,
                $nextRunSql,
                (int) $row['id'],
                (int) $row['id_empresa']
            );
            $stmt->execute();
            $stmt->close();

            $updatedIds[] = (int) $row['id'];
        }

        $automations = [];
        if ($empresaId > 0) {
            $automations = fetch_automations($empresaId);
        }

        respond_json(200, [
            'success' => true,
            'automations' => $automations,
            'generatedReports' => $generated
        ]);
    } catch (Throwable $exception) {
        error_log('run_due_automations: ' . $exception->getMessage());
        respond_json(500, ['success' => false, 'message' => 'No se pudieron ejecutar las automatizaciones programadas.']);
    } finally {
        $conn->close();
    }
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? '';

if ($method === 'OPTIONS') {
    header('Allow: GET, POST, OPTIONS');
    exit;
}

if ($method === 'GET') {
    if ($action === 'list') {
        $empresaId = isset($_GET['empresa']) ? (int) $_GET['empresa'] : 0;
        if ($empresaId <= 0) {
            respond_json(400, ['success' => false, 'message' => 'Empresa inválida.']);
        }
        $automations = fetch_automations($empresaId);
        respond_json(200, ['success' => true, 'automations' => $automations]);
    }

    respond_json(405, ['success' => false, 'message' => 'Método no permitido.']);
}

$input = json_decode(file_get_contents('php://input') ?: 'null', true);
if (!is_array($input)) {
    $input = [];
}

if ($method === 'POST') {
    switch ($action) {
        case 'save':
            save_automation($input);
            break;
        case 'delete':
            delete_automation($input);
            break;
        case 'toggle':
            toggle_automation($input);
            break;
        case 'run':
            run_single_automation($input);
            break;
        case 'run_due':
            run_due_automations($input);
            break;
        default:
            respond_json(400, ['success' => false, 'message' => 'Acción no soportada.']);
    }
}

respond_json(405, ['success' => false, 'message' => 'Método no permitido.']);
