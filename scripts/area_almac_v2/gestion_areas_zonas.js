// gestion_areas_zonas.js
(function() {

let editAreaId = null;
let editZoneId = null;

  // —————— Referencias al DOM ——————
  const areaBtn      = document.getElementById('nuevaArea');
  const zonaBtn      = document.getElementById('nuevaZona');
  const formArea     = document.getElementById('formArea');
  const formZona     = document.getElementById('formZona');
  const resumenAreas = document.getElementById('resumenAreas');
  const resumenZonas = document.getElementById('resumenZonas');
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
  const tablaAreasBody = document.querySelector('#tablaAreas tbody');
  const tablaZonasBody        = document.querySelector('#tablaZonas tbody');
  const tablaZonasSinAreaBody = document.querySelector('#tablaZonasSinArea tbody');
  const zonaSubniv   = document.getElementById('zonaSubniveles');
  const zonaDist     = document.getElementById('zonaDistancia');

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

  // —————— CRUD Áreas ——————
  async function fetchAreas() {
    const res = await fetch(`${API_BASE}/guardar_areas.php?empresa_id=${EMP_ID}`);
    return await res.json();
  }

async function renderAreas() {
  // 1) Traer datos de áreas y zonas
  const [areas, zonas] = await Promise.all([ fetchAreas(), fetchZonas() ]);
  // 2) Contar cuántas zonas hay por área
  const zonasPorArea = zonas.reduce((acc, z) => {
    acc[z.area_id] = (acc[z.area_id] || 0) + 1;
    return acc;
  }, {});

  // 3) Poblar la tabla de áreas
  tablaAreasBody.innerHTML = '';
areas.forEach(a => {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${a.nombre}</td>
    <td>${a.descripcion}</td>
    <td>${a.ancho}×${a.largo}×${a.alto}</td>
    <td>${parseFloat(a.volumen).toFixed(2)}</td>
    <td>${zonasPorArea[a.id]||0}</td>
    <td>
      <button class="btn btn-sm btn-primary me-1 btn-edit-area" data-id="${a.id}">Editar</button>
      <button class="btn btn-sm btn-danger btn-delete-area" data-id="${a.id}">Eliminar</button>
    </td>
  `;
  tablaAreasBody.appendChild(tr);
});

  // 4) También rellenamos el <select> de zonas
  zonaAreaSel.innerHTML = '<option value="">Seleccione</option>';
  areas.forEach(a => {
    const o = document.createElement('option');
    o.value = a.id;
    o.textContent = a.nombre;
    zonaAreaSel.appendChild(o);
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
      formArea.classList.add('d-none');
      // recarga
      await renderAreas();
      await renderZonas();
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


async function renderZonas() {
  // 1) Traer datos
  const [zonas, areas] = await Promise.all([ fetchZonas(), fetchAreas() ]);
  const areasMap = Object.fromEntries(areas.map(a => [a.id, a.nombre]));

  // 2) Separar asignadas / sin asignar
  const zonasAsignadas    = zonas.filter(z => z.area_id && z.area_id > 0);
  const zonasSinAsignar   = zonas.filter(z => !z.area_id || z.area_id === 0);

  // 3) Poblar tabla de Zonas asignadas
  tablaZonasBody.innerHTML = '';
  zonasAsignadas.forEach(z => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${z.nombre}</td>
      <td>${areasMap[z.area_id] || z.area_id}</td>
      <td>${z.ancho}×${z.largo}×${z.alto}</td>
      <td>${parseFloat(z.volumen).toFixed(2)}</td>
      <td>${z.tipo_almacenamiento}</td>
      <td>
        <button class="btn btn-sm btn-primary me-1 btn-edit-zone" data-id="${z.id}">Editar</button>
        <button class="btn btn-sm btn-danger btn-delete-zone" data-id="${z.id}">Eliminar</button>
      </td>
    `;
    tablaZonasBody.appendChild(tr);
  });
 // 4) Poblar tabla de Zonas sin asignar
tablaZonasSinAreaBody.innerHTML = '';
  zonasSinAsignar.forEach(z => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${z.nombre}</td>
      <td>${z.ancho}×${z.largo}×${z.alto}</td>
      <td>${parseFloat(z.volumen).toFixed(2)}</td>
      <td>${z.tipo_almacenamiento}</td>
      <td>
        <button class="btn btn-sm btn-primary me-1 btn-edit-zone" data-id="${z.id}">Editar</button>
        <button class="btn btn-sm btn-danger btn-delete-zone" data-id="${z.id}">Eliminar</button>
      </td>
    `;
    tablaZonasSinAreaBody.appendChild(tr);
  });

}

async function editArea(id) {
  // 1) Traer la área
  const res = await fetch(`${API_BASE}/guardar_areas.php?id=${id}&empresa_id=${EMP_ID}`);
  const a   = await res.json();
  // 2) Mostrar form y rellenar
  formArea.classList.remove('d-none');
  formZona.classList.add('d-none');
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
  formZona.classList.remove('d-none');
  formArea.classList.add('d-none');
  zonaNombre.value = z.nombre;
  zonaDesc.value   = z.descripcion;
  zonaLargo.value  = z.largo;
  zonaAncho.value  = z.ancho;
  zonaAlto.value   = z.alto;
  zonaTipoSel.value = z.tipo_almacenamiento;
  zonaAreaSel.value = z.area_id || '';
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
    area_id:            parseInt(zonaAreaSel.value, 10) || 0,
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
      formZona.classList.add('d-none');
      await renderZonas();
      await renderAreas();
    } else {
      throw new Error(j.error || 'Error en el servidor');
    }
  } catch (err) {
    showToast(err.message);
  }
});


async function deleteArea(id) {
  // 1) Obtener todas las zonas
  const zonas = await fetchZonas();
  // 2) Filtrar las que están asignadas a este área
  const zonasAsig = zonas.filter(z => z.area_id === parseInt(id, 10));

  // 3) Mensaje de confirmación distinto si hay zonas
  let mensaje = '¿Seguro que deseas eliminar esta área?';
  if (zonasAsig.length) {
    mensaje = `El área que vas a eliminar y sus ${zonasAsig.length} zona(s) asignadas quedarán sin un área a la que pertenezcan. ¿Deseas continuar?`;
  }
  if (!confirm(mensaje)) return;

  // 4) Para cada zona asignada, lanzamos un PUT reasignando area_id a 0
  for (const z of zonasAsig) {
    // Construir payload completo con area_id = 0
    const payload = {
      nombre:             z.nombre,
      descripcion:        z.descripcion,
      ancho:              z.ancho,
      largo:              z.largo,
      alto:               z.alto,
      tipo_almacenamiento: z.tipo_almacenamiento,
      subniveles:         z.subniveles || [],
      area_id:            0,
      empresa_id:         EMP_ID
    };
    await fetch(
      `${API_BASE}/guardar_zonas.php?id=${z.id}&empresa_id=${EMP_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  // 5) Finalmente borramos el área
  await fetch(
    `${API_BASE}/guardar_areas.php?id=${id}&empresa_id=${EMP_ID}`, {
    method: 'DELETE'
  });

  // 6) Refrescar ambas tablas
  await renderAreas();
  await renderZonas();
}



  // —————— Botones de alternar vista ——————
  areaBtn.addEventListener('click', () => {
    formArea.classList.remove('d-none');
    formZona.classList.add('d-none');
    renderAreas();
  });
  zonaBtn.addEventListener('click', () => {
    formZona.classList.remove('d-none');
    formArea.classList.add('d-none');
    renderAreas();
    renderZonas();
  });

// Áreas: editar / borrar
tablaAreasBody.addEventListener('click', e => {
  const id = e.target.dataset.id;
  if (!id) return;
  if (e.target.matches('.btn-edit-area'))  editArea(id);
  if (e.target.matches('.btn-delete-area')) deleteArea(id);
});

// Zonas: editar / borrar
tablaZonasBody.addEventListener('click', e => {
  const id = e.target.dataset.id;
  if (!id) return;
  if (e.target.matches('.btn-edit-zone'))  editZone(id);
  if (e.target.matches('.btn-delete-zone')) deleteZone(id);
});


// Zonas sin asignar: editar / borrar
tablaZonasSinAreaBody.addEventListener('click', e => {
  const id = e.target.dataset.id;
  if (!id) return;
  if (e.target.matches('.btn-edit-zone'))  editZone(id);
  if (e.target.matches('.btn-delete-zone')) deleteZone(id);
});

  // —————— Eventos de volumen en vivo ——————
  formArea.addEventListener('input', calcularVolumenArea);
  formZona.addEventListener('input', calcularVolumenZona);

  // —————— Inicialización ——————
  llenarTipos();
  calcularVolumenArea();
  calcularVolumenZona();
  renderAreas();
  renderZonas();
})();
