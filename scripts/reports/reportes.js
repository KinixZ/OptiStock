(function () {
  const HISTORY_API_URL = '../../scripts/php/report_history.php';
  const AUTOMATION_API_URL = '../../scripts/php/report_automations.php';
  const RETENTION_DAYS_FALLBACK = 60;

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
    searchInput: document.getElementById('historySearch'),
    typeFilter: document.getElementById('historyTypeFilter'),
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
    automationDeleteBtn: document.getElementById('automationDeleteBtn')
  };

  const state = {
    reports: [],
    serverReports: [],
    localAutomationReports: [],
    filteredReports: [],
    retentionDays: RETENTION_DAYS_FALLBACK,
    loading: false,
    alertTimerId: null,
    activeEmpresaId: null,
    automations: [],
    automationTimerId: null,
    automationModalInstance: null,
    automationSyncTimerId: null,
    automationsLoadedFromServer: false
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
  const MAX_AUTOMATION_CATCHUP = 4;
  const LOCAL_AUTOMATION_HISTORY_LIMIT = 30;

  function ensureModuleOption(value) {
    if (!value || !elements.automationModuleInput || elements.automationModuleInput.tagName !== 'SELECT') {
      return;
    }

    const options = Array.from(elements.automationModuleInput.options || []);
    const hasOption = options.some((option) => option.value === value);

    if (!hasOption) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
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

    const response = await fetch(HISTORY_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({ success: false }));
    if (!response.ok || !data.success) {
      const message = (data && data.message) || 'No se pudo guardar el reporte en el historial.';
      throw new Error(message);
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
      const payload = JSON.stringify(state.automations);
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

    if (Array.isArray(data.automations)) {
      state.automations = data.automations.map((item) => normalizeAutomation(item));
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
      state.automations = automations.map((item) => normalizeAutomation(item));
      cacheAutomationsLocally();
      state.automationsLoadedFromServer = true;
      renderAutomations();
      runPendingAutomations({ catchUp: true }).catch((error) => {
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
    const module = String(rawModule || '').trim();
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
    applyFilters();
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

  function renderHistory(list) {
    if (!elements.historyTableBody || !elements.historyTableWrapper) {
      return;
    }

    const totalReports = state.reports.length;
    const filteredCount = list.length;
    const hasFilters = Boolean((elements.searchInput && elements.searchInput.value.trim()) || (elements.typeFilter && elements.typeFilter.value !== 'all'));

    if (filteredCount === 0) {
      elements.historyTableBody.innerHTML = '';
      elements.historyTableWrapper.classList.add('d-none');
      if (elements.historyEmpty) {
        elements.historyEmpty.classList.remove('d-none');
        if (totalReports === 0) {
          elements.historyEmpty.innerHTML = '<p class="mb-1 fw-semibold">Aún no hay reportes guardados.</p><p class="mb-0">Cuando generes un PDF o Excel desde cualquier módulo aparecerá automáticamente aquí.</p>';
        } else if (hasFilters) {
          elements.historyEmpty.innerHTML = '<p class="mb-1 fw-semibold">No encontramos coincidencias.</p><p class="mb-0">Ajusta tu búsqueda o el tipo de archivo para ver otros resultados.</p>';
        } else {
          elements.historyEmpty.innerHTML = '<p class="mb-1 fw-semibold">No hay reportes disponibles.</p><p class="mb-0">Vuelve a intentarlo más tarde.</p>';
        }
      }
    } else {
      const rowsHtml = list
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
    }

    if (elements.historyCaption) {
      if (filteredCount === 0) {
        elements.historyCaption.textContent = totalReports === 0
          ? 'Aún no hay reportes guardados.'
          : hasFilters
            ? 'No se encontraron reportes con los filtros seleccionados.'
            : 'No hay reportes disponibles por el momento.';
      } else {
        elements.historyCaption.textContent = `${filteredCount} ${filteredCount === 1 ? 'reporte disponible' : 'reportes disponibles'}`;
      }
    }
  }

  function applyFilters() {
    const searchTerm = elements.searchInput ? elements.searchInput.value.trim().toLowerCase() : '';
    const typeFilter = elements.typeFilter ? elements.typeFilter.value : 'all';

    state.filteredReports = state.reports.filter((report) => {
      const normalizedName = `${report.originalName || ''} ${report.source || ''} ${report.notes || ''}`.toLowerCase();
      const matchesSearch = !searchTerm || normalizedName.includes(searchTerm);

      if (!matchesSearch) {
        return false;
      }

      if (typeFilter === 'all') {
        return true;
      }

      const normalizedMime = (report.mimeType || '').toLowerCase();
      if (typeFilter === 'application/pdf') {
        return normalizedMime.includes('pdf');
      }

      if (typeFilter === 'excel') {
        return normalizedMime.includes('sheet') || normalizedMime.includes('excel') || normalizedMime.includes('csv');
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
        const moduleText = automation.module
          ? `<span class="automatic-item__module">${escapeHtml(automation.module)}</span>`
          : '<span class="automatic-item__module text-muted">Sin módulo asignado</span>';
        const lastRun = formatAutomationLastRun(automation);
        return `
          <li class="automatic-item" data-automation-id="${escapeHtml(automation.id)}">
            <div class="automatic-item__main">
              <span class="automatic-item__name">${escapeHtml(automation.name)}</span>
              ${moduleText}
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
    const normalized = normalizeAutomation(automationData);
    const existingIndex = state.automations.findIndex((item) => item.id === normalized.id);
    if (existingIndex >= 0) {
      const current = state.automations[existingIndex];
      normalized.createdAt = current.createdAt || normalized.createdAt || new Date().toISOString();
      normalized.updatedAt = new Date().toISOString();
      state.automations[existingIndex] = { ...current, ...normalized };
    } else {
      const nowIso = new Date().toISOString();
      normalized.createdAt = normalized.createdAt || nowIso;
      normalized.updatedAt = normalized.updatedAt || nowIso;
      state.automations.push(normalized);
    }
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
    const module = elements.automationModuleInput ? elements.automationModuleInput.value.trim() : '';
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
      runPendingAutomations({ catchUp: true }).catch((error) => {
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
      ['Módulo', automation.module || 'No especificado'],
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
      automation.module ? `Módulo origen: ${automation.module}` : null,
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

  async function registerAutomationReport(automation, executedAt) {
    const file = createAutomationFile(automation, executedAt);
    const fileNameDate = new Date(executedAt);
    const safeDate = Number.isFinite(fileNameDate.getTime()) ? fileNameDate : new Date();
    const iso = safeDate.toISOString();
    const formattedDate = `${safeDate.getFullYear()}-${String(safeDate.getMonth() + 1).padStart(2, '0')}-${String(
      safeDate.getDate()
    ).padStart(2, '0')} ${String(safeDate.getHours()).padStart(2, '0')}-${String(safeDate.getMinutes()).padStart(2, '0')}`;
    const extension = file.extension || (automation.format === 'excel' ? 'csv' : 'pdf');
    const originalName = `${automation.name} - ${formattedDate}.${extension}`;
    const base64Content = encodeBase64(file.bytes);

    if (state.activeEmpresaId && state.activeEmpresaId !== 'local') {
      const metadata = {
        source: automation.module ? `Automatización · ${automation.module}` : 'Automatización',
        notes: automation.notes
          ? `Generado automáticamente · ${automation.notes}`
          : 'Generado automáticamente por OptiStock'
      };

      let uploadFileObject = null;
      if (typeof window !== 'undefined' && typeof File === 'function') {
        try {
          uploadFileObject = new File([file.bytes], originalName, { type: file.mimeType });
        } catch (error) {
          uploadFileObject = null;
        }
      }

      if (!uploadFileObject) {
        uploadFileObject = new Blob([file.bytes], { type: file.mimeType });
        try {
          Object.defineProperty(uploadFileObject, 'name', { value: originalName });
        } catch (error) {
          uploadFileObject.name = originalName;
        }
      }

      try {
        const uploadResponse = await uploadFileToServer(uploadFileObject, metadata);
        if (uploadResponse && uploadResponse.report) {
          state.serverReports.unshift(uploadResponse.report);
        } else {
          await loadHistory({ showSpinner: false });
        }
        rebuildReportCollection();
        return;
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
      source: automation.module ? `Automatización · ${automation.module}` : 'Automatización',
      notes: automation.notes ? `Notas: ${automation.notes}` : 'Generado automáticamente',
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
  }

  async function runPendingAutomations({ catchUp = false } = {}) {
    if (!state.automations.length) {
      return;
    }

    const now = new Date();
    let changed = false;

    for (const automation of state.automations) {
      if (!automation.nextRunAt) {
        automation.nextRunAt = computeNextRunAt(automation, now);
        changed = true;
      }

      if (!automation.active) {
        continue;
      }

      let iterations = 0;
      while (automation.nextRunAt) {
        const nextRun = new Date(automation.nextRunAt);
        if (!Number.isFinite(nextRun.getTime())) {
          automation.nextRunAt = computeNextRunAt(automation, now);
          changed = true;
          break;
        }

        if (nextRun > now && !catchUp) {
          break;
        }

        try {
          await registerAutomationReport(automation, nextRun);
          if (!catchUp) {
            showAlert(`Se generó el reporte automático "${automation.name}".`, 'success');
          }
          automation.lastRunAt = nextRun.toISOString();
        } catch (error) {
          const message = error && error.message ? error.message : 'No se pudo generar el reporte automático.';
          showAlert(message, 'danger', true);
          automation.nextRunAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
          changed = true;
          break;
        }

        automation.nextRunAt = computeNextRunAt(automation, new Date(nextRun.getTime() + 60 * 1000));
        changed = true;
        iterations += 1;
        if (!catchUp || iterations >= MAX_AUTOMATION_CATCHUP) {
          break;
        }
      }
    }

    if (changed) {
      saveAutomationsToStorage();
      renderAutomations();
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
        await registerAutomationReport(automation, executedAt);
        automation.lastRunAt = executedAt.toISOString();
        automation.nextRunAt = computeNextRunAt(automation, new Date(executedAt.getTime() + 60 * 1000));
        saveAutomationsToStorage();
        renderAutomations();
        showAlert(`Se generó el reporte automático "${automation.name}".`, 'success');
      } catch (error) {
        console.error('No se pudo generar el reporte automático desde la lista:', error);
        automation.nextRunAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        saveAutomationsToStorage();
        showAlert((error && error.message) || 'No se pudo generar el reporte automático.', 'danger', true);
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
    runPendingAutomations({ catchUp: true }).catch((error) => {
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
    }
    saveAutomationsToStorage();
    renderAutomations();
    if (automation.active) {
      runPendingAutomations({ catchUp: true }).catch((error) => {
        console.error('No se pudieron evaluar las automatizaciones al activar:', error);
      });
    }
  }

  function initializeAutomations() {
    state.automations = loadAutomationsFromStorage().map((item) => normalizeAutomation(item));

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

    if (elements.searchInput) {
      elements.searchInput.addEventListener('input', () => applyFilters());
    }
    if (elements.typeFilter) {
      elements.typeFilter.addEventListener('change', () => applyFilters());
    }
    if (elements.refreshButton) {
      elements.refreshButton.addEventListener('click', () => loadHistory());
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
