// gestion_areas_zonas.js
(function() {
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
  const tablaZonasBody = document.querySelector('#tablaZonas tbody'); 
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
      <td>${zonasPorArea[a.id] || 0}</td>
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
    const data = {
      nombre:      areaNombre.value.trim(),
      descripcion: areaDesc.value.trim(),
      ancho:       parseFloat(areaAncho.value)||0,
      largo:       parseFloat(areaLargo.value)||0,
      alto:        parseFloat(areaAlto.value)||0,
      empresa_id:  EMP_ID
    };
    try {
      const res = await fetch(`${API_BASE}/guardar_areas.php`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(data)
      });
      const j = await res.json();
      if (!j.id) throw new Error(j.error||'Falló el registro');
      showToast('Área registrada');
      formArea.reset();
      calcularVolumenArea();
      formArea.classList.add('hidden');
      renderAreas();
      renderZonas(); // para actualizar vinculaciones
    } catch (err) {
      showToast(err.message);
    }
      await renderAreas();
      renderZonas();
  });

  // —————— CRUD Zonas ——————
  async function fetchZonas() {
  const res = await fetch(`${API_BASE}/guardar_zonas.php?empresa_id=${EMP_ID}`);
  return await res.json();
}

async function renderZonas() {
  // 1) Traer datos de zonas y áreas (para el nombre de área)
  const [zonas, areas] = await Promise.all([ fetchZonas(), fetchAreas() ]);
  const areasMap = Object.fromEntries(areas.map(a => [a.id, a.nombre]));

  // 2) Poblar la tabla de zonas
  tablaZonasBody.innerHTML = '';
  zonas.forEach(z => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${z.nombre}</td>
      <td>${areasMap[z.area_id] || z.area_id}</td>
      <td>${z.ancho}×${z.largo}×${z.alto}</td>
      <td>${parseFloat(z.volumen).toFixed(2)}</td>
      <td>${z.tipo_almacenamiento}</td>
    `;
    tablaZonasBody.appendChild(tr);
  });
}



  formZona.addEventListener('submit', async e => {
    e.preventDefault();
    const data = {
      nombre: zonaNombre.value.trim(),
      descripcion: zonaDesc.value.trim(),
      ancho: parseFloat(zonaAncho.value) || 0,
      largo: parseFloat(zonaLargo.value) || 0,
      alto: parseFloat(zonaAlto.value) || 0,
      tipo_almacenamiento: zonaTipoSel.value,
      subniveles: [],        // tu lógica de subniveles
      area_id: parseInt(zonaAreaSel.value, 10) || 0,
      empresa_id: EMP_ID
    };
    try {
      const res = await fetch(`${API_BASE}/guardar_zonas.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const j = await res.json();
      if (!j.id) throw new Error(j.error || 'Falló el registro');
      showToast('Zona registrada');
      formZona.reset();
      calcularVolumenZona();
      formZona.classList.add('hidden');
      renderZonas();
      renderAreas();
    } catch (err) {
      showToast(err.message);
    }
    await renderZonas();
    renderAreas();
  });

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
