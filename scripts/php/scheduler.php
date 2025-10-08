<?php
// scripts/php/scheduler.php
declare(strict_types=1);
require_once __DIR__ . '/report_history.php';

// This script is intended to be called by a cron every X minutes (e.g. every 5 minutes).
// It will find active automatizaciones with next_run_at <= NOW(), generate the report
// using an HTML template and Dompdf (if installed) and save the file via save_report-like logic.

function log_msg(string $m): void
{
    error_log('[scheduler] ' . $m);
}

try {
    $conn = db_connect();
} catch (Throwable $e) {
    log_msg('No DB connection: ' . $e->getMessage());
    exit(1);
}

// Fetch due automatizaciones
$stmt = $conn->prepare('SELECT * FROM automatizaciones WHERE active = 1 AND next_run_at IS NOT NULL AND next_run_at <= NOW() ORDER BY next_run_at ASC LIMIT 20');
$stmt->execute();
$res = $stmt->get_result();
$tasks = [];
while ($row = $res->fetch_assoc()) {
    $tasks[] = $row;
}
$stmt->close();

if (!count($tasks)) {
    $conn->close();
    log_msg('No hay tareas pendientes.');
    exit(0);
}

// Ensure Dompdf available
if (!class_exists('\Dompdf\Dompdf')) {
    log_msg('Dompdf no disponible. Instala dompdf para usar scheduler o usa wkhtmltopdf.');
}

foreach ($tasks as $task) {
    try {
        $empresaId = (int) ($task['id_empresa'] ?? 0);
        $automationId = $task['id'];
        $name = $task['name'] ?: 'reporte';
        $format = $task['format'] === 'excel' ? 'excel' : 'pdf';

        // Render HTML template
        ob_start();
        $automation = $task; // available to template
        include __DIR__ . '/automation_template.php';
        $html = ob_get_clean();

        $fileName = sanitize_file_name($name) . ' - ' . gmdate('Y-m-d H-i') . '.pdf';

        if (class_exists('\Dompdf\Dompdf')) {
            $dompdf = new \Dompdf\Dompdf();
            $dompdf->loadHtml($html);
            $dompdf->setPaper('A4', 'portrait');
            $dompdf->render();
            $pdf = $dompdf->output();
            $base64 = base64_encode($pdf);
            // Reuse save_report logic: call save_report via POST-ing to report_history.php
            $payload = [
                'fileName' => $fileName,
                'mimeType' => 'application/pdf',
                'fileContent' => 'base64,' . $base64,
                'source' => 'Automatización · ' . ($automation['module'] ?? ''),
                'notes' => $automation['notes'] ?? '',
                'empresaId' => $empresaId
            ];

            // Do a local internal call to save_report() by including and providing php://input hack
            $saved = false;
            // We'll directly write file and insert DB entry to avoid HTTP call
            ensure_storage();
            $safeName = sanitize_file_name($payload['fileName']);
            $finalName = ensure_extension($safeName, $payload['mimeType']);
            $storageName = time() . '-' . random_id() . '.' . pathinfo($finalName, PATHINFO_EXTENSION);
            $filePath = REPORT_FILES_DIR . '/' . $storageName;
            file_put_contents($filePath, $pdf, LOCK_EX);

            $nowIso = gmdate('c');
            $expiresIso = gmdate('c', time() + REPORT_RETENTION_SECONDS);

            $entry = [
                'id' => random_id(),
                'originalName' => $finalName,
                'mimeType' => $payload['mimeType'],
                'storageName' => $storageName,
                'size' => filesize($filePath),
                'createdAt' => $nowIso,
                'expiresAt' => $expiresIso,
                'source' => str_limit($payload['source'], 120),
                'notes' => str_limit($payload['notes'], 240),
            ];

            try {
                insert_report_reference($entry, $empresaId);
                $saved = true;
            } catch (Throwable $ex) {
                @unlink($filePath);
                log_msg('No se pudo registrar reporte: ' . $ex->getMessage());
            }

            if ($saved) {
                // update automation next_run_at and last_run_at
                $lastRun = gmdate('Y-m-d H:i:s');
                // compute next run based on frequency
                $nextRunAt = null;
                $now = new DateTime('now', new DateTimeZone('UTC'));
                if ($automation['frequency'] === 'daily') {
                    $next = clone $now;
                    $timeParts = explode(':', $automation['time'] ?? '08:00');
                    $next->setTime((int)$timeParts[0], (int)$timeParts[1], 0);
                    if ($next <= $now) {
                        $next->modify('+1 day');
                    }
                    $nextRunAt = $next->format('Y-m-d H:i:s');
                } elseif ($automation['frequency'] === 'weekly') {
                    $desired = max(0, min(6, (int) ($automation['weekday'] ?? 1)));
                    $timeParts = explode(':', $automation['time'] ?? '08:00');
                    $next = clone $now;
                    $next->setTime((int)$timeParts[0], (int)$timeParts[1], 0);
                    $currentDay = (int) $next->format('w');
                    $diff = $desired - $currentDay;
                    if ($diff <= 0) $diff += 7;
                    $next->modify("+{$diff} days");
                    $nextRunAt = $next->format('Y-m-d H:i:s');
                } else {
                    // monthly
                    $day = max(1, min(28, (int) ($automation['monthday'] ?? 1)));
                    $timeParts = explode(':', $automation['time'] ?? '08:00');
                    $next = new DateTime('now', new DateTimeZone('UTC'));
                    $next->setDate((int)$next->format('Y'), (int)$next->format('n'), $day);
                    $next->setTime((int)$timeParts[0], (int)$timeParts[1], 0);
                    if ($next <= $now) {
                        $next->modify('+1 month');
                    }
                    $nextRunAt = $next->format('Y-m-d H:i:s');
                }

                $upd = $conn->prepare('UPDATE automatizaciones SET last_run_at = ?, next_run_at = ? WHERE id = ?');
                $upd->bind_param('sss', $lastRun, $nextRunAt, $automationId);
                $upd->execute();
                $upd->close();
            }
        } else {
            log_msg('No se generó (Dompdf no instalado) para ' . $automationId);
        }

    } catch (Throwable $e) {
        log_msg('Tarea fallo: ' . $e->getMessage());
    }
}

$conn->close();
log_msg('Scheduler finalizado.');
