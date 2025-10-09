<?php
// scripts/php/scheduler.php

declare(strict_types=1);

require_once __DIR__ . '/report_history.php';

// Este script está pensado para ejecutarse desde un cron cada X minutos (p. ej. cada 5 minutos).
// Busca automatizaciones pendientes en la tabla centralizada, genera el reporte con Dompdf
// y registra la corrida en el historial local y en la base de datos.

function log_msg(string $message): void
{
    error_log('[scheduler] ' . $message);
}

try {
    $conn = db_connect();
} catch (Throwable $exception) {
    log_msg('No DB connection: ' . $exception->getMessage());
    exit(1);
}

ensure_automation_run_table($conn);

$stmt = $conn->prepare('SELECT uuid, id_empresa FROM reportes_automatizados WHERE activo = 1 AND proxima_ejecucion IS NOT NULL AND proxima_ejecucion <= NOW() ORDER BY proxima_ejecucion ASC LIMIT 20');
$stmt->execute();
$result = $stmt->get_result();
$tasks = [];
while ($row = $result->fetch_assoc()) {
    $tasks[] = $row;
}
$stmt->close();

if (!count($tasks)) {
    $conn->close();
    log_msg('No hay tareas pendientes.');
    exit(0);
}

if (!class_exists('\Dompdf\Dompdf')) {
    log_msg('Dompdf no disponible. Instala dompdf para usar el scheduler o configura una alternativa.');
}

foreach ($tasks as $task) {
    $automationId = (string) ($task['uuid'] ?? '');
    $empresaId = (int) ($task['id_empresa'] ?? 0);

    if ($automationId === '' || $empresaId <= 0) {
        log_msg('Datos incompletos para automatización, se omite.');
        continue;
    }

    $transactionStarted = false;
    $filePath = null;

    try {
        $conn->begin_transaction();
        $transactionStarted = true;

        $lockStmt = $conn->prepare('SELECT uuid, id_empresa, nombre, modulo, formato, frecuencia, hora_ejecucion, dia_semana, dia_mes, notas, activo, ultimo_ejecutado, proxima_ejecucion FROM reportes_automatizados WHERE uuid = ? AND id_empresa = ? FOR UPDATE');
        $lockStmt->bind_param('si', $automationId, $empresaId);
        $lockStmt->execute();
        $automationResult = $lockStmt->get_result();
        $automationRow = $automationResult->fetch_assoc() ?: null;
        $lockStmt->close();

        if ($automationRow === null) {
            $conn->rollback();
            $transactionStarted = false;
            log_msg('Automatización no encontrada: ' . $automationId);
            continue;
        }

        if (empty($automationRow['activo'])) {
            $conn->rollback();
            $transactionStarted = false;
            log_msg('Automatización desactivada, se omite: ' . $automationId);
            continue;
        }

        $scheduledRaw = $automationRow['proxima_ejecucion'] ?? null;
        if (!$scheduledRaw) {
            $conn->rollback();
            $transactionStarted = false;
            log_msg('Automatización sin próxima ejecución definida: ' . $automationId);
            continue;
        }

        try {
            $scheduledAt = new DateTimeImmutable($scheduledRaw);
        } catch (Throwable $exception) {
            $conn->rollback();
            $transactionStarted = false;
            log_msg('Fecha de ejecución inválida para ' . $automationId . ': ' . $exception->getMessage());
            continue;
        }

        $now = new DateTimeImmutable('now');
        if ($scheduledAt > $now && seconds_between($scheduledAt, $now) > AUTOMATION_RUN_TOLERANCE_SECONDS) {
            $conn->rollback();
            $transactionStarted = false;
            log_msg('Aún no es momento de ejecutar la automatización ' . $automationId);
            continue;
        }

        $lastRunRaw = $automationRow['ultimo_ejecutado'] ?? null;
        if ($lastRunRaw) {
            try {
                $lastRun = new DateTimeImmutable($lastRunRaw);
                if (seconds_between($lastRun, $scheduledAt) <= AUTOMATION_RUN_TOLERANCE_SECONDS) {
                    $conn->rollback();
                    $transactionStarted = false;
                    log_msg('La automatización ' . $automationId . ' ya se ejecutó para este horario.');
                    continue;
                }
            } catch (Throwable $exception) {
                // Ignorar formato inválido.
            }
        }

        if (!class_exists('\Dompdf\Dompdf')) {
            $conn->rollback();
            $transactionStarted = false;
            log_msg('No hay motor PDF disponible para ejecutar ' . $automationId);
            continue;
        }

        $format = strtolower((string) ($automationRow['formato'] ?? 'pdf'));
        if ($format !== 'pdf') {
            $conn->rollback();
            $transactionStarted = false;
            log_msg('Formato no soportado para automatización ' . $automationId . ': ' . $format);
            continue;
        }

        $runAtSql = $scheduledAt->format('Y-m-d H:i:s');
        $runStmt = $conn->prepare('INSERT INTO reportes_automatizados_runs (automation_uuid, empresa_id, run_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE run_at = run_at');
        $runStmt->bind_param('sis', $automationId, $empresaId, $runAtSql);
        $runStmt->execute();
        if ($runStmt->affected_rows === 0) {
            $runStmt->close();
            $conn->rollback();
            $transactionStarted = false;
            log_msg('La automatización ' . $automationId . ' ya tiene registro para este horario.');
            continue;
        }
        $runStmt->close();

        $automation = [
            'id' => $automationId,
            'empresaId' => $empresaId,
            'name' => $automationRow['nombre'] ?? 'Reporte automatizado',
            'module' => $automationRow['modulo'] ?? '',
            'notes' => $automationRow['notas'] ?? '',
            'frequency' => $automationRow['frecuencia'] ?? 'daily',
            'time' => substr((string) ($automationRow['hora_ejecucion'] ?? '08:00:00'), 0, 5),
            'weekday' => $automationRow['dia_semana'] ?? null,
            'monthday' => $automationRow['dia_mes'] ?? null,
        ];

        try {
            $reportData = build_automation_report_data($conn, $automationRow);
        } catch (Throwable $exception) {
            $reportData = [];
            log_msg('No se pudo obtener datos para el reporte ' . $automationId . ': ' . $exception->getMessage());
        }

        ob_start();
        include __DIR__ . '/automation_template.php';
        $html = ob_get_clean();

        $dompdf = new \Dompdf\Dompdf();
        $dompdf->loadHtml($html);
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();
        $pdf = $dompdf->output();

        ensure_storage();
        $fileBaseName = sanitize_file_name(($automationRow['nombre'] ?? 'reporte') . ' - ' . $scheduledAt->format('Y-m-d H-i'));
        $finalName = ensure_extension($fileBaseName, 'application/pdf');
        $storageName = time() . '-' . random_id() . '.' . pathinfo($finalName, PATHINFO_EXTENSION);
        $filePath = REPORT_FILES_DIR . '/' . $storageName;

        if (file_put_contents($filePath, $pdf, LOCK_EX) === false) {
            throw new RuntimeException('No se pudo escribir el archivo para ' . $automationId);
        }

        $nowIso = gmdate('c');
        $expiresIso = gmdate('c', time() + REPORT_RETENTION_SECONDS);

        $entry = [
            'id' => random_id(),
            'originalName' => $finalName,
            'mimeType' => 'application/pdf',
            'storageName' => $storageName,
            'size' => strlen($pdf),
            'createdAt' => $nowIso,
            'expiresAt' => $expiresIso,
            'source' => str_limit('Automatización · ' . ($automationRow['modulo'] ?? ''), 120),
            'notes' => str_limit((string) ($automationRow['notas'] ?? ''), 240),
        ];

        insert_report_reference($entry, $empresaId, $conn);

        $automationRow['ultimo_ejecutado'] = $runAtSql;
        $automationNextRun = compute_next_run_for_automation($automationRow, $scheduledAt->modify('+1 minute'));

        if ($automationNextRun instanceof DateTimeImmutable) {
            $nextRunSql = $automationNextRun->format('Y-m-d H:i:s');
            $updateStmt = $conn->prepare('UPDATE reportes_automatizados SET ultimo_ejecutado = ?, proxima_ejecucion = ? WHERE uuid = ? AND id_empresa = ?');
            $updateStmt->bind_param('sssi', $runAtSql, $nextRunSql, $automationId, $empresaId);
        } else {
            $updateStmt = $conn->prepare('UPDATE reportes_automatizados SET ultimo_ejecutado = ?, proxima_ejecucion = NULL WHERE uuid = ? AND id_empresa = ?');
            $updateStmt->bind_param('ssi', $runAtSql, $automationId, $empresaId);
        }
        $updateStmt->execute();
        $updateStmt->close();

        $conn->commit();
        $transactionStarted = false;
        log_msg('Automatización ejecutada correctamente: ' . $automationId);
    } catch (Throwable $exception) {
        if ($transactionStarted) {
            try {
                $conn->rollback();
            } catch (Throwable $rollbackException) {
                log_msg('No se pudo revertir la transacción: ' . $rollbackException->getMessage());
            }
        }

        if ($filePath && is_file($filePath)) {
            @unlink($filePath);
        }

        log_msg('Tarea falló para ' . $automationId . ': ' . $exception->getMessage());
    }
}

$conn->close();
log_msg('Scheduler finalizado.');
