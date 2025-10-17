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

  function safeLocalStorageGet(key) {
    if (typeof localStorage === 'undefined') {
      return '';
    }
    try {
      const value = localStorage.getItem(key);
      return typeof value === 'string' ? value : '';
    } catch (error) {
      return '';
    }
  }

  const DEFAULT_COMPANY_LOGO = '/images/optistockLogo.png';

  function sanitizeLogoPath(path) {
    if (typeof path !== 'string') {
      return '';
    }
    const trimmed = path.trim();
    return trimmed || '';
  }

  function isDataUrl(value) {
    return typeof value === 'string' && /^data:image\//i.test(value.trim());
  }

  function resolveLogoUrl(path) {
    if (!path) {
      return null;
    }
    if (isDataUrl(path)) {
      return path;
    }
    if (/^https?:/i.test(path)) {
      return path;
    }
    try {
      const base = window.location && window.location.origin ? window.location.origin : '';
      if (path.startsWith('/')) {
        return base ? `${base}${path}` : path;
      }
      return base ? `${base.replace(/\/$/, '')}/${path}` : path;
    } catch (error) {
      return path;
    }
  }

  function readBlobAsDataURL(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function fetchLogoDataUrl(path) {
    const resolved = resolveLogoUrl(path);
    if (!resolved) {
      return null;
    }
    if (isDataUrl(resolved)) {
      return resolved;
    }
    if (typeof fetch !== 'function') {
      return null;
    }
    try {
      const response = await fetch(resolved, { credentials: 'same-origin' });
      if (!response.ok) {
        return null;
      }
      const blob = await response.blob();
      if (!/^image\//i.test(blob.type || '')) {
        return null;
      }
      const dataUrl = await readBlobAsDataURL(blob);
      return typeof dataUrl === 'string' ? dataUrl : null;
    } catch (error) {
      return null;
    }
  }

  const logoCache = {
    path: null,
    dataUrl: null
  };

  function getEmpresaLogoPath() {
    return sanitizeLogoPath(safeLocalStorageGet('logo_empresa'));
  }

  async function resolveLogoDataUrl(path, forceRefresh = false) {
    const normalized = sanitizeLogoPath(path);
    if (!normalized) {
      if (forceRefresh && logoCache.path === normalized) {
        logoCache.dataUrl = null;
      }
      return null;
    }
    if (!forceRefresh && logoCache.dataUrl && logoCache.path === normalized) {
      return logoCache.dataUrl;
    }
    if (isDataUrl(normalized)) {
      logoCache.path = normalized;
      logoCache.dataUrl = normalized;
      return normalized;
    }
    const dataUrl = await fetchLogoDataUrl(normalized);
    if (dataUrl) {
      logoCache.path = normalized;
      logoCache.dataUrl = dataUrl;
      return dataUrl;
    }
    if (logoCache.path === normalized) {
      logoCache.dataUrl = null;
    }
    return null;
  }

  async function getEmpresaLogoDataUrl(forceRefresh = false) {
    const storedPath = getEmpresaLogoPath();
    const primary = await resolveLogoDataUrl(storedPath, forceRefresh);
    if (primary) {
      return primary;
    }
    if (storedPath && storedPath === DEFAULT_COMPANY_LOGO) {
      return null;
    }
    return resolveLogoDataUrl(DEFAULT_COMPANY_LOGO, forceRefresh);
  }

  function inferImageFormat(dataUrl) {
    if (typeof dataUrl !== 'string') {
      return 'PNG';
    }
    const match = /^data:image\/([a-z0-9+.-]+);/i.exec(dataUrl);
    if (!match) {
      return 'PNG';
    }
    const subtype = match[1].toLowerCase();
    if (subtype.includes('png')) {
      return 'PNG';
    }
    if (subtype === 'jpg' || subtype === 'jpeg') {
      return 'JPEG';
    }
    if (subtype === 'webp') {
      return 'WEBP';
    }
    return 'PNG';
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

  function normalizeLabelKey(label) {
    if (!label) {
      return '';
    }
    return String(label)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function parseMetadataString(value) {
    if (typeof value !== 'string') {
      return { label: '', value: '' };
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return { label: '', value: '' };
    }
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex >= 0) {
      return {
        label: trimmed.slice(0, colonIndex).trim(),
        value: trimmed.slice(colonIndex + 1).trim()
      };
    }
    return { label: '', value: trimmed };
  }

  function splitSubtitleParts(subtitle) {
    if (typeof subtitle !== 'string') {
      return [];
    }
    const cleaned = subtitle.replace(/\s{2,}/g, ' ').trim();
    if (!cleaned) {
      return [];
    }
    return cleaned
      .split(/(?:\s[•·]\s|\s\|\s|\n|;)/)
      .map((part) => part.trim())
      .filter(Boolean)
      .map(parseMetadataString);
  }

  function coerceDate(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value;
    }
    if (typeof value === 'number') {
      const fromNumber = new Date(value);
      if (!Number.isNaN(fromNumber.getTime())) {
        return fromNumber;
      }
    }
    if (typeof value === 'string' && value.trim()) {
      const fromString = new Date(value);
      if (!Number.isNaN(fromString.getTime())) {
        return fromString;
      }
    }
    return new Date();
  }

  function buildMetadataEntries(options = {}, context = {}) {
    const entries = [];
    const seen = new Set();
    const includeModuleEntry = Boolean(context.includeModuleEntry);

    function addEntry(label, value, placeAtStart = false) {
      const rawValue = value === undefined || value === null ? '' : String(value);
      const safeValue = rawValue.trim();
      if (!safeValue) {
        return;
      }
      const safeLabel = typeof label === 'string' ? label.trim() : '';
      const key = `${normalizeLabelKey(safeLabel)}|${safeValue}`;
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      const entry = { label: safeLabel, value: safeValue };
      if (placeAtStart) {
        entries.unshift(entry);
      } else {
        entries.push(entry);
      }
    }

    if (Array.isArray(options.metadata)) {
      options.metadata.forEach((item) => {
        if (!item) {
          return;
        }
        if (typeof item === 'string') {
          const parsed = parseMetadataString(item);
          if (parsed.value) {
            addEntry(parsed.label, parsed.value);
          }
          return;
        }
        if (typeof item === 'object') {
          const label = Object.prototype.hasOwnProperty.call(item, 'label') ? item.label : item.title;
          const value = Object.prototype.hasOwnProperty.call(item, 'value') ? item.value : item.text;
          addEntry(label, value);
        }
      });
    }

    splitSubtitleParts(options.subtitle).forEach((part) => {
      if (part.value) {
        addEntry(part.label, part.value);
      }
    });

    const moduleLabel = context.moduleLabel ? String(context.moduleLabel).trim() : '';
    if (moduleLabel && includeModuleEntry) {
      const hasModuleEntry = entries.some((entry) => {
        const normalized = normalizeLabelKey(entry.label);
        return normalized === 'origen' || normalized === 'modulo' || normalized === 'modulo origen';
      });
      if (!hasModuleEntry) {
        addEntry('Origen', moduleLabel, true);
      }
    }

    const companyName = context.companyName ? String(context.companyName).trim() : '';
    if (companyName) {
      const hasCompanyEntry = entries.some((entry) => normalizeLabelKey(entry.label) === 'empresa');
      if (!hasCompanyEntry) {
        addEntry('Empresa', companyName, true);
      }
    }

    const generatedAtLabel = context.generatedAtLabel ? String(context.generatedAtLabel).trim() : '';
    if (generatedAtLabel) {
      const hasGeneratedEntry = entries.some((entry) => {
        const normalized = normalizeLabelKey(entry.label);
        return normalized === 'generado' || normalized === 'generado el' || normalized === 'generado en';
      });
      if (!hasGeneratedEntry) {
        addEntry('Generado', generatedAtLabel);
      }
    }

    return entries;
  }

  function buildHeaderMetaLayout(doc, entries, textWidth) {
    if (!Array.isArray(entries) || entries.length === 0) {
      return null;
    }

    const spacingTop = 16;
    const paddingTop = 10;
    const paddingBottom = 6;
    const rowPadding = 4;
    const rowSpacing = 4;
    const labelFontSize = 9;
    const labelLineHeight = 11;
    const valueLineHeight = 14;

    const effectiveWidth = Math.max(textWidth, 80);

    let height = spacingTop + paddingTop;

    const computed = entries.map((entry) => {
      const label = entry.label ? String(entry.label).trim() : '';
      const value = entry.value ? String(entry.value).trim() : '—';
      const lines = doc.splitTextToSize(value, effectiveWidth);
      const safeLines = Array.isArray(lines) && lines.length ? lines : [value];
      const blockHeight = rowPadding + labelLineHeight + 6 + safeLines.length * valueLineHeight + rowPadding;
      height += blockHeight;
      return {
        label,
        lines: safeLines,
        blockHeight
      };
    });

    height += paddingBottom;
    if (computed.length > 1) {
      height += rowSpacing * (computed.length - 1);
    }

    return {
      entries: computed,
      spacingTop,
      paddingTop,
      paddingBottom,
      rowPadding,
      rowSpacing,
      labelFontSize,
      labelLineHeight,
      valueFontSize: 11,
      valueLineHeight,
      height
    };
  }

  async function exportTableToPdf(options = {}) {
    const { jsPDF } = (window.jspdf || {});
    if (typeof jsPDF !== 'function') {
      throw new Error('PDF_LIBRARY_MISSING');
    }

    const dataset = options.data || extractTableData(options.table);
    if (!dataset || !dataset.header || !dataset.header.length) {
      throw new Error('EMPTY_TABLE');
    }

    const orientation = options.orientation || 'portrait';
    const doc = new jsPDF({ orientation, unit: 'pt', format: 'a4' });
    const palette = getPalette();

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 46;
    const reservedLogoWidth = 140;

    const companyName = options.companyName && String(options.companyName).trim()
      ? String(options.companyName).trim()
      : getEmpresaNombre();

    const moduleSource = options.moduleLabel || options.module || options.source || '';
    const moduleLabel = moduleSource ? String(moduleSource).trim() : '';

    const generatedAtDate = coerceDate(options.generatedAt);
    const generatedAtLabel = options.generatedAtLabel || formatTimestamp(generatedAtDate);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    const textAreaWidth = Math.max(pageWidth - marginX * 2 - reservedLogoWidth, 180);
    const titleText = options.title ? String(options.title) : 'Reporte';
    const titleLines = doc.splitTextToSize(titleText, textAreaWidth);

    const headerPaddingTop = 28;
    const headerPaddingBottom = 26;
    const companyLineHeight = 16;
    const titleLineHeight = 24;
    const moduleLineHeight = moduleLabel ? 18 : 0;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);

    const metadataEntries = buildMetadataEntries(options, {
      companyName,
      moduleLabel,
      generatedAtLabel,
      includeModuleEntry: options.includeModuleInMetadata === true
    });

    const headerMetaLayout = buildHeaderMetaLayout(doc, metadataEntries, textAreaWidth);

    let headerBodyHeight = headerPaddingTop + companyLineHeight + titleLines.length * titleLineHeight + moduleLineHeight + headerPaddingBottom;
    if (headerMetaLayout) {
      headerBodyHeight += headerMetaLayout.height;
    }
    if (headerBodyHeight < 160) {
      headerBodyHeight = 160;
    }

    const headerAccentHeight = 6;
    const headerTotalHeight = headerBodyHeight + headerAccentHeight;
    const tableStartY = headerTotalHeight + 24;
    const marginTop = headerTotalHeight + 18;

    const logoDataUrl = await getEmpresaLogoDataUrl();

    const headerTitleColor = rgbToArray(palette.topbarTextRgb);
    const headerMutedRgb = hexToRgb(mixHexColors(palette.topbarText, palette.topbar, 0.2));
    const headerMutedColor = rgbToArray(headerMutedRgb);
    const headerLabelRgb = hexToRgb(mixHexColors(palette.topbarText, palette.topbar, 0.34));
    const headerLabelColor = rgbToArray(headerLabelRgb);
    const headerDividerRgb = hexToRgb(mixHexColors(palette.topbarText, palette.topbar, 0.6));
    const headerDividerColor = rgbToArray(headerDividerRgb);

    const headerCompanyText = companyName ? companyName.toUpperCase() : '';

    function drawHeader(pageNumber) {
      doc.setFillColor(...rgbToArray(palette.topbarRgb));
      doc.rect(0, 0, pageWidth, headerBodyHeight, 'F');

      doc.setFillColor(...rgbToArray(palette.accentRgb));
      doc.rect(0, headerBodyHeight, pageWidth, headerAccentHeight, 'F');

      let cursorY = headerPaddingTop + 12;

      if (headerCompanyText) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...headerMutedColor);
        doc.text(headerCompanyText, marginX, cursorY, { baseline: 'alphabetic' });
        cursorY += companyLineHeight;
      } else {
        cursorY = headerPaddingTop + companyLineHeight;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(...headerTitleColor);
      titleLines.forEach((line) => {
        doc.text(line, marginX, cursorY, { baseline: 'alphabetic' });
        cursorY += titleLineHeight;
      });

      if (moduleLabel) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.setTextColor(...headerMutedColor);
        doc.text(`Módulo origen: ${moduleLabel}`, marginX, cursorY, { baseline: 'alphabetic' });
        cursorY += moduleLineHeight;
      }

      if (pageNumber === 1 && headerMetaLayout) {
        const metaTop = cursorY + headerMetaLayout.spacingTop;

        doc.setDrawColor(...headerDividerColor);
        doc.setLineWidth(0.6);
        doc.line(marginX, metaTop, pageWidth - marginX, metaTop);

        let metaCursor = metaTop + headerMetaLayout.paddingTop;

        headerMetaLayout.entries.forEach((entry, index) => {
          const entryStart = metaCursor;
          const labelBaseline = entryStart + headerMetaLayout.rowPadding + headerMetaLayout.labelFontSize;

          if (entry.label) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(headerMetaLayout.labelFontSize);
            doc.setTextColor(...headerLabelColor);
            doc.text(entry.label.toUpperCase(), marginX, labelBaseline, { baseline: 'alphabetic' });
          }

          let valueY = labelBaseline + 6;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(headerMetaLayout.valueFontSize);
          doc.setTextColor(...headerTitleColor);
          entry.lines.forEach((line) => {
            doc.text(line, marginX, valueY, { baseline: 'alphabetic' });
            valueY += headerMetaLayout.valueLineHeight;
          });

          metaCursor = entryStart + entry.blockHeight;
          if (index < headerMetaLayout.entries.length - 1) {
            metaCursor += headerMetaLayout.rowSpacing;
          }
        });

        doc.setDrawColor(0);
      }

      if (logoDataUrl) {
        try {
          const imageType = inferImageFormat(logoDataUrl);
          let targetWidth = 120;
          let targetHeight = 60;

          if (typeof doc.getImageProperties === 'function') {
            try {
              const props = doc.getImageProperties(logoDataUrl);
              if (props && props.width && props.height) {
                const ratio = props.width / props.height;
                targetWidth = 120;
                targetHeight = targetWidth / ratio;
                if (targetHeight > 60) {
                  targetHeight = 60;
                  targetWidth = targetHeight * ratio;
                }
              }
            } catch (error) {
              // ignore sizing issues
            }
          }

          targetWidth = Math.min(Math.max(targetWidth, 48), 140);
          targetHeight = Math.min(Math.max(targetHeight, 32), 80);

          const logoX = pageWidth - marginX - targetWidth;
          const logoY = headerPaddingTop;
          doc.addImage(logoDataUrl, imageType, logoX, logoY, targetWidth, targetHeight, undefined, 'FAST');
        } catch (error) {
          // ignore image rendering issues
        }
      }

      doc.setTextColor(...rgbToArray(palette.textRgb));
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
    }

    const headerRow = dataset.header.map((value) => {
      if (typeof value !== 'string') {
        return String(value || '');
      }
      return value.trim().toUpperCase();
    });

    doc.autoTable({
      head: [headerRow],
      body: dataset.rows,
      startY: tableStartY,
      margin: { left: marginX, right: marginX, top: marginTop },
      theme: 'striped',
      styles: {
        font: 'helvetica',
        fontSize: 10,
        textColor: rgbToArray(palette.textRgb),
        cellPadding: { top: 7, bottom: 7, left: 6, right: 6 },
        lineColor: rgbToArray(palette.gridRgb),
        lineWidth: 0.4
      },
      headStyles: {
        fontStyle: 'bold',
        fontSize: 11,
        fillColor: rgbToArray(palette.sidebarRgb),
        textColor: rgbToArray(palette.sidebarTextRgb),
        lineWidth: 0
      },
      bodyStyles: {
        fillColor: rgbToArray(palette.cardBgRgb),
        textColor: rgbToArray(palette.textRgb)
      },
      alternateRowStyles: {
        fillColor: rgbToArray(palette.altRowBgRgb)
      },
      tableLineColor: rgbToArray(palette.gridRgb),
      tableLineWidth: 0.4,
      didDrawPage: (data) => {
        drawHeader(data.pageNumber);
      }
    });

    const footerText = options.footerText || `Generado ${generatedAtLabel}`;
    const pageTotal = doc.internal.getNumberOfPages();

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...rgbToArray(palette.mutedRgb));

    for (let page = 1; page <= pageTotal; page += 1) {
      doc.setPage(page);
      const footerY = pageHeight - 30;
      doc.text(String(footerText), marginX, footerY, { baseline: 'alphabetic' });
      doc.text(`Página ${page} de ${pageTotal}`, pageWidth - marginX, footerY, {
        baseline: 'alphabetic',
        align: 'right'
      });
    }

    const fileName = options.fileName || 'reporte.pdf';
    let blob = null;

    if (typeof doc.output === 'function') {
      try {
        blob = doc.output('blob');
      } catch (error) {
        try {
          const arrayBuffer = doc.output('arraybuffer');
          blob = new Blob([arrayBuffer], { type: 'application/pdf' });
        } catch (err) {
          blob = null;
        }
      }
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
    getEmpresaNombre,
    getEmpresaLogoPath,
    getEmpresaLogoDataUrl
  };
})();
