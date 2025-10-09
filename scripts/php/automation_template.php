<?php
// scripts/php/automation_template.php
// Minimal template that mimics the page styles so PDFs look like UI.
if (!isset($automation) || !is_array($automation)) {
    $automation = [];
}

if (!isset($reportData) || !is_array($reportData)) {
    $reportData = [];
}

$title = htmlspecialchars($automation['name'] ?? 'Reporte automatizado', ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
$subtitle = htmlspecialchars($automation['module'] ?? '', ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
$notes = htmlspecialchars($automation['notes'] ?? '', ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

$company = isset($reportData['company']) && is_array($reportData['company']) ? $reportData['company'] : [];
$companyName = htmlspecialchars((string) ($company['name'] ?? ''), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
$companySector = htmlspecialchars((string) ($company['sector'] ?? ''), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

$metrics = isset($reportData['metrics']) && is_array($reportData['metrics']) ? $reportData['metrics'] : [];
$tables = isset($reportData['tables']) && is_array($reportData['tables']) ? $reportData['tables'] : [];

$generatedAtIso = (string) ($reportData['generatedAt'] ?? gmdate('c'));
try {
    $generatedAtDisplay = (new DateTimeImmutable($generatedAtIso))->format('Y-m-d H:i');
} catch (Throwable $exception) {
    $generatedAtDisplay = date('Y-m-d H:i');
}

function render_text(?string $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function render_table_cell(string $value): string
{
    return nl2br(render_text($value));
}

?><!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title><?php echo $title; ?></title>
  <link rel="stylesheet" href="<?php echo __DIR__ . '/../../styles/reports/reportes.css'; ?>" />
  <style>
    /* Inline adjustments for PDF rendering */
    body { font-family: Helvetica, Arial, sans-serif; padding: 28px; color: #1f2937; }
    .report-header { border-bottom: 1px solid #e5e7eb; padding-bottom: 12px; margin-bottom: 18px; }
    .report-title { font-weight: 700; font-size: 20px; }
    .report-subtitle { color: #6b7280; margin-top: 6px; }
    .report-notes { margin-top: 12px; color: #6b7280; font-size: 13px; }
    .report-meta { margin-top: 4px; color: #6b7280; font-size: 12px; }
    .company-name { font-weight: 600; margin-top: 8px; font-size: 14px; }
    .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-top: 20px; }
    .metric-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; background-color: #f9fafb; }
    .metric-label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
    .metric-value { font-size: 18px; font-weight: 700; margin-top: 4px; color: #111827; }
    .metric-description { font-size: 11px; color: #6b7280; margin-top: 6px; line-height: 1.4; }
    .report-section { margin-top: 24px; }
    .report-section h3 { font-size: 16px; margin-bottom: 12px; color: #111827; }
    .report-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .report-table th { background-color: #f3f4f6; text-align: left; padding: 8px; border: 1px solid #e5e7eb; font-weight: 600; }
    .report-table td { padding: 8px; border: 1px solid #e5e7eb; vertical-align: top; }
    .report-placeholder { margin-top: 16px; font-size: 13px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="report-header">
    <div class="report-title"><?php echo $title; ?></div>
    <?php if ($subtitle): ?><div class="report-subtitle"><?php echo $subtitle; ?></div><?php endif; ?>
    <?php if ($companyName): ?><div class="company-name">Empresa: <?php echo $companyName; ?><?php if ($companySector): ?> · <?php echo $companySector; ?><?php endif; ?></div><?php endif; ?>
    <div class="report-meta">Generado el <?php echo render_text($generatedAtDisplay); ?></div>
  </div>

  <div class="report-body">
    <p>Este documento fue generado automáticamente por la automatización configurada.</p>
    <?php if ($notes): ?><div class="report-notes"><strong>Notas:</strong> <?php echo $notes; ?></div><?php endif; ?>

    <?php if ($metrics): ?>
      <div class="metrics-grid">
        <?php foreach ($metrics as $metric):
          $metricLabel = render_text($metric['label'] ?? '');
          $metricValue = render_text($metric['value'] ?? '');
          $metricDescription = render_text($metric['description'] ?? '');
        ?>
          <div class="metric-card">
            <div class="metric-label"><?php echo $metricLabel; ?></div>
            <div class="metric-value"><?php echo $metricValue !== '' ? $metricValue : '—'; ?></div>
            <?php if ($metricDescription): ?><div class="metric-description"><?php echo $metricDescription; ?></div><?php endif; ?>
          </div>
        <?php endforeach; ?>
      </div>
    <?php endif; ?>

    <?php if ($tables): ?>
      <?php foreach ($tables as $table):
        $tableTitle = render_text($table['title'] ?? '');
        $headers = isset($table['headers']) && is_array($table['headers']) ? $table['headers'] : [];
        $rows = isset($table['rows']) && is_array($table['rows']) ? $table['rows'] : [];
        if (!$tableTitle || !$headers || !$rows) {
            continue;
        }
      ?>
        <div class="report-section">
          <h3><?php echo $tableTitle; ?></h3>
          <table class="report-table">
            <thead>
              <tr>
                <?php foreach ($headers as $header): ?>
                  <th><?php echo render_text((string) $header); ?></th>
                <?php endforeach; ?>
              </tr>
            </thead>
            <tbody>
              <?php foreach ($rows as $row): ?>
                <tr>
                  <?php foreach ($row as $cell): ?>
                    <td><?php echo render_table_cell((string) $cell); ?></td>
                  <?php endforeach; ?>
                </tr>
              <?php endforeach; ?>
            </tbody>
          </table>
        </div>
      <?php endforeach; ?>
    <?php endif; ?>

    <?php if (!$metrics && !$tables): ?>
      <p class="report-placeholder">No se encontraron datos recientes para esta automatización. Verifica que existan registros asociados al módulo seleccionado.</p>
    <?php endif; ?>
  </div>
</body>
</html>
