<?php
// scripts/php/automation_template.php
// Minimal template that mimics the page styles so PDFs look like UI.
if (!isset($automation) || !is_array($automation)) {
    $automation = [];
}

$title = htmlspecialchars($automation['name'] ?? 'Reporte automatizado', ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
$subtitle = htmlspecialchars($automation['module'] ?? '', ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
$notes = htmlspecialchars($automation['notes'] ?? '', ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

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
  </style>
</head>
<body>
  <div class="report-header">
    <div class="report-title"><?php echo $title; ?></div>
    <?php if ($subtitle): ?><div class="report-subtitle"><?php echo $subtitle; ?></div><?php endif; ?>
  </div>

  <div class="report-body">
    <p>Este documento fue generado automáticamente por la automatización configurada.</p>
    <?php if ($notes): ?><div class="report-notes"><strong>Notas:</strong> <?php echo $notes; ?></div><?php endif; ?>

    <!-- You can expand: include module-specific data here by querying DB and rendering tables -->
  </div>
</body>
</html>
