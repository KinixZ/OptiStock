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
  const modal = document.getElementById('modalProgramar');
  const programarBtn = document.getElementById('programarBtn');
  const guardarProgramacionBtn = document.getElementById('guardarProgramacion');
  const cancelarProgramacionBtn = document.getElementById('cancelarProgramacion');
  const intervaloSelect = document.getElementById('intervalo');
  const modalBackdrop = modal?.querySelector('[data-close="modal"]');
  const modalContent = modal?.querySelector('.modal__content');
  const graficaCanvas = document.getElementById('graficaTendencias');
  const ctxGrafica = graficaCanvas ? graficaCanvas.getContext('2d') : null;

  if (!metricasDiv || !tablaResultadosBody || !estadoResultados || !mensajeSinDatos || !historialBody || !intervaloSelect) {
    return;
  }

  const estilos = getComputedStyle(document.documentElement);
  const colorTexto = estilos.getPropertyValue('--text-color').trim() || '#1f2937';
  const colorBordes = estilos.getPropertyValue('--border-color').trim() || '#e7e9f5';
  const colorPrimario = estilos.getPropertyValue('--primary-color').trim() || '#ff6f91';
  const superficiePrimaria = estilos.getPropertyValue('--primary-surface-strong').trim() || 'rgba(255, 111, 145, 0.18)';
  const colorTenue = estilos.getPropertyValue('--muted-color').trim() || '#6b7280';

  let grafica = null;
  let programacion = null;
  let datosFiltrados = [];

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

  modulos.forEach(modulo => modulo.addEventListener('change', actualizarVista));
  [fInicio, fFin, fCategoria, fZona].forEach(input => {
    input.addEventListener('input', actualizarVista);
    input.addEventListener('change', actualizarVista);
  });
  fRol.addEventListener('change', actualizarVista);

  init();

  function init() {
    actualizarVista();
    actualizarHistorial();
    cargarProgramacion();
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
    if (tipo === 'pdf') {
      await exportarPDF(id, filtros, datosFiltrados);
    } else {
      exportarExcel(id, filtros, datosFiltrados);
    }
    guardarHistorial(id, filtros, datosFiltrados.length);
  }

  async function exportarPDF(id, filtros, datos) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const paginaAncho = doc.internal.pageSize.getWidth();
    const paginaAlto = doc.internal.pageSize.getHeight();

    let logoDataUrl = null;
    try {
      logoDataUrl = await cargarImagenBase64('images/optistockLogo.png');
    } catch (error) {
      console.warn('No se pudo cargar el logotipo para el PDF.', error);
    }

    if (logoDataUrl) {
      const marcaAguaEstado = doc.GState ? new doc.GState({ opacity: 0.06 }) : null;
      if (marcaAguaEstado) {
        doc.setGState(marcaAguaEstado);
      }
      const marcaAguaTam = paginaAncho * 0.65;
      const marcaAguaX = (paginaAncho - marcaAguaTam) / 2;
      const marcaAguaY = (paginaAlto - marcaAguaTam) / 2;
      doc.addImage(logoDataUrl, 'PNG', marcaAguaX, marcaAguaY, marcaAguaTam, marcaAguaTam, undefined, 'SLOW');
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
      doc.addImage(logoDataUrl, 'PNG', margenLateral, 12, logoAncho, logoAlto, undefined, 'FAST');
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

    doc.save(id + '.pdf');
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

    XLSX.writeFile(wb, id + '.xlsx');
  }

  function guardarHistorial(id, filtros, totalRegistros) {
    const historial = JSON.parse(localStorage.getItem('reportHistory') || '[]');
    historial.unshift({
      id,
      fecha: new Date().toISOString(),
      modulos: filtros.modulos.length ? filtros.modulos.join(', ') : 'Todos',
      registros: totalRegistros
    });
    localStorage.setItem('reportHistory', JSON.stringify(historial.slice(0, 20)));
    actualizarHistorial();
  }

  function actualizarHistorial() {
    const historial = JSON.parse(localStorage.getItem('reportHistory') || '[]');
    historialBody.innerHTML = '';
    historial.forEach(registro => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${registro.id}</td>
        <td>${formatearFechaHora(registro.fecha)}</td>
        <td>${registro.modulos} · ${registro.registros} registro${registro.registros === 1 ? '' : 's'}</td>
        <td><button class="btn-share" data-id="${registro.id}" type="button">Compartir</button></td>
      `;
      historialBody.appendChild(tr);
    });

    historialBody.querySelectorAll('.btn-share').forEach(btn => {
      btn.addEventListener('click', () => compartir(btn.dataset.id));
    });
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
    const val = intervaloSelect.value;
    localStorage.setItem('reportInterval', val);
    configurarProgramacion();
    toggleModal(false);
  }

  function cargarProgramacion() {
    const val = localStorage.getItem('reportInterval');
    if (val) {
      intervaloSelect.value = val;
      configurarProgramacion();
    }
  }

  function configurarProgramacion() {
    if (programacion) {
      clearInterval(programacion);
      programacion = null;
    }

    const val = intervaloSelect.value;
    if (!val) {
      return;
    }

    const intervalMs = val === 'diario' ? 86_400_000 : val === 'semanal' ? 604_800_000 : 2_592_000_000;

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
      img.src = src;
      if (img.complete && img.naturalWidth) {
        img.onload();
      }
    });
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
