(function () {
  const API_BASE = '/api/report-history';
  const RETENTION_DAYS_FALLBACK = 60;

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === 'string') {
          const commaIndex = result.indexOf(',');
          resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
        } else {
          reject(new Error('No se pudo convertir el archivo a base64.'));
        }
      };
      reader.onerror = () => reject(new Error('No se pudo leer el archivo para guardarlo.'));
      reader.readAsDataURL(blob);
    });
  }

  async function saveGeneratedFile(options) {
    if (!options || !(options.blob instanceof Blob)) {
      throw new Error('Debes proporcionar un Blob válido para guardar el reporte.');
    }

    const {
      blob,
      fileName = `reporte-${new Date().toISOString()}`,
      source = '',
      notes = ''
    } = options;

    const payload = {
      fileName,
      mimeType: blob.type || 'application/octet-stream',
      fileContent: await blobToBase64(blob),
      source,
      notes
    };

    const response = await fetch(API_BASE, {
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

  async function uploadFile(file, metadata = {}) {
    if (!(file instanceof Blob)) {
      throw new Error('El archivo proporcionado no es válido.');
    }
    return saveGeneratedFile({
      blob: file,
      fileName: typeof file.name === 'string' ? file.name : undefined,
      source: metadata.source,
      notes: metadata.notes
    });
  }

  async function fetchReportHistory() {
    const response = await fetch(API_BASE, { method: 'GET' });
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

  function downloadReport(reportId) {
    if (!reportId) {
      return;
    }
    const link = document.createElement('a');
    link.href = `${API_BASE}/${encodeURIComponent(reportId)}/download`;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  window.ReportHistory = {
    saveGeneratedFile,
    uploadFile,
    fetchReportHistory,
    downloadReport,
    RETENTION_DAYS_FALLBACK
  };
})();
