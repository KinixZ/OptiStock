(function () {
  const HISTORY_API_URL = '../../scripts/php/report_history.php';
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
    uploadHint: document.getElementById('uploadHint')
  };

  const state = {
    reports: [],
    filteredReports: [],
    retentionDays: RETENTION_DAYS_FALLBACK,
    loading: false,
    alertTimerId: null
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

  function downloadReportFromServer(reportId) {
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
      state.reports = Array.isArray(response.reports) ? response.reports : [];
      state.retentionDays = typeof response.retentionDays === 'number' ? response.retentionDays : state.retentionDays;
      updateSummary();
      applyFilters();
    } catch (error) {
      console.error('No se pudo cargar el historial de reportes:', error);
      showAlert(error.message || 'No se pudo cargar el historial de reportes.', 'danger', true);
      state.reports = [];
      applyFilters();
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
      downloadReportFromServer(reportId);
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

  function bootstrap() {
    const empresaId = getActiveEmpresaId();
    if (!empresaId) {
      setHistoryUnavailableState('Inicia sesión o selecciona una empresa para ver el historial.');
      return;
    }

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

    loadHistory();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
  } else {
    bootstrap();
  }
})();
