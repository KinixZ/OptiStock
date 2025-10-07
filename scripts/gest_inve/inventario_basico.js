(() => {
  const API = {
    categorias: '../../scripts/php/guardar_categorias.php',
    subcategorias: '../../scripts/php/guardar_subcategorias.php',
    productos: '../../scripts/php/guardar_productos.php',
    areas:       '../../scripts/php/guardar_areas.php',
    zonas:         '../../scripts/php/guardar_zonas.php',
    movimiento:   '../../scripts/php/guardar_movimientos.php'
  };

  const categorias = [];
  const subcategorias = [];
  const productos = [];
  const areas = [];
  const zonas = [];
  let vistaActual = 'producto';
  let editProdId = null;
  let editCatId = null;
  let editSubcatId = null;

const EMP_ID = parseInt(localStorage.getItem('id_empresa'),10) || 0;


  const btnProductos = document.getElementById('btnProductos');
  const btnCategorias = document.getElementById('btnCategorias');
  const btnSubcategorias = document.getElementById('btnSubcategorias');
  const prodArea = document.getElementById('prodArea');
  const prodZona = document.getElementById('prodZona');

  const productoFormCollapseEl = document.getElementById('productoFormCollapse');
  const productoFormToggle = document.getElementById('productoFormToggle');
  const productoFormTitle = document.getElementById('productoFormTitle');
  const productoFormSubtitle = document.getElementById('productoFormSubtitle');
  const productoFormSubmit = document.getElementById('productoFormSubmit');
  const productoFormModeHint = document.getElementById('productoFormModeHint');
  const productoFormModeProduct = document.getElementById('productoFormModeProduct');
  const productoFormSubtitleDefault = productoFormSubtitle?.textContent.trim() || '';

  const qrModalElement = document.getElementById('productoQrModal');
  const qrModalImage = document.getElementById('productoQrImage');
  const qrModalDownload = document.getElementById('productoQrDownload');
  const productoLabelCompact = document.getElementById('productoLabelCompact');
  const orientRadios = document.getElementsByName('etiquetaOrientacion');

  // (sanitizer defined later)

  // Build compact label DOM for orientation selection (hidden in modal)
  function getEmpresaNombre() {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('empresa_nombre') : '';
    if (typeof stored === 'string' && stored.trim()) {
      return stored.trim();
    }
    return 'OptiStock';
  }

  function getBrandPalette() {
    const rootStyles = window.getComputedStyle ? window.getComputedStyle(document.documentElement) : null;
    const header = rootStyles?.getPropertyValue('--sidebar-color')?.trim() || '#30374f';
    const headerText = rootStyles?.getPropertyValue('--sidebar-text-color')?.trim() || '#ffffff';
    const accent = rootStyles?.getPropertyValue('--topbar-color')?.trim() || '#505a76';
    const accentText = rootStyles?.getPropertyValue('--topbar-text-color')?.trim() || '#ffffff';
    const pageBg = rootStyles?.getPropertyValue('--page-bg')?.trim() || '';
    return { header, headerText, accent, accentText, pageBg };
  }

  function buildCompactLabel(producto, qrSrc, orientation = 'horizontal') {
    const wrapper = document.createElement('div');
    wrapper.className = `label-card ${orientation === 'vertical' ? 'vertical' : 'horizontal'}`.trim();

    const palette = getBrandPalette();
    const empresaNombre = getEmpresaNombre();
    const infoBackground = '#ffffff';
    const primaryTextColor = ensureReadableTextColor(palette.header, infoBackground, {
      fallbackDark: '#111827'
    });
    const secondaryTextColor = ensureReadableTextColor(mixWithWhite(palette.header, 0.35), infoBackground, {
      minContrast: 3.2,
      fallbackDark: '#4b5565'
    });
    const accentTextColor = ensureReadableTextColor(mixWithWhite(palette.header, 0.45), infoBackground, {
      minContrast: 3,
      fallbackDark: '#6b7280'
    });

    const header = document.createElement('div');
    header.className = 'label-header';
    const headerTitle = document.createElement('span');
    headerTitle.textContent = 'Etiqueta QR';
    const headerBrand = document.createElement('span');
    headerBrand.className = 'label-header__brand';
    headerBrand.textContent = empresaNombre;
    header.appendChild(headerTitle);
    header.appendChild(headerBrand);
    header.style.background = `linear-gradient(90deg, ${palette.header} 0%, ${mixWithWhite(palette.accent, 0.25)} 100%)`;
    header.style.color = palette.headerText;
    headerTitle.style.color = palette.headerText;
    headerBrand.style.color = palette.headerText;
    wrapper.appendChild(header);

    const body = document.createElement('div');
    body.className = 'label-body';
    wrapper.style.background = `linear-gradient(150deg, ${palette.pageBg || mixWithWhite(palette.header, 0.95)} 0%, ${mixWithWhite(palette.accent, 0.92)} 100%)`;
    wrapper.style.borderColor = hexToRgba(palette.header, 0.12);

    const qrColumn = document.createElement('div');
    qrColumn.className = 'label-qr';
    const qrCanvas = document.createElement('div');
    qrCanvas.className = 'label-qr__canvas';
    qrCanvas.style.background = `radial-gradient(circle at 30% 20%, ${mixWithWhite(palette.accent, 0.1)} 0%, ${mixWithWhite(palette.accent, 0.4)} 100%)`;
    qrCanvas.style.borderColor = hexToRgba(palette.header, 0.18);
    const img = document.createElement('img');
    img.alt = producto?.nombre ? `Código QR de ${producto.nombre}` : 'Código QR del producto';
    img.src = qrSrc;
    qrCanvas.appendChild(img);
    qrColumn.appendChild(qrCanvas);

    const infoColumn = document.createElement('div');
    infoColumn.className = 'label-info';
    const title = document.createElement('div');
    title.className = 'label-info__name';
    title.textContent = producto?.nombre || 'Nombre del producto';
    title.style.color = primaryTextColor;
    infoColumn.appendChild(title);

    const meta = document.createElement('div');
    meta.className = 'label-info__meta';
    meta.style.color = secondaryTextColor;
    const dimensionValue = formatDimensionTriplet(producto);
    const fields = [
      { k: 'Zona', v: producto?.zona_nombre || producto?.area_nombre || '' },
      { k: 'Categoría', v: producto?.categoria_nombre || '' },
      { k: 'Subcategoría', v: producto?.subcategoria_nombre || '' },
      { k: 'Dimensiones', v: dimensionValue },
      { k: 'Descripción', v: producto?.descripcion || '' },
      { k: 'Precio', v: producto?.precio_compra ? `$${Number(producto.precio_compra).toFixed(2)}` : '' }
    ].filter(f => Boolean(f.v));

    if (fields.length === 0) {
      const placeholderField = document.createElement('div');
      placeholderField.className = 'label-field';
      const pk = document.createElement('div');
      pk.className = 'label-field__key';
      pk.textContent = 'Información';
      pk.style.color = accentTextColor;
      const pv = document.createElement('div');
      pv.className = 'label-field__value';
      pv.textContent = 'Completa los datos del producto para mostrarlos en la etiqueta.';
      pv.style.color = primaryTextColor;
      placeholderField.appendChild(pk);
      placeholderField.appendChild(pv);
      meta.appendChild(placeholderField);
    } else {
      fields.forEach(f => {
        const node = document.createElement('div');
        node.className = 'label-field';
        const key = document.createElement('div');
        key.className = 'label-field__key';
        key.textContent = f.k;
        key.style.color = accentTextColor;
        const val = document.createElement('div');
        val.className = 'label-field__value';
        val.textContent = f.v;
        val.style.color = primaryTextColor;
        node.style.borderLeftColor = hexToRgba(palette.accent, 0.35);
        node.appendChild(key);
        node.appendChild(val);
        meta.appendChild(node);
      });
    }

    infoColumn.appendChild(meta);

    if (orientation === 'vertical') {
      body.appendChild(qrColumn);
      body.appendChild(infoColumn);
    } else {
      body.appendChild(qrColumn);
      body.appendChild(infoColumn);
    }

    wrapper.appendChild(body);

    const footer = document.createElement('div');
    footer.className = 'label-footer';
    footer.innerHTML = '<span>Etiqueta generada con OptiStock</span><span>optistock.site</span>';
    footer.style.background = `linear-gradient(90deg, ${mixWithWhite(palette.accent, 0.35)} 0%, ${palette.accent} 100%)`;
    footer.style.color = palette.accentText;
    wrapper.appendChild(footer);

    return wrapper;
  }

  // Render label to PNG with emphasis on QR visibility.
  async function renderLabelToPng(producto, qrSrc, orientation = 'horizontal', width = 900, dpi = 2) {
    // load QR image (fallback resolves to null)
    const qrImg = await new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = qrSrc;
    });

    const w = orientation === 'vertical' ? Math.round(width * 0.68) : width;
    const h = orientation === 'vertical' ? Math.round(width * 1.18) : Math.round(width * 0.6);
    const canvas = document.createElement('canvas');
    canvas.width = w * dpi;
    canvas.height = h * dpi;
    const ctx = canvas.getContext('2d');

    // draw background
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const paletteColors = getBrandPalette();
    const infoBackgroundColor = '#ffffff';
    const primaryCanvasText = ensureReadableTextColor(mixWithWhite(paletteColors.header, 0.14), infoBackgroundColor, {
      fallbackDark: '#1f2538'
    });
    const secondaryCanvasText = ensureReadableTextColor(mixWithWhite(paletteColors.header, 0.38), infoBackgroundColor, {
      minContrast: 3.2,
      fallbackDark: '#4b5565'
    });

    const colors = {
      background: paletteColors.pageBg || mixWithWhite(paletteColors.header, 0.92),
      cardBorder: hexToRgba(paletteColors.header, 0.14),
      header: paletteColors.header,
      accent: paletteColors.accent,
      textMain: primaryCanvasText,
      textMuted: secondaryCanvasText,
      textOnDark: paletteColors.headerText,
      textOnAccent: paletteColors.accentText
    };

    const headerH = 70 * dpi;
    const footerH = 54 * dpi;
    const bodyY = headerH;
    const bodyH = canvas.height - headerH - footerH;
    const gap = 24 * dpi;

    // header with gradient
    const headerGradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    headerGradient.addColorStop(0, colors.header);
    headerGradient.addColorStop(1, mixWithWhite(colors.accent, 0.2));
    ctx.fillStyle = headerGradient;
    ctx.fillRect(0, 0, canvas.width, headerH);
    ctx.fillStyle = colors.textOnDark;
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${18 * dpi}px Poppins, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('Etiqueta QR', 24 * dpi, headerH / 2);
    ctx.textAlign = 'right';
    ctx.font = `600 ${16 * dpi}px Poppins, sans-serif`;
    ctx.fillText(getEmpresaNombre(), canvas.width - 24 * dpi, headerH / 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const blocks = [
      { label: 'Zona', value: producto?.zona_nombre || producto?.area_nombre || '' },
      { label: 'Categoría', value: producto?.categoria_nombre || '' },
      { label: 'Subcategoría', value: producto?.subcategoria_nombre || '' },
      { label: 'Dimensiones', value: formatDimensionTriplet(producto) },
      { label: 'Descripción', value: producto?.descripcion || '' },
      { label: 'Precio', value: producto?.precio_compra ? `$${Number(producto.precio_compra).toFixed(2)}` : '' }
    ].filter(item => item.value);

    const drawParagraph = (text, startX, startY, maxWidth, lineHeight, maxLines = 4) => {
      const words = String(text ?? '').trim().split(/\s+/).filter(Boolean);
      if (words.length === 0) {
        ctx.fillText('—', startX, startY);
        return startY + lineHeight;
      }
      let line = '';
      let y = startY;
      let lines = 0;
      for (const word of words) {
        const testLine = line ? `${line} ${word}` : word;
        if (ctx.measureText(testLine).width > maxWidth && line) {
          ctx.fillText(line, startX, y);
          line = word;
          y += lineHeight;
          lines += 1;
          if (lines >= maxLines - 1) {
            ctx.fillText(`${line}…`, startX, y);
            return y + lineHeight;
          }
        } else {
          line = testLine;
        }
      }
      if (line) {
        ctx.fillText(line, startX, y);
        y += lineHeight;
      }
      return y;
    };

    const drawField = (label, value, startX, startY, maxWidth) => {
      ctx.fillStyle = colors.textMuted;
      ctx.font = `600 ${12 * dpi}px Poppins, sans-serif`;
      ctx.fillText(label.toUpperCase(), startX, startY);
      ctx.fillStyle = colors.textMain;
      ctx.font = `500 ${15 * dpi}px Poppins, sans-serif`;
      const nextY = drawParagraph(value, startX, startY + 18 * dpi, maxWidth, 22 * dpi, 4);
      return nextY + 10 * dpi;
    };

    if (orientation === 'horizontal') {
      const qrAreaWidth = Math.round(canvas.width * 0.46);
      const infoAreaWidth = canvas.width - qrAreaWidth - gap * 3;
      const infoX = gap * 2;
      const infoY = bodyY + gap;
      const infoHeight = bodyH - gap * 2;

      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.97)';
      roundRect(ctx, infoX, infoY, infoAreaWidth, infoHeight, 32 * dpi, true, false);
      ctx.lineWidth = 2;
      ctx.strokeStyle = colors.cardBorder;
      roundRect(ctx, infoX, infoY, infoAreaWidth, infoHeight, 32 * dpi, false, true);
      ctx.restore();

      const textX = infoX + 32 * dpi;
      let cursorY = infoY + 34 * dpi;

      ctx.fillStyle = colors.textMain;
      ctx.font = `700 ${24 * dpi}px Poppins, sans-serif`;
      cursorY = drawParagraph(producto?.nombre || 'Nombre del producto', textX, cursorY, infoAreaWidth - 64 * dpi, 30 * dpi, 3) + 8 * dpi;

      if (blocks.length > 0) {
        blocks.forEach(block => {
          cursorY = drawField(block.label, block.value, textX, cursorY, infoAreaWidth - 64 * dpi);
        });
      } else {
        cursorY = drawField('Información', 'Completa los datos del producto para mostrarlos en la etiqueta.', textX, cursorY, infoAreaWidth - 64 * dpi);
      }

      const qrAreaX = canvas.width - qrAreaWidth - gap;
      const qrAreaY = bodyY + gap;
      const qrAreaHeight = bodyH - gap * 2;
      const qrGradient = ctx.createLinearGradient(qrAreaX, qrAreaY, qrAreaX + qrAreaWidth, qrAreaY + qrAreaHeight);
      qrGradient.addColorStop(0, mixWithWhite(colors.accent, 0.65));
      qrGradient.addColorStop(1, mixWithWhite(colors.accent, 0.4));
      ctx.fillStyle = qrGradient;
      roundRect(ctx, qrAreaX, qrAreaY, qrAreaWidth, qrAreaHeight, 36 * dpi, true, false);

      const qrSize = Math.min(qrAreaWidth - gap * 2, qrAreaHeight - gap * 2);
      const qrInnerX = qrAreaX + (qrAreaWidth - qrSize) / 2;
      const qrInnerY = qrAreaY + (qrAreaHeight - qrSize) / 2;
      ctx.fillStyle = '#fff';
      roundRect(ctx, qrInnerX - 12 * dpi, qrInnerY - 12 * dpi, qrSize + 24 * dpi, qrSize + 24 * dpi, 28 * dpi, true, false);
      if (qrImg) {
        ctx.drawImage(qrImg, qrInnerX, qrInnerY, qrSize, qrSize);
      } else {
        ctx.strokeStyle = mixWithWhite(colors.accent, 0.4);
        ctx.lineWidth = 4;
        roundRect(ctx, qrInnerX, qrInnerY, qrSize, qrSize, 20 * dpi, false, true);
      }
    } else {
      const qrAreaWidth = canvas.width - gap * 4;
      const qrAreaHeight = Math.min(bodyH * 0.55, qrAreaWidth);
      const qrAreaX = (canvas.width - qrAreaWidth) / 2;
      const qrAreaY = bodyY + gap;

      const qrGradient = ctx.createLinearGradient(qrAreaX, qrAreaY, qrAreaX, qrAreaY + qrAreaHeight);
      qrGradient.addColorStop(0, mixWithWhite(colors.accent, 0.65));
      qrGradient.addColorStop(1, mixWithWhite(colors.accent, 0.38));
      ctx.fillStyle = qrGradient;
      roundRect(ctx, qrAreaX, qrAreaY, qrAreaWidth, qrAreaHeight, 36 * dpi, true, false);

      const qrSize = Math.min(qrAreaWidth - gap * 2, qrAreaHeight - gap * 2);
      const qrInnerX = qrAreaX + (qrAreaWidth - qrSize) / 2;
      const qrInnerY = qrAreaY + (qrAreaHeight - qrSize) / 2;
      ctx.fillStyle = '#fff';
      roundRect(ctx, qrInnerX - 12 * dpi, qrInnerY - 12 * dpi, qrSize + 24 * dpi, qrSize + 24 * dpi, 28 * dpi, true, false);
      if (qrImg) {
        ctx.drawImage(qrImg, qrInnerX, qrInnerY, qrSize, qrSize);
      } else {
        ctx.strokeStyle = mixWithWhite(colors.accent, 0.4);
        ctx.lineWidth = 4;
        roundRect(ctx, qrInnerX, qrInnerY, qrSize, qrSize, 20 * dpi, false, true);
      }

      const infoX = gap * 2;
      const infoY = qrAreaY + qrAreaHeight + gap;
      const infoWidth = canvas.width - infoX * 2;
      const infoHeight = bodyY + bodyH - infoY - gap;

      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.97)';
      roundRect(ctx, infoX, infoY, infoWidth, infoHeight, 32 * dpi, true, false);
      ctx.lineWidth = 2;
      ctx.strokeStyle = colors.cardBorder;
      roundRect(ctx, infoX, infoY, infoWidth, infoHeight, 32 * dpi, false, true);
      ctx.restore();

      let cursorY = infoY + 28 * dpi;
      const textX = infoX + 32 * dpi;

      ctx.fillStyle = colors.textMain;
      ctx.font = `700 ${24 * dpi}px Poppins, sans-serif`;
      cursorY = drawParagraph(producto?.nombre || 'Nombre del producto', textX, cursorY, infoWidth - 64 * dpi, 30 * dpi, 3) + 12 * dpi;

      if (blocks.length > 0) {
        blocks.forEach(block => {
          cursorY = drawField(block.label, block.value, textX, cursorY, infoWidth - 64 * dpi);
        });
      } else {
        cursorY = drawField('Información', 'Completa los datos del producto para mostrarlos en la etiqueta.', textX, cursorY, infoWidth - 64 * dpi);
      }
    }

    // footer
    const footerY = canvas.height - footerH;
    const footerGradient = ctx.createLinearGradient(0, footerY, canvas.width, footerY);
    footerGradient.addColorStop(0, mixWithWhite(colors.accent, 0.35));
    footerGradient.addColorStop(1, colors.accent);
    ctx.fillStyle = footerGradient;
    ctx.fillRect(0, footerY, canvas.width, footerH);
    ctx.fillStyle = colors.textOnAccent;
    ctx.textBaseline = 'middle';
    ctx.font = `600 ${13 * dpi}px Poppins, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('Etiqueta generada con OptiStock', 24 * dpi, footerY + footerH / 2);
    ctx.textAlign = 'right';
    ctx.fillText('optistock.site', canvas.width - 24 * dpi, footerY + footerH / 2);
    ctx.textAlign = 'left';

    return canvas.toDataURL('image/png');
  }

  // helper: rounded rect
  function roundRect(ctx, x, y, w, h, r, fill, stroke) {
    if (typeof r === 'undefined') r = 5;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  // simple text wrapper
  function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 3) {
    const words = String(text).split(' ');
    let line = '';
    let lines = 0;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line.trim(), x, y + lines * lineHeight);
        line = words[n] + ' ';
        lines++;
        if (lines >= maxLines) { ctx.fillText('…', x + maxWidth - 10, y + lines * lineHeight); return; }
      } else {
        line = testLine;
      }
    }
    if (line) {
      ctx.fillText(line.trim(), x, y + lines * lineHeight);
    }
  }
  const qrModalTitle = document.getElementById('productoQrTitle');
  const qrModalPlaceholder = document.getElementById('productoQrPlaceholder');
  let qrModalProducto = null;
  let qrModalSrc = '';

  function updateLabelPreview() {
    if (!qrModalProducto || !qrModalSrc || !productoLabelCompact) return;
    const orient = getSelectedOrientation();
    productoLabelCompact.innerHTML = '';
    const node = buildCompactLabel(qrModalProducto, qrModalSrc, orient);
    productoLabelCompact.appendChild(node);
  }

  let productoFormCollapse = null;
  if (productoFormCollapseEl && window.bootstrap?.Collapse) {
    productoFormCollapse = window.bootstrap.Collapse.getOrCreateInstance(productoFormCollapseEl, {
      toggle: false
    });
    if (productoFormCollapseEl.classList.contains('show')) {
      productoFormCollapse.show();
    }
  } else if (productoFormCollapseEl) {
    productoFormCollapseEl.classList.add('show');
  }

  function updateProductoFormToggleLabel(isOpen) {
    if (!productoFormToggle) return;
    productoFormToggle.textContent = isOpen ? 'Ocultar formulario' : 'Mostrar formulario';
    productoFormToggle.setAttribute('aria-expanded', String(isOpen));
  }

  function setProductoFormMode(mode, nombre = '') {
    if (productoFormTitle) {
      productoFormTitle.textContent = mode === 'edit' ? 'Editar producto' : 'Registrar nuevo producto';
    }
    if (productoFormSubmit) {
      productoFormSubmit.textContent = mode === 'edit' ? 'Actualizar producto' : 'Guardar producto';
    }
    if (productoFormSubtitle) {
      if (mode === 'edit') {
        productoFormSubtitle.textContent = 'Actualiza la información necesaria y guarda los cambios cuando termines.';
      } else {
        productoFormSubtitle.textContent = productoFormSubtitleDefault;
      }
    }
    if (productoFormModeHint && productoFormModeProduct) {
      if (mode === 'edit' && nombre) {
        productoFormModeProduct.textContent = nombre;
        productoFormModeHint.classList.remove('d-none');
      } else {
        productoFormModeProduct.textContent = '';
        productoFormModeHint.classList.add('d-none');
      }
    }
  }

  if (productoFormCollapseEl) {
    const initialState = productoFormCollapseEl.classList.contains('show');
    updateProductoFormToggleLabel(initialState);
    productoFormCollapseEl.addEventListener('shown.bs.collapse', () => updateProductoFormToggleLabel(true));
    productoFormCollapseEl.addEventListener('hidden.bs.collapse', () => updateProductoFormToggleLabel(false));
  }

  setProductoFormMode('create');

  let qrModalInstance = null;
  if (qrModalElement && window.bootstrap?.Modal) {
    qrModalInstance = window.bootstrap.Modal.getOrCreateInstance(qrModalElement);
  }

  if (qrModalElement) {
    qrModalElement.addEventListener('hidden.bs.modal', () => {
      if (qrModalImage) {
        qrModalImage.onload = null;
        qrModalImage.onerror = null;
        qrModalImage.src = '';
        qrModalImage.classList.add('d-none');
      }
      if (qrModalPlaceholder) {
        qrModalPlaceholder.textContent = 'Generando código QR...';
        qrModalPlaceholder.classList.remove('d-none');
      }
      if (qrModalDownload) {
        qrModalDownload.removeAttribute('href');
        qrModalDownload.dataset.qrSrc = '';
        qrModalDownload.dataset.filename = '';
        qrModalDownload.removeAttribute('download');
        qrModalDownload.classList.remove('disabled');
        qrModalDownload.removeAttribute('aria-disabled');
        qrModalDownload.removeAttribute('aria-busy');
      }
      qrModalProducto = null;
      qrModalSrc = '';
      if (productoLabelCompact) {
        productoLabelCompact.innerHTML = '';
      }
    });
  }

  for (const radio of orientRadios) {
    radio.addEventListener('change', updateLabelPreview);
  }

  function sanitizeFileName(text) {
    return (text || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_-]+/gi, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '')
      .toLowerCase();
  }

  // Read currently selected orientation from radios
  function getSelectedOrientation() {
    for (const r of orientRadios) if (r.checked) return r.value;
    return 'vertical';
  }

  function parseDimensionValue(value) {
    const num = Number.parseFloat(value);
    return Number.isFinite(num) && num > 0 ? num : null;
  }

  function formatDimensionTriplet(producto) {
    const dimensiones = [producto?.dim_x, producto?.dim_y, producto?.dim_z]
      .map(parseDimensionValue);
    if (dimensiones.every(num => Number.isFinite(num))) {
      return dimensiones
        .map(num => (Number.isInteger(num) ? num.toString() : num.toFixed(1)) + ' cm')
        .join(' x ');
    }
    return 'N/D';
  }

  function formatPrecioUnitario(producto) {
    const precio = Number.parseFloat(producto?.precio_compra);
    if (Number.isFinite(precio) && precio >= 0) {
      return `$${precio.toFixed(2)}`;
    }
    if (producto?.precio_compra) {
      return String(producto.precio_compra);
    }
    return 'N/D';
  }

  function roundedRectPath(ctx, x, y, width, height, radius) {
    let r = radius;
    if (typeof r === 'number') {
      r = { tl: r, tr: r, br: r, bl: r };
    } else {
      r = {
        tl: Math.max(0, r.tl || 0),
        tr: Math.max(0, r.tr || 0),
        br: Math.max(0, r.br || 0),
        bl: Math.max(0, r.bl || 0)
      };
    }

    ctx.beginPath();
    ctx.moveTo(x + r.tl, y);
    ctx.lineTo(x + width - r.tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r.tr);
    ctx.lineTo(x + width, y + height - r.br);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r.br, y + height);
    ctx.lineTo(x + r.bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r.bl);
    ctx.lineTo(x, y + r.tl);
    ctx.quadraticCurveTo(x, y, x + r.tl, y);
    ctx.closePath();
  }

  function drawRoundedRect(ctx, x, y, width, height, radius, fillStyle, strokeStyle) {
    roundedRectPath(ctx, x, y, width, height, radius);
    if (fillStyle) {
      ctx.fillStyle = fillStyle;
      ctx.fill();
    }
    if (strokeStyle) {
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  function parseHexColor(hex) {
    if (typeof hex !== 'string') return null;
    let normalized = hex.trim().replace(/^#/, '');
    if (!normalized) return null;
    if (normalized.length === 3) {
      normalized = normalized.split('').map(char => char + char).join('');
    }
    if (normalized.length !== 6) return null;
    const value = Number.parseInt(normalized, 16);
    if (Number.isNaN(value)) return null;
    return {
      r: (value >> 16) & 0xff,
      g: (value >> 8) & 0xff,
      b: value & 0xff
    };
  }

  function hexChannelToString(value) {
    return Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0');
  }

  function hexToRgba(hex, alpha = 1) {
    const rgb = parseHexColor(hex);
    if (!rgb) {
      const safeAlpha = Math.max(0, Math.min(1, alpha));
      return `rgba(0, 0, 0, ${safeAlpha})`;
    }
    const safeAlpha = Math.max(0, Math.min(1, alpha));
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${safeAlpha})`;
  }

  function rgbToHex({ r, g, b }) {
    return `#${hexChannelToString(r)}${hexChannelToString(g)}${hexChannelToString(b)}`;
  }

  function mixWithWhite(hex, weight = 0.2) {
    const rgb = parseHexColor(hex);
    if (!rgb) {
      return '#ffffff';
    }
    const ratio = Math.max(0, Math.min(1, weight));
    const r = rgb.r + (255 - rgb.r) * ratio;
    const g = rgb.g + (255 - rgb.g) * ratio;
    const b = rgb.b + (255 - rgb.b) * ratio;
    return `#${hexChannelToString(r)}${hexChannelToString(g)}${hexChannelToString(b)}`;
  }

  function getRelativeLuminance({ r, g, b }) {
    const channels = [r, g, b].map((value) => {
      const channel = value / 255;
      return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  }

  function getContrastRatio(colorA, colorB) {
    const luminanceA = getRelativeLuminance(colorA);
    const luminanceB = getRelativeLuminance(colorB);
    const lighter = Math.max(luminanceA, luminanceB);
    const darker = Math.min(luminanceA, luminanceB);
    return (lighter + 0.05) / (darker + 0.05);
  }

  function ensureReadableTextColor(colorHex, backgroundHex, options = {}) {
    const {
      minContrast = 4.5,
      fallbackDark = '#1f2538',
      fallbackLight = '#f5f5f5'
    } = options;

    const foregroundRgb = parseHexColor(colorHex) || parseHexColor(fallbackDark);
    const backgroundRgb = parseHexColor(backgroundHex) || { r: 255, g: 255, b: 255 };

    if (!foregroundRgb) {
      return fallbackDark;
    }

    const contrast = getContrastRatio(foregroundRgb, backgroundRgb);
    if (contrast >= minContrast) {
      return rgbToHex(foregroundRgb);
    }

    const backgroundLuminance = getRelativeLuminance(backgroundRgb);
    return backgroundLuminance > 0.5 ? fallbackDark : fallbackLight;
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = String(text ?? '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (words.length === 0) {
      const placeholder = 'N/D';
      ctx.fillText(placeholder, x, y);
      return { lastY: y, nextY: y + lineHeight };
    }

    let line = words[0];
    let currentY = y;
    for (let i = 1; i < words.length; i += 1) {
      const testLine = `${line} ${words[i]}`;
      if (ctx.measureText(testLine).width > maxWidth) {
        ctx.fillText(line, x, currentY);
        line = words[i];
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
    return { lastY: currentY, nextY: currentY + lineHeight };
  }

  function measureWrappedTextHeight(ctx, text, maxWidth, lineHeight) {
    const content = String(text ?? '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (content.length === 0) {
      return lineHeight;
    }

    let line = content[0];
    let lines = 1;
    for (let i = 1; i < content.length; i += 1) {
      const testLine = `${line} ${content[i]}`;
      if (ctx.measureText(testLine).width > maxWidth) {
        line = content[i];
        lines += 1;
      } else {
        line = testLine;
      }
    }

    return lines * lineHeight;
  }

  function crearEtiquetaProducto(producto, qrSrc) {
    return new Promise((resolve, reject) => {
      if (!producto || !qrSrc) {
        reject(new Error('Falta información para generar la etiqueta.'));
        return;
      }

      const qrImage = new Image();
      qrImage.crossOrigin = 'anonymous';
      qrImage.onload = () => {
        const width = 960;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = 1;
        let ctx = canvas.getContext('2d');

        const rootStyles = window.getComputedStyle ? window.getComputedStyle(document.documentElement) : null;
        const paletteColors = {
          header: rootStyles?.getPropertyValue('--sidebar-color')?.trim() || '#171f34',
          headerText: rootStyles?.getPropertyValue('--sidebar-text-color')?.trim() || '#ffffff',
          accent: rootStyles?.getPropertyValue('--topbar-color')?.trim() || '#ff6f91',
          accentText: rootStyles?.getPropertyValue('--topbar-text-color')?.trim() || '#ffffff',
          pageBg: rootStyles?.getPropertyValue('--page-bg')?.trim() || ''
        };

        const infoBackgroundColor = '#ffffff';
        const primaryCanvasText = ensureReadableTextColor(mixWithWhite(paletteColors.header, 0.14), infoBackgroundColor, {
          fallbackDark: '#1f2538'
        });
        const secondaryCanvasText = ensureReadableTextColor(mixWithWhite(paletteColors.header, 0.38), infoBackgroundColor, {
          minContrast: 3.2,
          fallbackDark: '#4b5565'
        });

        const colors = {
          background: paletteColors.pageBg || mixWithWhite(paletteColors.header, 0.92),
          card: '#ffffff',
          border: hexToRgba(paletteColors.header, 0.14),
          header: paletteColors.header,
          headerShadow: hexToRgba(paletteColors.header, 0.22),
          accent: paletteColors.accent,
          accentSoft: hexToRgba(paletteColors.accent, 0.16),
          accentOutline: hexToRgba(paletteColors.accent, 0.28),
          textMain: primaryCanvasText,
          textMuted: secondaryCanvasText,
          textOnDark: paletteColors.headerText,
          textOnDarkMuted: hexToRgba(paletteColors.headerText, 0.72),
          textOnAccent: paletteColors.accentText,
          qrBackdrop: mixWithWhite(paletteColors.accent, 0.85),
          divider: hexToRgba(paletteColors.header, 0.2)
        };

        const margin = 40;
        const cardX = margin;
        const cardY = margin;
        const cardW = width - margin * 2;
        const radius = 28;
        const headerHeight = 208;
        const bodyPadding = 48;
        const qrSize = 232;
        const qrContainerPadding = 28;
        const qrCaptionOffset = 36;
        const qrCaptionLineHeight = 24;
        const columnGap = 72;
        const infoBlockGap = 28;
        const labelHeight = 30;
        const labelSpacing = 18;
        const bodyTop = cardY + headerHeight;
        const infoStartY = bodyTop + bodyPadding;
        const qrAreaWidth = qrSize + qrContainerPadding * 2;
        const qrAreaX = cardX + cardW - bodyPadding - qrAreaWidth;
        const qrX = qrAreaX + qrContainerPadding;
        const qrY = infoStartY;
        const textStartX = cardX + bodyPadding;
        const textWidth = qrAreaX - textStartX - 40;
        const columnWidth = Math.max(200, Math.floor((textWidth - columnGap) / 2));
        const infoColumnsWidth = columnWidth * 2 + columnGap;
        const columnDividerX = textStartX + columnWidth + columnGap / 2;
        const footerHeight = 76;
        const labelFont = '600 13px "Poppins", "Segoe UI", sans-serif';
        const defaultValueFont = '600 22px "Poppins", "Segoe UI", sans-serif';

        const zonaPartes = [];
        if (producto?.zona_nombre) zonaPartes.push(producto.zona_nombre);
        if (producto?.area_nombre) zonaPartes.push(producto.area_nombre);
        const zonaTexto = zonaPartes.length ? zonaPartes.join(' · ') : 'Sin zona asignada';
        const descripcionTexto = producto?.descripcion?.trim() ? producto.descripcion.trim() : 'Sin descripción disponible';
        const categoriaTexto = producto?.categoria_nombre || 'Sin categoría';
        const subcategoriaTexto = producto?.subcategoria_nombre || 'Sin subcategoría';
        const dimensionesTexto = formatDimensionTriplet(producto);
        const precioTexto = formatPrecioUnitario(producto);

        const columnaIzquierda = [
          { etiqueta: 'Zona asignada', valor: zonaTexto },
          {
            etiqueta: 'Descripción',
            valor: descripcionTexto,
            multilinea: true,
            lineHeight: 26,
            font: '400 18px "Poppins", "Segoe UI", sans-serif'
          }
        ];

        const columnaDerecha = [
          { etiqueta: 'Categoría', valor: categoriaTexto },
          { etiqueta: 'Subcategoría', valor: subcategoriaTexto },
          { etiqueta: 'Dimensiones', valor: dimensionesTexto },
          { etiqueta: 'Precio unitario', valor: precioTexto }
        ];
        const measureColumnHeight = column => {
          let total = 0;
          column.forEach(bloque => {
            total += labelHeight + labelSpacing;
            ctx.font = bloque.font || defaultValueFont;
            const lineHeight = bloque.multilinea ? (bloque.lineHeight || 28) : (bloque.lineHeight || 30);
            const textValue = bloque.valor || 'N/D';
            const textHeight = bloque.multilinea
              ? measureWrappedTextHeight(ctx, textValue, columnWidth, lineHeight)
              : lineHeight;
            total += textHeight + infoBlockGap;
          });
          return total;
        };

        const leftColumnHeight = measureColumnHeight(columnaIzquierda);
        const rightColumnHeight = measureColumnHeight(columnaDerecha);
        const columnContentHeight = Math.max(leftColumnHeight, rightColumnHeight);
        const qrContentHeight = qrContainerPadding * 2 + qrSize + qrCaptionOffset + qrCaptionLineHeight;
        const bodyContentHeight = Math.max(columnContentHeight, qrContentHeight);
        const cardH = headerHeight + bodyPadding + bodyContentHeight + bodyPadding + footerHeight;
        const height = cardH + margin * 2;

        canvas.height = height;
        ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.fillStyle = colors.background;
        ctx.fillRect(0, 0, width, height);

        ctx.save();
        ctx.shadowColor = colors.headerShadow;
        ctx.shadowBlur = 32;
        ctx.shadowOffsetY = 20;
        drawRoundedRect(ctx, cardX, cardY, cardW, cardH, radius, colors.card, null);
        ctx.restore();
        drawRoundedRect(ctx, cardX, cardY, cardW, cardH, radius, null, colors.border);

        ctx.save();
        roundedRectPath(ctx, cardX, cardY, cardW, headerHeight, { tl: radius, tr: radius, br: 0, bl: 0 });
        ctx.clip();
        const headerGradient = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + headerHeight);
        headerGradient.addColorStop(0, colors.header);
        headerGradient.addColorStop(1, colors.accent);
        ctx.fillStyle = headerGradient;
        ctx.fillRect(cardX, cardY, cardW, headerHeight);
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = colors.accent;
        ctx.beginPath();
        ctx.ellipse(cardX + cardW * 0.78, cardY + headerHeight * 0.18, cardW * 0.42, headerHeight * 0.9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.restore();

        const paddingX = 48;
        const headerX = cardX + paddingX;
        const badgeHeight = 36;
        const badgePaddingX = 20;
        const badgeText = 'CÓDIGO QR';
        ctx.font = '600 16px "Poppins", "Segoe UI", sans-serif';
        const badgeWidth = Math.min(cardW - paddingX * 2, ctx.measureText(badgeText).width + badgePaddingX * 2);
        const badgeY = cardY + 46;
        drawRoundedRect(ctx, headerX, badgeY, badgeWidth, badgeHeight, 18, colors.accent, colors.accentOutline);
        ctx.save();
        ctx.fillStyle = colors.textOnAccent;
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeText, headerX + badgePaddingX, badgeY + badgeHeight / 2);
        ctx.restore();

        let headerY = badgeY + badgeHeight + 32;
        ctx.fillStyle = colors.textOnDark;
        ctx.font = '700 38px "Poppins", "Segoe UI", sans-serif';
        const headerTitle = wrapText(
          ctx,
          producto?.nombre || 'Producto sin nombre',
          headerX,
          headerY,
          cardW - paddingX * 2,
          42
        );

        const headerInfoY = Math.min(cardY + headerHeight - 36, headerTitle.nextY);
        ctx.fillStyle = colors.textOnDarkMuted;
        ctx.font = '400 18px "Poppins", "Segoe UI", sans-serif';
        ctx.fillText('Etiqueta de inventario OptiStock', headerX, headerInfoY);

        const leftColumnX = textStartX;
        const rightColumnX = textStartX + columnWidth + columnGap;

        const infoBackdropPaddingX = 24;
        const infoBackdropPaddingY = 20;
        const infoBackdropX = leftColumnX - infoBackdropPaddingX;
        const infoBackdropY = infoStartY - infoBackdropPaddingY;
        const infoBackdropHeight = columnContentHeight + infoBackdropPaddingY * 2;
        drawRoundedRect(
          ctx,
          infoBackdropX,
          infoBackdropY,
          infoColumnsWidth + infoBackdropPaddingX * 2,
          infoBackdropHeight,
          26,
          hexToRgba(colors.header, 0.06),
          hexToRgba(colors.header, 0.12)
        );

        const renderInfoBlock = (startX, startY, width, bloque) => {
          let currentY = startY;

          const labelText = String(bloque.etiqueta || '').toUpperCase();
          ctx.font = labelFont;
          const labelWidth = Math.min(width, ctx.measureText(labelText).width + 32);
          drawRoundedRect(ctx, startX, currentY, labelWidth, labelHeight, 16, colors.accentSoft, colors.accentOutline);
          ctx.save();
          ctx.fillStyle = colors.accent;
          ctx.textBaseline = 'middle';
          ctx.fillText(labelText, startX + 16, currentY + labelHeight / 2);
          ctx.restore();

          currentY += labelHeight + labelSpacing;
          ctx.fillStyle = colors.textMain;
          ctx.font = bloque.font || defaultValueFont;

          if (bloque.multilinea) {
            const lineHeight = bloque.lineHeight || 28;
            const wrapped = wrapText(ctx, bloque.valor, startX, currentY, width, lineHeight);
            currentY = wrapped.nextY;
          } else {
            const lineHeight = bloque.lineHeight || 30;
            ctx.fillText(bloque.valor || 'N/D', startX, currentY);
            currentY += lineHeight;
          }

          currentY += infoBlockGap;
          return currentY;
        };

        let leftColumnY = infoStartY;
        columnaIzquierda.forEach(bloque => {
          leftColumnY = renderInfoBlock(leftColumnX, leftColumnY, columnWidth, bloque);
        });

        let rightColumnY = infoStartY;
        columnaDerecha.forEach(bloque => {
          rightColumnY = renderInfoBlock(rightColumnX, rightColumnY, columnWidth, bloque);
        });

        ctx.strokeStyle = colors.divider;
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 14]);
        ctx.beginPath();
        const dividerTop = infoStartY - 12;
        const dividerBottom = Math.max(leftColumnY, rightColumnY) - infoBlockGap * 0.5;
        ctx.moveTo(columnDividerX, dividerTop);
        ctx.lineTo(columnDividerX, dividerBottom);
        ctx.stroke();
        ctx.setLineDash([]);

        const qrContainerX = qrX - qrContainerPadding;
        const qrContainerY = qrY - qrContainerPadding;
        const qrContainerSize = qrSize + qrContainerPadding * 2;
        drawRoundedRect(
          ctx,
          qrContainerX,
          qrContainerY,
          qrContainerSize,
          qrContainerSize,
          26,
          colors.qrBackdrop,
          colors.accentOutline
        );
        ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

        ctx.fillStyle = colors.textMuted;
        ctx.font = '500 16px "Poppins", "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Escanea para ver detalles', qrX + qrSize / 2, qrY + qrSize + qrCaptionOffset);
        ctx.textAlign = 'left';

        ctx.save();
        roundedRectPath(ctx, cardX, cardY + cardH - footerHeight, cardW, footerHeight, {
          tl: 0,
          tr: 0,
          br: radius,
          bl: radius
        });
        ctx.clip();
        const footerGradient = ctx.createLinearGradient(cardX, cardY + cardH - footerHeight, cardX + cardW, cardY + cardH);
        footerGradient.addColorStop(0, colors.accent);
        footerGradient.addColorStop(1, colors.header);
        ctx.fillStyle = footerGradient;
        ctx.fillRect(cardX, cardY + cardH - footerHeight, cardW, footerHeight);
        ctx.restore();

        ctx.save();
        ctx.fillStyle = colors.textOnAccent;
        ctx.textBaseline = 'middle';
        const footerCenterY = cardY + cardH - footerHeight / 2;
        ctx.font = '600 20px "Poppins", "Segoe UI", sans-serif';
        ctx.fillText('Etiqueta generada con OptiStock', textStartX, footerCenterY);
        ctx.textAlign = 'right';
        ctx.fillText('OptiStock', cardX + cardW - bodyPadding, footerCenterY);
        ctx.textAlign = 'left';
        ctx.restore();

        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataUrl);
      };
      qrImage.onerror = () => {
        reject(new Error('No se pudo cargar la imagen del código QR.'));
      };
      qrImage.src = qrSrc;
    });
  }

  async function handleEtiquetaDownload(event) {
    if (!qrModalDownload) return;
    if (!qrModalProducto || !qrModalSrc) {
      if (qrModalSrc) {
        qrModalDownload.href = qrModalSrc;
      }
      return;
    }
    // Use the new renderer which supports orientation
    event.preventDefault();
    if (qrModalDownload.classList.contains('disabled')) {
      return;
    }

    try {
      qrModalDownload.classList.add('disabled');
      qrModalDownload.setAttribute('aria-disabled', 'true');
      qrModalDownload.setAttribute('aria-busy', 'true');

      const orient = getSelectedOrientation();
      // renderLabelToPng supports orientation and produces a consistent PNG
      const dataUrl = await renderLabelToPng(qrModalProducto, qrModalSrc, orient, 900, 2);
      const filenameBase = qrModalDownload.dataset.filename || 'producto_etiqueta';
      const tempLink = document.createElement('a');
      tempLink.href = dataUrl;
      tempLink.download = `${filenameBase}.png`;
      document.body.appendChild(tempLink);
      tempLink.click();
      tempLink.remove();
    } catch (error) {
      console.error('Error generando etiqueta del producto', error);
      showToast('No se pudo generar la etiqueta del producto', 'error');
      if (qrModalSrc) {
        window.open(qrModalSrc, '_blank');
      }
    } finally {
      qrModalDownload.classList.remove('disabled');
      qrModalDownload.removeAttribute('aria-disabled');
      qrModalDownload.removeAttribute('aria-busy');
    }
  }

  qrModalDownload?.addEventListener('click', handleEtiquetaDownload);

  const productoFormContainer = document.getElementById('productoFormContainer');
  const categoriaFormContainer = document.getElementById('categoriaFormContainer');
  const subcategoriaFormContainer = document.getElementById('subcategoriaFormContainer');

  const tabButtons = {
    producto: btnProductos,
    categoria: btnCategorias,
    subcategoria: btnSubcategorias
  };

  const tabContainers = {
    producto: productoFormContainer,
    categoria: categoriaFormContainer,
    subcategoria: subcategoriaFormContainer
  };

  const resumenProductosEl = document.getElementById('resumenProductos');
  const resumenCategoriasEl = document.getElementById('resumenCategorias');
  const resumenCriticosEl = document.getElementById('resumenCriticos');
  const tablaDescripcionEl = document.getElementById('tablaResumenDescripcion');
  const exportResumenPdfBtn = document.getElementById('exportResumenPdf');
  const exportResumenExcelBtn = document.getElementById('exportResumenExcel');


async function fetchAPI(url, method = 'GET', data) {
  const options = { method };
  if (data) {
    options.headers = { 'Content-Type': 'application/json' };
    options.body    = JSON.stringify(data);
  }
  const res = await fetch(url, options);
  // clonamos la respuesta para poder leer el texto si json() falla
  const clone = res.clone();

  // Intentamos parsear el JSON
  let payload;
  try {
    payload = await res.json();
  } catch (e) {
    const text = await clone.text();
    console.error(`⚠️ fetchAPI: respuesta HTTP ${res.status} no es JSON:\n`, text);
    throw new Error(`HTTP ${res.status} – respuesta no-JSON: ${text.slice(0,200)}`);
  }

   // Si hubo cualquier código ≠2xx, volcamos el JSON y lanzamos
  if (!res.ok) {
    console.warn(`⚠️ fetchAPI: HTTP ${res.status}`, payload);
    const msg = payload.error || `Error HTTP ${res.status}`;
    const error = new Error(msg);
    error.status = res.status;
    error.payload = payload;
    throw error;
  }

  // OK → devolvemos el objeto parsado
  return payload;
}

  function showToast(message, type = 'info') {
    if (type === 'success' && typeof window.toastOk === 'function') {
      window.toastOk(message);
      return;
    }
    if (type === 'error' && typeof window.toastError === 'function') {
      window.toastError(message);
      return;
    }
    if (typeof window.toastInfo === 'function') {
      window.toastInfo(message);
      return;
    }

    const toast = document.createElement('div');
    toast.className = `toast-message toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  function actualizarIndicadores() {
    if (resumenProductosEl) {
      resumenProductosEl.textContent = productos.length;
    }
    if (resumenCategoriasEl) {
      resumenCategoriasEl.textContent = categorias.length;
    }
    if (resumenCriticosEl) {
      const criticos = productos.filter(p => {
        const stock = parseInt(p.stock, 10) || 0;
        const minimo = parseInt(p.stock_minimo, 10);
        if (Number.isFinite(minimo) && minimo > 0) {
          return stock <= minimo;
        }
        return stock <= 5;
      }).length;
      resumenCriticosEl.textContent = criticos;
    }
  }

  function obtenerMetaExportacion() {
    if (vistaActual === 'categoria') {
      return {
        title: 'Categorías del inventario',
        fileNameBase: 'inventario_categorias',
        sheetName: 'Categorias',
        historyLabel: 'Categorías del inventario',
        countLabel: total => (total === 1 ? '1 categoría registrada' : `${total} categorías registradas`),
        viewLabel: 'Vista: Categorías',
        orientation: 'landscape'
      };
    }
    if (vistaActual === 'subcategoria') {
      return {
        title: 'Subcategorías del inventario',
        fileNameBase: 'inventario_subcategorias',
        sheetName: 'Subcategorias',
        historyLabel: 'Subcategorías del inventario',
        countLabel: total => (total === 1 ? '1 subcategoría registrada' : `${total} subcategorías registradas`),
        viewLabel: 'Vista: Subcategorías',
        orientation: 'landscape'
      };
    }
    return {
      title: 'Catálogo de productos',
      fileNameBase: 'inventario_productos',
      sheetName: 'Productos',
      historyLabel: 'Productos del inventario',
      countLabel: total => (total === 1 ? '1 producto registrado' : `${total} productos registrados`),
      viewLabel: 'Vista: Productos',
      orientation: 'landscape'
    };
  }

  function construirSubtituloResumen(dataset, meta = {}) {
    const exporter = window.ReportExporter;
    const empresaNombre = exporter?.getEmpresaNombre
      ? exporter.getEmpresaNombre()
      : getEmpresaNombre();
    const timestamp = exporter?.formatTimestamp
      ? exporter.formatTimestamp()
      : new Date().toLocaleString();
    const conteo = typeof meta.countLabel === 'function'
      ? meta.countLabel(dataset.rowCount)
      : exporter?.pluralize
        ? exporter.pluralize(dataset.rowCount, 'registro')
        : `${dataset.rowCount} registros`;

    const partes = [
      `Empresa: ${empresaNombre}`,
      conteo
    ];

    if (meta.viewLabel) {
      partes.push(meta.viewLabel);
    }

    partes.push(`Generado: ${timestamp}`);
    return partes.filter(Boolean).join(' · ');
  }

  async function guardarReporteInventario(blob, fileName, notes) {
    if (!(blob instanceof Blob)) {
      return;
    }
    if (!window.ReportHistory || typeof window.ReportHistory.saveGeneratedFile !== 'function') {
      return;
    }

    try {
      await window.ReportHistory.saveGeneratedFile({
        blob,
        fileName,
        source: 'Gestión de inventario',
        notes
      });
    } catch (error) {
      console.warn('No se pudo guardar el reporte del inventario en el historial:', error);
    }
  }

  async function generarExportacionResumen(formato) {
    const exporter = window.ReportExporter;
    if (!exporter) {
      showToast('No se pudo cargar el módulo de exportación. Recarga la página e inténtalo nuevamente.', 'error');
      return;
    }
    if (!(tablaResumenElemento instanceof HTMLTableElement)) {
      showToast('No se encontró la tabla del resumen.', 'error');
      return;
    }

    const dataset = exporter.extractTableData(tablaResumenElemento);
    if (!dataset || !dataset.rowCount) {
      showToast('No hay registros disponibles para exportar.', 'error');
      return;
    }

    const meta = obtenerMetaExportacion();
    const subtitle = construirSubtituloResumen(dataset, meta);
    const historyLabel = meta.historyLabel || meta.title || 'reporte';
    const notes = {
      pdf: meta.notes?.pdf || `Exportación de ${historyLabel} a PDF`,
      excel: meta.notes?.excel || `Exportación de ${historyLabel} a Excel`
    };

    try {
      if (formato === 'pdf') {
        const result = exporter.exportTableToPdf({
          table: tablaResumenElemento,
          data: dataset,
          title: meta.title || 'Reporte',
          subtitle,
          fileName: `${meta.fileNameBase || 'reporte'}.pdf`,
          orientation: meta.orientation || 'landscape'
        });
        if (result?.blob) {
          await guardarReporteInventario(result.blob, result.fileName, notes.pdf);
        }
        showToast('Reporte PDF generado correctamente.', 'success');
        return;
      }

      if (formato === 'excel') {
        const result = exporter.exportTableToExcel({
          table: tablaResumenElemento,
          data: dataset,
          fileName: `${meta.fileNameBase || 'reporte'}.xlsx`,
          sheetName: meta.sheetName || 'Datos'
        });
        if (result?.blob) {
          await guardarReporteInventario(result.blob, result.fileName, notes.excel);
        }
        showToast('Reporte Excel generado correctamente.', 'success');
        return;
      }
    } catch (error) {
      console.error('Error al exportar el resumen del inventario:', error);
      if (error && error.message === 'PDF_LIBRARY_MISSING') {
        showToast('La librería para generar PDF no está disponible. Actualiza la página.', 'error');
        return;
      }
      if (error && error.message === 'EXCEL_LIBRARY_MISSING') {
        showToast('La librería para generar Excel no está disponible. Actualiza la página.', 'error');
        return;
      }
      showToast('No se pudo generar el reporte. Inténtalo nuevamente.', 'error');
    }
  }

  function mostrar(seccion) {
    Object.values(tabContainers).forEach(container => {
      if (container) {
        container.classList.add('d-none');
      }
    });

    Object.values(tabButtons).forEach(button => {
      if (button) {
        button.classList.remove('active');
        button.setAttribute('aria-selected', 'false');
      }
    });

    vistaActual = seccion;
    renderResumen();

    const activeContainer = tabContainers[seccion];
    if (activeContainer) {
      activeContainer.classList.remove('d-none');
    }

    const activeButton = tabButtons[seccion];
    if (activeButton) {
      activeButton.classList.add('active');
      activeButton.setAttribute('aria-selected', 'true');
    }
  }

  btnProductos?.addEventListener('click', () => mostrar('producto'));
  btnCategorias?.addEventListener('click', () => mostrar('categoria'));
  btnSubcategorias?.addEventListener('click', () => mostrar('subcategoria'));

  exportResumenPdfBtn?.addEventListener('click', () => generarExportacionResumen('pdf'));
  exportResumenExcelBtn?.addEventListener('click', () => generarExportacionResumen('excel'));

  const prodForm = document.getElementById('productoForm');
  const catForm = document.getElementById('categoriaForm');
  const subcatForm = document.getElementById('subcategoriaForm');
  const prodCategoria = document.getElementById('prodCategoria');
  const prodSubcategoria = document.getElementById('prodSubcategoria');
 // Cada vez que cambie la categoría, repoblamos el select de subcategorías
prodCategoria?.addEventListener('change', () => {
  // parseInt devuelve NaN si está vacío; con || null forzamos null
  const catId = parseInt(prodCategoria.value) || null;
  actualizarSelectSubcategorias(catId);
});

  prodArea?.addEventListener('change', () => {
    if (prodZona) {
      prodZona.value = '';
    }
    actualizarSelectZonas(prodArea?.value || null);
  });
  const subcatCategoria = document.getElementById('subcatCategoria');
  const tablaResumenElemento = document.getElementById('tablaResumen');
  const tablaResumen = document.querySelector('#tablaResumen tbody');

  function closeAllActionMenus(exceptMenu = null) {
    document
      .querySelectorAll('.table-action-menu__dropdown.is-open')
      .forEach(menu => {
        if (menu === exceptMenu) return;
        menu.classList.remove('is-open');
        const toggle = menu.previousElementSibling;
        if (toggle?.classList.contains('table-action-menu__toggle')) {
          toggle.setAttribute('aria-expanded', 'false');
        }
      });
  }

  document.addEventListener('click', event => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;
    if (target.closest('.table-action-menu')) return;
    closeAllActionMenus();
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    closeAllActionMenus();
  });
  const tablaHead = document.getElementById('tablaHead');
  const btnRecargarResumen = document.getElementById('btnRecargarResumen');
  const btnScanQR = document.getElementById('btnScanQR');
  const btnIngreso = document.getElementById('btnIngreso');
  const btnEgreso  = document.getElementById('btnEgreso');
  const movimientoModalElement = document.getElementById('movimientoModal');
  const movModal   = movimientoModalElement ? new bootstrap.Modal(movimientoModalElement) : null;
  const movTitle   = document.getElementById('movimientoTitle');
  const movProdSel = document.getElementById('movProdSelect');
  const movCant    = document.getElementById('movCantidad');
  const movGuardar = document.getElementById('movGuardar');
  let movTipo      = '';
  const qrReader   = document.getElementById('qrReader');
  let qrScanner;
  const scanModalElement = document.getElementById('scanModal');
  const scanModal = scanModalElement ? new bootstrap.Modal(scanModalElement) : null;
  const qrHelperText = document.getElementById('qrHelperText');
  const textoAyudaEscaneoBase = 'Coloca el código frente a la cámara para registrar el movimiento y confirma la operación antes de guardarla.';
  const textoAyudaProducto = 'Producto identificado. Selecciona el tipo de movimiento y confirma la cantidad antes de guardar.';
  const scanResult = document.getElementById('scanResult');
  const scanProdName = document.getElementById('scanProductoNombre');
  const scanProdCodigo = document.getElementById('scanProductoCodigo');
  const scanProdStock = document.getElementById('scanProductoStock');
  const scanTipoSelect = document.getElementById('scanMovimientoTipo');
  const scanCantidadInput = document.getElementById('scanMovimientoCantidad');
  const scanCantidadHelp = document.getElementById('scanCantidadAyuda');
  const scanRegistrar = document.getElementById('scanRegistrar');
  const scanReintentar = document.getElementById('scanReintentar');
  let scanProductoActual = null;
  let iniciarEscaneoPendiente = false;
  let scannerActivo = false;
  let preferredCameraId = null;
  let fallbackCameraId = null;
  let avisoCantidadCeroMostrado = false;

  async function detenerScanner() {
    if (!qrScanner || !scannerActivo) {
      return;
    }
    try {
      await qrScanner.stop();
    } catch (error) {
      console.warn('No se pudo detener el escáner', error);
    } finally {
      scannerActivo = false;
    }

    try {
      await qrScanner.clear();
    } catch (error) {
      console.debug('No se pudo limpiar el contenedor del escáner', error);
    }
  }

  const getScannerConfig = () => {
    const readerWidth = qrReader?.offsetWidth || 0;
    const maxBox = Math.min(420, Math.max(readerWidth - 40, 0));
    const size = Math.max(260, maxBox || 320);
    const config = {
      fps: 10,
      qrbox: { width: size, height: size },
      aspectRatio: 1
    };
    if (window.Html5QrcodeSupportedFormats?.QR_CODE) {
      config.formatsToSupport = [window.Html5QrcodeSupportedFormats.QR_CODE];
    }
    return config;
  };

  const obtenerStockNumerico = producto => {
    if (!producto) {
      return 0;
    }
    const raw = producto.stock ?? producto.stock_actual ?? 0;
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  function actualizarUIProductoEscaneado() {
    if (!scanProductoActual) {
      return;
    }
    if (scanProdName) {
      scanProdName.textContent = scanProductoActual.nombre || `Producto #${scanProductoActual.id}`;
    }
    if (scanProdCodigo) {
      scanProdCodigo.textContent = `ID interno: ${scanProductoActual.id}`;
    }
    if (scanProdStock) {
      scanProdStock.textContent = String(obtenerStockNumerico(scanProductoActual));
    }
  }

  function actualizarAyudaCantidad() {
    if (!scanProductoActual) {
      if (scanCantidadHelp) {
        scanCantidadHelp.textContent = 'Escanea un producto para registrar su movimiento.';
      }
      if (scanRegistrar) {
        scanRegistrar.disabled = true;
      }
      return;
    }

    if (!scanTipoSelect || !scanCantidadInput) {
      return;
    }

    const tipo = scanTipoSelect.value === 'egreso' ? 'egreso' : 'ingreso';
    const stockActual = obtenerStockNumerico(scanProductoActual);
    const rawCantidad = scanCantidadInput.value.trim();
    const cantidadActual = rawCantidad === '' ? 1 : parseInt(rawCantidad, 10);

    scanCantidadInput.min = '1';

    if (tipo === 'egreso') {
      if (stockActual <= 0) {
        scanCantidadInput.value = '';
        scanCantidadInput.disabled = true;
        scanCantidadInput.removeAttribute('max');
        if (scanCantidadHelp) {
          scanCantidadHelp.textContent = 'No hay unidades disponibles para registrar un egreso.';
        }
        if (scanRegistrar) {
          scanRegistrar.disabled = true;
        }
        return;
      }

      scanCantidadInput.disabled = false;
      scanCantidadInput.max = String(stockActual);
      if (rawCantidad !== '' && Number.isFinite(cantidadActual) && cantidadActual > stockActual) {
        scanCantidadInput.value = String(stockActual);
      }
      if (scanCantidadHelp) {
        const plural = stockActual === 1 ? '' : 'es';
        scanCantidadHelp.textContent = `Puedes retirar hasta ${stockActual} unidad${plural}.`;
      }
      if (scanRegistrar) {
        scanRegistrar.disabled = false;
      }
      return;
    }

    scanCantidadInput.disabled = false;
    scanCantidadInput.removeAttribute('max');
    if (scanCantidadHelp) {
      scanCantidadHelp.textContent = 'Las unidades ingresadas se sumarán al stock actual.';
    }
    if (scanRegistrar) {
      scanRegistrar.disabled = false;
    }
  }

  function prepararEscaneoUI() {
    scanProductoActual = null;
    scanResult?.classList.add('d-none');
    qrReader?.classList.remove('d-none');
    if (qrHelperText) {
      qrHelperText.textContent = textoAyudaEscaneoBase;
    }
    if (scanProdName) {
      scanProdName.textContent = 'Producto seleccionado';
    }
    if (scanProdCodigo) {
      scanProdCodigo.textContent = 'ID interno:';
    }
    if (scanProdStock) {
      scanProdStock.textContent = '0';
    }
    if (scanTipoSelect) {
      scanTipoSelect.value = 'ingreso';
      scanTipoSelect.disabled = true;
    }
    if (scanCantidadInput) {
      scanCantidadInput.value = '';
      scanCantidadInput.disabled = true;
      scanCantidadInput.removeAttribute('max');
    }
    avisoCantidadCeroMostrado = false;
    if (scanCantidadHelp) {
      scanCantidadHelp.textContent = 'Escanea un producto para registrar su movimiento.';
    }
    if (scanRegistrar) {
      scanRegistrar.disabled = true;
    }
  }

  function mostrarProductoEscaneado(producto) {
    if (!producto) {
      return;
    }
    scanProductoActual = producto;
    qrReader?.classList.add('d-none');
    scanResult?.classList.remove('d-none');
    if (qrHelperText) {
      qrHelperText.textContent = textoAyudaProducto;
    }
    if (scanTipoSelect) {
      scanTipoSelect.disabled = false;
      scanTipoSelect.value = 'ingreso';
    }
    if (scanCantidadInput) {
      scanCantidadInput.disabled = false;
      scanCantidadInput.value = '';
      scanCantidadInput.min = '1';
      scanCantidadInput.removeAttribute('max');
    }
    avisoCantidadCeroMostrado = false;
    if (scanRegistrar) {
      scanRegistrar.disabled = false;
    }
    actualizarUIProductoEscaneado();
    actualizarAyudaCantidad();
  }

  async function iniciarScanner() {
    if (!scanModalElement?.classList.contains('show')) {
      iniciarEscaneoPendiente = true;
      return;
    }
    if (scannerActivo) {
      return;
    }
    if (!qrReader) {
      showToast('No se encontró el lector QR en la interfaz', 'error');
      return;
    }

    if (!qrScanner) {
      qrScanner = new Html5Qrcode('qrReader');
    }

    const config = getScannerConfig();

    const startWithCamera = async cameraId => {
      if (!cameraId) {
        await qrScanner.start({ facingMode: { ideal: 'environment' } }, config, procesarLectura, handleScanError);
        return;
      }
      await qrScanner.start({ deviceId: { exact: cameraId } }, config, procesarLectura, handleScanError);
    };

    try {
      await startWithCamera(preferredCameraId);
      scannerActivo = true;
      iniciarEscaneoPendiente = false;
    } catch (error) {
      console.warn('No se pudo iniciar la cámara preferida, intentando alternativa.', error);
      if (fallbackCameraId && fallbackCameraId !== preferredCameraId) {
        try {
          await startWithCamera(fallbackCameraId);
          scannerActivo = true;
          iniciarEscaneoPendiente = false;
          return;
        } catch (fallbackError) {
          console.error('No se pudo iniciar la cámara alternativa', fallbackError);
        }
      }

      qrReader?.classList.add('d-none');
      scanModal?.hide();
      showToast('Error al iniciar la cámara', 'error');
    }
  }

  let lastScanError = '';
  const handleScanError = errorMessage => {
    if (typeof errorMessage !== 'string') {
      return;
    }
    if (errorMessage === lastScanError) {
      return;
    }
    lastScanError = errorMessage;
    console.debug('Scanner detectó un error/ruido', errorMessage);
  };

  async function procesarLectura(decodedText) {
    await detenerScanner();

    const productoId = parseInt(String(decodedText).trim(), 10);
    if (!Number.isFinite(productoId)) {
      showToast('Código QR no reconocido', 'error');
      prepararEscaneoUI();
      try {
        await iniciarScanner();
      } catch (reinicioError) {
        console.warn('No se pudo reiniciar el escáner tras un código inválido', reinicioError);
      }
      return;
    }

    let producto = productos.find(p => parseInt(p.id, 10) === productoId);

    if (!producto) {
      try {
        const remoto = await fetchAPI(`${API.productos}?empresa_id=${EMP_ID}&id=${productoId}`);
        if (remoto && remoto.id) {
          producto = remoto;
        }
      } catch (consultaError) {
        console.warn('No se pudo consultar el producto escaneado', consultaError);
      }
    }

    if (!producto) {
      showToast('El producto escaneado no se encuentra en el inventario.', 'error');
      prepararEscaneoUI();
      try {
        await iniciarScanner();
      } catch (reinicioError) {
        console.warn('No se pudo reiniciar el escáner tras un producto desconocido', reinicioError);
      }
      return;
    }
    mostrarProductoEscaneado(producto);
  }

  scanModalElement?.addEventListener('hidden.bs.modal', async () => {
    await detenerScanner();
    iniciarEscaneoPendiente = false;
    prepararEscaneoUI();
  });

  scanTipoSelect?.addEventListener('change', () => {
    actualizarAyudaCantidad();
  });

  scanCantidadInput?.addEventListener('input', () => {
    if (!scanCantidadInput) {
      return;
    }

    const raw = scanCantidadInput.value.trim();

    if (raw === '') {
      avisoCantidadCeroMostrado = false;
      actualizarAyudaCantidad();
      return;
    }

    let value = parseInt(raw, 10);

    if (!Number.isFinite(value)) {
      scanCantidadInput.value = '';
      actualizarAyudaCantidad();
      return;
    }

    if (value === 0) {
      if (!avisoCantidadCeroMostrado) {
        showToast('No se puede poner 0 a secas.', 'error');
        avisoCantidadCeroMostrado = true;
      }
      scanCantidadInput.value = '';
      actualizarAyudaCantidad();
      return;
    }

    avisoCantidadCeroMostrado = false;

    if (value < 0) {
      scanCantidadInput.value = '';
      actualizarAyudaCantidad();
      return;
    }

    if (scanProductoActual && scanTipoSelect?.value === 'egreso') {
      const stockActual = obtenerStockNumerico(scanProductoActual);
      if (stockActual > 0 && value > stockActual) {
        value = stockActual;
      }
    }
    scanCantidadInput.value = String(value);
    actualizarAyudaCantidad();
  });

  scanReintentar?.addEventListener('click', async () => {
    await detenerScanner();
    prepararEscaneoUI();
    try {
      await iniciarScanner();
    } catch (error) {
      console.warn('No se pudo reiniciar el escáner manualmente', error);
    }
  });

  scanRegistrar?.addEventListener('click', async () => {
    if (!scanProductoActual) {
      showToast('Escanea un producto antes de registrar el movimiento.', 'error');
      return;
    }

    const prodId = parseInt(scanProductoActual.id, 10);
    if (!Number.isFinite(prodId)) {
      showToast('El identificador del producto es inválido.', 'error');
      return;
    }

    const tipo = scanTipoSelect?.value === 'egreso' ? 'egreso' : 'ingreso';
    const rawCantidad = scanCantidadInput?.value?.trim() ?? '';
    const cantidad = rawCantidad === '' ? 1 : parseInt(rawCantidad, 10);

    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      showToast('La cantidad debe ser mayor a cero.', 'error');
      if (scanCantidadInput) {
        scanCantidadInput.value = '';
      }
      actualizarAyudaCantidad();
      return;
    }

    const stockActual = obtenerStockNumerico(scanProductoActual);

    if (tipo === 'egreso') {
      if (stockActual <= 0) {
        showToast('No hay unidades disponibles para egresar.', 'error');
        actualizarAyudaCantidad();
        return;
      }
      if (cantidad > stockActual) {
        showToast('La cantidad no puede exceder el stock disponible.', 'error');
        if (scanCantidadInput) {
          scanCantidadInput.value = String(stockActual);
        }
        actualizarAyudaCantidad();
        return;
      }
    }

    try {
      if (scanRegistrar) {
        scanRegistrar.disabled = true;
      }

      const movimientoPayload = {
        empresa_id: EMP_ID,
        producto_id: prodId,
        tipo,
        cantidad
      };
      const resultado = await fetchAPI(API.movimiento, 'POST', movimientoPayload);
      if (resultado?.success !== true) {
        throw new Error(resultado?.error || 'No se pudo registrar el movimiento');
      }

      const nuevoStock = (() => {
        const remoto = parseInt(resultado.stock_actual, 10);
        if (Number.isFinite(remoto)) {
          return remoto;
        }
        return tipo === 'ingreso' ? stockActual + cantidad : stockActual - cantidad;
      })();

      scanProductoActual.stock = nuevoStock;

      if (scanCantidadInput) {
        scanCantidadInput.value = '';
      }
      if (qrHelperText) {
        qrHelperText.textContent = 'Movimiento registrado. Puedes escanear otro código o ajustar el mismo producto.';
      }

      await cargarProductos();
      renderResumen();

      const productoActualizado = productos.find(p => parseInt(p.id, 10) === prodId);
      if (productoActualizado) {
        scanProductoActual = productoActualizado;
      }

      actualizarUIProductoEscaneado();
      actualizarAyudaCantidad();

      document.dispatchEvent(new CustomEvent('movimientoRegistrado', {
        detail: {
          productoId: prodId,
          tipo,
          cantidad,
          stockActual: nuevoStock
        }
      }));

      showToast(`Movimiento ${tipo} registrado`, 'success');
    } catch (error) {
      console.error(error);
      showToast('Error al registrar movimiento: ' + (error?.message || 'desconocido'), 'error');
    } finally {
      if (scanRegistrar) {
        scanRegistrar.disabled = false;
      }
      actualizarAyudaCantidad();
    }
  });

function poblarSelectProductos() {
  if (!movProdSel) return;
  movProdSel.innerHTML = '<option value="">Seleccione producto</option>';
  productos.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.nombre} (Stock: ${p.stock})`;
    movProdSel.appendChild(opt);
  });
}

btnScanQR?.addEventListener('click', async () => {
  if (!navigator.mediaDevices || !window.isSecureContext) {
    showToast('La cámara no es compatible o se requiere HTTPS/localhost', 'error');
    return;
  }

  if (!scanModal) {
    showToast('No se pudo abrir el escáner QR', 'error');
    return;
  }

  let testStream;
  try {
    testStream = await navigator.mediaDevices.getUserMedia({ video: true });
  } catch (error) {
    console.error('No se pudo obtener permiso para la cámara', error);
    showToast('Permiso de cámara denegado o no disponible', 'error');
    return;
  } finally {
    if (testStream) {
      testStream.getTracks().forEach(track => track.stop());
    }
  }

  let cameras = [];
  try {
    cameras = await Html5Qrcode.getCameras();
  } catch (error) {
    console.warn('No se pudieron enumerar las cámaras disponibles', error);
    cameras = [];
  }

  if (Array.isArray(cameras) && cameras.length > 0) {
    const backRegex = /(back|rear|environment)/i;
    const backCamera = cameras.find(cam => backRegex.test(cam.label));
    preferredCameraId = (backCamera || cameras[0]).id;
    const secondaryCamera = cameras.find(cam => cam.id !== preferredCameraId);
    fallbackCameraId = secondaryCamera ? secondaryCamera.id : null;
  } else {
    preferredCameraId = null;
    fallbackCameraId = null;
  }

  iniciarEscaneoPendiente = true;
  qrReader?.classList.remove('d-none');
  scanModal.show();
});

scanModalElement?.addEventListener('shown.bs.modal', async () => {
  prepararEscaneoUI();
  iniciarEscaneoPendiente = false;
  try {
    await iniciarScanner();
  } catch (error) {
    console.warn('No se pudo iniciar el escáner al abrir el modal', error);
  }
});

 btnIngreso?.addEventListener('click', () => {
    if (!movModal || !movTitle || !movCant) {
      console.warn('Modal de movimientos no disponible.');
      return;
    }
    movTipo = 'ingreso';
    movTitle.textContent = 'Registrar Ingreso';
    poblarSelectProductos();
    if (movCant) movCant.value = '';
    movModal.show();
  });
  btnEgreso?.addEventListener('click', () => {
    if (!movModal || !movTitle || !movCant) {
      console.warn('Modal de movimientos no disponible.');
      return;
    }
    movTipo = 'egreso';
    movTitle.textContent = 'Registrar Egreso';
    poblarSelectProductos();
    if (movCant) movCant.value = '';
    movModal.show();
  });





  function actualizarSelectCategorias() {
    [prodCategoria, subcatCategoria].forEach(select => {
      if (!select) return;
      select.innerHTML = '<option value="">Seleccione categoría</option>';
      categorias.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.nombre;
        select.appendChild(opt);
      });
    });
  }

function actualizarSelectSubcategorias(categoriaId) {
  if (!prodSubcategoria) return;
  prodSubcategoria.innerHTML = '<option value="">Seleccione subcategoría</option>';
  // Si no hay categoría elegida, salimos con sólo el placeholder
  if (!categoriaId) return;
  // Filtramos y añadimos las que coincidan
  subcategorias
    .filter(sc => parseInt(sc.categoria_id, 10) === categoriaId)
    .forEach(sc => {
      const opt = document.createElement('option');
      opt.value = sc.id;
      opt.textContent = sc.nombre;
      prodSubcategoria.appendChild(opt);
    });
}

function normalizarAreaId(valor) {
  if (valor === null || valor === undefined) return null;
  if (valor === '' || valor === 'null' || valor === 'undefined') return null;
  if (valor === 0 || valor === '0') return null;
  const parsed = parseInt(valor, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function actualizarSelectAreas(areaId = null, zonaId = null) {
  if (!prodArea) return;

  const previousValue = areaId !== null ? String(areaId) : prodArea.value;
  prodArea.innerHTML = '<option value="">Selecciona un área</option>';

  areas.forEach(area => {
    const opt = document.createElement('option');
    opt.value = area.id;
    opt.textContent = area.nombre;
    prodArea.appendChild(opt);
  });

  if (previousValue && areas.some(area => String(area.id) === previousValue)) {
    prodArea.value = previousValue;
  } else {
    prodArea.value = '';
  }

  const zonaObjetivo = zonaId === null ? '' : zonaId;
  actualizarSelectZonas(prodArea.value || null, zonaObjetivo);
}

function actualizarSelectZonas(areaId = null, zonaId = undefined) {
  if (!prodZona) return;

  const targetAreaValue = areaId !== null ? areaId : prodArea?.value || '';
  const targetAreaId = normalizarAreaId(targetAreaValue);
  const hasExplicitZona = zonaId !== undefined;
  const previousZona = hasExplicitZona ? String(zonaId ?? '') : prodZona.value;

  prodZona.innerHTML = '';

  const placeholder = document.createElement('option');
  placeholder.value = '';

  const zonasSinArea = zonas.filter(zona => normalizarAreaId(zona.area_id) === null);
  const zonasFiltradas = targetAreaId !== null
    ? zonas.filter(zona => normalizarAreaId(zona.area_id) === targetAreaId)
    : zonasSinArea;

  const hasArea = targetAreaId !== null;
  const hasZonas = zonasFiltradas.length > 0;

  placeholder.textContent = hasArea
    ? (hasZonas ? 'Selecciona una zona' : 'No hay zonas registradas para esta área')
    : (hasZonas ? 'Selecciona una zona sin área asignada' : 'No hay zonas sin área asignada');
  placeholder.selected = true;
  placeholder.disabled = false;
  prodZona.appendChild(placeholder);

  prodZona.disabled = !hasZonas;

  zonasFiltradas.forEach(z => {
    const opt = document.createElement('option');
    opt.value = z.id;
    opt.textContent = `${z.nombre} (${z.tipo_almacenamiento || '—'})`;
    prodZona.appendChild(opt);
  });

  if (previousZona && zonasFiltradas.some(z => String(z.id) === previousZona)) {
    prodZona.value = previousZona;
  } else {
    prodZona.value = '';
  }
}

  async function cargarCategorias() {
    categorias.length = 0;
    const datos = await fetchAPI(
      `${API.categorias}?empresa_id=${EMP_ID}`
    );
    datos.forEach(c => categorias.push(c));
    actualizarSelectCategorias();
    actualizarIndicadores();
  }

  async function cargarSubcategorias() {
    subcategorias.length = 0;
    const datos = await fetchAPI(
      `${API.subcategorias}?empresa_id=${EMP_ID}`
    );
    datos.forEach(s => subcategorias.push(s));
    // Al iniciar, ninguna categoría está elegida → sólo placeholder
    actualizarSelectSubcategorias(null);
    actualizarIndicadores();
  }

  async function cargarAreas() {
    areas.length = 0;
    const datos = await fetchAPI(`${API.areas}?empresa_id=${EMP_ID}`);
    datos.forEach(a => areas.push(a));
    actualizarSelectAreas();
  }

async function cargarZonas() {
   zonas.length = 0;
  const datos = await fetchAPI(`${API.zonas}?empresa_id=${EMP_ID}`);
   datos.forEach(z => zonas.push(z));
  actualizarSelectZonas();
 }

movGuardar?.addEventListener('click', async () => {
  if (!movProdSel || !movCant) {
    console.warn('Formulario de movimiento incompleto.');
    return;
  }
  const prodId = parseInt(movProdSel.value, 10);
  const qty    = parseInt(movCant.value, 10);
  if (!prodId || qty <= 0) {
    showToast('Selecciona un producto y una cantidad válida', 'error');
    return;
  }
  // POST a nuevo endpoint
  try {
    const movimientoPayload = {
      empresa_id: EMP_ID,
      producto_id: prodId,
      cantidad: qty,
      tipo: movTipo
    };

    const resultado = await fetchAPI(
      API.movimiento,
      'POST',
      movimientoPayload
    );

    if (resultado?.success !== true) {
      throw new Error(resultado?.error || 'No se pudo registrar el movimiento');
    }

    movModal?.hide();
    await cargarProductos();
    renderResumen();
    showToast(`Movimiento ${movTipo} registrado`, 'success');
    document.dispatchEvent(new CustomEvent('movimientoRegistrado', {
      detail: {
        productoId: prodId,
        tipo: movimientoPayload.tipo,
        cantidad: movimientoPayload.cantidad,
        stockActual: resultado.stock_actual ?? null
      }
    }));
  } catch (err) {
    console.error(err);
    showToast('Error al registrar movimiento: ' + err.message, 'error');
  }
});

  async function cargarProductos() {
    productos.length = 0;
    const datos = await fetchAPI(`${API.productos}?empresa_id=${EMP_ID}`);
    datos.forEach(p => {
      // Asegurarnos que son números
      const x = parseFloat(p.dim_x) || 0;
      const y = parseFloat(p.dim_y) || 0;
      const z = parseFloat(p.dim_z) || 0;
      // Calcular volumen en cm³
      const volumen = x * y * z;
      // Formatear con dos decimales, o vacío si falta algún dato
      p.volumen = volumen > 0 ? volumen.toFixed(2) + ' cm³' : '';
      productos.push(p);
    });
    actualizarIndicadores();
  }

  function renderResumen() {
    if (!tablaResumen || !tablaHead) {
      console.warn('Tabla de resumen no disponible en la vista actual.');
      return;
    }
    tablaResumen.innerHTML = '';
    tablaHead.innerHTML = '';

    if (tablaDescripcionEl) {
      if (vistaActual === 'producto') {
        const count = productos.length;
        tablaDescripcionEl.textContent = count
          ? `${count} producto${count === 1 ? '' : 's'} registrados`
          : 'Sin productos disponibles';
      } else if (vistaActual === 'categoria') {
        const count = categorias.length;
        tablaDescripcionEl.textContent = count
          ? `${count} categoría${count === 1 ? '' : 's'} disponibles`
          : 'Sin categorías registradas';
      } else {
        const count = subcategorias.length;
        tablaDescripcionEl.textContent = count
          ? `${count} subcategoría${count === 1 ? '' : 's'} registradas`
          : 'Sin subcategorías registradas';
      }
    }

if (vistaActual === 'producto') {
  tablaHead.innerHTML = `
    <tr>
      <th>Imagen</th>
      <th>Nombre</th>
      <th>Área</th>
      <th>Zona</th>
      <th>Descripción</th>
      <th>Categoría</th>
      <th>Subcategoría</th>
      <th>Volumen (cm³)</th>
      <th>Stock</th>
      <th>Precio compra</th>
      <th data-export="skip">Acciones</th>
    </tr>`;

  productos.forEach(p => {
const cat = p.categoria_nombre   || '';
const sub = p.subcategoria_nombre || '';
    const zona= p.zona_nombre || '';
    const area= p.area_nombre || '';
    const nombreAlt = (p.nombre || '').replace(/"/g, '&quot;');
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td data-export-value="${p.imagenBase64 ? 'Disponible' : '—'}">${p.imagenBase64 ? `<img src="${p.imagenBase64}" width="50" class="img-thumbnail" alt="Vista del producto ${nombreAlt}">` : ''}</td>
      <td>${p.nombre}</td>
      <td>${area}</td>
      <td>${zona}</td>
      <td>${p.descripcion}</td>
      <td>${cat}</td>
      <td>${sub}</td>
      <td>${p.volumen}</td>
      <td>${p.stock}</td>
      <td>${p.precio_compra}</td>
      <td data-export="skip">
        <div class="table-action-menu">
          <button
            type="button"
            class="table-action-menu__toggle"
            aria-expanded="false"
            aria-haspopup="true"
            aria-label="Abrir acciones del producto"
          >
            &#8942;
          </button>
          <div class="table-action-menu__dropdown" role="menu">
            <button
              type="button"
              class="table-action-menu__item btn btn-sm btn-secondary"
              data-accion="qr"
              data-tipo="producto"
              data-id="${p.id}"
              role="menuitem"
            >QR</button>
            <button
              type="button"
              class="table-action-menu__item btn btn-sm btn-primary"
              data-accion="edit"
              data-tipo="producto"
              data-id="${p.id}"
              role="menuitem"
            >Editar</button>
            <button
              type="button"
              class="table-action-menu__item btn btn-sm btn-danger"
              data-accion="del"
              data-tipo="producto"
              data-id="${p.id}"
              role="menuitem"
            >Eliminar</button>
          </div>
        </div>
      </td>
    `;
    tablaResumen.appendChild(tr);
  });
} else if (vistaActual === 'categoria') {
      tablaHead.innerHTML = `
        <tr>
          <th>Nombre</th>
          <th>Descripción</th>
          <th>Subcategorías</th>
          <th data-export="skip">Acciones</th>
        </tr>`;
      categorias.forEach(c => {
        const subcats = subcategorias
          .filter(sc => sc.categoria_id === c.id)
          .map(sc => sc.nombre)
          .join(', ');
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${c.nombre}</td>
          <td>${c.descripcion}</td>
          <td>${subcats}</td>
          <td data-export="skip">
            <button class="btn btn-sm btn-primary me-1" data-accion="edit" data-tipo="categoria" data-id="${c.id}">Editar</button>
            <button class="btn btn-sm btn-danger" data-accion="del" data-tipo="categoria" data-id="${c.id}">Eliminar</button>
          </td>`;
        tablaResumen.appendChild(tr);
      });
    } else if (vistaActual === 'subcategoria') {
      tablaHead.innerHTML = `
        <tr>
          <th>Nombre</th>
          <th>Categoría</th>
          <th>Descripción</th>
          <th data-export="skip">Acciones</th>
        </tr>`;
      subcategorias.forEach(sc => {
        const cat = categorias.find(c => c.id === sc.categoria_id)?.nombre || '';
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${sc.nombre}</td>
          <td>${cat}</td>
          <td>${sc.descripcion}</td>
          <td data-export="skip">
            <button class="btn btn-sm btn-primary me-1" data-accion="edit" data-tipo="subcategoria" data-id="${sc.id}">Editar</button>
            <button class="btn btn-sm btn-danger" data-accion="del" data-tipo="subcategoria" data-id="${sc.id}">Eliminar</button>
          </td>`;
        tablaResumen.appendChild(tr);
      });
    }

    actualizarIndicadores();
  }

catForm?.addEventListener('submit', async e => {
  e.preventDefault();
  // 1) Leer campos
  const nombre = document.getElementById('catNombre').value.trim();
  const descripcion = document.getElementById('catDescripcion').value.trim();
  if (!nombre) {
    showToast('El nombre es obligatorio', 'error');
    return;
  }

  // 2) Payload con empresa
  const payload = { nombre, descripcion, empresa_id: EMP_ID };

  try {
    // 3) POST o PUT
    if (editCatId) {
      await fetchAPI(
        `${API.categorias}?id=${editCatId}&empresa_id=${EMP_ID}`,
        'PUT',
        payload
      );
      showToast('Categoría editada correctamente', 'success');
    } else {
      await fetchAPI(
        `${API.categorias}?empresa_id=${EMP_ID}`,
        'POST',
        payload
      );
      showToast('Categoría guardada correctamente', 'success');
    }

    // 4) Reset y recarga
    catForm.reset();
    await cargarCategorias();

  } catch (err) {
    console.error(err);
    showToast('Error guardando categoría: ' + err.message, 'error');
  }
});


subcatForm?.addEventListener('submit', async e => {
  e.preventDefault();
  // 1) Leer campos
  const categoria_id = parseInt(document.getElementById('subcatCategoria').value, 10) || null;
  const nombre = document.getElementById('subcatNombre').value.trim();
  const descripcion = document.getElementById('subcatDescripcion').value.trim();
  if (!categoria_id) {
    showToast('Selecciona una categoría', 'error');
    return;
  }
  if (!nombre) {
    showToast('El nombre es obligatorio', 'error');
    return;
  }
  // 2) Payload con empresa
  const payload = { categoria_id, nombre, descripcion, empresa_id: EMP_ID };

  try {
    // 3) POST o PUT
    if (editSubcatId) {
      await fetchAPI(
        `${API.subcategorias}?id=${editSubcatId}&empresa_id=${EMP_ID}`,
        'PUT',
        payload
      );
      showToast('Subcategoría editada correctamente', 'success');
    } else {
      await fetchAPI(
        `${API.subcategorias}?empresa_id=${EMP_ID}`,
        'POST',
        payload
      );
      showToast('Subcategoría guardada correctamente', 'success');
    }

    // 4) Reset y recarga
    subcatForm.reset();
    await cargarSubcategorias();

  } catch (err) {
    console.error(err);
    showToast('Error guardando subcategoría: ' + err.message, 'error');
  }
});


prodForm?.addEventListener('submit', async e => {
    e.preventDefault();

    // 1) Leer campos de forma fiable
    const nombre = document.getElementById('prodNombre').value.trim();
    const descripcion = document.getElementById('prodDescripcion').value.trim();
    const categoria_id = parseInt(document.getElementById('prodCategoria').value) || null;
    const subcategoria_id = parseInt(document.getElementById('prodSubcategoria').value) || null;
    const stock = parseInt(document.getElementById('prodStock').value) || 0;
    const precio_compra = parseFloat(document.getElementById('prodPrecio').value) || 0;
    const dim_x = parseFloat(document.getElementById('prodDimX').value) || 0;
    const dim_y = parseFloat(document.getElementById('prodDimY').value) || 0;
    const dim_z = parseFloat(document.getElementById('prodDimZ').value) || 0;

    // Validaciones mínimas
    if (!nombre) {
      showToast('El nombre es obligatorio', 'error');
      return;
    }
    if (!categoria_id) {
      showToast('Selecciona una categoría', 'error');
      return;
    }

    let area_id = prodArea ? (parseInt(prodArea.value, 10) || null) : null;
    const zona_id = prodZona ? (parseInt(prodZona.value, 10) || null) : null;

    const zonaSeleccionada = zona_id
      ? zonas.find(z => parseInt(z.id, 10) === zona_id) || null
      : null;
    const zonaAreaId = zonaSeleccionada
      ? normalizarAreaId(zonaSeleccionada.area_id)
      : null;
    const zonaSinArea = zonaSeleccionada ? zonaAreaId === null : false;

    if (!zonaSinArea && zonaAreaId !== null && area_id === null) {
      area_id = zonaAreaId;
    }

    if (!area_id && !zonaSinArea) {
      showToast('Selecciona un área para el producto', 'error');
      return;
    }

    const data = {
      nombre,
      descripcion,
      categoria_id,
      subcategoria_id,
      area_id,
      zona_id,
      stock,
      precio_compra,
      dim_x,
      dim_y,
      dim_z
    };

    try {
      // 2) POST o PUT
      const base = API.productos;
if (editProdId) {
  await fetchAPI(
    `${base}?id=${editProdId}&empresa_id=${EMP_ID}`,
    'PUT',
    {...data, empresa_id: EMP_ID}
  );
  showToast('Producto editado correctamente', 'success');
  editProdId = null;
} else {
  // POST con filtro por empresa
    await fetchAPI(
    `${base}?empresa_id=${EMP_ID}`,
    'POST',
    {...data, empresa_id: EMP_ID}
  );
  showToast('Producto guardado correctamente', 'success');
}

      // 3) Reset y recarga de datos
      prodForm.reset();
      actualizarSelectAreas();
      await cargarProductos();
      await cargarAreas();
      await cargarZonas();
      renderResumen();
      setProductoFormMode('create');
      if (productoFormCollapse) {
        productoFormCollapse.show();
      } else if (productoFormCollapseEl) {
        productoFormCollapseEl.classList.add('show');
        updateProductoFormToggleLabel(true);
      }

    } catch (err) {
      console.error(err);
      showToast('Error al guardar producto: ' + err.message, 'error');
    }
  });

  prodForm?.addEventListener('reset', () => {
    editProdId = null;
    setTimeout(() => {
      actualizarSelectAreas();
    }, 0);
    setProductoFormMode('create');
    if (productoFormCollapse) {
      productoFormCollapse.show();
    } else if (productoFormCollapseEl) {
      productoFormCollapseEl.classList.add('show');
      updateProductoFormToggleLabel(true);
    }
  });

  tablaResumen?.addEventListener('click', async e => {
  const target = e.target instanceof HTMLElement ? e.target : null;
  if (!target) return;

  const toggle = target.closest('.table-action-menu__toggle');
  if (toggle) {
    e.preventDefault();
    const dropdown = toggle.nextElementSibling;
    const isOpen = dropdown?.classList.contains('is-open');
    closeAllActionMenus(isOpen ? null : dropdown);
    if (dropdown) {
      dropdown.classList.toggle('is-open', !isOpen);
      toggle.setAttribute('aria-expanded', String(!isOpen));
    }
    return;
  }

  const actionBtn = target.closest('[data-accion]');
  if (!actionBtn) return;

  closeAllActionMenus();

  const id     = parseInt(actionBtn.dataset.id, 10);
  const tipo   = actionBtn.dataset.tipo;
  const accion = actionBtn.dataset.accion;
  if (!accion || Number.isNaN(id)) return;

  if (accion === 'qr' && tipo === 'producto') {
    const producto = productos.find(pr => parseInt(pr.id, 10) === id) || null;
    const qrSrc = `../../scripts/php/generar_qr_producto.php?producto_id=${id}&cache=${Date.now()}`;
    qrModalProducto = producto;
    qrModalSrc = qrSrc;

    if (!qrModalInstance || !qrModalImage) {
      window.open(qrSrc, '_blank');
      return;
    }

    if (qrModalPlaceholder) {
      qrModalPlaceholder.textContent = 'Generando código QR...';
      qrModalPlaceholder.classList.remove('d-none');
    }

    qrModalImage.classList.add('d-none');
    qrModalImage.onload = () => {
      qrModalImage.classList.remove('d-none');
      if (qrModalPlaceholder) {
        qrModalPlaceholder.classList.add('d-none');
      }
      // update preview with loaded QR
      try { updateLabelPreview(); } catch (e) { /* ignore if not yet ready */ }
    };
    qrModalImage.onerror = () => {
      if (qrModalPlaceholder) {
        qrModalPlaceholder.textContent = 'No se pudo generar el código QR.';
        qrModalPlaceholder.classList.remove('d-none');
      }
      qrModalImage.classList.add('d-none');
      qrModalDownload?.removeAttribute('href');
    };
    qrModalImage.src = qrSrc;
    qrModalImage.alt = producto ? `Código QR del producto ${producto.nombre}` : 'Código QR del producto';

    if (qrModalTitle) {
      qrModalTitle.textContent = producto
        ? `Código QR – ${producto.nombre}`
        : 'Código QR del producto';
    }
    if (qrModalDownload) {
      const safeName = sanitizeFileName(producto?.nombre) || `producto_${id}`;
      qrModalDownload.href = '#';
      qrModalDownload.dataset.qrSrc = qrSrc;
      qrModalDownload.dataset.filename = `${safeName || 'producto'}_etiqueta`;
      qrModalDownload.download = `${safeName || 'producto'}_etiqueta.png`;
      qrModalDownload.textContent = 'Descargar etiqueta';
      qrModalDownload.classList.remove('disabled');
      qrModalDownload.removeAttribute('aria-disabled');
      qrModalDownload.removeAttribute('aria-busy');
    }

    qrModalInstance.show();
    // ensure preview built when opening modal (in case image is cached)
    try { updateLabelPreview(); } catch (e) { /* ignore */ }
    return;
  }

  // update preview when orientation changes
  const orientRadios = document.getElementsByName('etiquetaOrientacion');

  function updateLabelPreview() {
    if (!qrModalProducto || !qrModalSrc || !productoLabelCompact) return;
    const orient = getSelectedOrientation();
    productoLabelCompact.innerHTML = '';
    const node = buildCompactLabel(qrModalProducto, qrModalSrc, orient);
    productoLabelCompact.appendChild(node);
  }

  for (const r of orientRadios) {
    r.addEventListener('change', updateLabelPreview);
  }

  // Note: download click is handled by handleEtiquetaDownload above (centralized)

  // 1) Eliminar
  if (accion === 'del') {
    // --- BORRAR PRODUCTO CON CONFIRMACIÓN ---
    if (tipo === 'producto') {
      // 1) Encuentra el producto para mostrar su nombre en el diálogo
      const prod = productos.find(p => p.id === id);
      const nombre = prod ? prod.nombre : 'este producto';
      // 2) Pregunta al usuario
      const ok = window.confirm(`¿Estás seguro de que quieres eliminar "${nombre}"? Esta acción no se puede deshacer.`);
      if (!ok) return; // si cancela, no hacemos nada

      // 3) Intentamos borrar y manejamos el caso de movimientos asociados
      let resultadoEliminacion = null;
      try {
        resultadoEliminacion = await fetchAPI(
          `${API.productos}?id=${id}&empresa_id=${EMP_ID}`,
          'DELETE'
        );
      } catch (err) {
        if (err.status === 409 && err.payload?.movimientos) {
          const movimientos = parseInt(err.payload.movimientos, 10) || 0;
          const confirmar = window.confirm(
            `El producto tiene ${movimientos} movimiento(s) registrado(s).\n` +
            'Si continúas, también se eliminarán esos movimientos históricos.\n' +
            '¿Deseas continuar y borrar todo?'
          );
          if (!confirmar) {
            showToast('El producto no se eliminó.', 'info');
            return;
          }
          try {
            resultadoEliminacion = await fetchAPI(
              `${API.productos}?id=${id}&empresa_id=${EMP_ID}&force=1`,
              'DELETE'
            );
          } catch (forceErr) {
            console.error('Error eliminando producto con movimientos:', forceErr);
            showToast(`No se pudo eliminar el producto: ${forceErr.message}`, 'error');
            return;
          }
        } else {
          console.error('Error eliminando producto:', err);
          showToast(`No se pudo eliminar el producto: ${err.message}`, 'error');
          return;
        }
      }

      await cargarProductos();
      renderResumen();

      const movimientosEliminados = resultadoEliminacion?.movimientos_eliminados || 0;
      let mensaje = 'Producto eliminado correctamente';
      if (movimientosEliminados > 0) {
        mensaje += ` junto con ${movimientosEliminados} movimiento(s) asociado(s).`;
      } else {
        mensaje += '.';
      }
      showToast(mensaje, 'success');

  // --- BORRAR CATEGORÍA + OPCIONES EN CASCADA ---
  } else if (tipo === 'categoria') {
    // 1) Subcategorías de esta categoría
    const subs = subcategorias.filter(sc => sc.categoria_id === id);
    let eliminarSubs = true;
    if (subs.length) {
      eliminarSubs = confirm(
        `Esta categoría tiene ${subs.length} subcategoría(s).\n¿Quieres eliminar también las subcategorías relacionadas?`
      );
    }
    if (eliminarSubs) {
      for (const sc of subs) {
        // 2) Productos de cada subcategoría
        const prods = productos.filter(p => p.subcategoria_id === sc.id);
        let eliminarProds = true;
        if (prods.length) {
          eliminarProds = confirm(
            `La subcategoría "${sc.nombre}" tiene ${prods.length} producto(s).\n¿Eliminar también los productos asociados?`
          );
        }
        if (eliminarProds) {
          for (const p of prods) {
            await fetchAPI(
              `${API.productos}?id=${p.id}&empresa_id=${EMP_ID}`,
              'DELETE'
            );
          }
        }
        // 3) Borrar la subcategoría
        await fetchAPI(
          `${API.subcategorias}?id=${sc.id}&empresa_id=${EMP_ID}`,
          'DELETE'
        );
      }
    }
    // 4) Borrar finalmente la categoría
    await fetchAPI(
      `${API.categorias}?id=${id}&empresa_id=${EMP_ID}`,
      'DELETE'
    );
    await cargarCategorias();
    await cargarSubcategorias();
    await cargarProductos();

  // --- BORRAR SUBCATEGORÍA + OPCIÓN DE BORRAR PRODUCTOS ---
  } else if (tipo === 'subcategoria') {
    const prods = productos.filter(p => p.subcategoria_id === id);
    let eliminarProds = true;
    if (prods.length) {
      eliminarProds = confirm(
        `Esta subcategoría tiene ${prods.length} producto(s).\n¿Eliminar también los productos asociados?`
      );
    }
    if (eliminarProds) {
      for (const p of prods) {
        await fetchAPI(
          `${API.productos}?id=${p.id}&empresa_id=${EMP_ID}`,
          'DELETE'
        );
      }
    }
    await fetchAPI(
      `${API.subcategorias}?id=${id}&empresa_id=${EMP_ID}`,
      'DELETE'
    );
    await cargarSubcategorias();
    await cargarProductos();
  }

  // Siempre refrescamos la vista
  renderResumen();
  return;
}

  // 2) Editar producto
  if (accion === 'edit' && tipo === 'producto') {
    const p = productos.find(pr => parseInt(pr.id, 10) === id);
    if (!p) return;
    mostrar('producto');
    document.getElementById('prodNombre').value      = p.nombre;
    document.getElementById('prodDescripcion').value = p.descripcion;
    prodCategoria.value  = parseInt(p.categoria_id,10) || '';
    actualizarSelectSubcategorias(parseInt(p.categoria_id,10));
    prodSubcategoria.value = parseInt(p.subcategoria_id,10) || '';
    const areaId = p.area_id ? parseInt(p.area_id, 10) : null;
    const zonaId = p.zona_id ? parseInt(p.zona_id, 10) : null;
    actualizarSelectAreas(areaId, zonaId);
    const dims = (p.dimensiones || '').split('x');
    document.getElementById('prodDimX').value   = dims[0] || '';
    document.getElementById('prodDimY').value   = dims[1] || '';
    document.getElementById('prodDimZ').value   = dims[2] || '';
    document.getElementById('prodStock').value  = p.stock;
    document.getElementById('prodPrecio').value = p.precio_compra;
    editProdId = id;
    setProductoFormMode('edit', p.nombre);
    if (productoFormCollapse) {
      productoFormCollapse.show();
    } else if (productoFormCollapseEl) {
      productoFormCollapseEl.classList.add('show');
      updateProductoFormToggleLabel(true);
    }
    return;
  }

  // 3) Editar categoría
  if (accion === 'edit' && tipo === 'categoria') {
    const c = categorias.find(cat => parseInt(cat.id, 10) === id);
    if (!c) return;
    mostrar('categoria');
    // los inputs de categoría tienen id="catNombre" y id="catDescripcion"
    document.getElementById('catNombre').value      = c.nombre;
    document.getElementById('catDescripcion').value = c.descripcion;
    editCatId = id;
    return;
  }

  // 4) Editar subcategoría
  if (accion === 'edit' && tipo === 'subcategoria') {
    const sc = subcategorias.find(s => parseInt(s.id, 10) === id);
    if (!sc) return;
    mostrar('subcategoria');
    // select de categorías y inputs de subcategoría por su id
    document.getElementById('subcatCategoria').value   = parseInt(sc.categoria_id,10) || '';
    document.getElementById('subcatNombre').value      = sc.nombre;
    document.getElementById('subcatDescripcion').value = sc.descripcion;
    editSubcatId = id;
    return;
  }
});

  // Botón para recargar el resumen
  btnRecargarResumen?.addEventListener('click', async () => {
    await cargarCategorias();
    await cargarSubcategorias();
    await cargarAreas();
    await cargarProductos();
    await cargarZonas();
    renderResumen();
    showToast('Resumen recargado', 'info');
  });

  (async function init() {
    await cargarCategorias();
    await cargarSubcategorias();
    await cargarAreas();
    await cargarZonas();
    await cargarProductos();
    renderResumen();
  })();
})();
