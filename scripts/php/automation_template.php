<?php
// scripts/php/automation_template.php
if (!isset($automation) || !is_array($automation)) {
    $automation = [];
}
if (!isset($reportData) || !is_array($reportData)) {
    $reportData = [];
}

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

$primaryColor = automation_escape($palette['primary'] ?? '#ff6f91');
$secondaryColor = automation_escape($palette['secondary'] ?? '#0f172a');
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

?>
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title><?php echo $title; ?></title>
  <style>
    :root {
      --primary: <?php echo $primaryColor; ?>;
      --secondary: <?php echo $secondaryColor; ?>;
      --neutral: <?php echo $neutralColor; ?>;
      --text: #1f2937;
      --muted: #6b7280;
      --border: #e5e7eb;
      --card-bg: #ffffff;
      --shadow: 0 20px 45px -40px rgba(15, 23, 42, 0.45);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 32px 40px;
      font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
      font-size: 13px;
      line-height: 1.55;
      color: var(--text);
      background: #f8fafc;
    }
    h1, h2, h3 {
      margin: 0;
      font-weight: 700;
      color: var(--secondary);
    }
    .report-header {
      position: relative;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
      background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.8));
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 24px 28px;
      padding-right: 160px;
      box-shadow: var(--shadow);
      margin-bottom: 28px;
    }
    .report-brand {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 6px;
    }
    .report-logo {
      position: absolute;
      top: 20px;
      right: 28px;
      width: 110px;
      height: 110px;
      border-radius: 18px;
      border: 1px solid rgba(148, 163, 184, 0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      background: #fff;
      padding: 10px;
    }
    .report-logo img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .report-company {
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
      margin-bottom: 4px;
    }
    .report-title {
      font-size: 24px;
      margin-bottom: 4px;
      color: var(--secondary);
    }
    .report-module {
      font-size: 13px;
      color: var(--muted);
    }
    .report-meta {
      min-width: 220px;
      display: grid;
      gap: 6px;
    }
    .meta-row {
      display: flex;
      flex-direction: column;
      border: 1px solid rgba(148, 163, 184, 0.35);
      border-radius: 12px;
      padding: 10px 12px;
      background: rgba(248, 250, 252, 0.85);
    }
    .meta-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
      margin-bottom: 2px;
    }
    .meta-value {
      font-size: 13px;
      font-weight: 600;
      color: var(--secondary);
    }
    .report-section {
      margin-bottom: 28px;
    }
    .section-title {
      font-size: 18px;
      margin-bottom: 12px;
    }
    .metric-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 14px;
      margin-bottom: 20px;
    }
    .metric-card {
      border-radius: 16px;
      border: 1px solid rgba(148, 163, 184, 0.25);
      padding: 16px 18px;
      background: var(--card-bg);
      box-shadow: var(--shadow);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .metric-card.highlight {
      background: linear-gradient(135deg, rgba(255, 111, 145, 0.12), rgba(255, 111, 145, 0.05));
      border-color: rgba(255, 111, 145, 0.35);
    }
    .metric-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
    }
    .metric-value {
      font-size: 22px;
      font-weight: 700;
      color: var(--secondary);
    }
    .metric-subtext {
      font-size: 12px;
      color: var(--muted);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-bottom: 12px;
    }
    thead th {
      text-align: left;
      background: rgba(15, 23, 42, 0.04);
      color: var(--secondary);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 10px 12px;
      border-bottom: 1px solid var(--border);
    }
    tbody td {
      padding: 10px 12px;
      border-bottom: 1px solid var(--border);
      color: var(--text);
    }
    tbody tr:nth-child(even) td {
      background: rgba(148, 163, 184, 0.08);
    }
    .empty-state {
      border: 1px dashed var(--border);
      border-radius: 12px;
      padding: 14px;
      color: var(--muted);
      font-style: italic;
    }
    .two-column-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 16px;
    }
    .top-list {
      border-radius: 14px;
      border: 1px solid rgba(148, 163, 184, 0.25);
      padding: 16px;
      background: var(--card-bg);
      box-shadow: var(--shadow);
    }
    .top-list h3 {
      font-size: 14px;
      margin-bottom: 10px;
    }
    .top-list ol,
    .top-list ul {
      margin: 0;
      padding-left: 18px;
      color: var(--text);
      font-size: 12px;
    }
    .top-list li {
      margin-bottom: 6px;
    }
    .notes-card {
      border-radius: 14px;
      border: 1px solid rgba(148, 163, 184, 0.25);
      background: #fff;
      padding: 16px;
      color: var(--muted);
    }
    @media (max-width: 720px) {
      .report-header {
        flex-direction: column;
        padding-right: 28px;
      }
      .report-logo {
        position: static;
        align-self: flex-end;
        width: 88px;
        height: 88px;
        margin-bottom: 12px;
        padding: 8px;
      }
      .report-meta {
        width: 100%;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      }
    }
  </style>
</head>
<body>
  <header class="report-header">
    <?php if ($logoData): ?>
      <div class="report-logo">
        <img src="<?php echo automation_escape($logoData); ?>" alt="Logotipo de la empresa" />
      </div>
    <?php endif; ?>
    <div class="report-brand">
      <div class="report-heading">
        <div class="report-company"><?php echo $companyName; ?></div>
        <h1 class="report-title"><?php echo $title; ?></h1>
        <?php if ($module): ?>
          <p class="report-module">Módulo origen: <?php echo $module; ?></p>
        <?php endif; ?>
      </div>
    </div>
    <div class="report-meta">
      <?php if ($periodLabel): ?>
        <div class="meta-row">
          <span class="meta-label">Periodo analizado</span>
          <span class="meta-value"><?php echo $periodLabel; ?></span>
        </div>
      <?php endif; ?>
      <?php if ($frequencyLabel): ?>
        <div class="meta-row">
          <span class="meta-label">Frecuencia</span>
          <span class="meta-value"><?php echo $frequencyLabel; ?></span>
        </div>
      <?php endif; ?>
      <?php if ($generatedAtLabel): ?>
        <div class="meta-row">
          <span class="meta-label">Generado</span>
          <span class="meta-value"><?php echo $generatedAtLabel; ?></span>
        </div>
      <?php endif; ?>
    </div>
  </header>

  <section class="report-section">
    <h2 class="section-title">Resumen del periodo</h2>
    <div class="metric-grid">
      <div class="metric-card">
        <span class="metric-label">Movimientos registrados</span>
        <span class="metric-value"><?php echo automation_format_int($summary['totalMovements'] ?? 0); ?></span>
        <span class="metric-subtext">Entradas y salidas consolidadas</span>
      </div>
      <div class="metric-card">
        <span class="metric-label">Usuarios activos</span>
        <span class="metric-value"><?php echo automation_format_int($summary['uniqueUsers'] ?? 0); ?></span>
        <span class="metric-subtext">Colaboradores que ejecutaron movimientos</span>
      </div>
      <div class="metric-card">
        <span class="metric-label">Entradas registradas</span>
        <span class="metric-value"><?php echo automation_format_int($summary['totalIngresos'] ?? 0); ?></span>
        <span class="metric-subtext">Cantidad total de piezas ingresadas</span>
      </div>
      <div class="metric-card">
        <span class="metric-label">Salidas registradas</span>
        <span class="metric-value"><?php echo automation_format_int($summary['totalEgresos'] ?? 0); ?></span>
        <span class="metric-subtext">Cantidad total de piezas egresadas</span>
      </div>
      <div class="metric-card highlight">
        <span class="metric-label">Variación neta</span>
        <span class="metric-value"><?php echo automation_format_int($summary['net'] ?? 0); ?></span>
        <span class="metric-subtext">Entradas menos salidas en el periodo</span>
      </div>
    </div>
  </section>

  <section class="report-section">
    <h2 class="section-title">Movimientos por usuario</h2>
    <?php if (count($movementsByUser)): ?>
      <table>
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

  <section class="report-section">
    <h2 class="section-title">Actividad por fecha</h2>
    <?php if (count($movementTimeline)): ?>
      <table>
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

  <section class="report-section">
    <h2 class="section-title">Estado de áreas y zonas</h2>
    <div class="metric-grid">
      <div class="metric-card">
        <span class="metric-label">Áreas activas</span>
        <span class="metric-value"><?php echo automation_format_int($totalAreas); ?></span>
      </div>
      <div class="metric-card">
        <span class="metric-label">Zonas activas</span>
        <span class="metric-value"><?php echo automation_format_int($totalZones); ?></span>
      </div>
      <div class="metric-card">
        <span class="metric-label">Ocupación promedio de áreas</span>
        <span class="metric-value"><?php echo automation_format_percent($avgAreaOcc); ?></span>
      </div>
      <div class="metric-card">
        <span class="metric-label">Ocupación promedio de zonas</span>
        <span class="metric-value"><?php echo automation_format_percent($avgZoneOcc); ?></span>
      </div>
      <div class="metric-card">
        <span class="metric-label">Capacidad utilizada</span>
        <span class="metric-value"><?php echo automation_format_float($usedCapacity, 2); ?></span>
        <span class="metric-subtext">m³ ocupados en áreas registradas</span>
      </div>
      <div class="metric-card">
        <span class="metric-label">Volumen total</span>
        <span class="metric-value"><?php echo automation_format_float($totalVolume, 2); ?></span>
        <span class="metric-subtext">m³ disponibles en el layout actual</span>
      </div>
    </div>
    <div class="two-column-grid">
      <div class="top-list">
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
      <div class="top-list">
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
    </div>
  </section>

  <section class="report-section">
    <h2 class="section-title">Solicitudes y cambios</h2>
    <div class="metric-grid">
      <div class="metric-card highlight">
        <span class="metric-label">Solicitudes abiertas</span>
        <span class="metric-value"><?php echo automation_format_int($openRequests); ?></span>
        <span class="metric-subtext">Solicitudes en proceso al momento de generar el reporte</span>
      </div>
      <div class="metric-card">
        <span class="metric-label">Solicitudes creadas en el periodo</span>
        <span class="metric-value"><?php echo automation_format_int(array_sum(array_column($createdSummary, 'total'))); ?></span>
      </div>
      <div class="metric-card">
        <span class="metric-label">Solicitudes resueltas en el periodo</span>
        <span class="metric-value"><?php echo automation_format_int(array_sum(array_column($resolvedSummary, 'total'))); ?></span>
      </div>
    </div>

    <div class="two-column-grid" style="margin-top: 12px;">
      <div class="top-list">
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
      <div class="top-list">
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
    </div>

    <div class="two-column-grid" style="margin-top: 16px;">
      <div class="top-list">
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
      <div class="top-list">
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
    </div>
  </section>

  <?php if ($notesEscaped): ?>
    <section class="report-section">
      <h2 class="section-title">Notas de la automatización</h2>
      <div class="notes-card"><?php echo $notesEscaped; ?></div>
    </section>
  <?php endif; ?>
</body>
</html>
