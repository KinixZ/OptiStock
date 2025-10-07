document.addEventListener('DOMContentLoaded', () => {
  const datosReporte = [
    { id: 'INV-001', modulo: 'inventarios', fecha: '2024-01-18', categoria: 'Refacciones', zona: 'Norte', rol: 'almacenista', descripcion: 'Ingreso de refacciones automotrices', cantidad: 18 },
    { id: 'INV-002', modulo: 'inventarios', fecha: '2024-02-05', categoria: 'Herramientas', zona: 'Centro', rol: 'almacenista', descripcion: 'Salida de herramientas para mantenimiento', cantidad: 9 },
    { id: 'USR-101', modulo: 'usuarios', fecha: '2024-02-17', categoria: 'Altas', zona: 'Centro', rol: 'administrador', descripcion: 'Alta de nuevo supervisor de zona', cantidad: 1 },
    { id: 'ARE-020', modulo: 'areas', fecha: '2024-03-03', categoria: 'Inventario crítico', zona: 'Sur', rol: 'supervisor', descripcion: 'Revisión de existencias en área fría', cantidad: 5 },
    { id: 'ZON-301', modulo: 'zonas', fecha: '2024-03-22', categoria: 'Reubicaciones', zona: 'Este', rol: 'supervisor', descripcion: 'Reubicación de pallets a zona temporal', cantidad: 12 },
    { id: 'INV-003', modulo: 'inventarios', fecha: '2024-04-09', categoria: 'Consumibles', zona: 'Oeste', rol: 'almacenista', descripcion: 'Ingreso de material de empaque', cantidad: 30 },
    { id: 'INV-004', modulo: 'inventarios', fecha: '2024-05-11', categoria: 'Refacciones', zona: 'Norte', rol: 'mantenimiento', descripcion: 'Salida de refacciones para reparación', cantidad: 7 },
    { id: 'USR-150', modulo: 'usuarios', fecha: '2024-05-25', categoria: 'Bajas', zona: 'Sur', rol: 'administrador', descripcion: 'Baja de usuario temporal', cantidad: 1 },
    { id: 'ARE-034', modulo: 'areas', fecha: '2024-06-02', categoria: 'Auditorías', zona: 'Centro', rol: 'supervisor', descripcion: 'Auditoría interna de área seca', cantidad: 3 },
    { id: 'ZON-340', modulo: 'zonas', fecha: '2024-06-15', categoria: 'Reubicaciones', zona: 'Oeste', rol: 'almacenista', descripcion: 'Traslado de inventario a zona consolidada', cantidad: 16 }
  ];

  const modulos = document.querySelectorAll('.modulo');
  const fInicio = document.getElementById('fInicio');
  const fFin = document.getElementById('fFin');
  const fCategoria = document.getElementById('fCategoria');
  const fZona = document.getElementById('fZona');
  const fRol = document.getElementById('fRol');
  const metricasDiv = document.getElementById('metricas');
  const tablaResultadosBody = document.querySelector('#tablaResultados tbody');
  const estadoResultados = document.getElementById('estadoResultados');
  const mensajeSinDatos = document.getElementById('sinDatos');
  const historialBody = document.querySelector('#tablaHistorial tbody');
  const tablaDocumentosBody = document.querySelector('#tablaDocumentos tbody');
  const repositorioVacio = document.getElementById('repositorioVacio');
  const formSubida = document.getElementById('formSubida');
  const limpiarFormularioBtn = document.getElementById('limpiarFormulario');
  const tituloReporteInput = document.getElementById('tituloReporte');
  const moduloReporteSelect = document.getElementById('moduloReporte');
  const areaReporteInput = document.getElementById('areaReporte');
  const zonaReporteInput = document.getElementById('zonaReporte');
  const responsableReporteInput = document.getElementById('responsableReporte');
  const notasReporteInput = document.getElementById('notasReporte');
  const archivoReporteInput = document.getElementById('archivoReporte');
  const modal = document.getElementById('modalProgramar');
  const programarBtn = document.getElementById('programarBtn');
  const guardarProgramacionBtn = document.getElementById('guardarProgramacion');
  const cancelarProgramacionBtn = document.getElementById('cancelarProgramacion');
  const intervaloSelect = document.getElementById('intervalo');
  const intervaloDiasInput = document.getElementById('intervaloDias');
  const grupoPersonalizado = document.getElementById('grupoPersonalizado');
  const estadoProgramacion = document.getElementById('estadoProgramacion');
  const modalBackdrop = modal?.querySelector('[data-close="modal"]');
  const modalContent = modal?.querySelector('.modal__content');
  const graficaCanvas = document.getElementById('graficaTendencias');
  const ctxGrafica = graficaCanvas ? graficaCanvas.getContext('2d') : null;
  const heroBrand = document.getElementById('heroBrand');
  const brandRadios = document.querySelectorAll('input[name="brandMode"]');
  const brandOpacity = document.getElementById('brandOpacity');
  const brandOpacityValue = document.getElementById('brandOpacityValue');
  const brandPreview = document.getElementById('brandPreview');
  const brandReset = document.getElementById('brandReset');
  const logoPersonalizado = document.getElementById('logoPersonalizado');

  if (!metricasDiv || !tablaResultadosBody || !estadoResultados || !mensajeSinDatos || !historialBody) {
    return;
  }

  function actualizarEstadoProgramacion(texto) {
    if (estadoProgramacion) {
      estadoProgramacion.textContent = texto;
    }
  }

  function actualizarControlesMarca() {
    const porcentaje = Math.round((logoConfig.opacity || 0.08) * 100);
    if (brandOpacity) {
      brandOpacity.value = (logoConfig.opacity || 0.08).toFixed(2);
    }
    if (brandOpacityValue) {
      brandOpacityValue.textContent = `${porcentaje}%`;
    }

    brandRadios.forEach(radio => {
      radio.checked = radio.value === (logoConfig.mode || 'marca');
    });

    if (brandPreview) {
      if (logoConfig.image) {
        brandPreview.style.backgroundImage = `url(${logoConfig.image})`;
        brandPreview.textContent = logoConfig.name || 'Logotipo personalizado listo.';
      } else {
        brandPreview.style.backgroundImage = 'none';
        brandPreview.textContent = 'Sin logotipo personalizado';
      }
    }

    if (heroBrand) {
      if (!heroBrand.dataset.defaultSrc) {
        heroBrand.dataset.defaultSrc = heroBrand.getAttribute('src') || '';
      }
      const ruta = logoConfig.image || heroBrand.dataset.defaultSrc || '../../images/optistockLogo.png';
      heroBrand.setAttribute('src', ruta);
    }
  }

  function renderRepositorio() {
    if (!tablaDocumentosBody || !repositorioVacio) {
      return;
    }

    const documentos = obtenerRepositorio();
    tablaDocumentosBody.innerHTML = '';

    if (!documentos.length) {
      repositorioVacio.style.display = 'block';
      return;
    }

    repositorioVacio.style.display = 'none';

    documentos.forEach(documento => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div class="document-meta">
            <span>${escaparHtml(documento.titulo)}</span>
            <span>${escaparHtml(documento.notas || 'Sin notas adicionales')}</span>
          </div>
        </td>
        <td>
          <div class="document-tags">
            <span class="tag">${escaparHtml(capitalizar(documento.modulo || ''))}</span>
            ${documento.area ? `<span class="tag">${escaparHtml(documento.area)}</span>` : ''}
            ${documento.zona ? `<span class="tag">${escaparHtml(documento.zona)}</span>` : ''}
          </div>
        </td>
        <td>${escaparHtml(documento.responsable || 'Sin responsable')}</td>
        <td>${formatearFechaHora(documento.fecha)}</td>
        <td class="text-end">
          <div class="document-actions">
            <button class="btn-action btn--small" type="button" data-download="${documento.id}">Descargar</button>
            <button class="btn-action btn-action--danger btn--small" type="button" data-delete="${documento.id}">Eliminar</button>
          </div>
        </td>
      `;
      tablaDocumentosBody.appendChild(tr);
    });
  }

  function obtenerRepositorio() {
    try {
      const datos = JSON.parse(localStorage.getItem(KEY_REPO) || '[]');
      return Array.isArray(datos) ? datos : [];
    } catch (error) {
      console.warn('No se pudo leer el repositorio local.', error);
      return [];
    }
  }

  function guardarRepositorio(lista) {
    const copia = Array.isArray(lista) ? [...lista].slice(0, 60) : [];
    localStorage.setItem(KEY_REPO, JSON.stringify(copia));
  }

  function leerStorageSeguro(clave) {
    try {
      const datos = JSON.parse(localStorage.getItem(clave) || '[]');
      return Array.isArray(datos) ? datos : [];
    } catch (error) {
      console.warn(`No se pudo leer la clave ${clave} del almacenamiento local.`, error);
      return [];
    }
  }

  function depurarPorFecha(lista) {
    const ahora = Date.now();
    const depurada = (lista || []).filter(item => {
      const fecha = item?.fecha;
      const marcaTiempo = fecha ? new Date(fecha).getTime() : NaN;
      if (Number.isNaN(marcaTiempo)) {
        return false;
      }
      return ahora - marcaTiempo <= RETENCION_MS;
    });
    return { lista: depurada, cambio: depurada.length !== (lista || []).length };
  }

  function guardarArchivosGenerados(lista) {
    const arreglo = Array.isArray(lista) ? [...lista] : [];
    localStorage.setItem(KEY_GENERATED_FILES, JSON.stringify(arreglo.slice(0, MAX_GENERATED_FILES)));
  }

  function obtenerArchivosGenerados() {
    const almacenados = leerStorageSeguro(KEY_GENERATED_FILES);
    const { lista, cambio } = depurarPorFecha(almacenados);
    if (cambio) {
      guardarArchivosGenerados(lista);
    }
    return lista;
  }

  function guardarArchivoGenerado({ id, tipo, nombre, fecha, dataUrl }) {
    if (!id || !fecha || !dataUrl) {
      return;
    }
    const archivos = obtenerArchivosGenerados();
    const actualizado = [
      { id, tipo, nombre, fecha, dataUrl },
      ...archivos.filter(item => item.id !== id)
    ];
    guardarArchivosGenerados(actualizado);
  }

  function guardarHistorialLista(lista) {
    const arreglo = Array.isArray(lista) ? [...lista] : [];
    localStorage.setItem(KEY_HISTORY, JSON.stringify(arreglo.slice(0, MAX_HISTORY)));
  }

  function obtenerHistorial() {
    const almacenados = leerStorageSeguro(KEY_HISTORY);
    const { lista, cambio } = depurarPorFecha(almacenados);
    if (cambio) {
      guardarHistorialLista(lista);
    }
    return lista;
  }

  function escaparHtml(texto) {
    return (texto || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async function obtenerLogo() {
    if (logoConfig.image) {
      return logoConfig.image;
    }

    const ruta = heroBrand?.dataset.defaultSrc || heroBrand?.getAttribute('src') || '../../images/optistockLogo.png';
    if (!ruta) {
      return null;
    }

    if (ruta.startsWith('data:image')) {
      return ruta;
    }

    try {
      return await cargarImagenBase64(ruta);
    } catch (error) {
      console.warn('No se pudo cargar el logotipo predeterminado.', error);
      return null;
    }
  }

  function obtenerFormatoImagen(dataUrl) {
    if (!dataUrl) {
      return 'PNG';
    }
    if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) {
      return 'JPEG';
    }
    return 'PNG';
  }

  const estilos = getComputedStyle(document.documentElement);
  const colorTexto = estilos.getPropertyValue('--text-color').trim() || '#1f2937';
  const colorBordes = estilos.getPropertyValue('--border-color').trim() || '#e7e9f5';
  const colorPrimario = estilos.getPropertyValue('--primary-color').trim() || '#ff6f91';
  const superficiePrimaria = estilos.getPropertyValue('--primary-surface-strong').trim() || 'rgba(255, 111, 145, 0.18)';
  const colorTenue = estilos.getPropertyValue('--muted-color').trim() || '#6b7280';

  const KEY_REPO = 'reportRepository';
  const KEY_BRAND_MODE = 'reportBrandMode';
  const KEY_BRAND_OPACITY = 'reportBrandOpacity';
  const KEY_BRAND_IMAGE = 'reportBrandImage';
  const KEY_BRAND_NAME = 'reportBrandName';
  const KEY_INTERVAL = 'reportInterval';
  const KEY_INTERVAL_DAYS = 'reportIntervalCustomDays';
  const KEY_GENERATED_FILES = 'reportGeneratedFiles';
  const KEY_HISTORY = 'reportHistory';
  const RETENCION_MS = 60 * 24 * 60 * 60 * 1000;
  const MAX_GENERATED_FILES = 40;
  const MAX_HISTORY = 40;

  let grafica = null;
  let programacion = null;
  let datosFiltrados = [];
  let logoConfig = {
    mode: localStorage.getItem(KEY_BRAND_MODE) || 'marca',
    opacity: parseFloat(localStorage.getItem(KEY_BRAND_OPACITY) || '0.08'),
    image: localStorage.getItem(KEY_BRAND_IMAGE) || null,
    name: localStorage.getItem(KEY_BRAND_NAME) || ''
  };

  if (logoConfig.image === 'null') {
    logoConfig.image = null;
  }
  if (Number.isNaN(logoConfig.opacity)) {
    logoConfig.opacity = 0.08;
  }
  logoConfig.opacity = Math.min(Math.max(logoConfig.opacity, 0.02), 0.5);

  document.getElementById('generarPdf')?.addEventListener('click', () => exportar('pdf'));
  document.getElementById('generarExcel')?.addEventListener('click', () => exportar('excel'));

  if (programarBtn && modal) {
    programarBtn.addEventListener('click', () => toggleModal(true));
  }

  guardarProgramacionBtn?.addEventListener('click', guardarProgramacion);

  if (cancelarProgramacionBtn) {
    cancelarProgramacionBtn.addEventListener('click', () => toggleModal(false));
  }

  modalBackdrop?.addEventListener('click', () => toggleModal(false));

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && modal?.getAttribute('aria-hidden') === 'false') {
      toggleModal(false);
    }
  });

  intervaloSelect?.addEventListener('change', () => {
    if (grupoPersonalizado) {
      grupoPersonalizado.hidden = intervaloSelect.value !== 'personalizado';
    }
  });

  modulos.forEach(modulo => modulo.addEventListener('change', actualizarVista));
  [fInicio, fFin, fCategoria, fZona].forEach(input => {
    input.addEventListener('input', actualizarVista);
    input.addEventListener('change', actualizarVista);
  });
  fRol.addEventListener('change', actualizarVista);

  brandRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      if (!radio.checked) {
        return;
      }
      logoConfig.mode = radio.value;
      localStorage.setItem(KEY_BRAND_MODE, logoConfig.mode);
      actualizarControlesMarca();
    });
  });

  brandOpacity?.addEventListener('input', () => {
    const valor = parseFloat(brandOpacity.value);
    if (!Number.isNaN(valor)) {
      logoConfig.opacity = Math.min(Math.max(valor, 0.02), 0.5);
      localStorage.setItem(KEY_BRAND_OPACITY, String(logoConfig.opacity));
      actualizarControlesMarca();
    }
  });

  logoPersonalizado?.addEventListener('change', async event => {
    const archivo = event.target.files?.[0];
    if (!archivo) {
      return;
    }

    try {
      const base64 = await leerArchivo(archivo);
      logoConfig.image = base64;
      logoConfig.name = archivo.name;
      localStorage.setItem(KEY_BRAND_IMAGE, base64);
      localStorage.setItem(KEY_BRAND_NAME, logoConfig.name);
      actualizarControlesMarca();
    } catch (error) {
      console.error('No se pudo cargar el logotipo seleccionado.', error);
    }
  });

  brandReset?.addEventListener('click', () => {
    logoConfig.image = null;
    logoConfig.name = '';
    localStorage.removeItem(KEY_BRAND_IMAGE);
    localStorage.removeItem(KEY_BRAND_NAME);
    if (logoPersonalizado) {
      logoPersonalizado.value = '';
    }
    actualizarControlesMarca();
  });

  formSubida?.addEventListener('submit', async event => {
    event.preventDefault();

    const archivo = archivoReporteInput?.files?.[0];
    if (!archivo) {
      alert('Selecciona un archivo PDF para continuar.');
      return;
    }

    if (archivo.type !== 'application/pdf') {
      alert('Solo se aceptan archivos en formato PDF.');
      return;
    }

    if (archivo.size > 8 * 1024 * 1024) {
      alert('El archivo supera el límite de 8 MB. Reduce su tamaño antes de subirlo.');
      return;
    }

    try {
      const repositorio = obtenerRepositorio();
      const documento = {
        id: 'DOC-' + Date.now(),
        titulo: tituloReporteInput?.value.trim() || 'Reporte sin título',
        modulo: moduloReporteSelect?.value || 'inventarios',
        area: areaReporteInput?.value.trim() || '',
        zona: zonaReporteInput?.value.trim() || '',
        responsable: responsableReporteInput?.value.trim() || '',
        notas: notasReporteInput?.value.trim() || '',
        nombreArchivo: archivo.name,
        archivo: await leerArchivo(archivo),
        fecha: new Date().toISOString()
      };

      repositorio.unshift(documento);
      guardarRepositorio(repositorio);
      renderRepositorio();
      formSubida.reset();
      alert('Documento guardado en el repositorio local.');
    } catch (error) {
      console.error('No se pudo guardar el documento.', error);
      alert('Ocurrió un problema al guardar el PDF. Inténtalo de nuevo.');
    }
  });

  limpiarFormularioBtn?.addEventListener('click', () => {
    formSubida?.reset();
  });

  tablaDocumentosBody?.addEventListener('click', event => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target.dataset.download) {
      const repositorio = obtenerRepositorio();
      const documento = repositorio.find(item => item.id === target.dataset.download);
      if (!documento) {
        alert('No se encontró el archivo solicitado.');
        return;
      }
      const enlace = document.createElement('a');
      enlace.href = documento.archivo;
      enlace.download = documento.nombreArchivo || 'reporte.pdf';
      document.body.appendChild(enlace);
      enlace.click();
      document.body.removeChild(enlace);
    }

    if (target.dataset.delete) {
      const confirmar = confirm('¿Deseas eliminar este documento del repositorio?');
      if (!confirmar) {
        return;
      }
      const repositorio = obtenerRepositorio().filter(item => item.id !== target.dataset.delete);
      guardarRepositorio(repositorio);
      renderRepositorio();
    }
  });

  historialBody?.addEventListener('click', event => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target.dataset.downloadHistorial) {
      descargarDesdeHistorial(target.dataset.downloadHistorial);
      return;
    }

    if (target.dataset.share) {
      compartir(target.dataset.share);
    }
  });

  init();

  function init() {
    actualizarVista();
    actualizarHistorial();
    cargarProgramacion();
    actualizarControlesMarca();
    renderRepositorio();
  }

  function actualizarVista() {
    const filtros = obtenerFiltros();
    datosFiltrados = filtrarDatos(filtros);
    renderResultados(datosFiltrados);
    mostrarMetricas(datosFiltrados);
    actualizarGrafica(datosFiltrados);
    return filtros;
  }

  function obtenerFiltros() {
    return {
      modulos: Array.from(modulos).filter(m => m.checked).map(m => m.value),
      fechaInicio: fInicio.value,
      fechaFin: fFin.value,
      categoria: fCategoria.value.trim(),
      zona: fZona.value.trim(),
      rol: fRol.value
    };
  }

  function filtrarDatos(filtros) {
    return datosReporte.filter(item => {
      if (filtros.modulos.length && !filtros.modulos.includes(item.modulo)) {
        return false;
      }
      if (filtros.fechaInicio && item.fecha < filtros.fechaInicio) {
        return false;
      }
      if (filtros.fechaFin && item.fecha > filtros.fechaFin) {
        return false;
      }
      if (filtros.categoria && !item.categoria.toLowerCase().includes(filtros.categoria.toLowerCase())) {
        return false;
      }
      if (filtros.zona && !item.zona.toLowerCase().includes(filtros.zona.toLowerCase())) {
        return false;
      }
      if (filtros.rol && item.rol !== filtros.rol) {
        return false;
      }
      return true;
    });
  }

  function renderResultados(datos) {
    tablaResultadosBody.innerHTML = '';
    if (datos.length === 0) {
      mensajeSinDatos.style.display = 'block';
      estadoResultados.textContent = '0 registros encontrados.';
      return;
    }

    mensajeSinDatos.style.display = 'none';
    estadoResultados.textContent = `${datos.length} registro${datos.length === 1 ? '' : 's'} encontrado${datos.length === 1 ? '' : 's'}.`;

    datos.forEach((movimiento, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${capitalizar(movimiento.modulo)}</td>
        <td>${formatearFecha(movimiento.fecha)}</td>
        <td>${movimiento.categoria}</td>
        <td>${movimiento.zona}</td>
        <td>${capitalizar(movimiento.rol)}</td>
        <td>${movimiento.descripcion}</td>
        <td class="text-end">${movimiento.cantidad}</td>
      `;
      tablaResultadosBody.appendChild(tr);
    });
  }

  function mostrarMetricas(datos) {
    metricasDiv.innerHTML = '';

    if (datos.length === 0) {
      metricasDiv.innerHTML = '<p class="metrics-empty">Ajusta los filtros para ver información resumida.</p>';
      return;
    }

    const totalCantidad = datos.reduce((total, item) => total + item.cantidad, 0);
    const conteoPorModulo = datos.reduce((acc, item) => {
      acc[item.modulo] = (acc[item.modulo] || 0) + 1;
      return acc;
    }, {});

    const tarjetasBase = [
      { titulo: 'Registros', valor: datos.length },
      { titulo: 'Cantidad total', valor: totalCantidad },
      { titulo: 'Módulos activos', valor: Object.keys(conteoPorModulo).length }
    ];

    tarjetasBase.forEach(({ titulo, valor }) => {
      metricasDiv.appendChild(crearTarjetaMetrica(titulo, valor));
    });

    Object.entries(conteoPorModulo).forEach(([modulo, cantidad]) => {
      metricasDiv.appendChild(crearTarjetaMetrica(`Movimientos en ${capitalizar(modulo)}`, cantidad));
    });
  }

  function crearTarjetaMetrica(titulo, valor) {
    const tarjeta = document.createElement('article');
    tarjeta.className = 'metric-card';
    tarjeta.innerHTML = `
      <span class="metric-card__label">${titulo}</span>
      <strong class="metric-card__value">${valor}</strong>
    `;
    return tarjeta;
  }

  function actualizarGrafica(datos) {
    let etiquetas;
    let valores;

    if (datos.length === 0) {
      etiquetas = ['Sin datos'];
      valores = [0];
    } else {
      const agrupado = datos.reduce((acc, item) => {
        const clave = item.fecha.slice(0, 7); // YYYY-MM
        acc[clave] = (acc[clave] || 0) + item.cantidad;
        return acc;
      }, {});
      const ordenados = Object.keys(agrupado).sort();
      etiquetas = ordenados.map(formatearMes);
      valores = ordenados.map(clave => agrupado[clave]);
    }

    if (!ctxGrafica) {
      return;
    }

    if (!grafica) {
      grafica = new Chart(ctxGrafica, {
        type: 'line',
        data: {
          labels: etiquetas,
          datasets: [{
            label: 'Cantidad de movimientos',
            data: valores,
            borderColor: colorPrimario,
            backgroundColor: superficiePrimaria,
            tension: 0.25,
            fill: true
          }]
        },
        options: {
          plugins: {
            legend: {
              labels: {
                color: colorTexto
              }
            },
            tooltip: {
              backgroundColor: colorPrimario,
              titleColor: '#ffffff',
              bodyColor: '#ffffff'
            }
          },
          scales: {
            x: {
              ticks: { color: colorTenue },
              grid: { color: colorBordes }
            },
            y: {
              beginAtZero: true,
              ticks: { color: colorTenue },
              grid: { color: colorBordes }
            }
          }
        }
      });
    } else {
      grafica.data.labels = etiquetas;
      grafica.data.datasets[0].data = valores;
      grafica.update();
    }
  }

  async function exportar(tipo) {
    const filtros = actualizarVista();
    if (datosFiltrados.length === 0) {
      alert('No hay información para exportar con los filtros seleccionados.');
      return;
    }

    const id = 'REP-' + Date.now();
    const fecha = new Date().toISOString();
    const nombreArchivo = tipo === 'pdf' ? `${id}.pdf` : `${id}.xlsx`;

    let dataUrl = '';
    if (tipo === 'pdf') {
      dataUrl = await exportarPDF(id, filtros, datosFiltrados);
    } else {
      dataUrl = exportarExcel(id, filtros, datosFiltrados);
    }

    if (dataUrl) {
      descargarArchivo(dataUrl, nombreArchivo);
      guardarArchivoGenerado({ id, tipo, nombre: nombreArchivo, fecha, dataUrl });
    } else {
      console.warn('No se pudo generar el archivo para descarga.');
    }

    guardarHistorial({ id, fecha, filtros, totalRegistros: datosFiltrados.length, tipo, nombre: nombreArchivo });
  }

  async function exportarPDF(id, filtros, datos) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const paginaAncho = doc.internal.pageSize.getWidth();
    const paginaAlto = doc.internal.pageSize.getHeight();

    const logoDataUrl = await obtenerLogo();
    const formatoLogo = obtenerFormatoImagen(logoDataUrl);
    const modoMarca = logoConfig.mode || 'marca';
    const opacidadMarca = logoConfig.opacity || 0.08;
    const usarMarcaAgua = modoMarca === 'marca' || modoMarca === 'marca-pie';
    const usarPie = modoMarca === 'pie-izq' || modoMarca === 'pie-der' || modoMarca === 'marca-pie';

    if (logoDataUrl && usarMarcaAgua) {
      const marcaAguaEstado = doc.GState ? new doc.GState({ opacity: opacidadMarca }) : null;
      if (marcaAguaEstado) {
        doc.setGState(marcaAguaEstado);
      }
      const marcaAguaTam = paginaAncho * 0.65;
      const marcaAguaX = (paginaAncho - marcaAguaTam) / 2;
      const marcaAguaY = (paginaAlto - marcaAguaTam) / 2;
      doc.addImage(logoDataUrl, formatoLogo, marcaAguaX, marcaAguaY, marcaAguaTam, marcaAguaTam, undefined, 'SLOW');
      if (marcaAguaEstado) {
        const gStateNormal = new doc.GState({ opacity: 1 });
        doc.setGState(gStateNormal);
      }
    }

    const margenLateral = 14;
    const encabezadoAltura = 20;

    if (logoDataUrl) {
      const logoAncho = 28;
      const logoAlto = 28;
      doc.addImage(logoDataUrl, formatoLogo, margenLateral, 12, logoAncho, logoAlto, undefined, 'FAST');
      doc.setFontSize(18);
      doc.setTextColor(31, 41, 55);
      doc.text('OptiStock', margenLateral + logoAncho + 6, 20);
      doc.setFontSize(11);
      doc.setTextColor(107, 114, 128);
      doc.text('Reporte de actividades', margenLateral + logoAncho + 6, 26);
    } else {
      doc.setFontSize(18);
      doc.setTextColor(31, 41, 55);
      doc.text('OptiStock - Reporte de actividades', margenLateral, 20);
    }

    if (logoDataUrl && usarPie) {
      const posiciones = modoMarca === 'marca-pie' ? ['pie-izq', 'pie-der'] : [modoMarca];
      const logoAnchoPie = 26;
      const logoAltoPie = 26;
      posiciones.forEach(posicion => {
        const x = posicion === 'pie-der' ? paginaAncho - margenLateral - logoAnchoPie : margenLateral;
        const y = paginaAlto - logoAltoPie - 12;
        doc.addImage(logoDataUrl, formatoLogo, x, y, logoAnchoPie, logoAltoPie, undefined, 'FAST');
      });
    }

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(10);
    doc.text(`Folio: ${id}`, margenLateral, 42);
    doc.text(`Generado: ${new Date().toLocaleString()}`, paginaAncho - margenLateral, 42, { align: 'right' });

    doc.autoTable({
      head: [['Filtro', 'Valor']],
      body: [
        ['Módulos', filtros.modulos.length ? filtros.modulos.join(', ') : 'Todos'],
        ['Rango de fechas', `${filtros.fechaInicio || 'Sin definir'} - ${filtros.fechaFin || 'Sin definir'}`],
        ['Categoría', filtros.categoria || 'Todas'],
        ['Zona', filtros.zona || 'Todas'],
        ['Rol', filtros.rol || 'Todos']
      ],
      startY: encabezadoAltura + 32,
      theme: 'grid',
      styles: {
        fontSize: 10,
        cellPadding: 3,
        textColor: [55, 65, 81]
      },
      headStyles: {
        fillColor: [255, 111, 145],
        textColor: 255,
        halign: 'left'
      },
      alternateRowStyles: {
        fillColor: [255, 243, 247]
      }
    });

    doc.autoTable({
      head: [['ID', 'Módulo', 'Fecha', 'Categoría', 'Zona', 'Rol', 'Detalle', 'Cantidad']],
      body: datos.map(item => [
        item.id,
        capitalizar(item.modulo),
        formatearFecha(item.fecha),
        item.categoria,
        item.zona,
        capitalizar(item.rol),
        item.descripcion,
        item.cantidad
      ]),
      startY: doc.lastAutoTable.finalY + 8,
      styles: {
        fontSize: 9,
        cellPadding: 2,
        textColor: [31, 41, 55]
      },
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: 255
      },
      alternateRowStyles: {
        fillColor: [237, 233, 254]
      }
    });

    const pieY = doc.lastAutoTable.finalY + 10;
    if (pieY < paginaAlto - 12) {
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text('OptiStock · Gestión inteligente de inventarios', margenLateral, paginaAlto - 12);
      doc.text('https://optistock.local', paginaAncho - margenLateral, paginaAlto - 12, { align: 'right' });
    }

    return doc.output('datauristring');
  }

  function exportarExcel(id, filtros, datos) {
    const wb = XLSX.utils.book_new();
    const hojaFiltros = XLSX.utils.json_to_sheet([
      { filtro: 'Módulos', valor: filtros.modulos.length ? filtros.modulos.join(', ') : 'Todos' },
      { filtro: 'Rango de fechas', valor: `${filtros.fechaInicio || 'Sin definir'} - ${filtros.fechaFin || 'Sin definir'}` },
      { filtro: 'Categoría', valor: filtros.categoria || 'Todas' },
      { filtro: 'Zona', valor: filtros.zona || 'Todas' },
      { filtro: 'Rol', valor: filtros.rol || 'Todos' }
    ]);
    XLSX.utils.book_append_sheet(wb, hojaFiltros, 'Filtros');

    const hojaDatos = XLSX.utils.json_to_sheet(datos.map(item => ({
      ID: item.id,
      Modulo: capitalizar(item.modulo),
      Fecha: formatearFecha(item.fecha),
      Categoria: item.categoria,
      Zona: item.zona,
      Rol: capitalizar(item.rol),
      Detalle: item.descripcion,
      Cantidad: item.cantidad
    })));
    XLSX.utils.book_append_sheet(wb, hojaDatos, 'Datos');

    const base64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
    return `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`;
  }

  function guardarHistorial({ id, fecha, filtros, totalRegistros, tipo, nombre }) {
    const historial = obtenerHistorial();
    const nuevoRegistro = {
      id,
      fecha,
      modulos: filtros.modulos.length ? filtros.modulos.join(', ') : 'Todos',
      registros: totalRegistros,
      tipo,
      nombre
    };
    const actualizados = [nuevoRegistro, ...historial.filter(item => item.id !== id)];
    guardarHistorialLista(actualizados);
    actualizarHistorial();
  }

  function actualizarHistorial() {
    if (!historialBody) {
      return;
    }

    const historial = obtenerHistorial();
    const archivos = obtenerArchivosGenerados();
    const mapaArchivos = new Map(archivos.map(item => [item.id, item]));
    const vigentes = [];

    historialBody.innerHTML = '';
    historial.forEach(registro => {
      if (!mapaArchivos.has(registro.id)) {
        return;
      }
      vigentes.push(registro);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${registro.id}</td>
        <td>${formatearFechaHora(registro.fecha)}</td>
        <td>${registro.modulos} · ${registro.registros} registro${registro.registros === 1 ? '' : 's'}</td>
        <td>${registro.tipo === 'excel' ? 'Excel (.xlsx)' : 'PDF (.pdf)'}</td>
        <td class="text-end">
          <div class="document-actions">
            <button class="btn-action btn--small" type="button" data-download-historial="${registro.id}">Descargar</button>
            <button class="btn-action btn--small btn-share" type="button" data-share="${registro.id}">Compartir</button>
          </div>
        </td>
      `;
      historialBody.appendChild(tr);
    });

    if (vigentes.length !== historial.length) {
      guardarHistorialLista(vigentes);
    }
  }

  function descargarArchivo(dataUrl, nombre) {
    const enlace = document.createElement('a');
    enlace.href = dataUrl;
    enlace.download = nombre || 'reporte';
    enlace.rel = 'noopener';
    enlace.style.display = 'none';
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
  }

  function descargarDesdeHistorial(id) {
    const archivos = obtenerArchivosGenerados();
    const archivo = archivos.find(item => item.id === id);
    if (!archivo) {
      alert('El archivo ya no está disponible para descarga.');
      actualizarHistorial();
      return;
    }
    const extension = archivo.tipo === 'excel' ? '.xlsx' : '.pdf';
    const nombre = archivo.nombre || `${archivo.id}${extension}`;
    descargarArchivo(archivo.dataUrl, nombre);
  }

  function compartir(id) {
    const texto = `https://optistock.local/reportes/${id}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto)
        .then(() => alert('Enlace copiado: ' + texto))
        .catch(() => mostrarMensajeManual(texto));
    } else {
      mostrarMensajeManual(texto);
    }
  }

  function mostrarMensajeManual(texto) {
    alert('Copia manualmente el enlace:\n' + texto);
  }

  function guardarProgramacion() {
    if (!intervaloSelect) {
      toggleModal(false);
      return;
    }

    const val = intervaloSelect.value;

    if (val === 'personalizado') {
      const dias = parseInt(intervaloDiasInput?.value || '', 10);
      if (!dias || dias < 1) {
        alert('Ingresa la cantidad de días para la programación personalizada.');
        return;
      }
      localStorage.setItem(KEY_INTERVAL_DAYS, String(dias));
    } else {
      localStorage.removeItem(KEY_INTERVAL_DAYS);
    }

    localStorage.setItem(KEY_INTERVAL, val);
    configurarProgramacion();
    toggleModal(false);
  }

  function cargarProgramacion() {
    if (!intervaloSelect) {
      return;
    }

    const val = localStorage.getItem(KEY_INTERVAL) || '';
    intervaloSelect.value = val;

    if (val === 'personalizado' && intervaloDiasInput) {
      const diasGuardados = parseInt(localStorage.getItem(KEY_INTERVAL_DAYS) || '', 10);
      if (diasGuardados) {
        intervaloDiasInput.value = String(diasGuardados);
      }
    }

    if (grupoPersonalizado) {
      grupoPersonalizado.hidden = val !== 'personalizado';
    }

    configurarProgramacion();
  }

  function configurarProgramacion() {
    if (programacion) {
      clearInterval(programacion);
      programacion = null;
    }

    if (!intervaloSelect) {
      actualizarEstadoProgramacion('Sin programación automática activa.');
      return;
    }

    const val = intervaloSelect.value;

    if (grupoPersonalizado) {
      grupoPersonalizado.hidden = val !== 'personalizado';
    }

    if (!val) {
      actualizarEstadoProgramacion('Sin programación automática activa.');
      return;
    }

    let intervalMs = null;
    let descripcion = '';

    switch (val) {
      case 'diario':
        intervalMs = 86_400_000;
        descripcion = 'Programación activa: cada día.';
        break;
      case 'semanal':
        intervalMs = 604_800_000;
        descripcion = 'Programación activa: cada semana.';
        break;
      case 'quincenal':
        intervalMs = 1_296_000_000;
        descripcion = 'Programación activa: cada 15 días.';
        break;
      case 'mensual':
        intervalMs = 2_592_000_000;
        descripcion = 'Programación activa: cada 30 días.';
        break;
      case 'personalizado': {
        const dias = parseInt(intervaloDiasInput?.value || '', 10);
        if (!dias || dias < 1) {
          actualizarEstadoProgramacion('Define los días para activar el reporte automático.');
          return;
        }
        intervalMs = dias * 86_400_000;
        descripcion = `Programación activa: cada ${dias} día${dias === 1 ? '' : 's'}.`;
        localStorage.setItem(KEY_INTERVAL_DAYS, String(dias));
        break;
      }
      default:
        actualizarEstadoProgramacion('Sin programación automática activa.');
        return;
    }

    actualizarEstadoProgramacion(descripcion);

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    programacion = setInterval(() => {
      exportar('pdf').catch(error => console.error('Error al generar el reporte programado:', error));
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Reporte generado automáticamente', { body: 'Se creó un PDF con los filtros vigentes.' });
      }
    }, intervalMs);
  }

  function formatearFecha(fechaISO) {
    const fecha = new Date(fechaISO + 'T00:00:00');
    return fecha.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: '2-digit' });
  }

  function formatearFechaHora(fechaISO) {
    const fecha = new Date(fechaISO);
    return fecha.toLocaleString('es-ES');
  }

  function formatearMes(clave) {
    const [anio, mes] = clave.split('-');
    const fecha = new Date(Number(anio), Number(mes) - 1);
    return fecha.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
  }

  function capitalizar(texto) {
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  function leerArchivo(archivo) {
    return new Promise((resolve, reject) => {
      const lector = new FileReader();
      lector.onload = () => resolve(typeof lector.result === 'string' ? lector.result : '');
      lector.onerror = () => reject(new Error('No se pudo leer el archivo proporcionado.'));
      lector.readAsDataURL(archivo);
    });
  }

  function cargarImagenBase64(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const contexto = canvas.getContext('2d');
        contexto.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('No se pudo cargar la imagen: ' + src));
      img.src = src.startsWith('data:') ? src : normalizarRuta(src);
      if (img.complete && img.naturalWidth) {
        img.onload();
      }
    });
  }

  function normalizarRuta(ruta) {
    try {
      return new URL(ruta, window.location.href).toString();
    } catch (error) {
      console.warn('Ruta no válida para el recurso:', ruta, error);
      return ruta;
    }
  }

  function toggleModal(mostrar) {
    if (!modal) {
      return;
    }

    modal.setAttribute('aria-hidden', mostrar ? 'false' : 'true');

    if (mostrar) {
      (modalContent || modal).focus({ preventScroll: true });
    } else {
      programarBtn?.focus({ preventScroll: true });
    }
  }
});
