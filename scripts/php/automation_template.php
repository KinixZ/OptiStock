<?php
// scripts/php/automation_template.php
if (!isset($automation) || !is_array($automation)) {
    $automation = [];
}
if (!isset($reportData) || !is_array($reportData)) {
    $reportData = [];
}
$extraCss = isset($extraCss) ? $extraCss : '';

if (!function_exists('automation_escape')) {
    function automation_escape($value): string
    {
        return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }
}

if (!function_exists('automation_format_int')) {
    function automation_format_int($value): string
    {
        if (!is_numeric($value)) {
            return '0';
        }
        return number_format((float) $value, 0, ',', '.');
    }
}

if (!function_exists('automation_format_float')) {
    function automation_format_float($value, int $decimals = 2): string
    {
        if (!is_numeric($value)) {
            return '0';
        }
        return number_format((float) $value, $decimals, ',', '.');
    }
}

if (!function_exists('automation_format_percent')) {
    function automation_format_percent($value): string
    {
        if ($value === null || $value === '') {
            return '—';
        }
        if (!is_numeric($value)) {
            return (string) $value;
        }
        return automation_format_float($value, 2) . '%';
    }
}

$company = $reportData['company'] ?? [];
$palette = $reportData['palette'] ?? [];
$period = $reportData['period'] ?? [];
$summary = $reportData['summary'] ?? [];
$movementsByUser = $reportData['movementsByUser'] ?? [];
$movementTimeline = $reportData['movementTimeline'] ?? [];
$areas = $reportData['areas'] ?? [];
$requests = $reportData['requests'] ?? [];

$title = automation_escape($automation['name'] ?? 'Reporte automatizado');
$module = automation_escape($automation['module'] ?? '');
$notes = trim((string) ($automation['notes'] ?? ''));
$companyName = automation_escape($company['name'] ?? 'OptiStock');
$logoData = isset($company['logo']) && $company['logo'] ? $company['logo'] : null;
if (!$logoData) {
    $defaultLogoPath = realpath(__DIR__ . '/../../images/optistockLogo.png');
    if ($defaultLogoPath && is_file($defaultLogoPath)) {
        $defaultMime = @mime_content_type($defaultLogoPath) ?: 'image/png';
        $defaultData = @file_get_contents($defaultLogoPath);
        if ($defaultData !== false) {
            $logoData = 'data:' . $defaultMime . ';base64,' . base64_encode($defaultData);
        }
    }
}

$primaryColor = automation_escape($palette['primary'] ?? '#0f172a');
$secondaryColor = automation_escape($palette['secondary'] ?? '#1f2937');
$neutralColor = automation_escape($palette['neutral'] ?? '#f8fafc');
$periodLabel = automation_escape($period['label'] ?? '');
$frequencyLabel = automation_escape($period['frequencyLabel'] ?? '');
$generatedAtLabel = automation_escape($reportData['generatedAtLabel'] ?? '');
$notesEscaped = automation_escape($notes);

$totalAreas = $areas['totals']['areas'] ?? 0;
$totalZones = $areas['totals']['zones'] ?? 0;
$avgAreaOcc = $areas['totals']['avgAreaOccupancy'] ?? null;
$avgZoneOcc = $areas['totals']['avgZoneOccupancy'] ?? null;
$usedCapacity = $areas['totals']['usedCapacity'] ?? 0;
$totalVolume = $areas['totals']['volume'] ?? 0;

$openRequests = $requests['openTotal'] ?? 0;
$createdSummary = $requests['periodCreated'] ?? [];
$resolvedSummary = $requests['periodResolved'] ?? [];
$recentOpen = $requests['recentOpen'] ?? [];
$recentResolved = $requests['recentResolved'] ?? [];

$summaryRows = [
    ['Movimientos registrados', automation_format_int($summary['totalMovements'] ?? 0), 'Entradas y salidas consolidadas'],
    ['Usuarios activos', automation_format_int($summary['uniqueUsers'] ?? 0), 'Colaboradores que ejecutaron movimientos'],
    ['Entradas registradas', automation_format_int($summary['totalIngresos'] ?? 0), 'Cantidad total de piezas ingresadas'],
    ['Salidas registradas', automation_format_int($summary['totalEgresos'] ?? 0), 'Cantidad total de piezas egresadas'],
    ['Variación neta', automation_format_int($summary['net'] ?? 0), 'Entradas menos salidas en el periodo'],
];

$areaRows = [
    ['Áreas activas', automation_format_int($totalAreas), 'Total de áreas registradas'],
    ['Zonas activas', automation_format_int($totalZones), 'Total de zonas registradas'],
    ['Ocupación promedio de áreas', automation_format_percent($avgAreaOcc), 'Porcentaje promedio de ocupación'],
    ['Ocupación promedio de zonas', automation_format_percent($avgZoneOcc), 'Porcentaje promedio de ocupación'],
    ['Capacidad utilizada (m³)', automation_format_float($usedCapacity, 2), 'Volumen ocupado en áreas'],
    ['Volumen total (m³)', automation_format_float($totalVolume, 2), 'Volumen disponible registrado'],
];

$requestsRows = [
    ['Solicitudes abiertas', automation_format_int($openRequests), 'Solicitudes en proceso al momento de generar el reporte'],
    ['Solicitudes creadas en el periodo', automation_format_int(array_sum(array_column($createdSummary, 'total'))), 'Acumulado del periodo'],
    ['Solicitudes resueltas en el periodo', automation_format_int(array_sum(array_column($resolvedSummary, 'total'))), 'Historial de cierres en el periodo'],
];

?>
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title><?php echo $title; ?></title>
  <style>
    body {
      margin: 0;
      padding: 24px 28px;
      font-family: 'DejaVu Sans', 'Helvetica Neue', Arial, sans-serif;
      font-size: 12px;
      line-height: 1.55;
      color: #1f2937;
      background: #ffffff;
    }
    h1, h2, h3 {
      margin: 0 0 8px;
      color: <?php echo $secondaryColor; ?>;
    }
    h1 {
      font-size: 22px;
    }
    h2 {
      font-size: 16px;
      margin-top: 8px;
    }
    h3 {
      font-size: 13px;
    }
    .report-header {
      border: 1px solid #cbd5f5;
      background: <?php echo $neutralColor; ?>;
      padding: 16px;
      margin-bottom: 24px;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
    }
    .logo-cell {
      width: 120px;
      vertical-align: top;
      text-align: center;
    }
    .logo-box {
      border: 1px solid #cbd5f5;
      background: #ffffff;
      width: 110px;
      height: 110px;
      display: table-cell;
      vertical-align: middle;
      text-align: center;
    }
    .logo-box img {
      max-width: 100%;
      max-height: 100%;
    }
    .title-cell {
      padding-left: 12px;
      vertical-align: top;
    }
    .company-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #475569;
    }
    .module-label {
      font-size: 11px;
      color: #475569;
      margin-bottom: 6px;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
    }
    .meta-table td {
      border: 1px solid #e2e8f0;
      padding: 8px;
      font-size: 11px;
    }
    .meta-label {
      display: block;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.08em;
      font-weight: bold;
      color: #475569;
      margin-bottom: 4px;
    }
    section {
      margin-bottom: 24px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    .data-table th {
      background: #f1f5f9;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-size: 10px;
      padding: 8px;
      border: 1px solid #e2e8f0;
    }
    .data-table td {
      border: 1px solid #e2e8f0;
      padding: 8px;
      font-size: 11px;
    }
    .metrics-table td,
    .metrics-table th {
      border: 1px solid #e2e8f0;
      padding: 8px;
      font-size: 11px;
    }
    .metrics-table th {
      background: <?php echo $primaryColor; ?>;
      color: #ffffff;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-size: 10px;
    }
    .metric-description {
      color: #475569;
      font-size: 10px;
    }
    .list-card {
      border: 1px solid #cbd5f5;
      background: #ffffff;
      padding: 12px;
      margin-top: 8px;
    }
    .list-card ul,
    .list-card ol {
      margin: 0 0 0 16px;
      padding: 0;
      font-size: 11px;
    }
    .list-card li {
      margin-bottom: 6px;
    }
    .empty-state {
      border: 1px dashed #cbd5f5;
      padding: 10px;
      font-style: italic;
      color: #64748b;
      font-size: 11px;
      margin-top: 6px;
    }
    .notes-card {
      border: 1px solid #cbd5f5;
      background: #ffffff;
      padding: 12px;
      font-size: 11px;
      color: #475569;
    }
  </style>
  <?php if (!empty($extraCss) && is_string($extraCss)): ?>
    <style>
      <?php echo $extraCss; ?>
    </style>
  <?php endif; ?>
</head>
<body>
  <header class="report-header">
    <table class="header-table">
      <tr>
        <?php if ($logoData): ?>
          <td class="logo-cell">
            <div class="logo-box">
              <img src="<?php echo automation_escape($logoData); ?>" alt="Logotipo de la empresa" />
            </div>
          </td>
        <?php endif; ?>
        <td class="title-cell">
          <div class="company-label"><?php echo $companyName; ?></div>
          <h1><?php echo $title; ?></h1>
          <?php if ($module): ?>
            <div class="module-label">Módulo origen: <?php echo $module; ?></div>
          <?php endif; ?>
        </td>
      </tr>
    </table>
    <table class="meta-table">
      <tbody>
        <?php if ($periodLabel): ?>
          <tr>
            <td><span class="meta-label">Periodo analizado</span><?php echo $periodLabel; ?></td>
          </tr>
        <?php endif; ?>
        <?php if ($frequencyLabel): ?>
          <tr>
            <td><span class="meta-label">Frecuencia</span><?php echo $frequencyLabel; ?></td>
          </tr>
        <?php endif; ?>
        <?php if ($generatedAtLabel): ?>
          <tr>
            <td><span class="meta-label">Generado</span><?php echo $generatedAtLabel; ?></td>
          </tr>
        <?php endif; ?>
      </tbody>
    </table>
  </header>

  <section>
    <h2>Resumen del periodo</h2>
    <table class="metrics-table">
      <thead>
        <tr>
          <th>Indicador</th>
          <th>Valor</th>
          <th>Detalle</th>
        </tr>
      </thead>
      <tbody>
        <?php foreach ($summaryRows as $row): ?>
          <tr>
            <td><?php echo automation_escape($row[0]); ?></td>
            <td><?php echo automation_escape($row[1]); ?></td>
            <td class="metric-description"><?php echo automation_escape($row[2]); ?></td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </section>

  <section>
    <h2>Movimientos por usuario</h2>
    <?php if (count($movementsByUser)): ?>
      <table class="data-table">
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Rol</th>
            <th style="text-align:right">Movimientos</th>
            <th style="text-align:right">Entradas</th>
            <th style="text-align:right">Salidas</th>
            <th style="text-align:right">Variación</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($movementsByUser as $item): ?>
            <tr>
              <td><?php echo automation_escape($item['user'] ?? ''); ?></td>
              <td><?php echo automation_escape($item['role'] ?? ''); ?></td>
              <td style="text-align:right"><?php echo automation_format_int($item['movements'] ?? 0); ?></td>
              <td style="text-align:right"><?php echo automation_format_int($item['ingresos'] ?? 0); ?></td>
              <td style="text-align:right"><?php echo automation_format_int($item['egresos'] ?? 0); ?></td>
              <td style="text-align:right"><?php echo automation_format_int($item['net'] ?? 0); ?></td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    <?php else: ?>
      <div class="empty-state">No se registraron movimientos por usuario durante el periodo seleccionado.</div>
    <?php endif; ?>
  </section>

  <section>
    <h2>Actividad por fecha</h2>
    <?php if (count($movementTimeline)): ?>
      <table class="data-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th style="text-align:right">Movimientos</th>
            <th style="text-align:right">Entradas</th>
            <th style="text-align:right">Salidas</th>
            <th style="text-align:right">Variación</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($movementTimeline as $item): ?>
            <tr>
              <td><?php echo automation_escape($item['label'] ?? ''); ?></td>
              <td style="text-align:right"><?php echo automation_format_int($item['movements'] ?? 0); ?></td>
              <td style="text-align:right"><?php echo automation_format_int($item['ingresos'] ?? 0); ?></td>
              <td style="text-align:right"><?php echo automation_format_int($item['egresos'] ?? 0); ?></td>
              <td style="text-align:right"><?php echo automation_format_int($item['net'] ?? 0); ?></td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    <?php else: ?>
      <div class="empty-state">No se encontraron movimientos en el historial para el periodo analizado.</div>
    <?php endif; ?>
  </section>

  <section>
    <h2>Estado de áreas y zonas</h2>
    <table class="metrics-table">
      <thead>
        <tr>
          <th>Indicador</th>
          <th>Valor</th>
          <th>Detalle</th>
        </tr>
      </thead>
      <tbody>
        <?php foreach ($areaRows as $row): ?>
          <tr>
            <td><?php echo automation_escape($row[0]); ?></td>
            <td><?php echo automation_escape($row[1]); ?></td>
            <td class="metric-description"><?php echo automation_escape($row[2]); ?></td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
    <div class="list-card">
      <h3>Áreas con mayor ocupación</h3>
      <?php if (!empty($areas['topAreas'])): ?>
        <ol>
          <?php foreach ($areas['topAreas'] as $area): ?>
            <li>
              <strong><?php echo automation_escape($area['name'] ?? 'Área'); ?></strong><br />
              Ocupación: <?php echo automation_format_percent($area['occupancy'] ?? null); ?> · Productos: <?php echo automation_format_int($area['products'] ?? 0); ?>
            </li>
          <?php endforeach; ?>
        </ol>
      <?php else: ?>
        <div class="empty-state">Sin información registrada de áreas para este periodo.</div>
      <?php endif; ?>
    </div>
    <div class="list-card">
      <h3>Zonas con mayor ocupación</h3>
      <?php if (!empty($areas['topZones'])): ?>
        <ol>
          <?php foreach ($areas['topZones'] as $zone): ?>
            <li>
              <strong><?php echo automation_escape($zone['name'] ?? 'Zona'); ?></strong><br />
              Ocupación: <?php echo automation_format_percent($zone['occupancy'] ?? null); ?> · Productos: <?php echo automation_format_int($zone['products'] ?? 0); ?>
            </li>
          <?php endforeach; ?>
        </ol>
      <?php else: ?>
        <div class="empty-state">Sin información registrada de zonas para este periodo.</div>
      <?php endif; ?>
    </div>
  </section>

  <section>
    <h2>Solicitudes y cambios</h2>
    <table class="metrics-table">
      <thead>
        <tr>
          <th>Indicador</th>
          <th>Valor</th>
          <th>Detalle</th>
        </tr>
      </thead>
      <tbody>
        <?php foreach ($requestsRows as $row): ?>
          <tr>
            <td><?php echo automation_escape($row[0]); ?></td>
            <td><?php echo automation_escape($row[1]); ?></td>
            <td class="metric-description"><?php echo automation_escape($row[2]); ?></td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>

    <div class="list-card">
      <h3>Detalle de solicitudes registradas</h3>
      <?php if (!empty($createdSummary)): ?>
        <ul>
          <?php foreach ($createdSummary as $item): ?>
            <li><?php echo automation_escape(ucfirst($item['estado'] ?? '')); ?>: <?php echo automation_format_int($item['total'] ?? 0); ?></li>
          <?php endforeach; ?>
        </ul>
      <?php else: ?>
        <div class="empty-state">No se generaron solicitudes nuevas en el periodo.</div>
      <?php endif; ?>
    </div>

    <div class="list-card">
      <h3>Solicitudes resueltas</h3>
      <?php if (!empty($resolvedSummary)): ?>
        <ul>
          <?php foreach ($resolvedSummary as $item): ?>
            <li><?php echo automation_escape(ucfirst($item['estado'] ?? '')); ?>: <?php echo automation_format_int($item['total'] ?? 0); ?></li>
          <?php endforeach; ?>
        </ul>
      <?php else: ?>
        <div class="empty-state">No se resolvieron solicitudes durante el periodo.</div>
      <?php endif; ?>
    </div>

    <div class="list-card">
      <h3>Solicitudes pendientes más recientes</h3>
      <?php if (!empty($recentOpen)): ?>
        <ul>
          <?php foreach ($recentOpen as $item): ?>
            <li>
              <strong><?php echo automation_escape($item['module'] ?? ''); ?></strong><br />
              <?php echo automation_escape($item['summary'] ?? ''); ?><br />
              Estado: <?php echo automation_escape($item['estado'] ?? ''); ?> · <?php echo automation_escape($item['dateLabel'] ?? ''); ?>
            </li>
          <?php endforeach; ?>
        </ul>
      <?php else: ?>
        <div class="empty-state">No hay solicitudes pendientes registradas en este periodo.</div>
      <?php endif; ?>
    </div>

    <div class="list-card">
      <h3>Solicitudes cerradas más recientes</h3>
      <?php if (!empty($recentResolved)): ?>
        <ul>
          <?php foreach ($recentResolved as $item): ?>
            <li>
              <strong><?php echo automation_escape($item['module'] ?? ''); ?></strong><br />
              <?php echo automation_escape($item['summary'] ?? ''); ?><br />
              Resultado: <?php echo automation_escape($item['estado'] ?? ''); ?> · <?php echo automation_escape($item['dateLabel'] ?? ''); ?>
            </li>
          <?php endforeach; ?>
        </ul>
      <?php else: ?>
        <div class="empty-state">No se registran solicitudes cerradas durante el periodo.</div>
      <?php endif; ?>
    </div>
  </section>

  <?php if ($notesEscaped): ?>
    <section>
      <h2>Notas de la automatización</h2>
      <div class="notes-card"><?php echo $notesEscaped; ?></div>
    </section>
  <?php endif; ?>
</body>
</html>
