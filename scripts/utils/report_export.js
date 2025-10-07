(() => {
  function clamp(value, min = 0, max = 1) {
    if (!Number.isFinite(value)) return min;
    return Math.min(Math.max(value, min), max);
  }

  function componentToHex(component) {
    const clamped = Math.round(component);
    const hex = clamped.toString(16);
    return hex.length === 1 ? `0${hex}` : hex;
  }

  function normalizeHex(hex, fallback = '#000000') {
    if (typeof hex !== 'string') {
      return fallback;
    }
    const sanitized = hex.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(sanitized)) {
      return sanitized;
    }
    if (/^#[0-9a-fA-F]{3}$/.test(sanitized)) {
      const chars = sanitized.slice(1).split('');
      return `#${chars.map(ch => ch + ch).join('')}`;
    }
    return fallback;
  }

  function hexToRgb(hex, fallback = '#000000') {
    const normalized = normalizeHex(hex, fallback);
    const value = normalized.slice(1);
    const int = Number.parseInt(value, 16);
    if (!Number.isFinite(int)) {
      return hexToRgb(fallback, '#000000');
    }
    return {
      r: (int >> 16) & 255,
      g: (int >> 8) & 255,
      b: int & 255
    };
  }

  function rgbToArray(rgb) {
    if (!rgb || typeof rgb !== 'object') {
      return [0, 0, 0];
    }
    return [rgb.r || 0, rgb.g || 0, rgb.b || 0];
  }

  function mixHexColors(colorA, colorB, ratio = 0.5) {
    const amount = clamp(ratio);
    const a = hexToRgb(colorA);
    const b = hexToRgb(colorB);
    const r = a.r + (b.r - a.r) * amount;
    const g = a.g + (b.g - a.g) * amount;
    const bCh = a.b + (b.b - a.b) * amount;
    return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(bCh)}`;
  }

  function getCssVar(name, fallback) {
    try {
      const styles = window.getComputedStyle(document.documentElement);
      const value = styles.getPropertyValue(name);
      const trimmed = typeof value === 'string' ? value.trim() : '';
      return trimmed || fallback;
    } catch (error) {
      return fallback;
    }
  }

  function getPalette() {
    const topbar = normalizeHex(getCssVar('--topbar-color', '#ff6f91'));
    const topbarText = normalizeHex(getCssVar('--topbar-text-color', '#ffffff'));
    const sidebar = normalizeHex(getCssVar('--sidebar-color', '#171f34'));
    const sidebarText = normalizeHex(getCssVar('--sidebar-text-color', '#ffffff'));
    const accent = normalizeHex(getCssVar('--accent-color', '#0fb4d4'));
    const text = normalizeHex(getCssVar('--text-color', '#1f2937'));
    const muted = normalizeHex(getCssVar('--muted-color', '#6b7280'));
    const pageBg = normalizeHex(getCssVar('--page-bg', '#f5f6fb'));
    const cardBg = normalizeHex(getCssVar('--card-bg', '#ffffff'));

    const grid = mixHexColors(sidebar, '#ffffff', 0.86);
    const bodyBg = mixHexColors(cardBg, pageBg, 0.72);
    const altRowBg = mixHexColors(accent, '#ffffff', 0.92);

    return {
      topbar,
      topbarRgb: hexToRgb(topbar),
      topbarText,
      topbarTextRgb: hexToRgb(topbarText),
      sidebar,
      sidebarRgb: hexToRgb(sidebar),
      sidebarText,
      sidebarTextRgb: hexToRgb(sidebarText),
      accent,
      accentRgb: hexToRgb(accent),
      text,
      textRgb: hexToRgb(text),
      muted,
      mutedRgb: hexToRgb(muted),
      pageBg,
      pageBgRgb: hexToRgb(pageBg),
      cardBg,
      cardBgRgb: hexToRgb(cardBg),
      grid,
      gridRgb: hexToRgb(grid),
      bodyBg,
      bodyBgRgb: hexToRgb(bodyBg),
      altRowBg,
      altRowBgRgb: hexToRgb(altRowBg)
    };
  }

  function downloadBlob(blob, fileName) {
    if (!(blob instanceof Blob)) {
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function normalizeCellText(text) {
    if (typeof text !== 'string') {
      return '';
    }
    return text.replace(/\s+/g, ' ').trim();
  }

  function shouldSkipColumn(cell) {
    if (!cell) {
      return false;
    }
    const attr = cell.getAttribute('data-export');
    if (attr && attr.toLowerCase() === 'skip') {
      return true;
    }
    const dataSkip = cell.dataset?.export;
    if (typeof dataSkip === 'string' && dataSkip.toLowerCase() === 'skip') {
      return true;
    }
    const label = normalizeCellText(cell.textContent || '');
    return label.toLowerCase() === 'acciones';
  }

  function getCellExportValue(cell) {
    if (!cell) {
      return '';
    }
    const explicitValue = cell.getAttribute('data-export-value');
    if (explicitValue !== null) {
      return normalizeCellText(explicitValue);
    }
    if (cell.dataset && typeof cell.dataset.exportValue === 'string') {
      return normalizeCellText(cell.dataset.exportValue);
    }
    const text = normalizeCellText(cell.textContent || '');
    if (text) {
      return text;
    }
    const img = cell.querySelector('img');
    if (img) {
      return normalizeCellText(img.getAttribute('alt') || img.getAttribute('title') || 'Imagen');
    }
    return '';
  }

  function extractTableData(table) {
    if (!(table instanceof HTMLTableElement)) {
      return null;
    }

    const headerRow = table.tHead?.rows?.[0] || table.querySelector('tr');
    if (!headerRow) {
      return null;
    }

    const omit = new Set();
    const header = [];
    Array.from(headerRow.cells).forEach((cell, index) => {
      if (shouldSkipColumn(cell)) {
        omit.add(index);
        return;
      }
      header.push(normalizeCellText(cell.textContent || `Columna ${index + 1}`));
    });

    if (!header.length) {
      return null;
    }

    const bodyRows = [];
    const bodySections = table.tBodies && table.tBodies.length
      ? Array.from(table.tBodies)
      : [table];

    bodySections.forEach(section => {
      Array.from(section.rows).forEach(row => {
        if (row === headerRow) {
          return;
        }
        if (row.classList && row.classList.contains('empty-row')) {
          return;
        }
        if (row.hidden || row.style.display === 'none' || row.classList?.contains('d-none')) {
          return;
        }
        const cells = Array.from(row.cells);
        if (!cells.length) {
          return;
        }
        const rowData = [];
        cells.forEach((cell, index) => {
          const skip = omit.has(index) || shouldSkipColumn(cell);
          if (skip) {
            return;
          }
          rowData.push(getCellExportValue(cell));
        });
        if (rowData.length) {
          bodyRows.push(rowData);
        }
      });
    });

    return {
      header,
      rows: bodyRows,
      rowCount: bodyRows.length,
      columnCount: header.length,
      omitIndices: omit,
      table
    };
  }

  function formatTimestamp(date = new Date()) {
    try {
      return new Intl.DateTimeFormat('es-PE', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(date);
    } catch (error) {
      return date.toLocaleString();
    }
  }

  function pluralize(count, singular, plural) {
    const value = Number(count) || 0;
    if (value === 1) {
      return `1 ${singular}`;
    }
    const label = plural || `${singular}s`;
    return `${value} ${label}`;
  }

  function getEmpresaNombre() {
    if (typeof localStorage === 'undefined') {
      return 'OptiStock';
    }
    try {
      const stored = localStorage.getItem('empresa_nombre');
      if (typeof stored === 'string' && stored.trim()) {
        return stored.trim();
      }
    } catch (error) {
      // ignore access errors
    }
    return 'OptiStock';
  }

  function exportTableToPdf(options = {}) {
    const { jsPDF } = (window.jspdf || {});
    if (typeof jsPDF !== 'function') {
      throw new Error('PDF_LIBRARY_MISSING');
    }

    const dataset = options.data || extractTableData(options.table);
    if (!dataset || !dataset.header || !dataset.header.length) {
      throw new Error('EMPTY_TABLE');
    }

    const orientation = options.orientation || (dataset.columnCount > 5 ? 'landscape' : 'portrait');
    const doc = new jsPDF({ orientation, unit: 'pt', format: 'a4' });
    const palette = getPalette();

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const headerHeight = 90;

    doc.setFillColor(...rgbToArray(palette.topbarRgb));
    doc.rect(0, 0, pageWidth, headerHeight, 'F');

    doc.setFillColor(...rgbToArray(palette.accentRgb));
    doc.rect(0, headerHeight - 12, pageWidth, 12, 'F');

    doc.setTextColor(...rgbToArray(palette.topbarTextRgb));
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text(options.title || 'Reporte', 40, 48, { baseline: 'alphabetic' });

    if (options.subtitle) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11.5);
      doc.text(String(options.subtitle), 40, 68, { baseline: 'alphabetic' });
    }

    doc.autoTable({
      head: [dataset.header],
      body: dataset.rows,
      startY: headerHeight + 16,
      margin: { left: 40, right: 40 },
      theme: 'striped',
      styles: {
        font: 'helvetica',
        fontSize: 10,
        textColor: rgbToArray(palette.textRgb),
        cellPadding: { top: 6, bottom: 6, left: 6, right: 6 },
        lineColor: rgbToArray(palette.gridRgb),
        lineWidth: 0.3
      },
      headStyles: {
        fontStyle: 'bold',
        fontSize: 11,
        fillColor: rgbToArray(palette.sidebarRgb),
        textColor: rgbToArray(palette.sidebarTextRgb),
        lineWidth: 0
      },
      bodyStyles: {
        fillColor: rgbToArray(palette.bodyBgRgb),
        textColor: rgbToArray(palette.textRgb)
      },
      alternateRowStyles: {
        fillColor: rgbToArray(palette.altRowBgRgb)
      },
      tableLineColor: rgbToArray(palette.gridRgb),
      tableLineWidth: 0.3
    });

    const footerY = pageHeight - 30;
    const footerText = options.footerText || `Generado ${formatTimestamp()}`;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...rgbToArray(palette.mutedRgb));

    const marginX = 40;
    const pageTotal = doc.internal.getNumberOfPages();
    for (let page = 1; page <= pageTotal; page += 1) {
      doc.setPage(page);
      doc.text(String(footerText), marginX, footerY, { baseline: 'alphabetic' });
      doc.text(`Página ${page} de ${pageTotal}`, pageWidth - marginX, footerY, {
        baseline: 'alphabetic',
        align: 'right'
      });
    }

    const fileName = options.fileName || 'reporte.pdf';
    let blob = null;
    if (typeof doc.output === 'function') {
      blob = doc.output('blob');
    }
    if (options.autoDownload !== false) {
      doc.save(fileName);
    }

    return {
      blob,
      fileName,
      rowCount: dataset.rowCount,
      columnCount: dataset.columnCount,
      doc
    };
  }

  function exportTableToExcel(options = {}) {
    const XLSX = window.XLSX;
    if (!XLSX || !XLSX.utils || typeof XLSX.write !== 'function') {
      throw new Error('EXCEL_LIBRARY_MISSING');
    }

    const dataset = options.data || extractTableData(options.table);
    if (!dataset || !dataset.header || !dataset.header.length) {
      throw new Error('EMPTY_TABLE');
    }

    const sheetName = (options.sheetName || 'Datos').toString().substring(0, 31);
    const workbook = XLSX.utils.book_new();
    const sheetData = [dataset.header, ...dataset.rows];
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    const arrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([arrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const fileName = options.fileName || 'reporte.xlsx';
    if (options.autoDownload !== false) {
      downloadBlob(blob, fileName);
    }

    return {
      blob,
      fileName,
      rowCount: dataset.rowCount,
      columnCount: dataset.columnCount
    };
  }

  window.ReportExporter = {
    getPalette,
    extractTableData,
    exportTableToPdf,
    exportTableToExcel,
    formatTimestamp,
    pluralize,
    getEmpresaNombre
  };
})();
