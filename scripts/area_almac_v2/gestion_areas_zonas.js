// gestion_areas_zonas.js
(function() {
  // —————— Referencias al DOM ——————
  const areaBtn      = document.getElementById('nuevaArea');
  const zonaBtn      = document.getElementById('nuevaZona');
  const formArea     = document.getElementById('formArea');
  const formZona     = document.getElementById('formZona');
  const resumen      = document.getElementById('resumen');
  const lista        = document.getElementById('lista');
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
  const zonaSubniv   = document.getElementById('zonaSubniveles');
  const zonaDist     = document.getElementById('zonaDistancia');

  const API_BASE     = '../../scripts/php';
  const EMP_ID       = parseInt(localStorage.getItem('id_empresa'), 10) || 0;

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
    const areas = await fetchAreas();
    // rellenar select de zona
    zonaAreaSel.innerHTML = '<option value="">Seleccione</option>';
    areas.forEach(a => {
      const o = document.createElement('option');
      o.value = a.id; o.textContent = a.nombre;
      zonaAreaSel.appendChild(o);
    });
    // pintar resumen de áreas
    resumen.innerHTML = '';
    areas.forEach(a => {
      const div = document.createElement('div');
      div.className = 'resumen-item';
      div.innerHTML = `
        <h3>${a.nombre}</h3>
        <p>${a.descripcion}</p>
        <p>Dimensiones: ${a.ancho}×${a.largo}×${a.alto} m</p>
        <p>Volumen: ${parseFloat(a.volumen).toFixed(2)} m³</p>
      `;
      resumen.appendChild(div);
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
  });

  // —————— CRUD Zonas ——————
  async function fetchZonas() {
    const res = await fetch(`${API_BASE}/guardar_zonas.php?empresa_id=${EMP_ID}`);
    return await res.json();
  }
  async function renderZonas() {
    const zonas = await fetchZonas();
    // pintar lista independiente si quieres
    lista.innerHTML = '';
    zonas.forEach(z => {
      const div = document.createElement('div');
      div.className = 'resumen-item';
      div.innerHTML = `
        <h3>${z.nombre}</h3>
        <p>${z.descripcion}</p>
        <p>Dimensiones: ${z.ancho}×${z.largo}×${z.alto} m</p>
        <p>Volumen: ${parseFloat(z.volumen).toFixed(2)} m³</p>
        <p>Área: ${z.area_id}</p>
        <p>Tipo: ${z.tipo_almacenamiento}</p>
      `;
      lista.appendChild(div);
    });
  }
  formZona.addEventListener('submit', async e => {
    e.preventDefault();
    const data = {
      nombre:             zonaNombre.value.trim(),
      descripcion:        zonaDesc.value.trim(),
      ancho:              parseFloat(zonaAncho.value)||0,
      largo:              parseFloat(zonaLargo.value)||0,
      alto:               parseFloat(zonaAlto.value)||0,
      tipo_almacenamiento: zonaTipoSel.value,
      subniveles:         [],        // tu lógica de subniveles
      area_id:            parseInt(zonaAreaSel.value,10)||0,
      empresa_id:         EMP_ID
    };
    try {
      const res = await fetch(`${API_BASE}/guardar_zonas.php`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(data)
      });
      const j = await res.json();
      if (!j.id) throw new Error(j.error||'Falló el registro');
      showToast('Zona registrada');
      formZona.reset();
      calcularVolumenZona();
      formZona.classList.add('hidden');
      renderZonas();
      renderAreas();
    } catch (err) {
      showToast(err.message);
    }
  });

  // —————— Botones de alternar vista ——————
  areaBtn.addEventListener('click', () => {
    formArea.classList.remove('hidden');
    formZona.classList.add('hidden');
    renderAreas();
  });
  zonaBtn.addEventListener('click', () => {
    formZona.classList.remove('hidden');
    formArea.classList.add('hidden');
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
