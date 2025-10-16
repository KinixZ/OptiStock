<?php
// scripts/php/run_automation_now.php
// Genera un reporte automatizado bajo demanda y devuelve el archivo listo para guardarse
// en el historial como si fuera una exportación manual.

declare(strict_types=1);

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

define('OPTISTOCK_REPORT_HISTORY_NO_ROUTER', true);
require_once __DIR__ . '/report_history.php';
require_once __DIR__ . '/automation_runtime.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Método no permitido. Usa POST para solicitar la generación.',
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$input = json_decode(file_get_contents('php://input') ?: 'null', true);
if (!is_array($input)) {
    respond_json(400, [
        'success' => false,
        'message' => 'Solicitud inválida. Envía un cuerpo JSON con la automatización a ejecutar.',
    ]);
}

$automationId = isset($input['automationId']) ? trim((string) $input['automationId']) : '';
$empresaId = isset($input['empresaId']) ? (int) $input['empresaId'] : 0;

if ($automationId === '') {
    respond_json(400, [
        'success' => false,
        'message' => 'Debes indicar el identificador de la automatización.',
    ]);
}

if ($empresaId <= 0) {
    respond_json(400, [
        'success' => false,
        'message' => 'Debes indicar la empresa para generar el reporte.',
    ]);
}

try {
    $conn = db_connect();
} catch (Throwable $exception) {
    respond_json(500, [
        'success' => false,
        'message' => 'No se pudo conectar a la base de datos para generar el reporte.',
    ]);
}

try {
    $stmt = $conn->prepare('SELECT uuid, id_empresa, nombre, modulo, formato, frecuencia, hora_ejecucion, dia_semana, dia_mes, notas, activo, proxima_ejecucion, ultimo_ejecutado, creado_en FROM reportes_automatizados WHERE uuid = ? AND id_empresa = ? LIMIT 1');
    $stmt->bind_param('si', $automationId, $empresaId);
    $stmt->execute();
    $result = $stmt->get_result();
    $automationRow = $result->fetch_assoc() ?: null;
    $stmt->close();
} catch (Throwable $exception) {
    $conn->close();
    respond_json(500, [
        'success' => false,
        'message' => 'No se pudo consultar la automatización solicitada.',
    ]);
}

if ($automationRow === null) {
    $conn->close();
    respond_json(404, [
        'success' => false,
        'message' => 'La automatización indicada no existe.',
    ]);
}

$now = new DateTimeImmutable('now');
$payload = build_report_payload($conn, $automationRow, $now);

$moduleValue = normalize_module_value($automationRow['modulo'] ?? '');
$moduleLabel = resolve_module_label($automationRow['modulo'] ?? '');
$sourceLabel = resolve_manual_source_label($moduleValue, $moduleLabel);

$automationView = [
    'id' => (string) ($automationRow['uuid'] ?? $automationId),
    'name' => (string) ($automationRow['nombre'] ?? 'Reporte automatizado'),
    'module' => $moduleLabel,
    'moduleValue' => $moduleValue,
    'format' => (string) ($automationRow['formato'] ?? 'pdf'),
    'frequency' => (string) ($automationRow['frecuencia'] ?? 'daily'),
    'weekday' => $automationRow['dia_semana'] !== null ? (int) $automationRow['dia_semana'] : null,
    'monthday' => $automationRow['dia_mes'] !== null ? (int) $automationRow['dia_mes'] : null,
    'time' => substr((string) ($automationRow['hora_ejecucion'] ?? '08:00:00'), 0, 5),
    'notes' => (string) ($automationRow['notas'] ?? ''),
];

$format = $automationView['format'] === 'excel' ? 'excel' : 'pdf';
$binary = '';
$mimeType = $format === 'excel' ? 'text/csv' : 'application/pdf';
$extension = $format === 'excel' ? 'csv' : 'pdf';

if ($format === 'excel') {
    $binary = render_report_csv($payload);
} else {
    try {
        $vendorAutoload = realpath(__DIR__ . '/../../vendor/autoload.php');
        if ($vendorAutoload && is_file($vendorAutoload)) {
            require_once $vendorAutoload;
        }
    } catch (Throwable $e) {
        // ignore autoload errors, Dompdf might already be available
    }

    if (!class_exists('Dompdf\\Dompdf')) {
        $conn->close();
        respond_json(500, [
            'success' => false,
            'message' => 'Dompdf no está instalado en el servidor, no se pudo generar el PDF.',
        ]);
    }

    $reportData = $payload;
    $automation = $automationView;
    $extraCss = '';
    $cssFragments = [];

    $palettePath = realpath(__DIR__ . '/../../styles/theme/palette.css');
    if ($palettePath && is_file($palettePath)) {
        $paletteCss = @file_get_contents($palettePath);
        if ($paletteCss !== false) {
            $cssFragments[] = trim($paletteCss);
        }
    }

    $cssPath = realpath(__DIR__ . '/../../styles/reports/reportes.css');
    if ($cssPath && is_file($cssPath)) {
        $cssContent = @file_get_contents($cssPath);
        if ($cssContent !== false) {
            $cssContent = preg_replace('/@import[^;]+;\s*/i', '', $cssContent);
            $cssFragments[] = trim($cssContent);
        }
    }

    if (!empty($cssFragments)) {
        $extraCss = implode("\n", array_filter($cssFragments, static function ($fragment) {
            return $fragment !== '';
        }));
    }

    ob_start();
    include __DIR__ . '/automation_template.php';
    $html = ob_get_clean();

    $dompdf = new Dompdf\Dompdf();
    $dompdf->loadHtml($html);
    $dompdf->setPaper('A4', 'portrait');
    $dompdf->render();
    $binary = $dompdf->output();
}

$conn->close();

if ($binary === '' || $binary === null) {
    respond_json(500, [
        'success' => false,
        'message' => 'No se pudo generar el archivo del reporte.',
    ]);
}

$fileBaseName = sanitize_file_name($automationView['name'] ?: 'Reporte automatizado');
$timestampLabel = $now->format('Y-m-d H-i');
$originalName = $fileBaseName . ' - ' . $timestampLabel . '.' . $extension;

respond_json(200, [
    'success' => true,
    'fileName' => $originalName,
    'mimeType' => $mimeType,
    'fileContent' => base64_encode($binary),
    'moduleLabel' => $moduleLabel,
    'moduleValue' => $moduleValue,
    'sourceLabel' => $sourceLabel,
    'notes' => $automationView['notes'] !== '' ? $automationView['notes'] : 'Generado manualmente desde automatización',
    'generatedAt' => format_datetime_iso($now),
    'format' => $format,
]);
