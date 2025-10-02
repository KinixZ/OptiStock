// gestion_areas_zonas.js
(function() {

let editAreaId = null;
let editZoneId = null;

  // —————— Referencias al DOM ——————
  const areaBtn      = document.getElementById('nuevaArea');
  const zonaBtn      = document.getElementById('nuevaZona');
  const formArea     = document.getElementById('formArea');
  const formZona     = document.getElementById('formZona');
  const areaNombre   = document.getElementById('areaNombre');
  const areaDesc     = document.getElementById('areaDescripcion');
  const areaLargo    = document.getElementById('areaLargo');
  const areaAncho    = document.getElementById('areaAncho');
  const areaAlto     = document.getElementById('areaAlto');
  const volumenArea  = document.getElementById('areaVolumen');
  const zonaNombre   = document.getElementById('zonaNombre');
  const zonaDesc     = document.getElementById('zonaDescripcion');
  const zonaLargo    = document.getElementById('zonaLargo');
  const zonaAncho    = document.getElementById('zonaAncho');
  const zonaAlto     = document.getElementById('zonaAlto');
  const volumenZona  = document.getElementById('zonaVolumen');
  const zonaAreaSel  = document.getElementById('zonaArea');
  const zonaTipoSel  = document.getElementById('zonaTipo');
  const tablaAreasBody        = document.querySelector('#tablaAreas tbody');
  const tablaZonasBody        = document.querySelector('#tablaZonas tbody');
  const tablaZonasSinAreaBody = document.querySelector('#tablaZonasSinArea tbody');
  const totalAreasEl          = document.getElementById('totalAreas');
  const totalZonasEl          = document.getElementById('totalZonas');
  const zonasSinAreaEl        = document.getElementById('zonasSinArea');
  const filtroNombre          = document.getElementById('filtroNombre');
  const filtroArea            = document.getElementById('filtroArea');
  const filtroOcupacion       = document.getElementById('filtroOcupacion');
  const filtroOcupacionValor  = document.getElementById('filtroOcupacionValor');
  const filtroProductos       = document.getElementById('filtroProductos');
  const exportExcelBtn        = document.getElementById('exportExcel');
  const exportPdfBtn          = document.getElementById('exportPdf');
  const alertasBanner         = document.getElementById('alertasSaturacion');

  let areasData = [];
  let zonasData = [];

  const API_BASE     = '../../scripts/php';
  const EMP_ID       = parseInt(localStorage.getItem('id_empresa'), 10) || 0;

  const tiposZona = [
    'Rack', 'Mostrador', 'Caja', 'Estantería',
    'Refrigeración', 'Congelador', 'Piso', 'Contenedor',
    'Palet', 'Carro', 'Cajón', 'Jaula', 'Estiba',
    'Bodega', 'Silo', 'Tanque', 'Gabinete', 'Vitrina',
    'Armario', 'Otro'
  ];

  function llenarTipos() {
    zonaTipoSel.innerHTML = '<option value="">Seleccione tipo</option>';
    // al menos las primeras 20
    tiposZona.slice(0, 20).forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.toLowerCase();
      opt.textContent = t;
      zonaTipoSel.appendChild(opt);
    });
  }

  function normalizarArea(area = {}) {
    const volumen = parseFloat(area.volumen ?? 0) || 0;
    const capacidad = parseFloat(area.capacidad_utilizada ?? 0) || 0;
    const disponible = area.capacidad_disponible !== undefined
      ? parseFloat(area.capacidad_disponible) || 0
      : Math.max(volumen - capacidad, 0);

    return {
      ...area,
      id: area.id !== undefined ? parseInt(area.id, 10) : null,
      ancho: area.ancho !== undefined ? parseFloat(area.ancho) : 0,
      alto: area.alto !== undefined ? parseFloat(area.alto) : 0,
      largo: area.largo !== undefined ? parseFloat(area.largo) : 0,
      volumen,
      capacidad_utilizada: capacidad,
      capacidad_disponible: disponible,
      porcentaje_ocupacion: parseFloat(area.porcentaje_ocupacion ?? 0) || 0,
      productos_registrados: parseInt(area.productos_registrados ?? 0, 10) || 0,
      total_unidades: parseInt(area.total_unidades ?? 0, 10) || 0,
    };
  }

  function normalizarZona(zona = {}) {
    const volumen = parseFloat(zona.volumen ?? 0) || 0;
    const capacidad = parseFloat(zona.capacidad_utilizada ?? 0) || 0;
    const disponible = zona.capacidad_disponible !== undefined
      ? parseFloat(zona.capacidad_disponible) || 0
      : Math.max(volumen - capacidad, 0);

    let areaId = null;
    if (zona.area_id !== null && zona.area_id !== undefined) {
      const parsed = parseInt(zona.area_id, 10);
      areaId = Number.isNaN(parsed) ? null : parsed;
    }

    return {
      ...zona,
      id: zona.id !== undefined ? parseInt(zona.id, 10) : null,
      area_id: areaId,
      volumen,
      capacidad_utilizada: capacidad,
      capacidad_disponible: disponible,
      porcentaje_ocupacion: parseFloat(zona.porcentaje_ocupacion ?? 0) || 0,
      productos_registrados: parseInt(zona.productos_registrados ?? 0, 10) || 0,
      total_unidades: parseInt(zona.total_unidades ?? 0, 10) || 0,
    };
  }

  function renderBarraOcupacion(valor) {
    const porcentaje = Math.min(Math.max(Number(valor) || 0, 0), 100);
    const estado = porcentaje >= 90 ? ' capacity-bar--critical' : porcentaje >= 70 ? ' capacity-bar--warning' : '';
    return `
      <div class="capacity-bar${estado}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${porcentaje.toFixed(1)}">
        <div class="capacity-bar__fill" style="width:${porcentaje}%"></div>
        <span class="capacity-bar__label">${porcentaje.toFixed(1)}%</span>
      </div>
    `;
  }

  function filtrarZonas() {
    const nombreFiltro = (filtroNombre?.value || '').trim().toLowerCase();
    const areaSeleccionada = filtroArea?.value || 'todos';
    const ocupacionMin = filtroOcupacion ? parseInt(filtroOcupacion.value, 10) || 0 : 0;
    const productosMin = filtroProductos ? parseInt(filtroProductos.value, 10) || 0 : 0;

    const filtradas = zonasData.filter(zona => {
      if (nombreFiltro && !zona.nombre?.toLowerCase().includes(nombreFiltro)) {
        return false;
      }

      const areaId = zona.area_id ?? null;
      if (areaSeleccionada === 'sin-area' && areaId) {
        return false;
      }
      if (areaSeleccionada !== 'todos' && areaSeleccionada !== 'sin-area') {
        if ((areaId || 0) !== parseInt(areaSeleccionada, 10)) {
          return false;
        }
      }

      const porcentaje = Number(zona.porcentaje_ocupacion || 0);
      if (porcentaje < ocupacionMin) {
        return false;
      }

      const productos = Number(zona.productos_registrados || 0);
      if (productos < productosMin) {
        return false;
      }

      return true;
    });

    return {
      todas: filtradas,
      asignadas: filtradas.filter(z => z.area_id),
      sinArea: filtradas.filter(z => !z.area_id),
    };
  }

  function actualizarOpcionesArea() {
    const selectedZona = zonaAreaSel?.value || '';
    const selectedFiltro = filtroArea?.value || 'todos';

    if (zonaAreaSel) {
      zonaAreaSel.innerHTML = '<option value="">Seleccione un área</option>';
    }
    if (filtroArea) {
      filtroArea.innerHTML = '<option value="todos">Todas las zonas</option><option value="sin-area">Zonas sin área</option>';
    }

    areasData.forEach(area => {
      if (zonaAreaSel) {
        const opt = document.createElement('option');
        opt.value = area.id;
        opt.textContent = area.nombre;
        zonaAreaSel.appendChild(opt);
      }
      if (filtroArea) {
        const optFiltro = document.createElement('option');
        optFiltro.value = area.id;
        optFiltro.textContent = area.nombre;
        filtroArea.appendChild(optFiltro);
      }
    });

    if (zonaAreaSel) {
      zonaAreaSel.value = selectedZona;
    }
    if (filtroArea) {
      filtroArea.value = selectedFiltro;
    }
  }

  function actualizarResumen() {
    if (totalAreasEl) {
      totalAreasEl.textContent = areasData.length;
    }
    if (totalZonasEl) {
      totalZonasEl.textContent = zonasData.length;
    }
    if (zonasSinAreaEl) {
      zonasSinAreaEl.textContent = zonasData.filter(z => !z.area_id).length;
    }
  }

  function actualizarAlertas() {
    if (!alertasBanner) {
      return;
    }

    const UMBRAL_ALERTA = 70;
    const areasIndex = new Map(areasData.map(area => [area.id, area]));

    const alertasAreas = areasData
      .filter(area => Number(area.porcentaje_ocupacion || 0) >= UMBRAL_ALERTA)
      .map(area => ({
        tipo: 'Área',
        nombre: area.nombre || 'Sin nombre',
        porcentaje: Number(area.porcentaje_ocupacion || 0),
        disponible: area.capacidad_disponible,
      }));

    const alertasZonas = zonasData
      .filter(zona => Number(zona.porcentaje_ocupacion || 0) >= UMBRAL_ALERTA)
      .map(zona => ({
        tipo: 'Zona',
        nombre: zona.nombre || 'Sin nombre',
        porcentaje: Number(zona.porcentaje_ocupacion || 0),
        disponible: zona.capacidad_disponible,
        area: zona.area_id ? areasIndex.get(zona.area_id)?.nombre : null,
      }));

    const alertas = [...alertasAreas, ...alertasZonas]
      .sort((a, b) => b.porcentaje - a.porcentaje);

    if (!alertas.length) {
      alertasBanner.classList.remove('active');
      alertasBanner.innerHTML = '';
      return;
    }

    const items = alertas.map(alerta => {
      const detalles = [];
      if (alerta.tipo === 'Zona' && alerta.area) {
        detalles.push(`Área: ${alerta.area}`);
      }
      if (Number.isFinite(alerta.disponible)) {
        detalles.push(`${alerta.disponible.toFixed(2)} m³ libres`);
      }
      detalles.push(`${alerta.porcentaje.toFixed(1)}% ocupado`);

      return `<li><strong>${alerta.tipo}: ${alerta.nombre}</strong><span>${detalles.join(' · ')}</span></li>`;
    }).join('');

    alertasBanner.classList.add('active');
    alertasBanner.innerHTML = `<span>Capacidad reducida detectada:</span><ul>${items}</ul>`;
  }

  function exportarZonasCSV() {
    const datos = filtrarZonas().todas;
    if (!datos.length) {
      showToast('No hay datos filtrados para exportar');
      return;
    }

    const cabecera = ['Zona', 'Área', 'Capacidad utilizada (m³)', 'Disponible (m³)', 'Ocupación (%)', 'Productos (tipos)', 'Unidades totales'];
    const filas = datos.map(z => {
      const areaNombre = z.area_id ? (areasData.find(a => a.id === z.area_id)?.nombre || z.area_id) : 'Sin área';
      return [
        z.nombre,
        areaNombre,
        (z.capacidad_utilizada || 0).toFixed(2),
        (z.capacidad_disponible || 0).toFixed(2),
        (z.porcentaje_ocupacion || 0).toFixed(1),
        z.productos_registrados || 0,
        z.total_unidades || 0
      ].join(';');
    });

    const contenido = [cabecera.join(';'), ...filas].join('\n');
    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(blob);
    enlace.download = 'ocupacion_zonas.csv';
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    URL.revokeObjectURL(enlace.href);
  }

  function exportarZonasPDF() {
    const datos = filtrarZonas().todas;
    if (!datos.length) {
      showToast('No hay datos filtrados para exportar');
      return;
    }

    const ventana = window.open('', '_blank');
    if (!ventana) {
      showToast('No se pudo abrir la ventana de impresión');
      return;
    }

    const filas = datos.map(z => {
      const areaNombre = z.area_id ? (areasData.find(a => a.id === z.area_id)?.nombre || z.area_id) : 'Sin área';
      return `<tr>
        <td>${z.nombre}</td>
        <td>${areaNombre}</td>
        <td>${(z.capacidad_utilizada || 0).toFixed(2)}</td>
        <td>${(z.capacidad_disponible || 0).toFixed(2)}</td>
        <td>${(z.porcentaje_ocupacion || 0).toFixed(1)}%</td>
        <td>${z.productos_registrados || 0}</td>
        <td>${z.total_unidades || 0}</td>
      </tr>`;
    }).join('');

    ventana.document.write(`
      <html>
        <head>
          <title>Reporte de ocupación de zonas</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { font-size: 20px; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #999; padding: 8px; font-size: 12px; text-align: left; }
            th { background: #f1f3f8; }
          </style>
        </head>
        <body>
          <h1>Reporte de ocupación de zonas</h1>
          <table>
            <thead>
              <tr>
                <th>Zona</th>
                <th>Área</th>
                <th>Capacidad utilizada (m³)</th>
                <th>Disponible (m³)</th>
                <th>Ocupación (%)</th>
                <th>Productos (tipos)</th>
                <th>Unidades totales</th>
              </tr>
            </thead>
            <tbody>${filas}</tbody>
          </table>
        </body>
      </html>
    `);
    ventana.document.close();
    ventana.focus();
    ventana.print();
  }

  // —————— Helpers ——————
  function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'toast-message';
    t.innerText = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  function calcularVolumenArea() {
    const v = (parseFloat(areaLargo.value)||0) *
              (parseFloat(areaAncho.value)||0) *
              (parseFloat(areaAlto.value)||0);
    volumenArea.textContent = v.toFixed(2);
  }
  function calcularVolumenZona() {
    const v = (parseFloat(zonaLargo.value)||0) *
              (parseFloat(zonaAncho.value)||0) *
              (parseFloat(zonaAlto.value)||0);
    volumenZona.textContent = v.toFixed(2);
  }

  function activarFormulario(tipo) {
    if (tipo === 'area') {
      formArea.classList.remove('d-none');
      formZona.classList.add('d-none');
      areaBtn.setAttribute('aria-pressed', 'true');
      zonaBtn.setAttribute('aria-pressed', 'false');
    } else {
      formZona.classList.remove('d-none');
      formArea.classList.add('d-none');
      zonaBtn.setAttribute('aria-pressed', 'true');
      areaBtn.setAttribute('aria-pressed', 'false');
    }
  }

  // —————— CRUD Áreas ——————
  async function fetchAreas() {
    const res = await fetch(`${API_BASE}/guardar_areas.php?empresa_id=${EMP_ID}`);
    return await res.json();
  }

  function renderAreas() {
    tablaAreasBody.innerHTML = '';

    if (!areasData.length) {
      const emptyRow = document.createElement('tr');
      emptyRow.className = 'empty-row';
      emptyRow.innerHTML = '<td colspan="9">No hay áreas registradas.</td>';
      tablaAreasBody.appendChild(emptyRow);
      return;
    }

    const zonasPorArea = zonasData.reduce((acc, zona) => {
      const areaId = zona.area_id || 0;
      acc[areaId] = (acc[areaId] || 0) + 1;
      return acc;
    }, {});

    areasData.forEach(area => {
      const capacidad = Number(area.capacidad_utilizada || 0);
      const volumen = Number(area.volumen || 0);
      const disponible = area.capacidad_disponible !== undefined
        ? Number(area.capacidad_disponible)
        : Math.max(volumen - capacidad, 0);
      const porcentaje = Number(area.porcentaje_ocupacion || 0);
      const productos = Number(area.productos_registrados || 0);
      const totalUnidades = Number(area.total_unidades || 0);
      const productosDisplay = totalUnidades
        ? `${productos} tipo${productos === 1 ? '' : 's'} / ${totalUnidades} uds`
        : `${productos} tipo${productos === 1 ? '' : 's'}`;

      const tr = document.createElement('tr');
      if (porcentaje >= 90) {
        tr.classList.add('row-alert');
      }
      tr.innerHTML = `
        <td data-label="Área">
          <div class="table-title">${area.nombre}</div>
          <span class="table-subtext">${zonasPorArea[area.id] || 0} zonas vinculadas</span>
        </td>
        <td data-label="Descripción">${area.descripcion || ''}</td>
        <td data-label="Dimensiones">${(area.ancho ?? 0)}×${(area.largo ?? 0)}×${(area.alto ?? 0)}</td>
        <td data-label="Volumen">${volumen.toFixed(2)}</td>
        <td data-label="Capacidad utilizada">${capacidad.toFixed(2)}</td>
        <td data-label="Disponible">${disponible.toFixed(2)}</td>
        <td data-label="Ocupación">${renderBarraOcupacion(porcentaje)}</td>
        <td data-label="Productos">${productosDisplay}</td>
        <td data-label="Acciones">
          <div class="table-actions">
            <button class="table-action table-action--edit" data-action="edit-area" data-id="${area.id}">Editar</button>
            <button class="table-action table-action--delete" data-action="delete-area" data-id="${area.id}">Eliminar</button>
          </div>
        </td>
      `;
      tablaAreasBody.appendChild(tr);
    });
  }



formArea.addEventListener('submit', async e => {
  e.preventDefault();
  const payload = {
    nombre:      areaNombre.value.trim(),
    descripcion: areaDesc.value.trim(),
    ancho:       parseFloat(areaAncho.value) || 0,
    largo:       parseFloat(areaLargo.value) || 0,
    alto:        parseFloat(areaAlto.value) || 0,
    empresa_id:  EMP_ID
  };

  // Elegir método y URL según si estamos editando o creando
  const method = editAreaId ? 'PUT' : 'POST';
  const url    = editAreaId
    ? `${API_BASE}/guardar_areas.php?id=${editAreaId}&empresa_id=${EMP_ID}`
    : `${API_BASE}/guardar_areas.php`;

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const j = await res.json();
    if (res.ok && (j.id || j.success)) {
      showToast(editAreaId ? 'Área actualizada' : 'Área registrada');
      // reset
      formArea.reset();
      calcularVolumenArea();
      editAreaId = null;
      activarFormulario('area');
      await recargarDatos();
    } else {
      throw new Error(j.error || 'Error en el servidor');
    }
  } catch (err) {
    showToast(err.message);
  }
});

  // —————— CRUD Zonas ——————
  async function fetchZonas() {
  const res = await fetch(`${API_BASE}/guardar_zonas.php?empresa_id=${EMP_ID}`);
  return await res.json();
}


  async function recargarDatos() {
    try {
      const [areas, zonas] = await Promise.all([fetchAreas(), fetchZonas()]);
      areasData = Array.isArray(areas) ? areas.map(normalizarArea) : [];
      zonasData = Array.isArray(zonas) ? zonas.map(normalizarZona) : [];
      actualizarResumen();
      actualizarOpcionesArea();
      renderAreas();
      renderZonas();
    } catch (error) {
      console.error('Error al recargar datos', error);
      showToast('No se pudo actualizar la información de áreas y zonas');
    }
  }


  function renderZonas() {
    const resultado = filtrarZonas();
    const areasMap = Object.fromEntries(areasData.map(a => [a.id, a.nombre]));

    tablaZonasBody.innerHTML = '';
    if (!resultado.asignadas.length) {
      const emptyRow = document.createElement('tr');
      emptyRow.className = 'empty-row';
      emptyRow.innerHTML = '<td colspan="8">No hay zonas asignadas que coincidan con los filtros.</td>';
      tablaZonasBody.appendChild(emptyRow);
    } else {
      resultado.asignadas.forEach(zona => {
        const porcentaje = Number(zona.porcentaje_ocupacion || 0);
        const capacidad = Number(zona.capacidad_utilizada || 0);
        const disponible = zona.capacidad_disponible !== undefined
          ? Number(zona.capacidad_disponible)
          : Math.max(Number(zona.volumen || 0) - capacidad, 0);
        const productos = Number(zona.productos_registrados || 0);
        const totalUnidades = Number(zona.total_unidades || 0);
        const productosDisplay = totalUnidades
          ? `${productos} tipo${productos === 1 ? '' : 's'} / ${totalUnidades} uds`
          : `${productos} tipo${productos === 1 ? '' : 's'}`;

        const tr = document.createElement('tr');
        if (porcentaje >= 90) {
          tr.classList.add('row-alert');
        }
        tr.innerHTML = `
          <td data-label="Zona">
            <div class="table-title">${zona.nombre}</div>
            <span class="table-subtext">${zona.tipo_almacenamiento || 'Sin tipo'}</span>
          </td>
          <td data-label="Área">${areasMap[zona.area_id] || 'Sin área'}</td>
          <td data-label="Dimensiones">${(zona.ancho ?? 0)}×${(zona.largo ?? 0)}×${(zona.alto ?? 0)}</td>
          <td data-label="Capacidad utilizada">${capacidad.toFixed(2)}</td>
          <td data-label="Disponible">${disponible.toFixed(2)}</td>
          <td data-label="Ocupación">${renderBarraOcupacion(porcentaje)}</td>
          <td data-label="Productos">${productosDisplay}</td>
          <td data-label="Acciones">
            <div class="table-actions">
              <button class="table-action table-action--edit" data-action="edit-zone" data-id="${zona.id}">Editar</button>
              <button class="table-action table-action--delete" data-action="delete-zone" data-id="${zona.id}">Eliminar</button>
            </div>
          </td>
        `;
        tablaZonasBody.appendChild(tr);
      });
    }

    tablaZonasSinAreaBody.innerHTML = '';
    if (!resultado.sinArea.length) {
      const emptyRow = document.createElement('tr');
      emptyRow.className = 'empty-row';
      emptyRow.innerHTML = '<td colspan="7">No hay zonas sin área que coincidan con los filtros.</td>';
      tablaZonasSinAreaBody.appendChild(emptyRow);
    } else {
      resultado.sinArea.forEach(zona => {
        const porcentaje = Number(zona.porcentaje_ocupacion || 0);
        const capacidad = Number(zona.capacidad_utilizada || 0);
        const disponible = zona.capacidad_disponible !== undefined
          ? Number(zona.capacidad_disponible)
          : Math.max(Number(zona.volumen || 0) - capacidad, 0);
        const productos = Number(zona.productos_registrados || 0);
        const totalUnidades = Number(zona.total_unidades || 0);
        const productosDisplay = totalUnidades
          ? `${productos} tipo${productos === 1 ? '' : 's'} / ${totalUnidades} uds`
          : `${productos} tipo${productos === 1 ? '' : 's'}`;

        const tr = document.createElement('tr');
        if (porcentaje >= 90) {
          tr.classList.add('row-alert');
        }
        tr.innerHTML = `
          <td data-label="Zona">
            <div class="table-title">${zona.nombre}</div>
            <span class="table-subtext">${zona.tipo_almacenamiento || 'Sin tipo'}</span>
          </td>
          <td data-label="Dimensiones">${(zona.ancho ?? 0)}×${(zona.largo ?? 0)}×${(zona.alto ?? 0)}</td>
          <td data-label="Capacidad utilizada">${capacidad.toFixed(2)}</td>
          <td data-label="Disponible">${disponible.toFixed(2)}</td>
          <td data-label="Ocupación">${renderBarraOcupacion(porcentaje)}</td>
          <td data-label="Productos">${productosDisplay}</td>
          <td data-label="Acciones">
            <div class="table-actions">
              <button class="table-action table-action--edit" data-action="edit-zone" data-id="${zona.id}">Editar</button>
              <button class="table-action table-action--delete" data-action="delete-zone" data-id="${zona.id}">Eliminar</button>
            </div>
          </td>
        `;
        tablaZonasSinAreaBody.appendChild(tr);
      });
    }

    actualizarAlertas();
  }

async function editArea(id) {
  // 1) Traer la área
  const res = await fetch(`${API_BASE}/guardar_areas.php?id=${id}&empresa_id=${EMP_ID}`);
  const a   = await res.json();
  // 2) Mostrar form y rellenar
  activarFormulario('area');
  areaNombre.value = a.nombre;
  areaDesc.value   = a.descripcion;
  areaLargo.value  = a.largo;
  areaAncho.value  = a.ancho;
  areaAlto.value   = a.alto;
  calcularVolumenArea();
  editAreaId = id;
}

async function editZone(id) {
  const res = await fetch(`${API_BASE}/guardar_zonas.php?id=${id}&empresa_id=${EMP_ID}`);
  const z   = await res.json();
  activarFormulario('zona');
  zonaNombre.value = z.nombre;
  zonaDesc.value   = z.descripcion;
  zonaLargo.value  = z.largo;
  zonaAncho.value  = z.ancho;
  zonaAlto.value   = z.alto;
  zonaTipoSel.value = z.tipo_almacenamiento;
  zonaAreaSel.value = z.area_id ? String(z.area_id) : '';
  calcularVolumenZona();
  editZoneId = id;
}

formZona.addEventListener('submit', async e => {
  e.preventDefault();
  const payload = {
    nombre:             zonaNombre.value.trim(),
    descripcion:        zonaDesc.value.trim(),
    ancho:              parseFloat(zonaAncho.value) || 0,
    largo:              parseFloat(zonaLargo.value) || 0,
    alto:               parseFloat(zonaAlto.value) || 0,
    tipo_almacenamiento: zonaTipoSel.value,
    subniveles:         [],  // tu lógica si las tienes
    area_id:            zonaAreaSel.value ? parseInt(zonaAreaSel.value, 10) : null,
    empresa_id:         EMP_ID
  };

  const method = editZoneId ? 'PUT' : 'POST';
  const url    = editZoneId
    ? `${API_BASE}/guardar_zonas.php?id=${editZoneId}&empresa_id=${EMP_ID}`
    : `${API_BASE}/guardar_zonas.php`;

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const j = await res.json();
    if (res.ok && (j.id || j.success)) {
      showToast(editZoneId ? 'Zona actualizada' : 'Zona registrada');
      formZona.reset();
      calcularVolumenZona();
      editZoneId = null;
      activarFormulario('zona');
      await recargarDatos();
    } else {
      throw new Error(j.error || 'Error en el servidor');
    }
  } catch (err) {
    showToast(err.message);
  }
});


async function deleteArea(id) {
  if (!confirm('¿Seguro que deseas eliminar esta área?')) {
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/guardar_areas.php?id=${id}&empresa_id=${EMP_ID}`, {
      method: 'DELETE'
    });
    const respuesta = await res.json();
    if (!res.ok) {
      throw new Error(respuesta.error || 'No se pudo eliminar el área');
    }
    showToast('Área eliminada');
    await recargarDatos();
  } catch (error) {
    showToast(error.message);
  }
}

// —————— Borrar Zona ——————
async function deleteZone(id) {
  if (!confirm('¿Seguro que deseas eliminar esta zona?')) {
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/guardar_zonas.php?id=${id}&empresa_id=${EMP_ID}`, {
      method: 'DELETE'
    });
    const respuesta = await res.json();
    if (!res.ok) {
      throw new Error(respuesta.error || 'No se pudo eliminar la zona');
    }
    showToast('Zona eliminada');
    await recargarDatos();
  } catch (error) {
    showToast(error.message);
  }
}

  // —————— Botones de alternar vista ——————
  areaBtn.addEventListener('click', () => {
    activarFormulario('area');
    renderAreas();
  });
  zonaBtn.addEventListener('click', () => {
    activarFormulario('zona');
    renderAreas();
    renderZonas();
  });

  if (filtroNombre) {
    filtroNombre.addEventListener('input', renderZonas);
  }
  if (filtroArea) {
    filtroArea.addEventListener('change', renderZonas);
  }
  if (filtroOcupacion) {
    filtroOcupacion.addEventListener('input', () => {
      if (filtroOcupacionValor) {
        filtroOcupacionValor.textContent = `Desde ${filtroOcupacion.value}%`;
      }
      renderZonas();
    });
  }
  if (filtroProductos) {
    filtroProductos.addEventListener('input', renderZonas);
  }
  if (exportExcelBtn) {
    exportExcelBtn.addEventListener('click', exportarZonasCSV);
  }
  if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', exportarZonasPDF);
  }

// Áreas: editar / borrar
tablaAreasBody.addEventListener('click', e => {
  const button = e.target.closest('.table-action');
  if (!button) return;
  const { id, action } = button.dataset;
  if (!id || !action) return;
  if (action === 'edit-area')  editArea(id);
  if (action === 'delete-area') deleteArea(id);
});

// Zonas: editar / borrar
tablaZonasBody.addEventListener('click', e => {
  const button = e.target.closest('.table-action');
  if (!button) return;
  const { id, action } = button.dataset;
  if (!id || !action) return;
  if (action === 'edit-zone')  editZone(id);
  if (action === 'delete-zone') deleteZone(id);
});

// Zonas sin asignar: editar / borrar
tablaZonasSinAreaBody.addEventListener('click', e => {
  const button = e.target.closest('.table-action');
  if (!button) return;
  const { id, action } = button.dataset;
  if (!id || !action) return;
  if (action === 'edit-zone')  editZone(id);
  if (action === 'delete-zone') deleteZone(id);
});

  // —————— Eventos de volumen en vivo ——————
  formArea.addEventListener('input', calcularVolumenArea);
  formZona.addEventListener('input', calcularVolumenZona);

  // —————— Inicialización ——————
  activarFormulario('area');
  llenarTipos();
  calcularVolumenArea();
  calcularVolumenZona();
  if (filtroOcupacion && filtroOcupacionValor) {
    filtroOcupacionValor.textContent = `Desde ${filtroOcupacion.value}%`;
  }
  recargarDatos();
})();
