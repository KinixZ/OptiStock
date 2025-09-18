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
  const intervaloSelect = document.getElementById('intervalo');
  const ctxGrafica = document.getElementById('graficaTendencias').getContext('2d');

  let grafica = null;
  let programacion = null;
  let datosFiltrados = [];

  document.getElementById('generarPdf').addEventListener('click', () => exportar('pdf'));
  document.getElementById('generarExcel').addEventListener('click', () => exportar('excel'));
  document.getElementById('programarBtn').addEventListener('click', () => modal.style.display = 'flex');
  document.getElementById('guardarProgramacion').addEventListener('click', guardarProgramacion);
  document.getElementById('cancelarProgramacion').addEventListener('click', () => modal.style.display = 'none');

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
      metricasDiv.innerHTML = '<p class="mensaje-vacio">Ajusta los filtros para ver información resumida.</p>';
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
    const tarjeta = document.createElement('div');
    tarjeta.className = 'metric-card';
    tarjeta.innerHTML = `<span class="metric-title">${titulo}</span><strong>${valor}</strong>`;
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

    if (!grafica) {
      grafica = new Chart(ctxGrafica, {
        type: 'line',
        data: {
          labels: etiquetas,
          datasets: [{
            label: 'Cantidad de movimientos',
            data: valores,
            borderColor: '#0d6efd',
            backgroundColor: 'rgba(13, 110, 253, 0.15)',
            tension: 0.25,
            fill: true
          }]
        },
        options: {
          scales: {
            y: { beginAtZero: true }
          }
        }
      });
    } else {
      grafica.data.labels = etiquetas;
      grafica.data.datasets[0].data = valores;
      grafica.update();
    }
  }

  function exportar(tipo) {
    const filtros = actualizarVista();
    if (datosFiltrados.length === 0) {
      alert('No hay información para exportar con los filtros seleccionados.');
      return;
    }

    const id = 'REP-' + Date.now();
    if (tipo === 'pdf') {
      exportarPDF(id, filtros, datosFiltrados);
    } else {
      exportarExcel(id, filtros, datosFiltrados);
    }
    guardarHistorial(id, filtros, datosFiltrados.length);
  }

  function exportarPDF(id, filtros, datos) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(14);
    doc.text('Reporte ' + id, 10, 10);
    doc.setFontSize(11);
    doc.text('Generado: ' + new Date().toLocaleString(), 10, 18);

    doc.autoTable({
      head: [['Filtro', 'Valor']],
      body: [
        ['Módulos', filtros.modulos.length ? filtros.modulos.join(', ') : 'Todos'],
        ['Rango de fechas', `${filtros.fechaInicio || 'Sin definir'} - ${filtros.fechaFin || 'Sin definir'}`],
        ['Categoría', filtros.categoria || 'Todas'],
        ['Zona', filtros.zona || 'Todas'],
        ['Rol', filtros.rol || 'Todos']
      ],
      startY: 26
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
      startY: doc.lastAutoTable.finalY + 6,
      styles: { fontSize: 9 }
    });

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
        <td><button class="btn-share" data-id="${registro.id}">Compartir</button></td>
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
    modal.style.display = 'none';
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
      exportar('pdf');
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
});
