document.addEventListener('DOMContentLoaded', () => {
  const modulos = document.querySelectorAll('.modulo');
  const fInicio = document.getElementById('fInicio');
  const fFin = document.getElementById('fFin');
  const fCategoria = document.getElementById('fCategoria');
  const fZona = document.getElementById('fZona');
  const fRol = document.getElementById('fRol');
  const historialBody = document.querySelector('#tablaHistorial tbody');
  const modal = document.getElementById('modalProgramar');
  const intervaloSelect = document.getElementById('intervalo');
  let programacion = null;

  document.getElementById('generarPdf').addEventListener('click', () => exportar('pdf'));
  document.getElementById('generarExcel').addEventListener('click', () => exportar('excel'));
  document.getElementById('programarBtn').addEventListener('click', () => modal.style.display = 'flex');
  document.getElementById('guardarProgramacion').addEventListener('click', guardarProgramacion);
  document.getElementById('cancelarProgramacion').addEventListener('click', () => modal.style.display = 'none');

  init();

  function init() {
    actualizarHistorial();
    cargarProgramacion();
    mostrarMetricas();
    generarGrafica();
  }

  function obtenerFiltros() {
    return {
      modulos: Array.from(modulos).filter(m => m.checked).map(m => m.value),
      fechaInicio: fInicio.value,
      fechaFin: fFin.value,
      categoria: fCategoria.value,
      zona: fZona.value,
      rol: fRol.value
    };
  }

  function exportar(tipo) {
    const filtros = obtenerFiltros();
    const id = 'REP-' + Date.now();
    if (tipo === 'pdf') {
      exportarPDF(id, filtros);
    } else {
      exportarExcel(id, filtros);
    }
    guardarHistorial(id, filtros);
  }

  function exportarPDF(id, filtros) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text('Reporte ' + id, 10, 10);
    doc.autoTable({
      head: [['Módulos', 'Filtro']],
      body: [
        ['Módulos', filtros.modulos.join(', ') || 'Todos'],
        ['Fechas', `${filtros.fechaInicio} - ${filtros.fechaFin}`],
        ['Categoría', filtros.categoria || 'Todas'],
        ['Zona', filtros.zona || 'Todas'],
        ['Rol', filtros.rol || 'Todos']
      ],
      startY: 20
    });
    doc.save(id + '.pdf');
  }

  function exportarExcel(id, filtros) {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([
      { campo: 'Módulos', valor: filtros.modulos.join(', ') || 'Todos' },
      { campo: 'Fechas', valor: `${filtros.fechaInicio} - ${filtros.fechaFin}` },
      { campo: 'Categoría', valor: filtros.categoria || 'Todas' },
      { campo: 'Zona', valor: filtros.zona || 'Todas' },
      { campo: 'Rol', valor: filtros.rol || 'Todos' }
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Filtros');
    XLSX.writeFile(wb, id + '.xlsx');
  }

  function guardarHistorial(id, filtros) {
    const historial = JSON.parse(localStorage.getItem('reportHistory') || '[]');
    historial.unshift({
      id,
      fecha: new Date().toISOString(),
      modulos: filtros.modulos.join(', ')
    });
    localStorage.setItem('reportHistory', JSON.stringify(historial));
    actualizarHistorial();
  }

  function actualizarHistorial() {
    const historial = JSON.parse(localStorage.getItem('reportHistory') || '[]');
    historialBody.innerHTML = '';
    historial.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${r.id}</td><td>${new Date(r.fecha).toLocaleString()}</td><td>${r.modulos}</td><td><button class="btn-share" data-id="${r.id}">Compartir</button></td>`;
      historialBody.appendChild(tr);
    });
    historialBody.querySelectorAll('.btn-share').forEach(btn => {
      btn.addEventListener('click', () => compartir(btn.dataset.id));
    });
  }

  function compartir(id) {
    const texto = 'Reporte ' + id;
    navigator.clipboard.writeText(texto).then(() => {
      alert('Enlace copiado: ' + texto);
    });
  }

  function mostrarMetricas() {
    document.getElementById('metricas').textContent = 'Productos: 120 - Usuarios: 8 - Áreas: 5';
  }

  function generarGrafica() {
    const ctx = document.getElementById('graficaTendencias').getContext('2d');
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
        datasets: [{
          label: 'Movimientos',
          data: [5, 10, 8, 12, 9, 14],
          borderColor: '#007bff',
          fill: false
        }]
      }
    });
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
    if (programacion) clearInterval(programacion);
    const val = intervaloSelect.value;
    const intervalMs = val === 'diario' ? 86400000 : val === 'semanal' ? 604800000 : 2592000000;
    if (!val) return;
    programacion = setInterval(() => {
      exportar('pdf');
      if ('Notification' in window) {
        Notification.requestPermission().then(p => {
          if (p === 'granted') new Notification('Reporte generado');
        });
      }
    }, intervalMs);
  }
});
