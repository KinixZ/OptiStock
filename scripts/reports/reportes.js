(function () {
  const HISTORY_API_URL = '../../scripts/php/report_history.php';
  const AUTOMATIONS_API_URL = '../../scripts/php/report_automations.php';
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
    filteredReports: [],
    retentionDays: RETENTION_DAYS_FALLBACK,
    loading: false,
    alertTimerId: null,
    activeEmpresaId: null,
    automations: [],
    automationTimerId: null,
    automationModalInstance: null
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
  const AUTOMATION_POLL_INTERVAL_MS = 60 * 1000;

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
  }

  async function requestAutomationApi({ action = '', method = 'GET', params = {}, payload = null } = {}) {
    const url = new URL(AUTOMATIONS_API_URL, window.location.href);
    if (action) {
      url.searchParams.set('action', action);
    }
    Object.keys(params || {}).forEach((key) => {
      const value = params[key];
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });

    const options = { method, headers: {} };
    if (payload !== null && payload !== undefined) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(payload);
    }

    const response = await fetch(url.toString(), options);
    const data = await response.json().catch(() => ({ success: false }));

    if (!response.ok || !data.success) {
      const message = (data && data.message) || 'No se pudo comunicar con el servicio de automatizaciones.';
      throw new Error(message);
    }

    return data;
  }

  function downloadReport(reportId) {
    if (!reportId) {
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

  function rebuildReportCollection() {
    const combined = [...state.serverReports];
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

  function normalizeAutomation(raw = {}) {
    if (!raw || typeof raw !== 'object') {
      return null;
    }

    const frequencyKey = String(raw.frequency ?? raw.frecuencia ?? '').toLowerCase();
    const frequencyMap = {
      daily: 'daily',
      diario: 'daily',
      weekly: 'weekly',
      semanal: 'weekly',
      biweekly: 'biweekly',
      quincenal: 'biweekly',
      fortnightly: 'biweekly',
      monthly: 'monthly',
      mensual: 'monthly'
    };
    const frequency = frequencyMap[frequencyKey] || 'daily';

    const format = raw.format === 'excel' || raw.formato === 'excel' ? 'excel' : 'pdf';
    const weekdayValue = raw.weekday ?? raw.dia_semana;
    const monthdayValue = raw.monthday ?? raw.dia_mes;
    const weekday = Number.isFinite(Number(weekdayValue)) ? Math.min(Math.max(parseInt(weekdayValue, 10), 0), 6) : 1;
    const monthday = Number.isFinite(Number(monthdayValue)) ? Math.min(Math.max(parseInt(monthdayValue, 10), 1), 31) : 1;
    const activeValue = raw.active ?? raw.activo;
    const idValue = raw.id ?? raw.uuid ?? raw.identificador;
    const normalized = {
      id: idValue ? String(idValue) : `auto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: raw.name || raw.nombre || 'Reporte automatizado',
      module: raw.module || raw.modulo || '',
      format,
      frequency,
      time: raw.time || raw.hora || '08:00',
      weekday,
      monthday,
      notes: raw.notes || raw.notas || '',
      active: !(activeValue === false || activeValue === '0' || activeValue === 0 || activeValue === 'false'),
      nextRunAt: raw.nextRunAt || raw.proxima_ejecucion || null,
      lastRunAt: raw.lastRunAt || raw.ultima_ejecucion || null,
      createdAt: raw.createdAt || raw.creado_en || null,
      updatedAt: raw.updatedAt || raw.actualizado_en || null
    };

    if (normalized.module) {
      ensureModuleOption(normalized.module);
    }

    return normalized;
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

  function formatAutomationFrequency(automation) {
    const timeLabel = formatTimeLabel(automation.time || '08:00');
    if (automation.frequency === 'weekly') {
      const dayName = getWeekdayName(Number.isFinite(Number(automation.weekday)) ? parseInt(automation.weekday, 10) : 1);
      return `Semanal · ${dayName} · ${timeLabel}`;
    }
    if (automation.frequency === 'biweekly') {
      const dayName = getWeekdayName(Number.isFinite(Number(automation.weekday)) ? parseInt(automation.weekday, 10) : 1);
      return `Quincenal · ${dayName} · ${timeLabel}`;
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
      elements.automationWeekdayWrapper.classList.toggle('d-none', value !== 'weekly' && value !== 'biweekly');
    }
    if (elements.automationMonthdayWrapper) {
      elements.automationMonthdayWrapper.classList.toggle('d-none', value !== 'monthly');
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

  async function handleAutomationFormSubmit(event) {
    event.preventDefault();
    if (!elements.automationForm) {
      return;
    }

    elements.automationForm.classList.add('was-validated');

    if (!elements.automationForm.checkValidity()) {
      return;
    }

    if (!state.activeEmpresaId) {
      showAlert('Vincula una empresa antes de crear automatizaciones.', 'warning', true);
      return;
    }

    const id = elements.automationIdInput && elements.automationIdInput.value ? elements.automationIdInput.value : null;
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
      if (elements.automationNameInput) {
        elements.automationNameInput.focus();
      }
      return;
    }

    const payload = {
      id,
      empresaId: state.activeEmpresaId,
      name,
      module,
      format,
      frequency,
      time,
      weekday,
      monthday,
      notes,
      active
    };

    let previousLabel = '';
    if (elements.automationSubmitBtn) {
      previousLabel = elements.automationSubmitBtn.textContent;
      elements.automationSubmitBtn.disabled = true;
      elements.automationSubmitBtn.textContent = 'Guardando...';
    }

    try {
      const response = await requestAutomationApi({ action: 'save', method: 'POST', payload });
      if (response.automation) {
        upsertAutomation(response.automation);
      }

      if (state.automationModalInstance) {
        state.automationModalInstance.hide();
      }

      showAlert(`Automatización "${name}" guardada correctamente.`, 'success');

      if (Array.isArray(response.generatedReports) && response.generatedReports.length) {
        await loadHistory({ showSpinner: false });
      }
    } catch (error) {
      console.error('No se pudo guardar la automatización:', error);
      showAlert(error.message || 'No se pudo guardar la automatización.', 'danger', true);
    } finally {
      if (elements.automationSubmitBtn) {
        elements.automationSubmitBtn.disabled = false;
        elements.automationSubmitBtn.textContent = previousLabel || 'Guardar automatización';
      }
    }
  }

  function upsertAutomation(automationData) {
    const normalized = normalizeAutomation(automationData);
    if (!normalized) {
      return;
    }

    const existingIndex = state.automations.findIndex((item) => item.id === normalized.id);
    if (existingIndex >= 0) {
      state.automations[existingIndex] = { ...state.automations[existingIndex], ...normalized };
    } else {
      state.automations.push(normalized);
    }

    renderAutomations();
  }

  async function deleteAutomation(automationId) {
    if (!automationId || !state.activeEmpresaId) {
      return;
    }

    try {
      await requestAutomationApi({
        action: 'delete',
        method: 'POST',
        payload: { id: automationId, empresaId: state.activeEmpresaId }
      });
      state.automations = state.automations.filter((item) => item.id !== automationId);
      renderAutomations();
      showAlert('Automatización eliminada correctamente.', 'success');
    } catch (error) {
      console.error('No se pudo eliminar la automatización:', error);
      showAlert(error.message || 'Ocurrió un error al eliminar la automatización.', 'danger', true);
    }
  }

  async function runAutomationNow(automationId) {
    if (!automationId || !state.activeEmpresaId) {
      return;
    }

    try {
      const response = await requestAutomationApi({
        action: 'run',
        method: 'POST',
        payload: { id: automationId, empresaId: state.activeEmpresaId }
      });

      if (response.automation) {
        upsertAutomation(response.automation);
      }

      if (Array.isArray(response.generatedReports) && response.generatedReports.length) {
        await loadHistory({ showSpinner: false });
      }

      const automation = state.automations.find((item) => item.id === automationId);
      const automationName = automation ? automation.name : 'Reporte automático';
      showAlert(`Se generó el reporte automático "${automationName}".`, 'success');
    } catch (error) {
      console.error('No se pudo ejecutar la automatización:', error);
      showAlert(error.message || 'No se pudo generar el reporte automático.', 'danger', true);
    }
  }

  async function runDueAutomations({ silent = false } = {}) {
    if (!state.activeEmpresaId) {
      return;
    }

    try {
      const response = await requestAutomationApi({
        action: 'run_due',
        method: 'POST',
        payload: { empresaId: state.activeEmpresaId }
      });

      if (Array.isArray(response.automations)) {
        state.automations = response.automations.map((item) => normalizeAutomation(item)).filter(Boolean);
        renderAutomations();
      }

      if (Array.isArray(response.generatedReports) && response.generatedReports.length) {
        if (!silent) {
          showAlert('Se generaron reportes programados automáticamente.', 'success');
        }
        await loadHistory({ showSpinner: false });
      }
    } catch (error) {
      console.error('No se pudieron ejecutar las automatizaciones programadas:', error);
      if (!silent) {
        showAlert(error.message || 'No se pudieron ejecutar las automatizaciones programadas.', 'danger', true);
      }
    }
  }

  function handleAutomationListClick(event) {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) {
      return;
    }

    const runBtn = target.closest('[data-automation-run]');
    if (runBtn) {
      const automationId = runBtn.getAttribute('data-automation-run');
      if (!automationId) {
        return;
      }
      if (runBtn instanceof HTMLButtonElement) {
        runBtn.disabled = true;
      }
      runAutomationNow(automationId).finally(() => {
        if (runBtn instanceof HTMLButtonElement) {
          runBtn.disabled = false;
        }
      });
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
      state.automationTimerId = null;
    }

    if (!state.activeEmpresaId) {
      return;
    }

    runDueAutomations({ silent: true });
    state.automationTimerId = window.setInterval(() => {
      runDueAutomations({ silent: true });
    }, AUTOMATION_POLL_INTERVAL_MS);
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

    const desiredState = target.checked;
    target.disabled = true;

    requestAutomationApi({
      action: 'toggle',
      method: 'POST',
      payload: { id: automationId, empresaId: state.activeEmpresaId, active: desiredState }
    })
      .then((response) => {
        if (response.automation) {
          upsertAutomation(response.automation);
        }
        if (Array.isArray(response.generatedReports) && response.generatedReports.length) {
          loadHistory({ showSpinner: false });
        }
      })
      .catch((error) => {
        console.error('No se pudo actualizar el estado de la automatización:', error);
        target.checked = !desiredState;
        showAlert(error.message || 'No se pudo actualizar la automatización.', 'danger', true);
      })
      .finally(() => {
        target.disabled = false;
      });
  }

  async function initializeAutomations() {
    state.automations = [];

    if (!state.activeEmpresaId) {
      renderAutomations();
      startAutomationScheduler();
      return;
    }

    try {
      const response = await requestAutomationApi({
        action: 'list',
        method: 'GET',
        params: { empresa: state.activeEmpresaId }
      });
      state.automations = Array.isArray(response.automations)
        ? response.automations.map((item) => normalizeAutomation(item)).filter(Boolean)
        : [];
      renderAutomations();
    } catch (error) {
      console.error('No se pudieron cargar las automatizaciones:', error);
      renderAutomations();
      showAlert(error.message || 'No se pudieron cargar las automatizaciones.', 'danger', true);
    } finally {
      startAutomationScheduler();
    }
  }

  function bootstrap() {
    const empresaId = getActiveEmpresaId();
    state.activeEmpresaId = empresaId ? String(empresaId) : null;

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
      showAlert('Vincula una empresa para habilitar el historial y las automatizaciones de reportes.', 'info', true);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
  } else {
    bootstrap();
  }
})();
