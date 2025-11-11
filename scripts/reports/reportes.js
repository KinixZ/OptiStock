(function () {
  const HISTORY_API_URL = '../../scripts/php/report_history.php';
  const AUTOMATION_API_URL = '../../scripts/php/report_automations.php';
  const AUTOMATION_RUN_API_URL = '../../scripts/php/run_automation_now.php';
  const RETENTION_DAYS_FALLBACK = 60;
  const HISTORY_PAGE_SIZE = 10;
  const AUTOMATION_MODULES = [
    { value: 'inventario', label: 'Inventario actual' },
    { value: 'usuarios', label: 'Usuarios actuales' },
    { value: 'areas_zonas', label: 'Áreas y zonas' },
    { value: 'ingresos/egresos', label: 'Ingresos y egresos' },
    { value: 'ingresos', label: 'Ingresos registrados' },
    { value: 'egresos', label: 'Egresos registrados' },
    { value: 'registro_actividades', label: 'Registro de actividades' },
    { value: 'solicitudes', label: 'Historial de solicitudes' },
    { value: 'accesos', label: 'Accesos de usuarios' }
  ];
  const AUTOMATION_MODULE_VALUE_SET = new Set(AUTOMATION_MODULES.map((item) => item.value));
  const MANUAL_SOURCE_LABELS = {
    inventario: 'Gestión de inventario',
    usuarios: 'Administración de usuarios',
    areas_zonas: 'Áreas y zonas de almacén',
    'ingresos/egresos': 'Ingresos y egresos',
    ingresos: 'Ingresos registrados',
    egresos: 'Egresos registrados',
    registro_actividades: 'Registro de actividades',
    solicitudes: 'Historial de solicitudes',
    accesos: 'Accesos de usuarios'
  };
  const AUTOMATION_MODULE_HINTS = {
    'ingresos/egresos': 'En este módulo se registran tanto ingresos como egresos.',
    ingresos: 'En este módulo solo se registran ingresos.',
    egresos: 'En este módulo solo se registran egresos.'
  };
  const LEGACY_MODULE_ALIASES = {
    'gestión de inventario': 'inventario',
    'gestion de inventario': 'inventario',
    'gestión de usuarios': 'usuarios',
    'gestion de usuarios': 'usuarios',
    'reportes y análisis': 'ingresos/egresos',
    'reportes y analisis': 'ingresos/egresos',
    'historial de movimientos': 'ingresos/egresos',
    'historial_movimientos': 'ingresos/egresos',
    'ingresos y egresos': 'ingresos/egresos',
    'ingresos y egreso': 'ingresos/egresos',
    'resumen de ingresos y egresos': 'ingresos/egresos',
    'recepción y almacenamiento': 'ingresos',
    'recepcion y almacenamiento': 'ingresos',
    'despacho y distribución': 'egresos',
    'despacho y distribucion': 'egresos',
    'alertas y monitoreo': 'registro_actividades',
    'registro de accesos': 'accesos',
    'accesos de usuarios': 'accesos',
    'control de accesos': 'accesos'
  };

  function normalizeAutomationModuleValue(rawValue) {
    if (!rawValue) {
      return '';
    }
    const trimmed = String(rawValue).trim();
    if (AUTOMATION_MODULE_VALUE_SET.has(trimmed)) {
      return trimmed;
    }
    const lower = trimmed.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(LEGACY_MODULE_ALIASES, lower)) {
      return LEGACY_MODULE_ALIASES[lower];
    }
    return '';
  }

  function isAllowedAutomationModule(value) {
    return AUTOMATION_MODULE_VALUE_SET.has(value);
  }

  function getAutomationModuleLabel(value) {
    if (!value) {
      return '';
    }
    const entry = AUTOMATION_MODULES.find((item) => item.value === value);
    if (entry) {
      return entry.label;
    }
    const lower = String(value).toLowerCase();
    if (Object.prototype.hasOwnProperty.call(LEGACY_MODULE_ALIASES, lower)) {
      const normalized = LEGACY_MODULE_ALIASES[lower];
      const aliasEntry = AUTOMATION_MODULES.find((item) => item.value === normalized);
      return aliasEntry ? aliasEntry.label : value;
    }
    return String(value);
  }

  function getAutomationModuleHint(value) {
    if (!value) {
      return '';
    }

    if (Object.prototype.hasOwnProperty.call(AUTOMATION_MODULE_HINTS, value)) {
      return AUTOMATION_MODULE_HINTS[value];
    }

    const normalized = normalizeAutomationModuleValue(value);
    if (normalized && Object.prototype.hasOwnProperty.call(AUTOMATION_MODULE_HINTS, normalized)) {
      return AUTOMATION_MODULE_HINTS[normalized];
    }

    return '';
  }

  function resolveManualSourceLabel(value) {
    const normalized = normalizeAutomationModuleValue(value);
    if (normalized && Object.prototype.hasOwnProperty.call(MANUAL_SOURCE_LABELS, normalized)) {
      return MANUAL_SOURCE_LABELS[normalized];
    }
    const label = getAutomationModuleLabel(value);
    return label || 'Reportes';
  }

  function populateAutomationModuleSelect() {
    if (!elements.automationModuleInput || elements.automationModuleInput.tagName !== 'SELECT') {
      return;
    }

    const previousValue = elements.automationModuleInput.value;
    elements.automationModuleInput.innerHTML = '';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Selecciona un módulo';
    elements.automationModuleInput.append(placeholder);

    AUTOMATION_MODULES.forEach((item) => {
      const option = document.createElement('option');
      option.value = item.value;
      option.textContent = item.label;
      elements.automationModuleInput.append(option);
    });

    if (previousValue && AUTOMATION_MODULE_VALUE_SET.has(previousValue)) {
      elements.automationModuleInput.value = previousValue;
    }
  }

  // Provide a local alias for the optional external history client.
  // Some installations include `scripts/reports/report-history-client.js` which
  // exposes `window.ReportHistory`. Older code expects a `historyClient`
  // variable — define it here as a safe reference or `null` when absent.
  const historyClient = (typeof window !== 'undefined' && window.ReportHistory) ? window.ReportHistory : null;

  const elements = {
    summaryTotal: document.getElementById('summaryTotal'),
    summaryMonth: document.getElementById('summaryMonth'),
    summaryExpiring: document.getElementById('summaryExpiring'),
    summaryRetention: document.getElementById('summaryRetention'),
    historyCaption: document.getElementById('historyCaption'),
    historyTableBody: document.getElementById('historyTableBody'),
    historyTableWrapper: document.querySelector('.history-card .table-responsive'),
    historyLoading: document.getElementById('historyLoading'),
    historyEmpty: document.getElementById('historyEmpty'),
    historyAlert: document.getElementById('historyAlert'),
    historyFooter: document.getElementById('historyFooter'),
    historyPaginationInfo: document.getElementById('historyPaginationInfo'),
    historyPagination: document.getElementById('historyPagination'),
    historyPaginationPrev: document.getElementById('historyPaginationPrev'),
    historyPaginationNext: document.getElementById('historyPaginationNext'),
    historyPaginationPages: document.getElementById('historyPaginationPages'),
    searchInput: document.getElementById('historySearch'),
    typeFilter: document.getElementById('historyTypeFilter'),
    sourceFilter: document.getElementById('historySourceFilter'),
    refreshButton: document.getElementById('refreshHistoryBtn'),
    uploadForm: document.getElementById('manualUploadForm'),
    uploadFileInput: document.getElementById('uploadFileInput'),
    uploadSourceInput: document.getElementById('uploadSourceInput'),
    uploadNotesInput: document.getElementById('uploadNotesInput'),
    uploadSubmitBtn: document.getElementById('uploadSubmitBtn'),
    uploadHint: document.getElementById('uploadHint'),
    automationList: document.getElementById('automaticList'),
    automationEmpty: document.getElementById('automaticEmpty'),
    automationConfigBtn: document.getElementById('automationConfigBtn'),
    automationModal: document.getElementById('automationModal'),
    automationForm: document.getElementById('automationForm'),
    automationIdInput: document.getElementById('automationId'),
    automationNameInput: document.getElementById('automationName'),
    automationModuleInput: document.getElementById('automationModule'),
    automationFormatSelect: document.getElementById('automationFormat'),
    automationFrequencySelect: document.getElementById('automationFrequency'),
    automationWeekdayWrapper: document.getElementById('automationWeekdayWrapper'),
    automationWeekdaySelect: document.getElementById('automationWeekday'),
    automationMonthdayWrapper: document.getElementById('automationMonthdayWrapper'),
    automationMonthdayInput: document.getElementById('automationMonthday'),
    automationTimeInput: document.getElementById('automationTime'),
    automationNotesInput: document.getElementById('automationNotes'),
    automationActiveInput: document.getElementById('automationActive'),
    automationModalTitle: document.getElementById('automationModalTitle'),
    automationSubmitBtn: document.getElementById('automationSubmitBtn'),
    automationDeleteBtn: document.getElementById('automationDeleteBtn'),
    manualGeneratorSection: document.getElementById('manualGeneratorSection'),
    manualGeneratorGrid: document.getElementById('manualGeneratorGrid'),
    manualGeneratorEmpty: document.getElementById('manualGeneratorEmpty')
  };

  const state = {
    reports: [],
    serverReports: [],
    localAutomationReports: [],
    filteredReports: [],
    availableSources: [],
    historyPage: 1,
    retentionDays: RETENTION_DAYS_FALLBACK,
    loading: false,
    alertTimerId: null,
    activeEmpresaId: null,
    automations: [],
    automationTimerId: null,
    automationModalInstance: null,
    automationSyncTimerId: null,
    automationsLoadedFromServer: false,
    automationRunInProgress: false,
    automationRunQueued: false,
    manualReports: [],
    manualReportsStatus: {}
  };

  function setHistoryUnavailableState(message) {
    if (elements.historyLoading) {
      elements.historyLoading.classList.add('d-none');
    }
    if (elements.historyTableWrapper) {
      elements.historyTableWrapper.classList.add('d-none');
    }
    if (elements.historyEmpty) {
      elements.historyEmpty.classList.remove('d-none');
      elements.historyEmpty.innerHTML = `<p class="mb-1 fw-semibold">No se pudo conectar con el historial.</p><p class="mb-0">${escapeHtml(
        message
      )}</p>`;
    }
    if (elements.historyCaption) {
      elements.historyCaption.textContent = 'El historial no está disponible.';
    }
    if (elements.historyAlert) {
      elements.historyAlert.textContent = message;
      elements.historyAlert.classList.remove('d-none', 'alert-danger', 'alert-success', 'alert-warning', 'alert-info');
      elements.historyAlert.classList.add('alert-danger');
    }
  }

  const BYTES_UNITS = ['B', 'KB', 'MB', 'GB'];
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  const EXPIRING_THRESHOLD_MS = 10 * 24 * 60 * 60 * 1000;
  const AUTOMATION_STORAGE_PREFIX = 'optistock:automations:';
  const AUTOMATION_REPORTS_PREFIX = 'optistock:automationReports:';
  const SCHEDULED_REPORT_ALERTS_PREFIX = 'optistock:scheduledReportAlerts:';
  const SCHEDULED_REPORT_ALERTS_LIMIT = 30;
  const MANUAL_FORMAT_LABELS = {
    pdf: 'PDF',
    excel: 'Excel'
  };

  function getScheduledReportAlertsKey(empresaId) {
    const resolved = !empresaId || empresaId === 'local' ? 'local' : String(empresaId);
    return `${SCHEDULED_REPORT_ALERTS_PREFIX}${resolved}`;
  }

  function getActiveUsuarioId() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem('usuario_id');
        const parsed = stored ? parseInt(stored, 10) : NaN;
        if (!Number.isNaN(parsed) && parsed > 0) {
          return parsed;
        }
      }
    } catch (error) {
      console.warn('No se pudo leer el ID de usuario desde localStorage:', error);
    }
    return null;
  }

  function formatAutomationRunForStorage(date) {
    const target = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
    const year = target.getFullYear();
    const month = String(target.getMonth() + 1).padStart(2, '0');
    const day = String(target.getDate()).padStart(2, '0');
    const hours = String(target.getHours()).padStart(2, '0');
    const minutes = String(target.getMinutes()).padStart(2, '0');
    const seconds = String(target.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  function formatAutomationRunForDisplay(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      return 'fecha desconocida';
    }
    try {
      return new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
    } catch (error) {
      return date.toLocaleString();
    }
  }

  function readScheduledReportAlertsFromStorage(empresaId) {
    if (typeof window === 'undefined' || !window.localStorage) {
      return [];
    }
    try {
      const raw = window.localStorage.getItem(getScheduledReportAlertsKey(empresaId));
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('No se pudieron leer las alertas de reportes programados guardadas localmente.', error);
      return [];
    }
  }

  function writeScheduledReportAlertsToStorage(alerts, empresaId) {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    const key = getScheduledReportAlertsKey(empresaId);
    try {
      window.localStorage.setItem(key, JSON.stringify(alerts));
      window.dispatchEvent(
        new CustomEvent('scheduled-report-alert-stored', {
          detail: { empresaId: empresaId || 'local' }
        })
      );
    } catch (error) {
      console.warn('No se pudieron guardar las alertas locales de reportes programados.', error);
    }
  }

  function appendScheduledReportAlertLocally(notification, empresaId) {
    if (!notification) {
      return;
    }
    const empresaKey = empresaId && empresaId !== 'local' ? empresaId : 'local';
    const stored = readScheduledReportAlertsFromStorage(empresaKey);
    const nextAlerts = Array.isArray(stored) ? stored.slice() : [];
    nextAlerts.push(notification);
    if (nextAlerts.length > SCHEDULED_REPORT_ALERTS_LIMIT) {
      nextAlerts.splice(0, nextAlerts.length - SCHEDULED_REPORT_ALERTS_LIMIT);
    }
    writeScheduledReportAlertsToStorage(nextAlerts, empresaKey);
  }

  async function persistScheduledReportAlert(notification, empresaId) {
    if (!notification) {
      return;
    }

    const payload = {
      id_empresa: empresaId,
      id_usuario: getActiveUsuarioId() || 0,
      notifications: [
        {
          titulo: notification.titulo,
          mensaje: notification.mensaje,
          prioridad: notification.prioridad,
          estado: notification.estado,
          tipo_destinatario: notification.tipo_destinatario,
          ruta_destino: notification.ruta_destino,
          fecha_disponible_desde: notification.fecha_disponible_desde
        }
      ]
    };

    try {
      const response = await fetch('../../scripts/php/save_notifications.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      if (!result || result.success !== true) {
        throw new Error(result && result.message ? result.message : 'No se pudo guardar la notificación.');
      }
    } catch (error) {
      console.error('No se pudo sincronizar la notificación de reporte programado con el servidor:', error);
    }
  }

  async function notifyScheduledReportGenerated(automation, runDate) {
    const empresaId = state.activeEmpresaId && state.activeEmpresaId !== 'local'
      ? state.activeEmpresaId
      : getActiveEmpresaId() || 'local';

    const executedAt = runDate instanceof Date && !Number.isNaN(runDate.getTime()) ? runDate : new Date();
    const storedTimestamp = formatAutomationRunForStorage(executedAt);
    const displayTimestamp = formatAutomationRunForDisplay(executedAt);
    const moduleLabel = getAutomationModuleLabel(automation && automation.module);
    const formatLabel = automation && automation.format ? String(automation.format).toUpperCase() : '';

    const details = [];
    if (moduleLabel) {
      details.push(`Módulo: ${moduleLabel}.`);
    }
    if (formatLabel) {
      details.push(`Formato: ${formatLabel}.`);
    }
    details.push(`Generado el ${displayTimestamp}.`);

    const titulo = automation && automation.name
      ? `Reporte programado generado: ${automation.name}`
      : 'Reporte programado generado';
    const mensaje = details.join(' ');
    const localNotification = {
      id: `scheduled-report-${automation && automation.id ? automation.id : 'local'}-${Date.now()}`,
      titulo,
      mensaje,
      prioridad: 'Media',
      estado: 'Enviada',
      tipo_destinatario: 'Usuario',
      ruta_destino: 'reports/reportes.html',
      fecha_disponible_desde: storedTimestamp,
      es_nueva: true,
      es_local: true,
      automationId: automation ? automation.id : null
    };

    appendScheduledReportAlertLocally(localNotification, empresaId);

    if (empresaId && empresaId !== 'local') {
      await persistScheduledReportAlert(localNotification, empresaId);
    }
  }

  function normalizeNumber(value) {
    if (value === null || value === undefined || value === '') {
      return 0;
    }
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function formatManualInteger(value) {
    const number = normalizeNumber(value);
    try {
      return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(number);
    } catch (error) {
      return String(number);
    }
  }

  function formatManualDecimal(value, decimals = 2) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return '—';
    }
    try {
      return new Intl.NumberFormat('es-MX', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(number);
    } catch (error) {
      return number.toFixed(decimals);
    }
  }

  function formatManualDimensions(ancho, alto, largo, unit = 'm') {
    const values = [ancho, alto, largo].map((value) => {
      const number = Number(value);
      if (!Number.isFinite(number) || number <= 0) {
        return '—';
      }
      try {
        return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(number);
      } catch (error) {
        return String(number);
      }
    });

    if (values.every((item) => item === '—')) {
      return '—';
    }

    const joined = values.join(' × ');
    return unit ? `${joined} ${unit}` : joined;
  }

  function parseManualDate(value) {
    if (!value && value !== 0) {
      return null;
    }
    if (value instanceof Date) {
      return Number.isFinite(value.getTime()) ? value : null;
    }
    const text = String(value).trim();
    if (!text) {
      return null;
    }
    let normalized = text;
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      normalized = `${text}T00:00:00`;
    } else if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(text)) {
      normalized = text.replace(' ', 'T');
    }
    const date = new Date(normalized);
    if (!Number.isFinite(date.getTime())) {
      return null;
    }
    return date;
  }

  function formatManualDateTime(value) {
    const date = value instanceof Date ? value : parseManualDate(value);
    if (!date) {
      return '—';
    }
    try {
      return new Intl.DateTimeFormat('es-MX', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(date);
    } catch (error) {
      return date.toLocaleString();
    }
  }

  function countZoneProductsSnapshot(zona) {
    if (!zona || typeof zona !== 'object') {
      return 0;
    }
    const base = normalizeNumber(
      zona.productos_activos ?? zona.productos ?? zona.total_productos ?? zona.cantidad_productos
    );
    let total = base;
    if (Array.isArray(zona.subniveles) && zona.subniveles.length) {
      total += zona.subniveles.reduce((acc, subnivel) => {
        return acc + normalizeNumber(
          subnivel.productos_activos ?? subnivel.productos ?? subnivel.total_productos
        );
      }, 0);
    }
    return total;
  }

  function countAreaProductsSnapshot(area, zonas = []) {
    const base = normalizeNumber(area?.productos_activos ?? area?.productos ?? area?.total_productos);
    const zonasArray = Array.isArray(zonas) ? zonas : [];
    const zonasTotal = zonasArray.reduce((acc, zona) => acc + countZoneProductsSnapshot(zona), 0);
    return base + zonasTotal;
  }

  function joinAccessDescriptions(accesos) {
    if (!Array.isArray(accesos) || !accesos.length) {
      return 'Acceso completo';
    }
    return accesos
      .map((item) => {
        const area = item && item.area ? String(item.area) : 'Área general';
        const zonaLabel = item && item.zona ? String(item.zona) : '';
        if (zonaLabel) {
          return `${area} · ${zonaLabel}`;
        }
        return `${area} · Todas las zonas`;
      })
      .join(' | ');
  }

  function getFormatLabel(format) {
    const key = String(format).toLowerCase();
    return MANUAL_FORMAT_LABELS[key] || key.toUpperCase();
  }

  function getManualFormatsLabel(formats = []) {
    if (!Array.isArray(formats) || !formats.length) {
      return '';
    }
    return formats.map((format) => getFormatLabel(format)).join(' · ');
  }

  async function fetchInventoryReportDataset({ empresaId, exporter }) {
    const url = `../../scripts/php/guardar_productos.php?empresa_id=${encodeURIComponent(empresaId)}`;
    const response = await fetch(url, { credentials: 'same-origin' });
    let data = null;
    try {
      data = await response.json();
    } catch (error) {
      data = null;
    }
    if (!response.ok) {
      const message = (data && (data.message || data.error)) || 'No se pudo obtener el inventario de productos.';
      throw new Error(message);
    }
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('EMPTY_DATASET');
    }

    const header = [
      'Nombre',
      'Área',
      'Zona',
      'Descripción',
      'Categoría',
      'Subcategoría',
      'Volumen (cm³)',
      'Stock',
      'Precio compra'
    ];

    const rows = data.map((item) => {
      const nombre = item && item.nombre ? String(item.nombre) : 'Sin nombre';
      const area = item && item.area_nombre ? String(item.area_nombre) : '—';
      const zona = item && item.zona_nombre ? String(item.zona_nombre) : '—';
      const descripcion = item && item.descripcion ? String(item.descripcion) : '—';
      const categoria = item && item.categoria_nombre ? String(item.categoria_nombre) : '—';
      const subcategoria = item && item.subcategoria_nombre ? String(item.subcategoria_nombre) : '—';
      const x = Number(item && item.dim_x);
      const y = Number(item && item.dim_y);
      const z = Number(item && item.dim_z);
      let volumen = '—';
      if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
        const volumenValor = x * y * z;
        if (volumenValor > 0) {
          volumen = `${volumenValor.toFixed(2)} cm³`;
        }
      }
      const stock = formatManualInteger(item && item.stock);
      const precioBruto = Number(item && (item.precio_compra ?? item.precio));
      const precio = Number.isFinite(precioBruto) && precioBruto > 0 ? formatManualDecimal(precioBruto, 2) : '—';
      return [nombre, area, zona, descripcion, categoria, subcategoria, volumen, stock, precio];
    });

    const dataset = {
      header,
      rows,
      rowCount: rows.length,
      columnCount: header.length
    };

    const subtitleParts = [];
    const empresaNombre = exporter && typeof exporter.getEmpresaNombre === 'function' ? exporter.getEmpresaNombre() : '';
    if (empresaNombre) {
      subtitleParts.push(`Empresa: ${empresaNombre}`);
    }
    const productosLabel = exporter && typeof exporter.pluralize === 'function'
      ? exporter.pluralize(rows.length, 'producto')
      : `${rows.length} producto${rows.length === 1 ? '' : 's'}`;
    subtitleParts.push(`Productos exportados: ${productosLabel}`);
    if (exporter && typeof exporter.formatTimestamp === 'function') {
      subtitleParts.push(`Generado: ${exporter.formatTimestamp(new Date())}`);
    } else {
      subtitleParts.push(`Generado: ${new Date().toLocaleString()}`);
    }

    return {
      dataset,
      title: 'Inventario actual · Productos',
      subtitle: subtitleParts.join(' • '),
      fileNameBase: 'inventario_productos',
      sheetName: 'Productos',
      historyLabel: 'Inventario actual',
      module: 'Gestión de inventario',
      includeRowCount: false,
      countLabel: (total) => {
        if (exporter && typeof exporter.pluralize === 'function') {
          return exporter.pluralize(total, 'producto');
        }
        return total === 1 ? '1 producto' : `${total} productos`;
      },
      notes: {
        pdf: 'Exportación del inventario actual a PDF (generada desde la página de reportes).',
        excel: 'Exportación del inventario actual a Excel (generada desde la página de reportes).'
      },
      source: 'Gestión de inventario'
    };
  }

  async function fetchAreasReportDataset({ empresaId, exporter }) {
    const response = await fetch('../../scripts/php/obtener_areas_zonas.php', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_empresa: empresaId })
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch (error) {
      payload = null;
    }

    if (!response.ok || !payload || payload.success === false) {
      const message = (payload && payload.message) || 'No se pudo obtener el detalle de áreas y zonas.';
      throw new Error(message);
    }

    const data = Array.isArray(payload && payload.data) ? payload.data : [];
    const rows = [];

    data.forEach((entry) => {
      const area = entry && entry.area ? entry.area : {};
      const zonas = Array.isArray(entry && entry.zonas) ? entry.zonas : [];
      const areaNombre = area && area.nombre ? String(area.nombre) : 'Área sin nombre';
      const areaDescripcion = area && area.descripcion ? String(area.descripcion) : '—';
      const areaDimensiones = formatManualDimensions(area && area.ancho, area && area.alto, area && area.largo, 'm');

      if (zonas.length) {
        zonas.forEach((zona) => {
          const zonaNombre = zona && zona.nombre ? String(zona.nombre) : '—';
          const tipo = zona && zona.tipo_almacenamiento ? String(zona.tipo_almacenamiento) : '—';
          const zonaDimensiones = formatManualDimensions(zona && zona.ancho, zona && zona.alto, zona && zona.largo, 'm');
          const productosZona = formatManualInteger(countZoneProductsSnapshot(zona));
          const subniveles = Array.isArray(zona && zona.subniveles) ? zona.subniveles.length : 0;
          const subnivelesLabel = subniveles
            ? `${subniveles} subnivel${subniveles === 1 ? '' : 'es'}`
            : '—';
          rows.push([
            areaNombre,
            areaDescripcion,
            areaDimensiones,
            zonaNombre,
            tipo,
            zonaDimensiones,
            productosZona,
            subnivelesLabel
          ]);
        });
      } else {
        const productosArea = formatManualInteger(countAreaProductsSnapshot(area, zonas));
        rows.push([areaNombre, areaDescripcion, areaDimensiones, '—', '—', '—', productosArea, '—']);
      }
    });

    if (!rows.length) {
      throw new Error('EMPTY_DATASET');
    }

    const header = [
      'Área',
      'Descripción',
      'Dimensiones área (m)',
      'Zona',
      'Tipo de almacenamiento',
      'Dimensiones zona (m)',
      'Productos activos',
      'Subniveles'
    ];

    const dataset = {
      header,
      rows,
      rowCount: rows.length,
      columnCount: header.length
    };

    const subtitleParts = [];
    const empresaNombre = exporter && typeof exporter.getEmpresaNombre === 'function' ? exporter.getEmpresaNombre() : '';
    if (empresaNombre) {
      subtitleParts.push(`Empresa: ${empresaNombre}`);
    }
    const areasLabel = data.length === 1 ? '1 área' : `${data.length} áreas`;
    subtitleParts.push(`Áreas registradas: ${areasLabel}`);
    const registrosLabel = exporter && typeof exporter.pluralize === 'function'
      ? exporter.pluralize(rows.length, 'registro')
      : `${rows.length} registros`;
    subtitleParts.push(`Registros exportados: ${registrosLabel}`);
    if (exporter && typeof exporter.formatTimestamp === 'function') {
      subtitleParts.push(`Generado: ${exporter.formatTimestamp(new Date())}`);
    } else {
      subtitleParts.push(`Generado: ${new Date().toLocaleString()}`);
    }

    return {
      dataset,
      title: 'Áreas y zonas del almacén',
      subtitle: subtitleParts.join(' • '),
      fileNameBase: 'areas_zonas',
      sheetName: 'AreasZonas',
      historyLabel: 'Áreas y zonas',
      module: 'Áreas y zonas de almacén',
      notes: {
        pdf: 'Exportación de áreas y zonas a PDF (generada desde la página de reportes).',
        excel: 'Exportación de áreas y zonas a Excel (generada desde la página de reportes).'
      },
      source: 'Áreas y zonas de almacén'
    };
  }

  async function fetchUsersReportDataset({ empresaId, exporter }) {
    const response = await fetch('../../scripts/php/obtener_usuarios_empresa.php', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_empresa: empresaId })
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch (error) {
      payload = null;
    }

    if (!response.ok || !payload || payload.success === false) {
      const message = (payload && payload.message) || 'No se pudo obtener la lista de usuarios.';
      throw new Error(message);
    }

    const usuarios = Array.isArray(payload && payload.usuarios) ? payload.usuarios : [];
    if (!usuarios.length) {
      throw new Error('EMPTY_DATASET');
    }

    const header = ['Nombre', 'Apellido', 'Correo', 'Teléfono', 'Rol', 'Estado', 'Accesos'];

    const rows = usuarios.map((usuario) => {
      const nombre = usuario && usuario.nombre ? String(usuario.nombre) : '—';
      const apellido = usuario && usuario.apellido ? String(usuario.apellido) : '—';
      const correo = usuario && usuario.correo ? String(usuario.correo) : '—';
      const telefono = usuario && usuario.telefono ? String(usuario.telefono) : '—';
      const rol = usuario && usuario.rol ? String(usuario.rol) : '—';
      const estado = usuario && usuario.activo ? 'Activo' : 'Inactivo';
      const accesos = joinAccessDescriptions(usuario && usuario.accesos);
      return [nombre, apellido, correo, telefono, rol, estado, accesos];
    });

    const dataset = {
      header,
      rows,
      rowCount: rows.length,
      columnCount: header.length
    };

    const subtitleParts = [];
    const empresaNombre = exporter && typeof exporter.getEmpresaNombre === 'function' ? exporter.getEmpresaNombre() : '';
    if (empresaNombre) {
      subtitleParts.push(`Empresa: ${empresaNombre}`);
    }
    const usuariosLabel = exporter && typeof exporter.pluralize === 'function'
      ? exporter.pluralize(rows.length, 'usuario')
      : `${rows.length} usuario${rows.length === 1 ? '' : 's'}`;
    subtitleParts.push(`Usuarios exportados: ${usuariosLabel}`);
    if (exporter && typeof exporter.formatTimestamp === 'function') {
      subtitleParts.push(`Generado: ${exporter.formatTimestamp(new Date())}`);
    } else {
      subtitleParts.push(`Generado: ${new Date().toLocaleString()}`);
    }

    return {
      dataset,
      title: 'Usuarios de la empresa',
      subtitle: subtitleParts.join(' • '),
      fileNameBase: 'usuarios_empresa',
      sheetName: 'Usuarios',
      historyLabel: 'Usuarios de la empresa',
      module: 'Administración de usuarios',
      includeRowCount: false,
      countLabel: (total) => {
        if (exporter && typeof exporter.pluralize === 'function') {
          return exporter.pluralize(total, 'usuario');
        }
        return total === 1 ? '1 usuario' : `${total} usuarios`;
      },
      notes: {
        pdf: 'Exportación de usuarios a PDF (generada desde la página de reportes).',
        excel: 'Exportación de usuarios a Excel (generada desde la página de reportes).'
      },
      source: 'Administración de usuarios'
    };
  }

  const MANUAL_REPORTS = [
    {
      id: 'inventory-products',
      title: 'Inventario actual',
      description: 'Exporta el catálogo completo de productos y niveles de stock registrados en la empresa.',
      formats: ['pdf', 'excel'],
      fetchDataset: fetchInventoryReportDataset,
      historySource: 'Gestión de inventario'
    },
    {
      id: 'warehouse-areas',
      title: 'Áreas y zonas de almacén',
      description: 'Resume la capacidad de cada área y las zonas asociadas con sus productos activos.',
      formats: ['pdf', 'excel'],
      fetchDataset: fetchAreasReportDataset,
      historySource: 'Áreas y zonas de almacén'
    },
    {
      id: 'company-users',
      title: 'Administración de usuarios',
      description: 'Descarga la lista actualizada de colaboradores, roles y accesos asignados.',
      formats: ['pdf', 'excel'],
      fetchDataset: fetchUsersReportDataset,
      historySource: 'Administración de usuarios'
    }
  ];
  const LOCAL_AUTOMATION_HISTORY_LIMIT = 30;

  function buildAutomationKey(automation) {
    if (!automation) {
      return '';
    }
    const module = automation.module || '';
    const frequency = automation.frequency || '';
    const time = automation.time || '';
    const format = automation.format || '';
    const weekday = Number.isFinite(Number(automation.weekday)) ? String(parseInt(automation.weekday, 10)) : '';
    const monthday = Number.isFinite(Number(automation.monthday)) ? String(parseInt(automation.monthday, 10)) : '';
    return `${module}::${frequency}::${time}::${format}::${weekday}::${monthday}`;
  }

  function isTemporaryAutomationId(id) {
    return typeof id === 'string' && id.startsWith('auto-');
  }

  function deduplicateAutomations(list) {
    if (!Array.isArray(list) || list.length === 0) {
      return [];
    }

    const map = new Map();

    list.forEach((automation) => {
      const key = buildAutomationKey(automation);
      if (!key) {
        const fallbackKey = automation && automation.id ? `id:${automation.id}` : `rand:${Math.random()}`;
        map.set(fallbackKey, automation);
        return;
      }

      const existing = map.get(key);
      if (!existing) {
        map.set(key, automation);
        return;
      }

      const existingUpdated = existing && existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
      const candidateUpdated = automation && automation.updatedAt ? new Date(automation.updatedAt).getTime() : 0;
      const existingIsTemp = isTemporaryAutomationId(existing.id);
      const candidateIsTemp = isTemporaryAutomationId(automation.id);

      if (existingIsTemp && !candidateIsTemp) {
        map.set(key, { ...existing, ...automation });
        return;
      }

      if (!existingIsTemp && candidateIsTemp) {
        return;
      }

      if (candidateUpdated > existingUpdated) {
        map.set(key, { ...existing, ...automation });
      }
    });

    return Array.from(map.values());
  }

  function ensureModuleOption(value) {
    if (!value || !elements.automationModuleInput || elements.automationModuleInput.tagName !== 'SELECT') {
      return;
    }

    const options = Array.from(elements.automationModuleInput.options || []);
    const hasOption = options.some((option) => option.value === value);

    if (!hasOption) {
      const option = document.createElement('option');
      option.value = value;
      const label = getAutomationModuleLabel(value);
      option.textContent = label || value;
      option.dataset.dynamic = 'true';
      elements.automationModuleInput.append(option);
    }
  }

  function escapeHtml(text) {
    if (text === null || text === undefined) {
      return '';
    }
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function encodeBase64(uint8Array) {
    if (!(uint8Array instanceof Uint8Array)) {
      return '';
    }

    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk);
    }

    try {
      return window.btoa(binary);
    } catch (error) {
      console.warn('No se pudo convertir a base64:', error);
      return '';
    }
  }

  function decodeBase64(base64) {
    if (!base64) {
      return new Uint8Array();
    }

    try {
      const binary = window.atob(base64);
      const output = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        output[i] = binary.charCodeAt(i);
      }
      return output;
    } catch (error) {
      console.warn('No se pudo decodificar base64:', error);
      return new Uint8Array();
    }
  }

  function encodeText(text) {
    if (typeof TextEncoder !== 'undefined') {
      return new TextEncoder().encode(text);
    }
    const normalized = String(text);
    const buffer = new Uint8Array(normalized.length);
    for (let i = 0; i < normalized.length; i += 1) {
      buffer[i] = normalized.charCodeAt(i) & 0xff;
    }
    return buffer;
  }

  function getActiveEmpresaId() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem('id_empresa');
        const parsed = stored ? parseInt(stored, 10) : NaN;
        if (!Number.isNaN(parsed) && parsed > 0) {
          return parsed;
        }
      }
    } catch (error) {
      console.warn('No se pudo leer el ID de empresa desde localStorage:', error);
    }

    return null;
  }

  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === 'string' ? reader.result : '';
        const commaIndex = result.indexOf(',');
        resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
      };
      reader.onerror = () => {
        reject(new Error('No se pudo leer el archivo para guardarlo.'));
      };
      reader.readAsDataURL(file);
    });
  }

  async function fetchHistoryFromServer() {
    const empresaId = getActiveEmpresaId();
    if (!empresaId) {
      throw new Error('No se encontró una empresa activa para consultar el historial.');
    }
    // Prefer the optional client API when available (it resolves base paths reliably).
    if (historyClient && typeof historyClient.fetchReportHistory === 'function') {
      return historyClient.fetchReportHistory();
    }

    const params = new URLSearchParams({ empresa: String(empresaId) });
    const response = await fetch(`${HISTORY_API_URL}?${params.toString()}`, { method: 'GET' });
    const data = await response.json().catch(() => ({ success: false }));

    if (!response.ok || !data.success) {
      const message = (data && data.message) || 'No se pudo consultar el historial de reportes.';
      throw new Error(message);
    }

    if (typeof data.retentionDays !== 'number') {
      data.retentionDays = RETENTION_DAYS_FALLBACK;
    }

    return data;
  }

  async function uploadFileToServer(file, metadata = {}) {
    if (!(file instanceof Blob)) {
      throw new Error('El archivo proporcionado no es válido.');
    }

    // Prefer the optional client API when available which accepts a Blob directly.
    if (historyClient && typeof historyClient.uploadFile === 'function') {
      return historyClient.uploadFile(file, metadata);
    }

    const empresaId = getActiveEmpresaId();
    if (!empresaId) {
      throw new Error('No se encontró una empresa activa para asociar el reporte.');
    }

    const payload = {
      fileName: typeof file.name === 'string' ? file.name : `reporte-${Date.now()}`,
      mimeType: file.type || 'application/octet-stream',
      fileContent: await readFileAsBase64(file),
      source: metadata.source || '',
      notes: metadata.notes || '',
      empresaId
    };

    if (metadata.automationId) {
      payload.automationId = metadata.automationId;
    }
    if (metadata.automationRunAt) {
      payload.automationRunAt = metadata.automationRunAt;
    }

    const response = await fetch(HISTORY_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({ success: false }));
    if (!response.ok || !data.success) {
      const message = (data && data.message) || 'No se pudo guardar el reporte en el historial.';
      const error = new Error(message);
      error.status = response.status;
      error.details = data;
      throw error;
    }

    return data;
  }

  function downloadReport(reportId) {
    if (!reportId) {
      return;
    }

    if (typeof reportId === 'string' && reportId.startsWith('local-auto:')) {
      const report = state.localAutomationReports.find((item) => item.id === reportId);
      if (!report) {
        showAlert('No encontramos el archivo generado automáticamente.', 'warning');
        return;
      }

      const bytes = decodeBase64(report.fileContent);
      const blob = new Blob([bytes], { type: report.mimeType || 'application/octet-stream' });
      const objectUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = report.originalName || 'reporte-automatico';
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
      return;
    }

    if (historyClient && typeof historyClient.downloadReport === 'function') {
      return historyClient.downloadReport(reportId);
    }

    const empresaId = getActiveEmpresaId();
    if (!empresaId) {
      showAlert('No se encontró una empresa activa para descargar el reporte.', 'warning');
      return;
    }

    const url = new URL(HISTORY_API_URL, window.location.origin);
    url.searchParams.set('action', 'download');
    url.searchParams.set('id', reportId);
    url.searchParams.set('empresa', String(empresaId));

    const link = document.createElement('a');
    link.href = url.toString();
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) {
      return '--';
    }
    if (bytes === 0) {
      return '0 B';
    }
    let value = bytes;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < BYTES_UNITS.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }
    const decimals = value < 10 && unitIndex > 0 ? 1 : 0;
    return `${value.toFixed(decimals)} ${BYTES_UNITS[unitIndex]}`;
  }

  function formatDate(isoString) {
    if (!isoString) {
      return '--';
    }
    const date = new Date(isoString);
    if (!Number.isFinite(date.getTime())) {
      return '--';
    }
    try {
      return new Intl.DateTimeFormat('es-MX', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(date);
    } catch (error) {
      return date.toLocaleString();
    }
  }

  function formatRelative(isoString) {
    if (!isoString) {
      return '';
    }
    const date = new Date(isoString);
    const now = Date.now();
    const diff = date.getTime() - now;
    if (!Number.isFinite(diff)) {
      return '';
    }
    const days = Math.round(diff / (24 * 60 * 60 * 1000));
    if (days <= 0) {
      return 'Expirado';
    }
    return `Expira en ${days} día${days === 1 ? '' : 's'}`;
  }

  function getTypeMeta(mimeType) {
    const normalized = (mimeType || '').toLowerCase();
    if (normalized.includes('pdf')) {
      return { label: 'PDF', chipClass: 'history-table__chip history-table__chip--pdf' };
    }
    if (normalized.includes('sheet') || normalized.includes('excel') || normalized.includes('csv')) {
      return { label: 'Excel', chipClass: 'history-table__chip history-table__chip--excel' };
    }
    return { label: mimeType || 'Archivo', chipClass: 'history-table__chip' };
  }

  function showAlert(message, variant = 'danger', persistent = false) {
    if (!elements.historyAlert) {
      return;
    }
    elements.historyAlert.textContent = message;
    elements.historyAlert.classList.remove('d-none', 'alert-danger', 'alert-success', 'alert-warning', 'alert-info');
    elements.historyAlert.classList.add(`alert-${variant}`);

    if (state.alertTimerId) {
      clearTimeout(state.alertTimerId);
      state.alertTimerId = null;
    }

    if (!persistent) {
      state.alertTimerId = window.setTimeout(() => {
        elements.historyAlert.classList.add('d-none');
        state.alertTimerId = null;
      }, 5000);
    }
  }

  function hideAlert() {
    if (!elements.historyAlert) {
      return;
    }
    elements.historyAlert.classList.add('d-none');
    if (state.alertTimerId) {
      clearTimeout(state.alertTimerId);
      state.alertTimerId = null;
    }
  }

  function formatManualLastGenerated(timestamp) {
    if (!timestamp) {
      return 'Aún no se ha generado desde aquí';
    }
    const date = parseManualDate(timestamp);
    if (!date) {
      return 'Generado recientemente';
    }
    try {
      return `Última generación: ${new Intl.DateTimeFormat('es-MX', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(date)}`;
    } catch (error) {
      return `Última generación: ${date.toLocaleString()}`;
    }
  }

  function setManualReportLoading(reportId, loading) {
    if (!reportId) {
      return;
    }
    if (!state.manualReportsStatus[reportId]) {
      state.manualReportsStatus[reportId] = {};
    }
    state.manualReportsStatus[reportId].loading = Boolean(loading);
  }

  function renderManualReports() {
    if (!elements.manualGeneratorGrid) {
      return;
    }

    const reports = Array.isArray(state.manualReports) ? state.manualReports : [];
    const hasEmpresa = state.activeEmpresaId && state.activeEmpresaId !== 'local';

    if (!reports.length) {
      elements.manualGeneratorGrid.innerHTML = '';
      if (elements.manualGeneratorEmpty) {
        elements.manualGeneratorEmpty.textContent = 'No hay reportes manuales disponibles en este momento.';
        elements.manualGeneratorEmpty.classList.remove('d-none');
      }
      return;
    }

    if (!hasEmpresa) {
      elements.manualGeneratorGrid.innerHTML = '';
      if (elements.manualGeneratorEmpty) {
        elements.manualGeneratorEmpty.textContent = 'Vincula una empresa para comenzar a generar reportes desde aquí.';
        elements.manualGeneratorEmpty.classList.remove('d-none');
      }
      return;
    }

    if (elements.manualGeneratorEmpty) {
      elements.manualGeneratorEmpty.classList.add('d-none');
    }

    const cardsHtml = reports
      .map((report) => {
        const status = state.manualReportsStatus[report.id] || {};
        const loading = Boolean(status.loading);
        const statusClass = `manual-card__status${loading ? ' manual-card__status--loading' : ''}`;
        const formatsLabel = getManualFormatsLabel(report.formats);
        const hintText = formatsLabel ? `Formatos: ${formatsLabel}` : '';
        const statusLabel = formatManualLastGenerated(status.lastGenerated);

        const buttonsHtml = (report.formats || [])
          .map((format) => {
            const label = getFormatLabel(format);
            const secondaryClass = String(format).toLowerCase() === 'excel' ? ' manual-card__button--secondary' : '';
            const disabledAttr = loading ? ' disabled' : '';
            const text = loading
              ? (String(format).toLowerCase() === 'excel' ? 'Generando Excel…' : 'Generando PDF…')
              : label;
            return `<button type="button" class="manual-card__button${secondaryClass}" data-report-id="${escapeHtml(
              report.id
            )}" data-report-format="${escapeHtml(String(format))}"${disabledAttr}>${escapeHtml(text)}</button>`;
          })
          .join('');

        return `
          <article class="manual-card" role="listitem">
            <div class="manual-card__body">
              <span class="manual-card__label">${escapeHtml(report.historySource || 'Módulo')}</span>
              <h3 class="manual-card__title">${escapeHtml(report.title)}</h3>
              <p class="manual-card__description">${escapeHtml(report.description || '')}</p>
            </div>
            <div class="manual-card__actions">
              ${buttonsHtml}
            </div>
            <div class="manual-card__meta">
              <span class="${statusClass}">${escapeHtml(statusLabel)}</span>
              <span class="manual-card__hint">${escapeHtml(hintText)}</span>
            </div>
          </article>
        `;
      })
      .join('');

    elements.manualGeneratorGrid.innerHTML = cardsHtml;
  }

  async function saveManualReport(blob, fileName, source, notes) {
    if (!(blob instanceof Blob)) {
      throw new Error('El archivo generado no es válido.');
    }
    if (!historyClient || typeof historyClient.saveGeneratedFile !== 'function') {
      return false;
    }
    await historyClient.saveGeneratedFile({
      blob,
      fileName,
      source,
      notes
    });
    return true;
  }

  async function generateManualReport(reportId, format) {
    const report = (state.manualReports || []).find((item) => item.id === reportId);
    if (!report) {
      return;
    }

    if (!state.activeEmpresaId || state.activeEmpresaId === 'local') {
      showAlert('Vincula una empresa para generar reportes desde aquí.', 'warning', true);
      return;
    }

    const exporter = window.ReportExporter;
    if (!exporter) {
      showAlert('No se pudo cargar el módulo de exportación. Recarga la página e inténtalo nuevamente.', 'danger', true);
      return;
    }

    const normalizedFormat = String(format).toLowerCase();
    if (normalizedFormat !== 'pdf' && normalizedFormat !== 'excel') {
      showAlert('Formato de reporte no soportado.', 'danger');
      return;
    }

    const status = state.manualReportsStatus[reportId] || {};
    if (status.loading) {
      return;
    }

    setManualReportLoading(reportId, true);
    renderManualReports();

    try {
      const datasetInfo = await report.fetchDataset({
        empresaId: state.activeEmpresaId,
        exporter
      });

      if (!datasetInfo || !datasetInfo.dataset || !datasetInfo.dataset.rowCount) {
        throw new Error('EMPTY_DATASET');
      }

      let result = null;
      if (normalizedFormat === 'pdf') {
        const pdfOptions = {
          data: datasetInfo.dataset,
          title: datasetInfo.title || report.title,
          subtitle: datasetInfo.subtitle || '',
          fileName: `${datasetInfo.fileNameBase || 'reporte'}.pdf`,
          module: datasetInfo.module || datasetInfo.moduleLabel || report.title
        };
        if (Array.isArray(datasetInfo.metadata)) {
          pdfOptions.metadata = datasetInfo.metadata;
        }
        if (typeof datasetInfo.companyName === 'string' && datasetInfo.companyName.trim()) {
          pdfOptions.companyName = datasetInfo.companyName.trim();
        }
        if (datasetInfo.generatedAt) {
          pdfOptions.generatedAt = datasetInfo.generatedAt;
        }
        if (typeof datasetInfo.countLabel === 'function') {
          pdfOptions.countLabel = datasetInfo.countLabel;
        }
        if (datasetInfo.includeRowCount === false) {
          pdfOptions.includeRowCount = false;
        }
        result = await exporter.exportTableToPdf(pdfOptions);
      } else {
        result = exporter.exportTableToExcel({
          data: datasetInfo.dataset,
          fileName: `${datasetInfo.fileNameBase || 'reporte'}.xlsx`,
          sheetName: datasetInfo.sheetName || 'Datos'
        });
      }

      if (!result || !(result.blob instanceof Blob)) {
        showAlert('No se generó ningún archivo para este reporte.', 'warning');
        return;
      }

      let savedToHistory = false;
      try {
        savedToHistory = await saveManualReport(
          result.blob,
          result.fileName,
          datasetInfo.source || report.historySource || report.title,
          datasetInfo.notes ? datasetInfo.notes[normalizedFormat] : undefined
        );
      } catch (error) {
        console.warn('No se pudo guardar el reporte manual en el historial:', error);
        showAlert(error.message || 'No se pudo guardar el reporte en el historial.', 'warning', true);
      }

      if (savedToHistory) {
        await loadHistory({ showSpinner: false });
      }

      state.manualReportsStatus[reportId] = {
        ...(state.manualReportsStatus[reportId] || {}),
        lastGenerated: new Date().toISOString(),
        loading: false
      };

      const message = savedToHistory
        ? `Reporte "${report.title}" generado y guardado en el historial.`
        : `Reporte "${report.title}" generado. Descarga disponible en tu navegador.`;
      showAlert(message, 'success');
    } catch (error) {
      state.manualReportsStatus[reportId] = {
        ...(state.manualReportsStatus[reportId] || {}),
        loading: false
      };

      if (error && error.message === 'EMPTY_DATASET') {
        showAlert('No hay datos disponibles para generar el reporte seleccionado.', 'warning', true);
      } else if (error && error.message === 'MODULE_MISSING') {
        showAlert('No se pudo cargar el módulo de exportación. Recarga la página e inténtalo nuevamente.', 'danger', true);
      } else {
        showAlert((error && error.message) || 'No se pudo generar el reporte solicitado.', 'danger', true);
      }
      console.error('No se pudo generar el reporte manual:', error);
    } finally {
      setManualReportLoading(reportId, false);
      renderManualReports();
    }
  }

  function handleManualGeneratorClick(event) {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) {
      return;
    }
    const button = target.closest('[data-report-format]');
    if (!button) {
      return;
    }
    const reportId = button.getAttribute('data-report-id');
    const format = button.getAttribute('data-report-format');
    if (!reportId || !format) {
      return;
    }
    generateManualReport(reportId, format);
  }

  function getAutomationStorageKey(empresaId) {
    return `${AUTOMATION_STORAGE_PREFIX}${empresaId}`;
  }

  function getAutomationReportsKey(empresaId) {
    return `${AUTOMATION_REPORTS_PREFIX}${empresaId}`;
  }

  function loadAutomationsFromStorage() {
    const empresaId = state.activeEmpresaId;
    if (!empresaId || !window.localStorage) {
      return [];
    }
    try {
      const raw = window.localStorage.getItem(getAutomationStorageKey(empresaId));
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('No se pudieron leer las automatizaciones almacenadas:', error);
      return [];
    }
  }

  function cacheAutomationsLocally() {
    const empresaId = state.activeEmpresaId;
    if (!empresaId || !window.localStorage) {
      return;
    }
    try {
      const payload = JSON.stringify(deduplicateAutomations(state.automations));
      window.localStorage.setItem(getAutomationStorageKey(empresaId), payload);
    } catch (error) {
      console.warn('No se pudieron guardar las automatizaciones en caché:', error);
    }
  }

  function saveAutomationsToStorage(options = {}) {
    cacheAutomationsLocally();
    const skipServerSync = options && options.skipServerSync;
    if (skipServerSync) {
      return;
    }
    scheduleAutomationSync();
  }

  function scheduleAutomationSync() {
    if (!state.activeEmpresaId || state.activeEmpresaId === 'local') {
      return;
    }
    if (state.automationSyncTimerId) {
      window.clearTimeout(state.automationSyncTimerId);
    }
    state.automationSyncTimerId = window.setTimeout(() => {
      state.automationSyncTimerId = null;
      persistAutomationsToServer().catch((error) => {
        console.error('No se pudo sincronizar las automatizaciones:', error);
        showAlert(error.message || 'No se pudo sincronizar las automatizaciones.', 'danger', true);
      });
    }, 500);
  }

  function serializeAutomationForSync(automation) {
    return {
      id: automation.id,
      name: automation.name,
      module: automation.module,
      format: automation.format,
      frequency: automation.frequency,
      time: automation.time,
      weekday: automation.weekday,
      monthday: automation.monthday,
      notes: automation.notes,
      active: Boolean(automation.active),
      nextRunAt: automation.nextRunAt || null,
      lastRunAt: automation.lastRunAt || null,
      createdAt: automation.createdAt || null,
      updatedAt: automation.updatedAt || null
    };
  }

  async function persistAutomationsToServer() {
    if (!state.activeEmpresaId || state.activeEmpresaId === 'local') {
      return;
    }

    const payload = {
      action: 'sync',
      empresaId: state.activeEmpresaId,
      automations: state.automations.map((automation) => serializeAutomationForSync(automation))
    };

    const response = await fetch(AUTOMATION_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({ success: false }));
    if (!response.ok || !data.success) {
      const message = (data && data.message) || 'No se pudo sincronizar las automatizaciones.';
      throw new Error(message);
    }

    if (data.requiresApproval) {
      const infoMessage = typeof data.message === 'string' && data.message
        ? data.message
        : 'Tu solicitud para actualizar las automatizaciones fue enviada para revisión.';
      showAlert(infoMessage, 'info', true);
    }

    if (Array.isArray(data.automations)) {
      state.automations = deduplicateAutomations(
        data.automations.map((item) => normalizeAutomation(item))
      );
      cacheAutomationsLocally();
      renderAutomations();
    }
    state.automationsLoadedFromServer = true;
  }

  async function fetchAutomationsFromServer() {
    if (!state.activeEmpresaId || state.activeEmpresaId === 'local') {
      return [];
    }
    const params = new URLSearchParams({ empresa: String(state.activeEmpresaId) });
    const response = await fetch(`${AUTOMATION_API_URL}?${params.toString()}`, { method: 'GET' });
    const data = await response.json().catch(() => ({ success: false }));
    if (!response.ok || !data.success) {
      const message = (data && data.message) || 'No se pudieron consultar las automatizaciones.';
      throw new Error(message);
    }
    return Array.isArray(data.automations) ? data.automations : [];
  }

  async function refreshAutomationsFromServer() {
    if (!state.activeEmpresaId || state.activeEmpresaId === 'local') {
      return;
    }
    try {
      const automations = await fetchAutomationsFromServer();
      state.automations = deduplicateAutomations(
        automations.map((item) => normalizeAutomation(item))
      );
      cacheAutomationsLocally();
      state.automationsLoadedFromServer = true;
      renderAutomations();
      runPendingAutomations().catch((error) => {
        console.error('No se pudieron ejecutar las automatizaciones pendientes:', error);
      });
    } catch (error) {
      console.error('No se pudieron cargar las automatizaciones desde el servidor:', error);
      showAlert(error.message || 'No se pudieron cargar las automatizaciones.', 'danger', true);
    }
  }

  function toIsoString(value) {
    if (!value) {
      return null;
    }
    try {
      const date = new Date(value);
      if (!Number.isFinite(date.getTime())) {
        return null;
      }
      return date.toISOString();
    } catch (error) {
      return null;
    }
  }

  function normalizeAutomation(raw) {
    const validFrequencies = ['daily', 'weekly', 'biweekly', 'monthly'];
    const rawId = raw && typeof raw.id === 'string' && raw.id
      ? raw.id
      : raw && typeof raw.uuid === 'string' && raw.uuid
        ? raw.uuid
        : '';
    const id = rawId || `auto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const rawName = (raw && (raw.name || raw.nombre)) || 'Reporte automatizado';
    const name = String(rawName || '').trim() || 'Reporte automatizado';
    const rawModule = (raw && (raw.module || raw.modulo)) || '';
    const module = normalizeAutomationModuleValue(rawModule);
    const rawFormat = raw && (raw.format || raw.formato);
    const format = rawFormat === 'excel' ? 'excel' : 'pdf';
    const rawFrequency = raw && (raw.frequency || raw.frecuencia);
    const frequency = validFrequencies.includes(String(rawFrequency)) ? String(rawFrequency) : 'daily';
    let timeInput = raw && typeof raw.time === 'string' && raw.time ? raw.time : '';
    if (!timeInput && raw && typeof raw.hora === 'string' && raw.hora) {
      timeInput = raw.hora;
    }
    if (!timeInput && raw && typeof raw.hora_ejecucion === 'string' && raw.hora_ejecucion) {
      timeInput = raw.hora_ejecucion;
    }
    const { hours, minutes } = getTimeParts(timeInput || '08:00');
    const time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    const weekdayRaw = raw && typeof raw.weekday !== 'undefined' ? raw.weekday : raw && typeof raw.dia_semana !== 'undefined' ? raw.dia_semana : null;
    const weekday = Number.isFinite(Number(weekdayRaw)) ? Math.min(Math.max(parseInt(weekdayRaw, 10), 0), 6) : 1;
    const monthdayRaw = raw && typeof raw.monthday !== 'undefined' ? raw.monthday : raw && typeof raw.dia_mes !== 'undefined' ? raw.dia_mes : null;
    const monthday = Number.isFinite(Number(monthdayRaw)) ? Math.min(Math.max(parseInt(monthdayRaw, 10), 1), 31) : 1;
    const notesValue = (raw && (raw.notes || raw.notas)) || '';
    const notes = String(notesValue || '').trim();
    const activeValue = raw && typeof raw.active !== 'undefined' ? raw.active : raw && typeof raw.activo !== 'undefined' ? raw.activo : true;
    const active = !(activeValue === false || activeValue === 'false' || activeValue === 0 || activeValue === '0');
    const lastRunAt = toIsoString((raw && raw.lastRunAt) || (raw && raw.ultimo_ejecutado));
    let nextRunAt = toIsoString((raw && raw.nextRunAt) || (raw && raw.proxima_ejecucion));
    const createdAt = toIsoString((raw && raw.createdAt) || (raw && raw.creado_en)) || new Date().toISOString();
    const updatedAt = toIsoString((raw && raw.updatedAt) || (raw && raw.actualizado_en)) || createdAt;

    const automation = {
      id,
      name,
      module,
      format,
      frequency,
      time,
      weekday,
      monthday,
      notes,
      active,
      lastRunAt,
      nextRunAt,
      createdAt,
      updatedAt
    };

    if (!automation.nextRunAt && automation.active) {
      automation.nextRunAt = computeNextRunAt(automation, new Date());
    }

    return automation;
  }

  function loadLocalAutomationReports() {
    const empresaId = state.activeEmpresaId;
    if (!window.localStorage || empresaId !== 'local') {
      state.localAutomationReports = [];
      return;
    }
    try {
      const raw = window.localStorage.getItem(getAutomationReportsKey(empresaId));
      if (!raw) {
        state.localAutomationReports = [];
        return;
      }
      const parsed = JSON.parse(raw);
      state.localAutomationReports = Array.isArray(parsed)
        ? parsed
            .map((item) => ({
              id: item.id,
              automationId: item.automationId,
              originalName: item.originalName,
              mimeType: item.mimeType,
              source: item.source,
              notes: item.notes,
              createdAt: item.createdAt,
              expiresAt: item.expiresAt || null,
              size: item.size || 0,
              fileContent: item.fileContent,
              fileExtension: item.fileExtension || ''
            }))
            .filter((item) => item.id && item.fileContent)
        : [];
      if (state.localAutomationReports.length > LOCAL_AUTOMATION_HISTORY_LIMIT) {
        state.localAutomationReports = state.localAutomationReports.slice(-LOCAL_AUTOMATION_HISTORY_LIMIT);
      }
    } catch (error) {
      console.warn('No se pudieron leer los reportes automáticos locales:', error);
      state.localAutomationReports = [];
    }
  }

  function saveLocalAutomationReports() {
    const empresaId = state.activeEmpresaId;
    if (!window.localStorage || empresaId !== 'local') {
      return;
    }
    try {
      const payload = JSON.stringify(state.localAutomationReports);
      window.localStorage.setItem(getAutomationReportsKey(empresaId), payload);
    } catch (error) {
      console.warn('No se pudieron guardar los reportes automáticos locales:', error);
    }
  }

  function rebuildReportCollection() {
    const combined = [...state.serverReports, ...state.localAutomationReports];
    combined.sort((a, b) => {
      const aTime = new Date(a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt || 0).getTime();
      return bTime - aTime;
    });
    state.reports = combined;
    updateSummary();
    refreshSourceFilterOptions();
    applyFilters({ resetPage: true });
  }

  function setLoading(isLoading) {
    state.loading = isLoading;
    if (elements.historyLoading) {
      elements.historyLoading.classList.toggle('d-none', !isLoading);
    }
    if (elements.historyTableWrapper) {
      elements.historyTableWrapper.classList.toggle('d-none', isLoading);
    }
    if (elements.historyEmpty) {
      elements.historyEmpty.classList.toggle('d-none', true);
    }
    if (elements.historyFooter) {
      elements.historyFooter.classList.toggle('d-none', isLoading);
    }
  }

  function countMonthReports(reports) {
    const now = Date.now();
    return reports.reduce((acc, report) => {
      const createdAt = new Date(report.createdAt).getTime();
      if (Number.isFinite(createdAt) && now - createdAt <= THIRTY_DAYS_MS) {
        return acc + 1;
      }
      return acc;
    }, 0);
  }

  function countExpiringReports(reports) {
    const now = Date.now();
    return reports.reduce((acc, report) => {
      const expiresAt = new Date(report.expiresAt).getTime();
      if (Number.isFinite(expiresAt)) {
        const diff = expiresAt - now;
        if (diff > 0 && diff <= EXPIRING_THRESHOLD_MS) {
          return acc + 1;
        }
      }
      return acc;
    }, 0);
  }

  function updateSummary() {
    if (elements.summaryTotal) {
      elements.summaryTotal.textContent = state.reports.length.toString();
    }
    if (elements.summaryMonth) {
      elements.summaryMonth.textContent = countMonthReports(state.reports).toString();
    }
    if (elements.summaryExpiring) {
      elements.summaryExpiring.textContent = countExpiringReports(state.reports).toString();
    }
    if (elements.summaryRetention) {
      elements.summaryRetention.textContent = `Eliminación automática cada ${state.retentionDays} día${state.retentionDays === 1 ? '' : 's'}`;
    }
    if (elements.uploadHint) {
      elements.uploadHint.textContent = `Los reportes se eliminan automáticamente a los ${state.retentionDays} días.`;
    }
  }

  function refreshSourceFilterOptions() {
    if (!elements.sourceFilter) {
      state.availableSources = [];
      return;
    }

    const previousValue = elements.sourceFilter.value || 'all';
    const uniqueSources = new Map();

    state.reports.forEach((report) => {
      if (!report || typeof report.source !== 'string') {
        return;
      }
      const trimmed = report.source.trim();
      if (!trimmed) {
        return;
      }
      const normalized = trimmed.toLowerCase();
      if (!uniqueSources.has(normalized)) {
        uniqueSources.set(normalized, trimmed);
      }
    });

    state.availableSources = Array.from(uniqueSources.values()).sort((a, b) =>
      a.localeCompare(b, 'es', { sensitivity: 'base' })
    );

    elements.sourceFilter.innerHTML = '';

    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'Todos';
    elements.sourceFilter.append(allOption);

    state.availableSources.forEach((source) => {
      const option = document.createElement('option');
      option.value = source;
      option.textContent = source;
      elements.sourceFilter.append(option);
    });

    const nextValue = previousValue !== 'all' && !state.availableSources.includes(previousValue)
      ? 'all'
      : previousValue;
    elements.sourceFilter.value = nextValue;
  }

  function updateHistoryFooter({ filteredCount, start = 0, end = 0, totalPages = 1 }) {
    if (elements.historyPaginationInfo) {
      elements.historyPaginationInfo.textContent = filteredCount === 0
        ? 'Sin reportes para mostrar'
        : `Mostrando ${start}-${end} de ${filteredCount} ${filteredCount === 1 ? 'reporte' : 'reportes'}`;
    }

    if (!elements.historyPagination) {
      return;
    }

    if (filteredCount === 0) {
      elements.historyPagination.classList.add('d-none');
      if (elements.historyPaginationPages) {
        elements.historyPaginationPages.innerHTML = '';
      }
      if (elements.historyPaginationPrev) {
        elements.historyPaginationPrev.disabled = true;
      }
      if (elements.historyPaginationNext) {
        elements.historyPaginationNext.disabled = true;
      }
      return;
    }

    const total = Math.max(1, totalPages);
    if (total <= 1) {
      elements.historyPagination.classList.add('d-none');
      if (elements.historyPaginationPrev) {
        elements.historyPaginationPrev.disabled = true;
      }
      if (elements.historyPaginationNext) {
        elements.historyPaginationNext.disabled = true;
      }
      if (elements.historyPaginationPages) {
        elements.historyPaginationPages.innerHTML = '';
      }
      return;
    }

    elements.historyPagination.classList.remove('d-none');
    if (elements.historyPaginationPrev) {
      elements.historyPaginationPrev.disabled = state.historyPage <= 1;
    }
    if (elements.historyPaginationNext) {
      elements.historyPaginationNext.disabled = state.historyPage >= total;
    }

    if (!elements.historyPaginationPages) {
      return;
    }

    elements.historyPaginationPages.innerHTML = '';
    const maxButtons = 5;
    let startPage = Math.max(1, state.historyPage - Math.floor(maxButtons / 2));
    let endPage = startPage + maxButtons - 1;

    if (endPage > total) {
      endPage = total;
      startPage = Math.max(1, endPage - maxButtons + 1);
    }

    for (let page = startPage; page <= endPage; page += 1) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `history-page-number${page === state.historyPage ? ' is-active' : ''}`;
      button.textContent = page;
      button.addEventListener('click', () => {
        if (page !== state.historyPage) {
          state.historyPage = page;
          renderHistory(state.filteredReports);
        }
      });
      elements.historyPaginationPages.appendChild(button);
    }
  }

  function renderHistory(list) {
    if (!elements.historyTableBody || !elements.historyTableWrapper) {
      return;
    }

    const totalReports = state.reports.length;
    const filteredCount = list.length;
    const hasFilters = Boolean(
      (elements.searchInput && elements.searchInput.value.trim()) ||
      (elements.typeFilter && elements.typeFilter.value !== 'all') ||
      (elements.sourceFilter && elements.sourceFilter.value !== 'all')
    );

    if (elements.historyFooter) {
      elements.historyFooter.classList.remove('d-none');
    }

    if (filteredCount === 0) {
      elements.historyTableBody.innerHTML = '';
      elements.historyTableWrapper.classList.add('d-none');
      if (elements.historyEmpty) {
        elements.historyEmpty.classList.remove('d-none');
        if (totalReports === 0) {
          elements.historyEmpty.innerHTML = '<p class="mb-1 fw-semibold">Aún no hay reportes guardados.</p><p class="mb-0">Cuando generes un PDF o Excel desde cualquier módulo aparecerá automáticamente aquí.</p>';
        } else if (hasFilters) {
          elements.historyEmpty.innerHTML = '<p class="mb-1 fw-semibold">No encontramos coincidencias.</p><p class="mb-0">Ajusta tu búsqueda, el tipo de archivo o el origen para ver otros resultados.</p>';
        } else {
          elements.historyEmpty.innerHTML = '<p class="mb-1 fw-semibold">No hay reportes disponibles.</p><p class="mb-0">Vuelve a intentarlo más tarde.</p>';
        }
      }

      updateHistoryFooter({ filteredCount: 0 });

      if (elements.historyCaption) {
        elements.historyCaption.textContent = totalReports === 0
          ? 'Aún no hay reportes guardados.'
          : hasFilters
            ? 'No se encontraron reportes con los filtros seleccionados.'
            : 'No hay reportes disponibles por el momento.';
      }
      return;
    }

    const totalPages = Math.max(1, Math.ceil(filteredCount / HISTORY_PAGE_SIZE));
    state.historyPage = Math.min(Math.max(state.historyPage, 1), totalPages);
    const startIndex = (state.historyPage - 1) * HISTORY_PAGE_SIZE;
    const endIndex = Math.min(startIndex + HISTORY_PAGE_SIZE, filteredCount);
    const pageItems = list.slice(startIndex, endIndex);

    const rowsHtml = pageItems
      .map((report) => {
        const typeMeta = getTypeMeta(report.mimeType);
        const source = report.source ? escapeHtml(report.source) : '<span class="text-muted">Sin origen</span>';
        const notes = report.notes ? `<div class="text-muted small mt-1">${escapeHtml(report.notes)}</div>` : '';
        const expiresTooltip = report.expiresAt ? formatRelative(report.expiresAt) : '';
        return `
            <tr>
              <td data-label="Nombre">
                <span class="history-table__name">${escapeHtml(report.originalName)}</span>
                ${notes}
              </td>
              <td data-label="Tipo">
                <span class="${typeMeta.chipClass}" title="${escapeHtml(typeMeta.label)}">${typeMeta.label}</span>
              </td>
              <td data-label="Origen">${source}</td>
              <td data-label="Fecha" title="${escapeHtml(expiresTooltip)}">${formatDate(report.createdAt)}</td>
              <td data-label="Tamaño">${formatBytes(report.size)}</td>
              <td data-label="Acciones">
                <div class="history-actions justify-content-end">
                  <div class="dropdown">
                    <button class="btn btn-sm btn-light dropdown-toggle history-actions-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">⋯</button>
                    <ul class="dropdown-menu dropdown-menu-end">
                      <li><button class="dropdown-item history-download-btn" data-download-id="${escapeHtml(report.id)}">Descargar</button></li>
                      <li><button class="dropdown-item text-danger history-delete-btn" data-delete-id="${escapeHtml(report.id)}" data-delete-name="${escapeHtml(report.originalName)}">Eliminar</button></li>
                    </ul>
                  </div>
                </div>
              </td>
            </tr>
          `;
      })
      .join('');

    elements.historyTableBody.innerHTML = rowsHtml;
    elements.historyTableWrapper.classList.remove('d-none');
    if (elements.historyEmpty) {
      elements.historyEmpty.classList.add('d-none');
    }

    updateHistoryFooter({
      filteredCount,
      start: startIndex + 1,
      end: endIndex,
      totalPages
    });

    if (elements.historyCaption) {
      elements.historyCaption.textContent = `Mostrando ${startIndex + 1}-${endIndex} de ${filteredCount} ${filteredCount === 1 ? 'reporte disponible' : 'reportes disponibles'}`;
    }
  }

  function applyFilters({ resetPage = true } = {}) {
    const searchTerm = elements.searchInput ? elements.searchInput.value.trim().toLowerCase() : '';
    const typeFilter = elements.typeFilter ? elements.typeFilter.value : 'all';
    const sourceFilter = elements.sourceFilter ? elements.sourceFilter.value : 'all';
    const normalizedSourceFilter = sourceFilter === 'all' ? 'all' : sourceFilter.toLowerCase();

    if (resetPage) {
      state.historyPage = 1;
    }

    state.filteredReports = state.reports.filter((report) => {
      const normalizedName = `${report.originalName || ''} ${report.source || ''} ${report.notes || ''}`.toLowerCase();
      const matchesSearch = !searchTerm || normalizedName.includes(searchTerm);

      if (!matchesSearch) {
        return false;
      }

      const normalizedMime = (report.mimeType || '').toLowerCase();
      if (typeFilter === 'application/pdf' && !normalizedMime.includes('pdf')) {
        return false;
      }

      if (
        typeFilter === 'excel' &&
        !(normalizedMime.includes('sheet') || normalizedMime.includes('excel') || normalizedMime.includes('csv'))
      ) {
        return false;
      }

      if (normalizedSourceFilter !== 'all') {
        const reportSource = typeof report.source === 'string' ? report.source.trim().toLowerCase() : '';
        if (!reportSource || reportSource !== normalizedSourceFilter) {
          return false;
        }
      }

      return true;
    });

    renderHistory(state.filteredReports);
  }

  async function loadHistory({ showSpinner = true } = {}) {
    if (showSpinner) {
      setLoading(true);
    }
    hideAlert();

    // If an optional history client is not present we still support the built-in fetch
    // fallback. Do not throw here — prefer graceful degradation.
    if (!historyClient) {
      console.warn('Report history client not detected; using direct fetch fallback.');
    }

    try {
      const response = await fetchHistoryFromServer();
      state.serverReports = Array.isArray(response.reports) ? response.reports : [];
      state.retentionDays = typeof response.retentionDays === 'number' ? response.retentionDays : state.retentionDays;
      loadLocalAutomationReports();
      rebuildReportCollection();
    } catch (error) {
      console.error('No se pudo cargar el historial de reportes:', error);
      showAlert(error.message || 'No se pudo cargar el historial de reportes.', 'danger', true);
      state.serverReports = [];
      loadLocalAutomationReports();
      rebuildReportCollection();
    } finally {
      if (showSpinner) {
        setLoading(false);
      }
    }
  }

  async function handleManualUpload(event) {
    event.preventDefault();
    if (!elements.uploadFileInput || !elements.uploadSubmitBtn) {
      return;
    }

    const file = elements.uploadFileInput.files && elements.uploadFileInput.files[0];
    if (!file) {
      showAlert('Selecciona un archivo PDF o Excel antes de guardar.', 'warning');
      elements.uploadFileInput.focus();
      return;
    }

    elements.uploadSubmitBtn.disabled = true;
    elements.uploadSubmitBtn.textContent = 'Guardando...';

    try {
      await uploadFileToServer(file, {
        source: elements.uploadSourceInput ? elements.uploadSourceInput.value : '',
        notes: elements.uploadNotesInput ? elements.uploadNotesInput.value : ''
      });
      if (elements.uploadForm) {
        elements.uploadForm.reset();
      }
      await loadHistory({ showSpinner: false });
      showAlert('Reporte guardado correctamente en el historial.', 'success');
    } catch (error) {
      console.error('No se pudo guardar el reporte:', error);
      showAlert(error.message || 'Ocurrió un error al guardar el reporte.', 'danger', true);
    } finally {
      elements.uploadSubmitBtn.disabled = false;
      elements.uploadSubmitBtn.textContent = 'Guardar en historial';
    }
  }

  async function handleTableActionClick(event) {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;

    // Download
    const dl = target.closest('[data-download-id]');
    if (dl) {
      const reportId = dl.getAttribute('data-download-id');
      downloadReport(reportId);
      return;
    }

    // Delete
    const delBtn = target.closest('[data-delete-id]');
    if (!delBtn) return;
    const reportId = delBtn.getAttribute('data-delete-id');
    const reportName = delBtn.getAttribute('data-delete-name') || '';

    // Double confirmation
    const ok1 = window.confirm(`¿Eliminar "${reportName}"? Esta acción quitará el archivo del historial.`);
    if (!ok1) return;
    const ok2 = window.confirm('Por favor confirma de nuevo. Esta eliminación es permanente. ¿Deseas continuar?');
    if (!ok2) return;

    if (reportId && reportId.startsWith('local-auto:')) {
      state.localAutomationReports = state.localAutomationReports.filter((item) => item.id !== reportId);
      saveLocalAutomationReports();
      rebuildReportCollection();
      showAlert('Reporte automático eliminado correctamente.', 'success');
      return;
    }

    const empresaId = getActiveEmpresaId();
    if (!empresaId) {
      showAlert('No se encontró la empresa activa para realizar la eliminación.', 'warning');
      return;
    }

    try {
      const url = new URL(HISTORY_API_URL, window.location.origin);
      url.searchParams.set('action', 'delete');

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reportId, empresaId })
      });

      const data = await response.json().catch(() => ({ success: false }));
      if (!response.ok || !data.success) {
        showAlert((data && data.message) || 'No se pudo eliminar el reporte.', 'danger', true);
        return;
      }

      showAlert('Reporte eliminado correctamente.', 'success');
      await loadHistory({ showSpinner: false });
    } catch (error) {
      console.error('Error al eliminar reporte:', error);
      showAlert(error.message || 'Ocurrió un error al eliminar el reporte.', 'danger', true);
    }
  }

  function getTimeParts(value) {
    if (typeof value !== 'string') {
      return { hours: 8, minutes: 0 };
    }
    const [rawHours, rawMinutes] = value.split(':');
    const hours = Number.isFinite(Number(rawHours)) ? Math.min(Math.max(parseInt(rawHours, 10), 0), 23) : 8;
    const minutes = Number.isFinite(Number(rawMinutes)) ? Math.min(Math.max(parseInt(rawMinutes, 10), 0), 59) : 0;
    return { hours, minutes };
  }

  function getWeekdayName(index) {
    const names = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return names[index] || 'Día';
  }

  function formatTimeLabel(timeValue) {
    const { hours, minutes } = getTimeParts(timeValue);
    const reference = new Date();
    reference.setHours(hours, minutes, 0, 0);
    try {
      return new Intl.DateTimeFormat('es-MX', { hour: 'numeric', minute: '2-digit' }).format(reference);
    } catch (error) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
  }

  function computeMonthDate(year, month, day, hours, minutes) {
    const lastDay = new Date(year, month + 1, 0).getDate();
    const safeDay = Math.min(Math.max(day, 1), lastDay);
    return new Date(year, month, safeDay, hours, minutes, 0, 0);
  }

  function computeNextRunAt(automation, reference = new Date()) {
    const { hours, minutes } = getTimeParts(automation.time || '08:00');
    const now = new Date(reference.getTime());
    now.setSeconds(0, 0);

    if (automation.frequency === 'weekly') {
      const desiredDay = Number.isFinite(Number(automation.weekday)) ? parseInt(automation.weekday, 10) : 1;
      const base = new Date(now.getTime());
      base.setHours(hours, minutes, 0, 0);
      const currentDay = base.getDay();
      let diff = desiredDay - currentDay;
      if (diff < 0 || (diff === 0 && base <= now)) {
        diff += 7;
      }
      base.setDate(base.getDate() + diff);
      return base.toISOString();
    }

    if (automation.frequency === 'biweekly') {
      const desiredDay = Number.isFinite(Number(automation.monthday)) ? parseInt(automation.monthday, 10) : 1;
      const lastRun = automation.lastRunAt ? new Date(automation.lastRunAt) : null;
      if (lastRun && Number.isFinite(lastRun.getTime())) {
        const candidate = new Date(lastRun.getTime());
        candidate.setHours(hours, minutes, 0, 0);
        while (candidate <= now) {
          candidate.setDate(candidate.getDate() + 14);
        }
        return candidate.toISOString();
      }
      const base = computeMonthDate(now.getFullYear(), now.getMonth(), desiredDay, hours, minutes);
      if (base <= now) {
        const next = new Date(base.getTime() + 14 * 24 * 60 * 60 * 1000);
        return next.toISOString();
      }
      return base.toISOString();
    }

    if (automation.frequency === 'monthly') {
      const desiredDay = Number.isFinite(Number(automation.monthday)) ? parseInt(automation.monthday, 10) : 1;
      const base = computeMonthDate(now.getFullYear(), now.getMonth(), desiredDay, hours, minutes);
      if (base <= now) {
        const next = computeMonthDate(now.getFullYear(), now.getMonth() + 1, desiredDay, hours, minutes);
        return next.toISOString();
      }
      return base.toISOString();
    }

    const base = new Date(now.getTime());
    base.setHours(hours, minutes, 0, 0);
    if (base <= now) {
      base.setDate(base.getDate() + 1);
    }
    return base.toISOString();
  }

  function formatAutomationFrequency(automation) {
    const timeLabel = formatTimeLabel(automation.time || '08:00');
    if (automation.frequency === 'weekly') {
      const dayName = getWeekdayName(Number.isFinite(Number(automation.weekday)) ? parseInt(automation.weekday, 10) : 1);
      return `Semanal · ${dayName} · ${timeLabel}`;
    }
    if (automation.frequency === 'biweekly') {
      const day = Number.isFinite(Number(automation.monthday)) ? parseInt(automation.monthday, 10) : 1;
      return `Quincenal · Día ${day} · ${timeLabel}`;
    }
    if (automation.frequency === 'monthly') {
      const day = Number.isFinite(Number(automation.monthday)) ? parseInt(automation.monthday, 10) : 1;
      return `Mensual · Día ${day} · ${timeLabel}`;
    }
    return `Diario · ${timeLabel}`;
  }

  function formatAutomationNextRun(automation) {
    if (!automation.active) {
      return 'Automatización en pausa';
    }
    if (!automation.nextRunAt) {
      return 'Calculando siguiente ejecución…';
    }
    const date = new Date(automation.nextRunAt);
    if (!Number.isFinite(date.getTime())) {
      return 'Próxima ejecución pendiente de programar';
    }
    try {
      const formatted = new Intl.DateTimeFormat('es-MX', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(date);
      return `Próxima ejecución: ${formatted}`;
    } catch (error) {
      return `Próxima ejecución: ${date.toLocaleString()}`;
    }
  }

  function formatAutomationLastRun(automation) {
    if (!automation.lastRunAt) {
      return 'Aún no se ha ejecutado';
    }
    try {
      const formatted = new Intl.DateTimeFormat('es-MX', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(new Date(automation.lastRunAt));
      return `Última ejecución: ${formatted}`;
    } catch (error) {
      return `Última ejecución: ${new Date(automation.lastRunAt).toLocaleString()}`;
    }
  }

  function renderAutomations() {
    if (!elements.automationList || !elements.automationEmpty) {
      return;
    }

    if (!state.automations.length) {
      elements.automationList.innerHTML = '';
      elements.automationEmpty.classList.remove('d-none');
      return;
    }

    elements.automationEmpty.classList.add('d-none');

    const itemsHtml = state.automations
      .sort((a, b) => {
        const aNext = a.active ? new Date(a.nextRunAt || 0).getTime() : Infinity;
        const bNext = b.active ? new Date(b.nextRunAt || 0).getTime() : Infinity;
        return aNext - bNext;
      })
      .map((automation) => {
        const formatLabel = automation.format === 'excel' ? 'Excel' : 'PDF';
        const moduleLabel = getAutomationModuleLabel(automation.module);
        const moduleText = moduleLabel
          ? `<span class="automatic-item__module">${escapeHtml(moduleLabel)}</span>`
          : '<span class="automatic-item__module text-muted">Sin módulo asignado</span>';
        const moduleHint = getAutomationModuleHint(automation.module);
        const moduleHintHtml = moduleHint ? `<span class="automatic-item__hint">${escapeHtml(moduleHint)}</span>` : '';
        const lastRun = formatAutomationLastRun(automation);
        return `
          <li class="automatic-item" data-automation-id="${escapeHtml(automation.id)}">
            <div class="automatic-item__main">
              <span class="automatic-item__name">${escapeHtml(automation.name)}</span>
              ${moduleText}
              ${moduleHintHtml}
            </div>
            <div class="automatic-item__meta">
              <span class="automatic-item__badge">${formatLabel}</span>
              <span class="automatic-item__frequency">${escapeHtml(formatAutomationFrequency(automation))}</span>
              <span class="automatic-item__next">${escapeHtml(formatAutomationNextRun(automation))}</span>
            </div>
            <div class="automatic-item__footer">
              <div class="automatic-item__controls">
                <label class="automatic-toggle">
                  <input type="checkbox" ${automation.active ? 'checked' : ''} data-automation-toggle="${escapeHtml(
          automation.id
        )}" />
                  <span>${automation.active ? 'Activa' : 'Pausada'}</span>
                </label>
                <span class="automatic-item__status">${escapeHtml(lastRun)}</span>
              </div>
              <div class="automatic-item__actions">
                <button class="automatic-item__action" type="button" data-automation-run="${escapeHtml(
          automation.id
        )}">Generar ahora</button>
                <button class="automatic-item__ghost" type="button" data-automation-edit="${escapeHtml(
          automation.id
        )}">Editar</button>
              </div>
            </div>
          </li>
        `;
      })
      .join('');

    elements.automationList.innerHTML = itemsHtml;
  }

  function resetAutomationForm() {
    if (!elements.automationForm) {
      return;
    }
    elements.automationForm.reset();
    if (elements.automationIdInput) {
      elements.automationIdInput.value = '';
    }
    if (elements.automationModuleInput) {
      elements.automationModuleInput.value = '';
      elements.automationModuleInput.setCustomValidity('');
    }
    if (elements.automationFrequencySelect) {
      elements.automationFrequencySelect.value = 'daily';
    }
    if (elements.automationTimeInput) {
      elements.automationTimeInput.value = '08:00';
    }
    if (elements.automationActiveInput) {
      elements.automationActiveInput.checked = true;
    }
    if (elements.automationNotesInput) {
      elements.automationNotesInput.value = '';
    }
    updateFrequencyFields();
    elements.automationForm.classList.remove('was-validated');
  }

  function updateFrequencyFields() {
    if (!elements.automationFrequencySelect) {
      return;
    }
    const value = elements.automationFrequencySelect.value;
    if (elements.automationWeekdayWrapper) {
      elements.automationWeekdayWrapper.classList.toggle('d-none', value !== 'weekly');
    }
    if (elements.automationMonthdayWrapper) {
      elements.automationMonthdayWrapper.classList.toggle('d-none', value !== 'monthly' && value !== 'biweekly');
    }
  }

  function openAutomationModal(automation = null) {
    if (!elements.automationModal) {
      return;
    }

    if (!state.automationModalInstance) {
      state.automationModalInstance = window.bootstrap
        ? window.bootstrap.Modal.getOrCreateInstance(elements.automationModal)
        : null;
    }

    if (!state.automationModalInstance) {
      return;
    }

    resetAutomationForm();

    if (elements.automationModalTitle) {
      elements.automationModalTitle.textContent = automation ? 'Editar automatización' : 'Nueva automatización';
    }
    if (elements.automationDeleteBtn) {
      elements.automationDeleteBtn.classList.toggle('d-none', !automation);
    }

    if (automation) {
      if (elements.automationIdInput) {
        elements.automationIdInput.value = automation.id;
      }
      if (elements.automationNameInput) {
        elements.automationNameInput.value = automation.name || '';
      }
      if (elements.automationModuleInput) {
        ensureModuleOption(automation.module);
        elements.automationModuleInput.value = automation.module || '';
      }
      if (elements.automationFormatSelect) {
        elements.automationFormatSelect.value = automation.format || 'pdf';
      }
      if (elements.automationFrequencySelect) {
        elements.automationFrequencySelect.value = automation.frequency || 'daily';
      }
      updateFrequencyFields();
      if (elements.automationWeekdaySelect && typeof automation.weekday !== 'undefined') {
        elements.automationWeekdaySelect.value = String(automation.weekday);
      }
      if (elements.automationMonthdayInput && typeof automation.monthday !== 'undefined') {
        elements.automationMonthdayInput.value = String(automation.monthday);
      }
      if (elements.automationTimeInput) {
        elements.automationTimeInput.value = automation.time || '08:00';
      }
      if (elements.automationNotesInput) {
        elements.automationNotesInput.value = automation.notes || '';
      }
      if (elements.automationActiveInput) {
        elements.automationActiveInput.checked = Boolean(automation.active);
      }
    } else {
      updateFrequencyFields();
    }

    state.automationModalInstance.show();
  }

  function upsertAutomation(automationData) {
    // If an id exists, update the matching automation.
    if (automationData.id) {
      const existingIndex = state.automations.findIndex((item) => item.id === automationData.id);
      if (existingIndex >= 0) {
        state.automations[existingIndex] = { ...state.automations[existingIndex], ...automationData, updatedAt: new Date().toISOString() };
        saveAutomationsToStorage();
        renderAutomations();
        return;
      }
    }

    const newKey = buildAutomationKey(automationData);
    const duplicateIndex = state.automations.findIndex((item) => buildAutomationKey(item) === newKey);

    if (duplicateIndex >= 0) {
      // Update existing duplicate instead of adding a new one.
      state.automations[duplicateIndex] = { ...state.automations[duplicateIndex], ...automationData, updatedAt: new Date().toISOString() };
    } else {
      // Insert as new automation
      state.automations.push({ ...automationData, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    state.automations = deduplicateAutomations(state.automations);
    saveAutomationsToStorage();
    renderAutomations();
  }

  function handleAutomationFormSubmit(event) {
    event.preventDefault();
    if (!elements.automationForm) {
      return;
    }

    elements.automationForm.classList.add('was-validated');

    if (!elements.automationForm.checkValidity()) {
      return;
    }

    const id = elements.automationIdInput && elements.automationIdInput.value ? elements.automationIdInput.value : `auto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const name = elements.automationNameInput ? elements.automationNameInput.value.trim() : '';
    const rawModuleValue = elements.automationModuleInput ? elements.automationModuleInput.value.trim() : '';
    const module = normalizeAutomationModuleValue(rawModuleValue);
    const format = elements.automationFormatSelect ? elements.automationFormatSelect.value : 'pdf';
    const frequency = elements.automationFrequencySelect ? elements.automationFrequencySelect.value : 'daily';
    const time = elements.automationTimeInput ? elements.automationTimeInput.value : '08:00';
    const rawWeekday = elements.automationWeekdaySelect ? parseInt(elements.automationWeekdaySelect.value, 10) : 1;
    const weekday = Number.isFinite(rawWeekday) ? Math.min(Math.max(rawWeekday, 0), 6) : 1;
    const rawMonthday = elements.automationMonthdayInput ? parseInt(elements.automationMonthdayInput.value, 10) : 1;
    const monthday = Number.isFinite(rawMonthday) ? Math.min(Math.max(rawMonthday, 1), 31) : 1;
    const notes = elements.automationNotesInput ? elements.automationNotesInput.value.trim() : '';
    const active = elements.automationActiveInput ? elements.automationActiveInput.checked : true;

    if (!name) {
      elements.automationNameInput.focus();
      return;
    }

    if (!module || !isAllowedAutomationModule(module)) {
      if (elements.automationModuleInput) {
        elements.automationModuleInput.setCustomValidity('Selecciona un módulo válido.');
        elements.automationModuleInput.reportValidity();
        elements.automationModuleInput.focus();
      }
      return;
    }

    if (elements.automationModuleInput) {
      elements.automationModuleInput.setCustomValidity('');
      elements.automationModuleInput.value = module;
    }

    const target = state.automations.find((item) => item.id === id);
    const nextRunAt = computeNextRunAt({ frequency, time, weekday, monthday }, new Date());

    const automationPayload = {
      id,
      name,
      module,
      format,
      frequency,
      time,
      weekday,
      monthday,
      notes,
      active,
      nextRunAt,
      lastRunAt: target ? target.lastRunAt : null
    };

    upsertAutomation(automationPayload);

    if (state.automationModalInstance) {
      state.automationModalInstance.hide();
    }

    showAlert(`Automatización "${name}" guardada correctamente.`, 'success');

    if (active) {
      runPendingAutomations().catch((error) => {
        console.error('No se pudieron evaluar las automatizaciones al guardar:', error);
      });
    } else {
      renderAutomations();
    }
  }

  function deleteAutomation(automationId) {
    const index = state.automations.findIndex((item) => item.id === automationId);
    if (index < 0) {
      return;
    }
    state.automations.splice(index, 1);
    saveAutomationsToStorage();
    renderAutomations();
    showAlert('Automatización eliminada correctamente.', 'success');
  }

  function generateAutomationCsv(automation, executedAt) {
    const executedDate = new Date(executedAt);
    let generatedAt;
    try {
      generatedAt = new Intl.DateTimeFormat('es-MX', { dateStyle: 'full', timeStyle: 'short' }).format(executedDate);
    } catch (error) {
      generatedAt = executedDate.toLocaleString();
    }
    const rows = [
      ['Nombre del reporte', automation.name],
    ['Módulo', getAutomationModuleLabel(automation.module) || 'No especificado'],
      ['Generado automáticamente', generatedAt],
      ['Frecuencia', formatAutomationFrequency(automation)],
      ['Notas', automation.notes || '']
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const bytes = encodeText(csv);
    return { bytes, mimeType: 'text/csv', extension: 'csv' };
  }

  function generateAutomationPdf(automation, executedAt) {
    const executedDate = new Date(executedAt);
    let generatedAt;
    try {
      generatedAt = new Intl.DateTimeFormat('es-MX', { dateStyle: 'full', timeStyle: 'short' }).format(executedDate);
    } catch (error) {
      generatedAt = executedDate.toLocaleString();
    }
    const lines = [
      automation.name,
      '',
      `Generado automáticamente el ${generatedAt}`,
      automation.module ? `Módulo origen: ${getAutomationModuleLabel(automation.module)}` : null,
      `Frecuencia: ${formatAutomationFrequency(automation)}`,
      automation.notes ? `Notas: ${automation.notes}` : null
    ].filter(Boolean);

    const sanitizedLines = lines.map((line) =>
      String(line)
        .replace(/\\/g, '\\\\')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)')
    );
    let stream = 'BT /F1 16 Tf 72 760 Td ';
    sanitizedLines.forEach((line, index) => {
      if (index === 0) {
        stream += `(${line}) Tj`;
      } else {
        stream += ` T* (${line}) Tj`;
      }
    });
    stream += ' ET';

    const offsets = [];
    let pdf = '%PDF-1.4\n';

    function addObject(content) {
      offsets.push(pdf.length);
      pdf += content;
    }

    addObject('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
    addObject('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
    addObject('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n');
    addObject(`4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`);
    addObject('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');

    const xrefOffset = pdf.length;
    pdf += 'xref\n0 6\n0000000000 65535 f \n';
    offsets.forEach((offset) => {
      pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
    });
    pdf += 'trailer\n<< /Root 1 0 R /Size 6 >>\nstartxref\n';
    pdf += `${xrefOffset}\n%%EOF`;

    const bytes = encodeText(pdf);
    return { bytes, mimeType: 'application/pdf', extension: 'pdf' };
  }

  function createAutomationFile(automation, executedAt) {
    if (automation.format === 'excel') {
      return generateAutomationCsv(automation, executedAt);
    }
    return generateAutomationPdf(automation, executedAt);
  }

  async function requestAutomationRunFile(automation) {
    const empresaId = getActiveEmpresaId();
    if (!empresaId) {
      throw new Error('No se encontró una empresa activa para generar el reporte.');
    }

    const response = await fetch(AUTOMATION_RUN_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ automationId: automation.id, empresaId })
    });

    const data = await response.json().catch(() => null);
    if (!response.ok || !data || data.success !== true) {
      const message = data && data.message ? data.message : 'No se pudo generar el reporte desde el servidor.';
      const error = new Error(message);
      error.status = response.status;
      error.details = data;
      throw error;
    }

    const bytes = decodeBase64(data.fileContent || '');
    return {
      bytes,
      fileName: data.fileName || '',
      mimeType: data.mimeType || 'application/octet-stream',
      sourceLabel: data.sourceLabel || resolveManualSourceLabel(automation.module),
      notes:
        typeof data.notes === 'string' && data.notes.trim()
          ? data.notes.trim()
          : automation.notes
          ? `Generado manualmente · ${automation.notes}`
          : 'Generado manualmente desde automatización',
      generatedAt: typeof data.generatedAt === 'string' && data.generatedAt ? data.generatedAt : new Date().toISOString(),
      format: data.format || automation.format || 'pdf'
    };
  }

  async function registerAutomationReport(automation, executedAt) {
    const fileNameDate = new Date(executedAt);
    const safeDate = Number.isFinite(fileNameDate.getTime()) ? fileNameDate : new Date();
    const iso = safeDate.toISOString();
    let serverFile = null;

    if (state.activeEmpresaId && state.activeEmpresaId !== 'local') {
      try {
        serverFile = await requestAutomationRunFile(automation);
      } catch (error) {
        console.error('No se pudo generar el reporte manual desde el servidor, se usará el generador local:', error);
      }
    }

    const file = serverFile
      ? {
          bytes: serverFile.bytes,
          mimeType: serverFile.mimeType,
          extension: serverFile.format === 'excel' ? 'csv' : 'pdf',
          originalName: serverFile.fileName
        }
      : createAutomationFile(automation, executedAt);
    const extension = file.extension || (automation.format === 'excel' ? 'csv' : 'pdf');
    const formattedDate = `${safeDate.getFullYear()}-${String(safeDate.getMonth() + 1).padStart(2, '0')}-${String(
      safeDate.getDate()
    ).padStart(2, '0')} ${String(safeDate.getHours()).padStart(2, '0')}-${String(safeDate.getMinutes()).padStart(2, '0')}`;
    const fallbackName = `${automation.name} - ${formattedDate}.${extension}`;
    const originalName = serverFile && serverFile.fileName ? serverFile.fileName : fallbackName;
    const base64Content = encodeBase64(file.bytes instanceof Uint8Array ? file.bytes : new Uint8Array());

    if (state.activeEmpresaId && state.activeEmpresaId !== 'local') {
      const metadata = {
        source: serverFile ? serverFile.sourceLabel : automation.module
          ? `Automatización · ${getAutomationModuleLabel(automation.module)}`
          : 'Automatización',
        notes: (() => {
          if (serverFile) {
            const manualNotes = serverFile.notes || '';
            if (manualNotes.toLowerCase().includes('generado manualmente')) {
              return manualNotes;
            }
            return manualNotes ? `Generado manualmente · ${manualNotes}` : 'Generado manualmente desde automatización';
          }
          if (automation.notes) {
            return `Generado automáticamente · ${automation.notes}`;
          }
          return 'Generado automáticamente por OptiStock';
        })()
      };
      if (automation && automation.id) {
        metadata.automationId = automation.id;
        metadata.automationRunAt = serverFile && serverFile.generatedAt ? serverFile.generatedAt : iso;
      }

      let uploadFileObject = null;
      if (typeof window !== 'undefined' && typeof File === 'function') {
        try {
          const bytes = file.bytes instanceof Uint8Array ? file.bytes : new Uint8Array();
          uploadFileObject = new File([bytes], originalName, { type: file.mimeType });
        } catch (error) {
          uploadFileObject = null;
        }
      }

      if (!uploadFileObject) {
        const bytes = file.bytes instanceof Uint8Array ? file.bytes : new Uint8Array();
        uploadFileObject = new Blob([bytes], { type: file.mimeType });
        try {
          Object.defineProperty(uploadFileObject, 'name', { value: originalName });
        } catch (error) {
          uploadFileObject.name = originalName;
        }
      }

      try {
        const uploadResponse = await uploadFileToServer(uploadFileObject, metadata);
        const automationUpdate = uploadResponse && uploadResponse.automation ? uploadResponse.automation : null;
        if (uploadResponse && uploadResponse.report) {
          state.serverReports.unshift(uploadResponse.report);
        } else {
          await loadHistory({ showSpinner: false });
        }
        rebuildReportCollection();
        const fallbackNextRun = computeNextRunAt(automation, new Date(safeDate.getTime() + 60 * 1000));
        return {
          lastRunAt: (automationUpdate && automationUpdate.lastRunAt) || iso,
          nextRunAt: (automationUpdate && automationUpdate.nextRunAt) || fallbackNextRun,
          active: automationUpdate && typeof automationUpdate.active === 'boolean' ? automationUpdate.active : automation.active
        };
      } catch (error) {
        console.error('No se pudo guardar el reporte automático en el servidor:', error);
        throw error;
      }
    }

    const reportRecord = {
      id: `local-auto:${automation.id}:${safeDate.getTime()}`,
      automationId: automation.id,
      originalName,
      mimeType: file.mimeType,
      source: resolveManualSourceLabel(automation.module),
      notes: automation.notes
        ? `Generado manualmente · ${automation.notes}`
        : 'Generado manualmente desde automatización',
      createdAt: iso,
      expiresAt: null,
      size: file.bytes.length,
      fileContent: base64Content,
      fileExtension: extension
    };

    state.localAutomationReports.push(reportRecord);
    if (state.localAutomationReports.length > LOCAL_AUTOMATION_HISTORY_LIMIT) {
      state.localAutomationReports.splice(0, state.localAutomationReports.length - LOCAL_AUTOMATION_HISTORY_LIMIT);
    }
    saveLocalAutomationReports();
    rebuildReportCollection();
    return {
      lastRunAt: iso,
      nextRunAt: computeNextRunAt(automation, new Date(safeDate.getTime() + 60 * 1000)),
      active: automation.active
    };
  }

  async function runPendingAutomations() {
    if (state.automationRunInProgress) {
      state.automationRunQueued = true;
      return;
    }

    state.automationRunInProgress = true;
    state.automationRunQueued = false;

    if (!state.automations.length) {
      state.automationRunInProgress = false;
      return;
    }

    const now = new Date();
    let changed = false;

    try {
      for (const automation of state.automations) {
        if (!automation.nextRunAt) {
          automation.nextRunAt = computeNextRunAt(automation, now);
          changed = true;
        }

        if (!automation.active) {
          continue;
        }

        if (!automation.nextRunAt) {
          continue;
        }

        const nextRun = new Date(automation.nextRunAt);
        if (!Number.isFinite(nextRun.getTime())) {
          automation.nextRunAt = computeNextRunAt(automation, now);
          changed = true;
          continue;
        }

        if (nextRun > now) {
          continue;
        }

        try {
          const automationUpdate = await registerAutomationReport(automation, nextRun);
          if (automationUpdate) {
            automation.lastRunAt = automationUpdate.lastRunAt || nextRun.toISOString();
            automation.nextRunAt = automationUpdate.nextRunAt || null;
            if (typeof automationUpdate.active === 'boolean') {
              automation.active = automationUpdate.active;
            }
          }
          const runTimestampForNotification = automationUpdate && automationUpdate.lastRunAt
            ? new Date(automationUpdate.lastRunAt)
            : nextRun;
          notifyScheduledReportGenerated(automation, runTimestampForNotification).catch((error) => {
            console.error('No se pudo registrar la notificación del reporte programado:', error);
          });
          showAlert(`Se generó el reporte automático "${automation.name}".`, 'success');
        } catch (error) {
          console.error('No se pudo generar el reporte automático programado:', error);
          const serverDetails = error && error.details ? error.details : null;
          if (serverDetails && serverDetails.automation) {
            automation.lastRunAt = serverDetails.automation.lastRunAt || automation.lastRunAt || null;
            automation.nextRunAt = serverDetails.automation.nextRunAt || automation.nextRunAt || null;
            if (typeof serverDetails.automation.active === 'boolean') {
              automation.active = serverDetails.automation.active;
            }
            changed = true;
          } else {
            automation.nextRunAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
            changed = true;
          }

          if (serverDetails && serverDetails.code === 'inactive') {
            showAlert('La automatización está desactivada y no se generará el reporte.', 'warning', true);
          } else if (serverDetails && serverDetails.code === 'duplicate') {
            showAlert('Ese reporte automático ya se había generado. Se omitió la ejecución duplicada.', 'info', true);
          } else if (serverDetails && serverDetails.code === 'not_due') {
            showAlert('Se ignoró la ejecución porque aún no es la hora programada.', 'info', true);
          } else {
            showAlert('No se pudo generar un reporte automático. Se reintentará más tarde.', 'danger', true);
          }
          continue;
        }

        changed = true;
      }

      if (changed) {
        state.automations = deduplicateAutomations(state.automations);
        saveAutomationsToStorage();
        renderAutomations();
      }
    } finally {
      state.automationRunInProgress = false;
      if (state.automationRunQueued) {
        state.automationRunQueued = false;
        runPendingAutomations().catch((error) => {
          console.error('No se pudieron ejecutar las automatizaciones pendientes en cola:', error);
        });
      }
    }
  }

  async function handleAutomationListClick(event) {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) {
      return;
    }

    const runBtn = target.closest('[data-automation-run]');
    if (runBtn) {
      const automationId = runBtn.getAttribute('data-automation-run');
      const automation = state.automations.find((item) => item.id === automationId);
      if (!automation) {
        return;
      }
      const executedAt = new Date();
      try {
        const automationUpdate = await registerAutomationReport(automation, executedAt);
        if (automationUpdate) {
          automation.lastRunAt = automationUpdate.lastRunAt || executedAt.toISOString();
          automation.nextRunAt = automationUpdate.nextRunAt || null;
          if (typeof automationUpdate.active === 'boolean') {
            automation.active = automationUpdate.active;
          }
        }
        saveAutomationsToStorage();
        renderAutomations();
        showAlert(`Se generó el reporte automático "${automation.name}".`, 'success');
      } catch (error) {
        console.error('No se pudo generar el reporte automático desde la lista:', error);
        const serverDetails = error && error.details ? error.details : null;
        if (serverDetails && serverDetails.automation) {
          automation.lastRunAt = serverDetails.automation.lastRunAt || automation.lastRunAt || null;
          automation.nextRunAt = serverDetails.automation.nextRunAt || automation.nextRunAt || null;
          if (typeof serverDetails.automation.active === 'boolean') {
            automation.active = serverDetails.automation.active;
          }
        } else {
          automation.nextRunAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        }
        saveAutomationsToStorage();
        renderAutomations();

        if (serverDetails && serverDetails.code === 'inactive') {
          showAlert('No se generó el reporte porque la automatización está desactivada.', 'warning', true);
        } else if (serverDetails && serverDetails.code === 'duplicate') {
          showAlert('Ya existe un reporte generado para este horario.', 'info', true);
        } else if (serverDetails && serverDetails.code === 'not_due') {
          showAlert('Aún no es momento de ejecutar esta automatización.', 'info', true);
        } else {
          showAlert((error && error.message) || 'No se pudo generar el reporte automático.', 'danger', true);
        }
      }
      return;
    }

    const editBtn = target.closest('[data-automation-edit]');
    if (editBtn) {
      const automationId = editBtn.getAttribute('data-automation-edit');
      const automation = state.automations.find((item) => item.id === automationId);
      if (automation) {
        openAutomationModal(automation);
      }
      return;
    }

  }

  function startAutomationScheduler() {
    if (state.automationTimerId) {
      window.clearInterval(state.automationTimerId);
    }
    runPendingAutomations().catch((error) => {
      console.error('No se pudieron ejecutar las automatizaciones programadas:', error);
    });
    state.automationTimerId = window.setInterval(() => {
      runPendingAutomations().catch((error) => {
        console.error('No se pudieron ejecutar las automatizaciones programadas:', error);
      });
    }, 60 * 1000);
  }

  function handleAutomationToggleChange(event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || !target.matches('[data-automation-toggle]')) {
      return;
    }

    const automationId = target.getAttribute('data-automation-toggle');
    const automation = state.automations.find((item) => item.id === automationId);
    if (!automation) {
      return;
    }

    automation.active = target.checked;
    if (automation.active && !automation.nextRunAt) {
      automation.nextRunAt = computeNextRunAt(automation, new Date());
    } else if (!automation.active) {
      automation.nextRunAt = null;
    }
    saveAutomationsToStorage();
    renderAutomations();
    if (automation.active) {
      runPendingAutomations().catch((error) => {
        console.error('No se pudieron evaluar las automatizaciones al activar:', error);
      });
    }
  }

  function initializeAutomations() {
    state.automations = deduplicateAutomations(
      loadAutomationsFromStorage().map((item) => normalizeAutomation(item))
    );

    const now = new Date();
    let needsSave = false;
    state.automations.forEach((automation) => {
      if (automation.active && !automation.nextRunAt) {
        automation.nextRunAt = computeNextRunAt(automation, now);
        needsSave = true;
      }
    });

    if (needsSave) {
      saveAutomationsToStorage({ skipServerSync: true });
    }

    renderAutomations();
    loadLocalAutomationReports();
    rebuildReportCollection();
    startAutomationScheduler();

    if (state.activeEmpresaId && state.activeEmpresaId !== 'local') {
      refreshAutomationsFromServer();
    }
  }

  function bootstrap() {
    const empresaId = getActiveEmpresaId();
    state.activeEmpresaId = empresaId || 'local';
    state.manualReportsStatus = {};
    state.manualReports = MANUAL_REPORTS.map((item) => ({ ...item }));
    renderManualReports();

    if (elements.automationModuleInput) {
      populateAutomationModuleSelect();
      elements.automationModuleInput.addEventListener('change', () => {
        elements.automationModuleInput.setCustomValidity('');
      });
    }

    if (elements.searchInput) {
      elements.searchInput.addEventListener('input', () => applyFilters({ resetPage: true }));
    }
    if (elements.typeFilter) {
      elements.typeFilter.addEventListener('change', () => applyFilters({ resetPage: true }));
    }
    if (elements.sourceFilter) {
      elements.sourceFilter.addEventListener('change', () => applyFilters({ resetPage: true }));
    }
    if (elements.historyPaginationPrev) {
      elements.historyPaginationPrev.addEventListener('click', () => {
        if (state.historyPage > 1) {
          state.historyPage -= 1;
          renderHistory(state.filteredReports);
        }
      });
    }
    if (elements.historyPaginationNext) {
      elements.historyPaginationNext.addEventListener('click', () => {
        const filteredCount = state.filteredReports.length;
        const totalPages = Math.max(1, Math.ceil(filteredCount / HISTORY_PAGE_SIZE));
        if (state.historyPage < totalPages) {
          state.historyPage += 1;
          renderHistory(state.filteredReports);
        }
      });
    }
    if (elements.refreshButton) {
      elements.refreshButton.addEventListener('click', () => loadHistory());
    }
    if (elements.manualGeneratorGrid) {
      elements.manualGeneratorGrid.addEventListener('click', handleManualGeneratorClick);
    }
    if (elements.uploadForm) {
      elements.uploadForm.addEventListener('submit', handleManualUpload);
    }
    if (elements.historyTableBody) {
      elements.historyTableBody.addEventListener('click', handleTableActionClick);
    }
    if (elements.automationConfigBtn) {
      elements.automationConfigBtn.addEventListener('click', () => openAutomationModal());
    }
    if (elements.automationFrequencySelect) {
      elements.automationFrequencySelect.addEventListener('change', updateFrequencyFields);
    }
    if (elements.automationForm) {
      elements.automationForm.addEventListener('submit', handleAutomationFormSubmit);
    }
    if (elements.automationDeleteBtn) {
      elements.automationDeleteBtn.addEventListener('click', () => {
        const automationId = elements.automationIdInput ? elements.automationIdInput.value : '';
        if (!automationId) {
          return;
        }
        const automation = state.automations.find((item) => item.id === automationId);
        const confirmation = automation
          ? window.confirm(`¿Eliminar la automatización "${automation.name}"? Esta acción no se puede deshacer.`)
          : false;
        if (!confirmation) {
          return;
        }
        deleteAutomation(automationId);
        if (state.automationModalInstance) {
          state.automationModalInstance.hide();
        }
      });
    }
    if (elements.automationModal) {
      elements.automationModal.addEventListener('hidden.bs.modal', () => {
        resetAutomationForm();
      });
    }
    if (elements.automationList) {
      elements.automationList.addEventListener('click', handleAutomationListClick);
      elements.automationList.addEventListener('change', handleAutomationToggleChange);
    }

    updateFrequencyFields();
    initializeAutomations();

    if (empresaId) {
      loadHistory();
    } else {
      setLoading(false);
      showAlert('Los reportes automáticos se guardan en este navegador hasta que vincules una empresa.', 'info', true);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
  } else {
    bootstrap();
  }
})();
