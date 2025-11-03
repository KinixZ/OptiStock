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

if (!function_exists('automation_normalize_hex')) {
    function automation_normalize_hex($value, string $fallback = '#000000'): string
    {
        $raw = is_string($value) ? trim($value) : '';
        if ($raw === '') {
            return strtolower($fallback);
        }
        if (preg_match('/^#[0-9a-fA-F]{6}$/', $raw)) {
            return strtolower($raw);
        }
        if (preg_match('/^#[0-9a-fA-F]{3}$/', $raw)) {
            $chars = substr($raw, 1);
            $expanded = '#' . $chars[0] . $chars[0] . $chars[1] . $chars[1] . $chars[2] . $chars[2];
            return strtolower($expanded);
        }
        return strtolower($fallback);
    }
}

if (!function_exists('automation_rgb_to_hex')) {
    function automation_rgb_to_hex($r, $g, $b): string
    {
        $clamp = static function ($component): int {
            if (!is_numeric($component)) {
                return 0;
            }
            return (int) max(0, min(255, round((float) $component)));
        };
        return sprintf('#%02x%02x%02x', $clamp($r), $clamp($g), $clamp($b));
    }
}

if (!function_exists('automation_hex_to_rgb')) {
    function automation_hex_to_rgb(string $hex): array
    {
        $normalized = automation_normalize_hex($hex, '#000000');
        $value = substr($normalized, 1);
        $int = (int) hexdec($value);
        return [
            ($int >> 16) & 255,
            ($int >> 8) & 255,
            $int & 255,
        ];
    }
}

if (!function_exists('automation_mix_hex_colors')) {
    function automation_mix_hex_colors(string $colorA, string $colorB, float $ratio = 0.5): string
    {
        $amount = max(0.0, min(1.0, $ratio));
        [$ar, $ag, $ab] = automation_hex_to_rgb($colorA);
        [$br, $bg, $bb] = automation_hex_to_rgb($colorB);
        $r = $ar + ($br - $ar) * $amount;
        $g = $ag + ($bg - $ag) * $amount;
        $b = $ab + ($bb - $ab) * $amount;
        return automation_rgb_to_hex($r, $g, $b);
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
    function automation_format_percent($value, int $decimals = 2): string
    {
        if ($value === null || $value === '') {
            return '—';
        }
        if (!is_numeric($value)) {
            return (string) $value;
        }
        return number_format((float) $value, $decimals, ',', '.') . '%';
    }
}

if (!function_exists('automation_format_movement_type')) {
    function automation_format_movement_type($value): string
    {
        if ($value === null || $value === '') {
            return '—';
        }

        $normalized = strtolower((string) $value);
        if ($normalized === 'ingreso') {
            return 'Ingreso';
        }
        if ($normalized === 'egreso') {
            return 'Egreso';
        }

        return ucfirst($normalized);
    }
}

$company = $reportData['company'] ?? [];
$palette = $reportData['palette'] ?? [];
$period = $reportData['period'] ?? [];
$summary = $reportData['summary'] ?? [];
$movementsByUser = $reportData['movementsByUser'] ?? [];
$movementTimeline = $reportData['movementTimeline'] ?? [];
$recentMovements = $reportData['recentMovements'] ?? [];
$areasReport = $reportData['areas'] ?? [];
$requests = $reportData['requests'] ?? [];
$inventoryReport = $reportData['inventory'] ?? [];
$usersReport = $reportData['users'] ?? [];
$movementFocus = $reportData['movementFocus'] ?? [];
$activityLog = $reportData['activityLog'] ?? [];
$accessLog = $reportData['accessLog'] ?? [];

$title = automation_escape($automation['name'] ?? 'Reporte automatizado');
$moduleValue = (string) ($reportData['module'] ?? '');
$moduleLabel = automation_escape($reportData['moduleLabel'] ?? ($automation['module'] ?? ''));
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

// Fuerza una paleta monocromática para los reportes automatizados. La consulta a la
// configuración de colores de la empresa no siempre está disponible cuando el
// planificador se ejecuta en segundo plano, por lo que se opta por un diseño sin
// color que garantice legibilidad consistente.
$primaryHex = '#ffffff';
$secondaryHex = '#f3f4f6';
$neutralHex = '#ffffff';
$accentHex = '#1f2937';
$topbarTextHex = '#1f2937';
$sidebarTextHex = '#1f2937';
$textHex = '#1f2937';
$mutedHex = '#4b5563';
$cardBgHex = '#ffffffff';
$gridHex = '#d1d5db';
$altRowHex = '#f9fafb';
$pageBgHex = '#ffffff';

$primaryColor = automation_escape($primaryHex);
$secondaryColor = automation_escape($secondaryHex);
$neutralColor = automation_escape($neutralHex);
$accentColor = automation_escape($accentHex);
$topbarTextColor = automation_escape($topbarTextHex);
$sidebarTextColor = automation_escape($sidebarTextHex);
$textColor = automation_escape($textHex);
$mutedColor = automation_escape($mutedHex);
$cardBgColor = automation_escape($cardBgHex);
$gridColor = automation_escape($gridHex);
$altRowColor = automation_escape($altRowHex);
$pageBgColor = automation_escape($pageBgHex);
$periodLabel = automation_escape($period['label'] ?? '');
$frequencyLabel = automation_escape($period['frequencyLabel'] ?? '');
$generatedAtLabel = automation_escape($reportData['generatedAtLabel'] ?? '');
$notesEscaped = automation_escape($notes);

$totalMovements = (int) ($summary['totalMovements'] ?? 0);
$totalIngresos = (int) ($summary['totalIngresos'] ?? 0);
$totalEgresos = (int) ($summary['totalEgresos'] ?? 0);
$totalNet = (int) ($summary['net'] ?? ($totalIngresos - $totalEgresos));
$uniqueUsers = (int) ($summary['uniqueUsers'] ?? count($movementsByUser));

$movementFocusMode = (string) ($movementFocus['mode'] ?? '');
$movementFocusTotals = $movementFocus['totals'] ?? [];
$movementFocusTimeline = $movementFocus['timeline'] ?? [];
$movementFocusRecent = $movementFocus['recent'] ?? [];

if (!function_exists('automation_sum_request_totals')) {
    function automation_sum_request_totals(array $entries): int
    {
        $total = 0;
        foreach ($entries as $entry) {
            $total += (int) ($entry['total'] ?? 0);
        }
        return $total;
    }
}

?>
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title><?php echo $title; ?></title>
  <?php if (!empty($extraCss) && is_string($extraCss)): ?>
    <style>
      <?php echo $extraCss; ?>
    </style>
  <?php endif; ?>
  <style>
    @page {
      size: A4 portrait;
      margin: 24px 28px;
    }
    :root {
      --page-bg: <?php echo $pageBgColor; ?>;
      --card-bg: <?php echo $cardBgColor; ?>;
      --border-color: <?php echo $gridColor; ?>;
      --text-color: <?php echo $textColor; ?>;
      --muted-color: <?php echo $mutedColor; ?>;
      --topbar-color: <?php echo $primaryColor; ?>;
      --topbar-text-color: <?php echo $topbarTextColor; ?>;
      --accent-color: <?php echo $accentColor; ?>;
      --sidebar-color: <?php echo $secondaryColor; ?>;
      --sidebar-text-color: <?php echo $sidebarTextColor; ?>;
      --row-alt: <?php echo $altRowColor; ?>;
    }
    body {
      margin: 0;
      font-family: 'Poppins', 'Helvetica Neue', Arial, sans-serif;
      font-size: 12px;
      line-height: 1.55;
      color: var(--text-color);
      background: var(--page-bg);
    }
    .report-wrapper {
      background: var(--page-bg);
    }
    .report-banner {
      background: var(--topbar-color);
      color: var(--topbar-text-color);
      padding: 24px 28px 18px;
    }
    .report-banner__header {
      width: 100%;
      border-collapse: collapse;
    }
    .report-banner__logo {
      width: 120px;
      vertical-align: middle;
      text-align: center;
    }
    .report-banner__logo img {
      max-width: 110px;
      max-height: 64px;
      display: block;
      margin: 0 auto;
    }
    .report-banner__info {
      padding-left: 12px;
      vertical-align: middle;
    }
    .report-banner__company {
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 6px;
      color: rgba(255, 255, 255, 0.82);
    }
    .report-banner__title {
      margin: 0;
      font-size: 22px;
    }
    .report-banner__module {
      margin-top: 4px;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.82);
    }
    .report-banner__meta {
      margin-top: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.25);
      padding-top: 10px;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
    }
    .meta-table td {
      padding: 4px 0;
      font-size: 11px;
    }
    .meta-label {
      display: block;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-size: 9px;
      color: rgba(255, 255, 255, 0.7);
      margin-bottom: 2px;
    }
    .report-banner__accent {
      height: 6px;
      background: var(--accent-color);
    }
    .report-content {
      padding: 24px 28px;
    }
    .section-card {
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 18px 20px;
      margin-bottom: 18px;
      box-shadow: 0 18px 40px -28px rgba(23, 31, 52, 0.45);
    }
    .section-card h2 {
      margin: 0 0 10px;
      font-size: 16px;
      color: var(--accent-color);
    }
    .section-card h3 {
      margin: 12px 0 8px;
      font-size: 13px;
      color: var(--accent-color);
    }
    .section-card__note {
      margin: 4px 0 0;
      font-size: 11px;
      color: var(--muted-color);
    }
    .metric-grid {
      margin-top: 6px;
    }
    .metric-card {
      display: inline-block;
      min-width: 150px;
      padding: 10px 12px;
      margin: 4px 6px 4px 0;
      border: 1px solid var(--border-color);
      border-radius: 10px;
      background: var(--card-bg);
    }
    .metric-card__label {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted-color);
    }
    .metric-card__value {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-color);
      margin-top: 4px;
    }
    .metric-card__description {
      font-size: 10px;
      color: var(--muted-color);
      margin-top: 2px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    .data-table th {
      background: var(--sidebar-color);
      color: var(--sidebar-text-color);
      padding: 7px 8px;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      text-align: left;
      border: 1px solid var(--sidebar-color);
    }
    .data-table td {
      border: 1px solid var(--border-color);
      padding: 7px 8px;
      font-size: 11px;
      color: var(--text-color);
    }
    .data-table tbody tr:nth-child(even) {
      background: var(--row-alt);
    }
    .empty-state {
      border: 1px dashed var(--border-color);
      padding: 10px 12px;
      font-style: italic;
      color: var(--muted-color);
      font-size: 11px;
      margin-top: 8px;
    }
    .status-badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .status-badge--active {
      background: #dcfce7;
      color: #166534;
      border: 1px solid #bbf7d0;
    }
    .status-badge--inactive {
      background: #fee2e2;
      color: #b91c1c;
      border: 1px solid #fecaca;
    }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .badge-ingreso {
      background: #dcfce7;
      color: #15803d;
      border: 1px solid #bbf7d0;
    }
    .badge-egreso {
      background: #fee2e2;
      color: #b91c1c;
      border: 1px solid #fecaca;
    }
    .list-inline {
      padding-left: 16px;
      margin: 6px 0 0;
      font-size: 11px;
    }
    .notes-box {
      border: 1px solid var(--border-color);
      border-radius: 10px;
      padding: 12px 14px;
      background: #ffffff;
      font-size: 11px;
      color: var(--text-color);
    }
  </style>
</head>
<body class="report-wrapper">
  <header class="report-banner">
    <table class="report-banner__header">
      <tr>
        <?php if ($logoData): ?>
          <td class="report-banner__logo">
            <img src="<?php echo automation_escape($logoData); ?>" alt="Logotipo de la empresa" />
          </td>
        <?php endif; ?>
        <td class="report-banner__info">
          <div class="report-banner__company"><?php echo $companyName; ?></div>
          <h1 class="report-banner__title"><?php echo $title; ?></h1>
          <?php if ($moduleLabel !== ''): ?>
            <div class="report-banner__module">Módulo origen: <?php echo $moduleLabel; ?></div>
          <?php endif; ?>
        </td>
      </tr>
    </table>
    <div class="report-banner__meta">
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
    </div>
  </header>
  <div class="report-banner__accent"></div>

  <main class="report-content">
    <?php if ($moduleValue === 'inventario'): ?>
      <?php $invTotals = $inventoryReport['totals'] ?? []; ?>
      <section class="section-card">
        <h2>Resumen de inventario</h2>
        <div class="metric-grid">
          <div class="metric-card">
            <div class="metric-card__label">Productos registrados</div>
            <div class="metric-card__value"><?php echo automation_format_int($invTotals['products'] ?? 0); ?></div>
          </div>
          <div class="metric-card">
            <div class="metric-card__label">Unidades en stock</div>
            <div class="metric-card__value"><?php echo automation_format_int($invTotals['totalStock'] ?? 0); ?></div>
          </div>
          <div class="metric-card">
            <div class="metric-card__label">Valor aproximado</div>
            <div class="metric-card__value">$<?php echo automation_format_float($invTotals['valuation'] ?? 0, 2); ?></div>
          </div>
          <div class="metric-card">
            <div class="metric-card__label">Con ubicación asignada</div>
            <div class="metric-card__value"><?php echo automation_format_int($invTotals['withLocation'] ?? 0); ?></div>
          </div>
          <div class="metric-card">
            <div class="metric-card__label">Sin stock disponible</div>
            <div class="metric-card__value"><?php echo automation_format_int($invTotals['outOfStock'] ?? 0); ?></div>
          </div>
        </div>
      </section>

      <section class="section-card">
        <h3>Stock por categoría</h3>
        <?php if (!empty($inventoryReport['categories'])): ?>
          <table class="data-table">
            <thead>
              <tr>
                <th>Categoría</th>
                <th style="text-align:right">Productos</th>
                <th style="text-align:right">Unidades</th>
              </tr>
            </thead>
            <tbody>
              <?php foreach ($inventoryReport['categories'] as $category): ?>
                <tr>
                  <td><?php echo automation_escape($category['name'] ?? ''); ?></td>
                  <td style="text-align:right"><?php echo automation_format_int($category['products'] ?? 0); ?></td>
                  <td style="text-align:right"><?php echo automation_format_int($category['stock'] ?? 0); ?></td>
                </tr>
              <?php endforeach; ?>
            </tbody>
          </table>
        <?php else: ?>
          <div class="empty-state">No se encontraron categorías con productos registrados.</div>
        <?php endif; ?>
      </section>

      <section class="section-card">
        <h3>Detalle de productos</h3>
        <?php if (!empty($inventoryReport['products'])): ?>
          <table class="data-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoría</th>
                <th style="text-align:right">Stock</th>
                <th>Ubicación</th>
                <th>Último movimiento</th>
              </tr>
            </thead>
            <tbody>
              <?php foreach ($inventoryReport['products'] as $product): ?>
                <tr>
                  <td>
                    <?php echo automation_escape($product['name'] ?? ''); ?>
                    <?php if (!empty($product['code'])): ?>
                      <div style="font-size:10px;color:var(--muted-color);">Código: <?php echo automation_escape($product['code']); ?></div>
                    <?php endif; ?>
                  </td>
                  <td><?php echo automation_escape($product['category'] ?? ''); ?></td>
                  <td style="text-align:right"><?php echo automation_format_int($product['stock'] ?? 0); ?></td>
                  <td><?php echo $product['location'] !== '' ? automation_escape($product['location']) : 'Sin asignar'; ?></td>
                  <td>
                    <?php echo $product['lastMovement'] ? automation_escape($product['lastMovement']) : 'Sin registros'; ?>
                    <?php if (!empty($product['lastType'])): ?>
                      <div style="font-size:10px;color:var(--muted-color);">Tipo: <?php echo automation_escape(automation_format_movement_type($product['lastType'])); ?></div>
                    <?php endif; ?>
                  </td>
                </tr>
              <?php endforeach; ?>
            </tbody>
          </table>
        <?php else: ?>
          <div class="empty-state">Aún no se registran productos en el inventario.</div>
        <?php endif; ?>
      </section>
    <?php elseif ($moduleValue === 'usuarios'): ?>
      <?php $userTotals = $usersReport['totals'] ?? []; ?>
      <section class="section-card">
        <h2>Indicadores de personal</h2>
        <div class="metric-grid">
          <div class="metric-card">
            <div class="metric-card__label">Colaboradores registrados</div>
            <div class="metric-card__value"><?php echo automation_format_int($userTotals['users'] ?? 0); ?></div>
          </div>
          <div class="metric-card">
            <div class="metric-card__label">Activos</div>
            <div class="metric-card__value"><?php echo automation_format_int($userTotals['active'] ?? 0); ?></div>
          </div>
          <div class="metric-card">
            <div class="metric-card__label">Inactivos</div>
            <div class="metric-card__value"><?php echo automation_format_int($userTotals['inactive'] ?? 0); ?></div>
          </div>
        </div>
        <?php if (!empty($usersReport['roles'])): ?>
          <h3>Distribución por rol</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>Rol</th>
                <th style="text-align:right">Colaboradores</th>
              </tr>
            </thead>
            <tbody>
              <?php foreach ($usersReport['roles'] as $role): ?>
                <tr>
                  <td><?php echo automation_escape($role['role'] ?? ''); ?></td>
                  <td style="text-align:right"><?php echo automation_format_int($role['total'] ?? 0); ?></td>
                </tr>
              <?php endforeach; ?>
            </tbody>
          </table>
        <?php endif; ?>
      </section>

      <section class="section-card">
        <h3>Directorio de usuarios</h3>
        <?php if (!empty($usersReport['people'])): ?>
          <table class="data-table">
            <thead>
              <tr>
                <th>Colaborador</th>
                <th>Correo</th>
                <th>Teléfono</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Registro</th>
                <th>Accesos asignados</th>
              </tr>
            </thead>
            <tbody>
              <?php foreach ($usersReport['people'] as $person): ?>
                <tr>
                  <td><?php echo automation_escape($person['name'] ?? ''); ?></td>
                  <td><?php echo automation_escape($person['email'] ?? ''); ?></td>
                  <td><?php echo automation_escape($person['phone'] ?? ''); ?></td>
                  <td><?php echo automation_escape($person['role'] ?? ''); ?></td>
                  <td>
                    <?php $active = !empty($person['active']); ?>
                    <span class="status-badge <?php echo $active ? 'status-badge--active' : 'status-badge--inactive'; ?>">
                      <?php echo $active ? 'Activo' : 'Inactivo'; ?>
                    </span>
                  </td>
                  <td><?php echo automation_escape($person['registered'] ?? ''); ?></td>
                  <td><?php echo automation_escape($person['accessSummary'] ?? ''); ?></td>
                </tr>
              <?php endforeach; ?>
            </tbody>
          </table>
        <?php else: ?>
          <div class="empty-state">No se encontraron usuarios vinculados a la empresa.</div>
        <?php endif; ?>
      </section>
    <?php elseif ($moduleValue === 'areas_zonas'): ?>
      <?php $areaTotals = $areasReport['totals'] ?? []; ?>
      <section class="section-card">
        <h2>Estado de áreas y zonas</h2>
        <div class="metric-grid">
          <div class="metric-card">
            <div class="metric-card__label">Áreas registradas</div>
            <div class="metric-card__value"><?php echo automation_format_int($areaTotals['areas'] ?? 0); ?></div>
          </div>
          <div class="metric-card">
            <div class="metric-card__label">Zonas registradas</div>
            <div class="metric-card__value"><?php echo automation_format_int($areaTotals['zones'] ?? 0); ?></div>
          </div>
          <div class="metric-card">
            <div class="metric-card__label">Ocupación promedio de áreas</div>
            <div class="metric-card__value"><?php echo automation_format_percent($areaTotals['avgAreaOccupancy'] ?? null); ?></div>
          </div>
          <div class="metric-card">
            <div class="metric-card__label">Ocupación promedio de zonas</div>
            <div class="metric-card__value"><?php echo automation_format_percent($areaTotals['avgZoneOccupancy'] ?? null); ?></div>
          </div>
          <div class="metric-card">
            <div class="metric-card__label">Capacidad utilizada (m³)</div>
            <div class="metric-card__value"><?php echo automation_format_float($areaTotals['usedCapacity'] ?? 0.0, 2); ?></div>
          </div>
          <div class="metric-card">
            <div class="metric-card__label">Volumen total (m³)</div>
            <div class="metric-card__value"><?php echo automation_format_float($areaTotals['volume'] ?? 0.0, 2); ?></div>
          </div>
        </div>
      </section>

      <section class="section-card">
        <h3>Detalle de áreas</h3>
        <?php if (!empty($areasReport['areas'])): ?>
          <table class="data-table">
            <thead>
              <tr>
                <th>Área</th>
                <th>Descripción</th>
                <th style="text-align:right">Volumen (m³)</th>
                <th style="text-align:right">Capacidad usada (m³)</th>
                <th style="text-align:right">Ocupación</th>
                <th style="text-align:right">Productos</th>
              </tr>
            </thead>
            <tbody>
              <?php foreach ($areasReport['areas'] as $area): ?>
                <tr>
                  <td><?php echo automation_escape($area['name'] ?? ''); ?></td>
                  <td><?php echo automation_escape($area['description'] ?? ''); ?></td>
                  <td style="text-align:right"><?php echo automation_format_float($area['volume'] ?? 0, 2); ?></td>
                  <td style="text-align:right"><?php echo automation_format_float($area['usedCapacity'] ?? 0, 2); ?></td>
                  <td style="text-align:right"><?php echo automation_format_percent($area['occupancy'] ?? null); ?></td>
                  <td style="text-align:right"><?php echo automation_format_int($area['products'] ?? 0); ?></td>
                </tr>
              <?php endforeach; ?>
            </tbody>
          </table>
        <?php else: ?>
          <div class="empty-state">No se encontraron áreas registradas en la empresa.</div>
        <?php endif; ?>
      </section>

      <section class="section-card">
        <h3>Detalle de zonas</h3>
        <?php if (!empty($areasReport['zones'])): ?>
          <table class="data-table">
            <thead>
              <tr>
                <th>Zona</th>
                <th>Área</th>
                <th>Tipo</th>
                <th style="text-align:right">Ocupación</th>
                <th style="text-align:right">Capacidad usada (m³)</th>
                <th style="text-align:right">Productos</th>
              </tr>
            </thead>
            <tbody>
              <?php foreach ($areasReport['zones'] as $zone): ?>
                <tr>
                  <td><?php echo automation_escape($zone['name'] ?? ''); ?></td>
                  <td><?php echo automation_escape($zone['area'] ?? ''); ?></td>
                  <td><?php echo automation_escape($zone['storageType'] ?? ''); ?></td>
                  <td style="text-align:right"><?php echo automation_format_percent($zone['occupancy'] ?? null); ?></td>
                  <td style="text-align:right"><?php echo automation_format_float($zone['capacity'] ?? 0, 2); ?></td>
                  <td style="text-align:right"><?php echo automation_format_int($zone['products'] ?? 0); ?></td>
                </tr>
              <?php endforeach; ?>
            </tbody>
          </table>
        <?php else: ?>
          <div class="empty-state">No se encontraron zonas registradas.</div>
        <?php endif; ?>
      </section>
    <?php elseif (in_array($moduleValue, ['ingresos/egresos', 'ingresos', 'egresos'], true)): ?>
      <?php $focusTotals = $movementFocusTotals; ?>
      <section class="section-card">
        <h2>Resumen de movimientos</h2>
        <?php if ($moduleValue === 'ingresos/egresos'): ?>
          <p class="section-card__note">En este reporte se registran tanto ingresos como egresos.</p>
        <?php elseif ($moduleValue === 'ingresos'): ?>
          <p class="section-card__note">En este reporte solo se incluyen los ingresos registrados.</p>
        <?php elseif ($moduleValue === 'egresos'): ?>
          <p class="section-card__note">En este reporte solo se incluyen los egresos registrados.</p>
        <?php endif; ?>
        <div class="metric-grid">
          <div class="metric-card">
            <div class="metric-card__label">
              <?php echo $movementFocusMode === 'ingresos' ? 'Total de ingresos' : ($movementFocusMode === 'egresos' ? 'Total de egresos' : 'Movimientos registrados'); ?>
            </div>
            <div class="metric-card__value"><?php echo automation_format_int($focusTotals['movements'] ?? $totalMovements); ?></div>
          </div>
          <div class="metric-card">
            <div class="metric-card__label">Entradas registradas</div>
            <div class="metric-card__value"><?php echo automation_format_int($focusTotals['ingresos'] ?? $totalIngresos); ?></div>
          </div>
          <div class="metric-card">
            <div class="metric-card__label">Salidas registradas</div>
            <div class="metric-card__value"><?php echo automation_format_int($focusTotals['egresos'] ?? $totalEgresos); ?></div>
          </div>
          <div class="metric-card">
            <div class="metric-card__label">Variación neta</div>
            <div class="metric-card__value"><?php echo automation_format_int(($focusTotals['net'] ?? $totalNet)); ?></div>
          </div>
          <div class="metric-card">
            <div class="metric-card__label">Colaboradores involucrados</div>
            <div class="metric-card__value"><?php echo automation_format_int($uniqueUsers); ?></div>
          </div>
        </div>
      </section>

      <section class="section-card">
        <h3>Movimientos por usuario</h3>
        <?php if (!empty($movementsByUser)): ?>
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
          <div class="empty-state">No se registraron movimientos por usuario durante el periodo analizado.</div>
        <?php endif; ?>
      </section>

      <section class="section-card">
        <h3>Evolución en el periodo</h3>
        <?php if (!empty($movementFocusTimeline)): ?>
          <table class="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <?php if ($movementFocusMode === 'ingresos'): ?>
                  <th style="text-align:right">Entradas</th>
                <?php elseif ($movementFocusMode === 'egresos'): ?>
                  <th style="text-align:right">Salidas</th>
                <?php else: ?>
                  <th style="text-align:right">Movimientos</th>
                  <th style="text-align:right">Entradas</th>
                  <th style="text-align:right">Salidas</th>
                  <th style="text-align:right">Variación</th>
                <?php endif; ?>
              </tr>
            </thead>
            <tbody>
              <?php foreach ($movementFocusTimeline as $item): ?>
                <tr>
                  <td><?php echo automation_escape($item['label'] ?? ''); ?></td>
                  <?php if ($movementFocusMode === 'ingresos'): ?>
                    <td style="text-align:right"><?php echo automation_format_int($item['ingresos'] ?? 0); ?></td>
                  <?php elseif ($movementFocusMode === 'egresos'): ?>
                    <td style="text-align:right"><?php echo automation_format_int($item['egresos'] ?? 0); ?></td>
                  <?php else: ?>
                    <td style="text-align:right"><?php echo automation_format_int($item['movements'] ?? 0); ?></td>
                    <td style="text-align:right"><?php echo automation_format_int($item['ingresos'] ?? 0); ?></td>
                    <td style="text-align:right"><?php echo automation_format_int($item['egresos'] ?? 0); ?></td>
                    <td style="text-align:right"><?php echo automation_format_int($item['net'] ?? 0); ?></td>
                  <?php endif; ?>
                </tr>
              <?php endforeach; ?>
            </tbody>
          </table>
        <?php else: ?>
          <div class="empty-state">No se encontraron movimientos en el historial del periodo.</div>
        <?php endif; ?>
      </section>

      <section class="section-card">
        <h3>Movimientos recientes</h3>
        <?php if (!empty($movementFocusRecent)): ?>
          <table class="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Producto</th>
                <th>Tipo</th>
                <th style="text-align:right">Cantidad</th>
                <th>Ubicación</th>
                <th>Responsable</th>
              </tr>
            </thead>
            <tbody>
              <?php foreach ($movementFocusRecent as $movement): ?>
                <tr>
                  <td><?php echo automation_escape($movement['dateLabel'] ?? ''); ?></td>
                  <td>
                    <?php echo automation_escape($movement['product'] ?? ''); ?>
                    <?php if (!empty($movement['productCode'])): ?>
                      <div style="font-size:10px;color:var(--muted-color);">Código: <?php echo automation_escape($movement['productCode']); ?></div>
                    <?php endif; ?>
                  </td>
                  <td>
                    <?php
                    $type = strtolower((string) ($movement['type'] ?? ''));
                    $badgeClass = $type === 'ingreso' ? 'badge badge-ingreso' : ($type === 'egreso' ? 'badge badge-egreso' : 'badge');
                    ?>
                    <span class="<?php echo $badgeClass; ?>"><?php echo automation_escape(automation_format_movement_type($movement['type'] ?? '')); ?></span>
                  </td>
                  <td style="text-align:right"><?php echo automation_format_int($movement['quantity'] ?? 0); ?></td>
                  <td>
                    <?php
                    $areaLabel = isset($movement['area']) ? (string) $movement['area'] : '';
                    $zoneLabel = isset($movement['zone']) ? (string) $movement['zone'] : '';
                    $locationLabel = trim($areaLabel . ($zoneLabel !== '' ? ' · ' . $zoneLabel : ''));
                    ?>
                    <?php echo $locationLabel !== '' ? automation_escape($locationLabel) : '—'; ?>
                  </td>
                  <td><?php echo automation_escape($movement['user'] ?? ''); ?></td>
                </tr>
              <?php endforeach; ?>
            </tbody>
          </table>
        <?php else: ?>
          <div class="empty-state">No se registraron movimientos en el periodo. En la siguiente ejecución se incluirán los más recientes.</div>
        <?php endif; ?>
      </section>
    <?php elseif ($moduleValue === 'solicitudes'): ?>
      <?php $openTotal = (int) ($requests['openTotal'] ?? 0); ?>
      <?php $createdTotal = automation_sum_request_totals($requests['periodCreated'] ?? []); ?>
      <?php $resolvedTotal = automation_sum_request_totals($requests['periodResolved'] ?? []); ?>
      <section class="section-card">
        <h2>Resumen de solicitudes</h2>
        <div class="metric-grid">
          <div class="metric-card">
            <div class="metric-card__label">Solicitudes abiertas</div>
            <div class="metric-card__value"><?php echo automation_format_int($openTotal); ?></div>
          </div>
          <div class="metric-card">
            <div class="metric-card__label">Creadas en el periodo</div>
            <div class="metric-card__value"><?php echo automation_format_int($createdTotal); ?></div>
          </div>
          <div class="metric-card">
            <div class="metric-card__label">Resueltas en el periodo</div>
            <div class="metric-card__value"><?php echo automation_format_int($resolvedTotal); ?></div>
          </div>
        </div>
      </section>

      <section class="section-card">
        <h3>Detalle por estado</h3>
        <?php if (!empty($requests['periodCreated']) || !empty($requests['periodResolved'])): ?>
          <table class="data-table">
            <thead>
              <tr>
                <th>Estado</th>
                <th style="text-align:right">Creadas</th>
                <th style="text-align:right">Resueltas</th>
              </tr>
            </thead>
            <tbody>
              <?php
              $createdMap = [];
              foreach (($requests['periodCreated'] ?? []) as $row) {
                  $createdMap[$row['estado'] ?? ''] = (int) ($row['total'] ?? 0);
              }
              $resolvedMap = [];
              foreach (($requests['periodResolved'] ?? []) as $row) {
                  $resolvedMap[$row['estado'] ?? ''] = (int) ($row['total'] ?? 0);
              }
              $allStates = array_unique(array_merge(array_keys($createdMap), array_keys($resolvedMap)));
              foreach ($allStates as $state):
              ?>
                <tr>
                  <td><?php echo automation_escape($state ?: 'Sin estado'); ?></td>
                  <td style="text-align:right"><?php echo automation_format_int($createdMap[$state] ?? 0); ?></td>
                  <td style="text-align:right"><?php echo automation_format_int($resolvedMap[$state] ?? 0); ?></td>
                </tr>
              <?php endforeach; ?>
            </tbody>
          </table>
        <?php else: ?>
          <div class="empty-state">No hay solicitudes registradas durante el periodo.</div>
        <?php endif; ?>
      </section>

      <section class="section-card">
        <h3>Solicitudes recientes</h3>
        <h4 style="margin:8px 0 6px;font-size:12px;color:var(--muted-color);">Pendientes</h4>
        <?php if (!empty($requests['recentOpen'])): ?>
          <ul class="list-inline">
            <?php foreach ($requests['recentOpen'] as $item): ?>
              <li>
                <strong><?php echo automation_escape($item['module'] ?? ''); ?></strong> ·
                <?php echo automation_escape($item['summary'] ?? ''); ?> ·
                Estado: <?php echo automation_escape($item['estado'] ?? ''); ?> ·
                <?php echo automation_escape($item['dateLabel'] ?? ''); ?>
              </li>
            <?php endforeach; ?>
          </ul>
        <?php else: ?>
          <div class="empty-state">No hay solicitudes abiertas en el periodo.</div>
        <?php endif; ?>

        <h4 style="margin:12px 0 6px;font-size:12px;color:var(--muted-color);">Cerradas</h4>
        <?php if (!empty($requests['recentResolved'])): ?>
          <ul class="list-inline">
            <?php foreach ($requests['recentResolved'] as $item): ?>
              <li>
                <strong><?php echo automation_escape($item['module'] ?? ''); ?></strong> ·
                <?php echo automation_escape($item['summary'] ?? ''); ?> ·
                Resultado: <?php echo automation_escape($item['estado'] ?? ''); ?> ·
                <?php echo automation_escape($item['dateLabel'] ?? ''); ?>
              </li>
            <?php endforeach; ?>
          </ul>
        <?php else: ?>
          <div class="empty-state">No se cerraron solicitudes durante el periodo.</div>
        <?php endif; ?>
      </section>
    <?php elseif ($moduleValue === 'accesos'): ?>
      <?php $actionCounts = $accessLog['actionCounts'] ?? []; ?>
      <?php $lastByUser = $accessLog['lastAccessByUser'] ?? []; ?>
      <section class="section-card">
        <h2>Actividad de accesos</h2>
        <div class="metric-grid">
          <div class="metric-card">
            <div class="metric-card__label">Registros en el periodo</div>
            <div class="metric-card__value"><?php echo automation_format_int($accessLog['total'] ?? 0); ?></div>
          </div>
          <div class="metric-card">
            <div class="metric-card__label">Inicios de sesión</div>
            <div class="metric-card__value"><?php echo automation_format_int($actionCounts['Inicio'] ?? 0); ?></div>
          </div>
          <div class="metric-card">
            <div class="metric-card__label">Cierres de sesión</div>
            <div class="metric-card__value"><?php echo automation_format_int($actionCounts['Cierre'] ?? 0); ?></div>
          </div>
          <div class="metric-card">
            <div class="metric-card__label">Usuarios activos</div>
            <div class="metric-card__value"><?php echo automation_format_int(count($lastByUser)); ?></div>
          </div>
        </div>
      </section>

      <section class="section-card">
        <h3>Historial de accesos</h3>
        <?php if (!empty($accessLog['entries'])): ?>
          <table class="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              <?php foreach ($accessLog['entries'] as $entry): ?>
                <tr>
                  <td><?php echo automation_escape($entry['date'] ?? ''); ?></td>
                  <td><?php echo automation_escape($entry['time'] ?? ''); ?></td>
                  <td><?php echo automation_escape($entry['user'] ?? ''); ?></td>
                  <td><?php echo automation_escape($entry['role'] ?? ''); ?></td>
                  <td><?php echo automation_escape($entry['action'] ?? ''); ?></td>
                </tr>
              <?php endforeach; ?>
            </tbody>
          </table>
        <?php else: ?>
          <div class="empty-state">No se registraron accesos en el periodo seleccionado.</div>
        <?php endif; ?>
      </section>

      <?php if (!empty($lastByUser)): ?>
        <section class="section-card">
          <h3>Último acceso por usuario</h3>
          <ul class="list-inline">
            <?php foreach ($lastByUser as $entry): ?>
              <li>
                <strong><?php echo automation_escape($entry['user'] ?? ''); ?></strong> ·
                <?php echo automation_escape($entry['action'] ?? ''); ?> ·
                <?php echo automation_escape($entry['date'] ?? ''); ?> ·
                <?php echo automation_escape($entry['time'] ?? ''); ?>
              </li>
            <?php endforeach; ?>
          </ul>
        </section>
      <?php endif; ?>
    <?php elseif ($moduleValue === 'registro_actividades'): ?>
      <?php $moduleCounts = $activityLog['moduleCounts'] ?? []; ?>
      <?php $topModule = '';
      $topCount = 0;
      foreach ($moduleCounts as $moduleName => $count) {
          if ($count > $topCount) {
              $topCount = (int) $count;
              $topModule = (string) $moduleName;
          }
      }
      ?>
      <section class="section-card">
        <h2>Registro de actividades</h2>
        <div class="metric-grid">
          <div class="metric-card">
            <div class="metric-card__label">Eventos registrados</div>
            <div class="metric-card__value"><?php echo automation_format_int($activityLog['total'] ?? 0); ?></div>
          </div>
          <div class="metric-card">
            <div class="metric-card__label">Módulos con actividad</div>
            <div class="metric-card__value"><?php echo automation_format_int(count($moduleCounts)); ?></div>
          </div>
          <?php if ($topModule !== ''): ?>
            <div class="metric-card">
              <div class="metric-card__label">Módulo con más acciones</div>
              <div class="metric-card__value"><?php echo automation_escape($topModule); ?></div>
              <div class="metric-card__description"><?php echo automation_format_int($topCount); ?> eventos</div>
            </div>
          <?php endif; ?>
        </div>
      </section>

      <section class="section-card">
        <h3>Detalle de eventos</h3>
        <?php if (!empty($activityLog['logs'])): ?>
          <table class="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Módulo</th>
                <th>Acción</th>
                <th>Responsable</th>
              </tr>
            </thead>
            <tbody>
              <?php foreach ($activityLog['logs'] as $log): ?>
                <tr>
                  <td><?php echo automation_escape($log['date'] ?? ''); ?></td>
                  <td><?php echo automation_escape($log['time'] ?? ''); ?></td>
                  <td><?php echo automation_escape($log['module'] ?? ''); ?></td>
                  <td><?php echo automation_escape($log['action'] ?? ''); ?></td>
                  <td><?php echo automation_escape($log['user'] ?? ''); ?></td>
                </tr>
              <?php endforeach; ?>
            </tbody>
          </table>
        <?php else: ?>
          <div class="empty-state">No se encontraron registros de actividad para el periodo.</div>
        <?php endif; ?>
      </section>
    <?php else: ?>
      <section class="section-card">
        <h2>Resumen del periodo</h2>
        <div class="metric-grid">
          <div class="metric-card">
            <div class="metric-card__label">Movimientos registrados</div>
            <div class="metric-card__value"><?php echo automation_format_int($totalMovements); ?></div>
          </div>
          <div class="metric-card">
            <div class="metric-card__label">Entradas registradas</div>
            <div class="metric-card__value"><?php echo automation_format_int($totalIngresos); ?></div>
          </div>
          <div class="metric-card">
            <div class="metric-card__label">Salidas registradas</div>
            <div class="metric-card__value"><?php echo automation_format_int($totalEgresos); ?></div>
          </div>
          <div class="metric-card">
            <div class="metric-card__label">Variación neta</div>
            <div class="metric-card__value"><?php echo automation_format_int($totalNet); ?></div>
          </div>
          <div class="metric-card">
            <div class="metric-card__label">Colaboradores involucrados</div>
            <div class="metric-card__value"><?php echo automation_format_int($uniqueUsers); ?></div>
          </div>
        </div>
      </section>

      <section class="section-card">
        <h3>Movimientos por usuario</h3>
        <?php if (!empty($movementsByUser)): ?>
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
          <div class="empty-state">No se registraron movimientos por usuario en el periodo.</div>
        <?php endif; ?>
      </section>

      <section class="section-card">
        <h3>Historial cronológico</h3>
        <?php if (!empty($movementTimeline)): ?>
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
          <div class="empty-state">No se registraron movimientos durante el periodo de análisis.</div>
        <?php endif; ?>
      </section>

      <section class="section-card">
        <h3>Movimientos recientes</h3>
        <?php if (!empty($recentMovements)): ?>
          <table class="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Producto</th>
                <th>Tipo</th>
                <th style="text-align:right">Cantidad</th>
                <th>Ubicación</th>
                <th>Responsable</th>
              </tr>
            </thead>
            <tbody>
              <?php foreach ($recentMovements as $movement): ?>
                <tr>
                  <td><?php echo automation_escape($movement['dateLabel'] ?? ''); ?></td>
                  <td>
                    <?php echo automation_escape($movement['product'] ?? ''); ?>
                    <?php if (!empty($movement['productCode'])): ?>
                      <div style="font-size:10px;color:var(--muted-color);">Código: <?php echo automation_escape($movement['productCode']); ?></div>
                    <?php endif; ?>
                  </td>
                  <td>
                    <?php
                    $type = strtolower((string) ($movement['type'] ?? ''));
                    $badgeClass = $type === 'ingreso' ? 'badge badge-ingreso' : ($type === 'egreso' ? 'badge badge-egreso' : 'badge');
                    ?>
                    <span class="<?php echo $badgeClass; ?>"><?php echo automation_escape(automation_format_movement_type($movement['type'] ?? '')); ?></span>
                  </td>
                  <td style="text-align:right"><?php echo automation_format_int($movement['quantity'] ?? 0); ?></td>
                  <td>
                    <?php
                    $areaLabel = isset($movement['area']) ? (string) $movement['area'] : '';
                    $zoneLabel = isset($movement['zone']) ? (string) $movement['zone'] : '';
                    $locationLabel = trim($areaLabel . ($zoneLabel !== '' ? ' · ' . $zoneLabel : ''));
                    ?>
                    <?php echo $locationLabel !== '' ? automation_escape($locationLabel) : '—'; ?>
                  </td>
                  <td><?php echo automation_escape($movement['user'] ?? ''); ?></td>
                </tr>
              <?php endforeach; ?>
            </tbody>
          </table>
        <?php else: ?>
          <div class="empty-state">No hay movimientos recientes registrados.</div>
        <?php endif; ?>
      </section>
    <?php endif; ?>

    <?php if ($notesEscaped): ?>
      <section class="section-card">
        <h2>Notas de la automatización</h2>
        <div class="notes-box"><?php echo $notesEscaped; ?></div>
      </section>
    <?php endif; ?>
  </main>
</body>
</html>
