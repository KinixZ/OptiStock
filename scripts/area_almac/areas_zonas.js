(() => {
  const STORAGE_KEYS = {
    areas: 'optistock_areas',
    zonas: 'optistock_zonas'
  };
  const ALERT_THRESHOLD = 90;

  let areas = [];
  let zonas = [];

  const filters = {
    name: '',
    area: '',
    capacity: '',
    product: ''
  };

  const areaForm = document.getElementById('areaForm');
  const zoneForm = document.getElementById('zoneForm');
  const registroLista = document.getElementById('registroLista');
  const zoneAreaSelect = document.getElementById('zoneArea');
  const filterAreaSelect = document.getElementById('filterArea');
  const filterNameInput = document.getElementById('filterName');
  const filterCapacitySelect = document.getElementById('filterCapacity');
  const filterProductInput = document.getElementById('filterProduct');
  const resetFiltersBtn = document.getElementById('resetFilters');
  const exportExcelBtn = document.getElementById('exportExcel');
  const exportPDFBtn = document.getElementById('exportPDF');
  const alertsContainer = document.getElementById('alertsContainer');
  const metricsContainer = document.getElementById('metricsContainer');
  const tableBody = document.querySelector('#tablaAreasZonas tbody');
  const emptyTableMessage = document.getElementById('emptyTableMessage');
  const sublevelsCountInput = document.getElementById('sublevelsCount');
  const sublevelsContainer = document.getElementById('sublevelsContainer');
  const errorContainer = document.getElementById('error-message');
  const resumenAreasEl = document.getElementById('totalAreas');
  const resumenZonasEl = document.getElementById('totalZonas');
  const resumenZonasSinAreaEl = document.getElementById('zonasSinArea');

  const DEFAULT_DATA = {
    areas: [
      {
        id: 101,
        nombre: 'Recepción y desembalaje',
        descripcion: 'Zona destinada al ingreso de mercancía y control de calidad inicial.',
        ancho: 18,
        alto: 6,
        largo: 22,
        actualizado: new Date().toISOString()
      },
      {
        id: 102,
        nombre: 'Picking y preparación de pedidos',
        descripcion: 'Área de preparación de pedidos con estanterías dinámicas.',
        ancho: 24,
        alto: 7,
        largo: 30,
        actualizado: new Date().toISOString()
      },
      {
        id: 103,
        nombre: 'Almacenamiento refrigerado',
        descripcion: 'Cámaras de frío para productos perecederos.',
        ancho: 16,
        alto: 5,
        largo: 20,
        actualizado: new Date().toISOString()
      }
    ],
    zonas: [
      {
        id: 201,
        nombre: 'Recepción A1',
        descripcion: 'Recepción de contenedores estándar',
        ancho: 9,
        alto: 5,
        largo: 12,
        tipo_almacenamiento: 'piso',
        area_id: 101,
        ocupacion: 62,
        productos: ['Materia prima importada', 'Palets mixtos'],
        subniveles: [],
        actualizado: new Date().toISOString()
      },
      {
        id: 202,
        nombre: 'Picking Estantería dinámica',
        descripcion: 'Estantería dinámica para alta rotación',
        ancho: 8,
        alto: 6,
        largo: 15,
        tipo_almacenamiento: 'estanteria',
        area_id: 102,
        ocupacion: 78,
        productos: ['Electrónica', 'Accesorios'],
        subniveles: [
          { numero_subnivel: 1, ancho: 8, alto: 2, largo: 15, distancia: 0.4 },
          { numero_subnivel: 2, ancho: 8, alto: 2, largo: 15, distancia: 0.4 }
        ],
        actualizado: new Date().toISOString()
      },
      {
        id: 203,
        nombre: 'Refrigerado - Cámara 2',
        descripcion: 'Cámara de frío para productos lácteos',
        ancho: 6,
        alto: 4,
        largo: 10,
        tipo_almacenamiento: 'refrigeracion',
        area_id: 103,
        ocupacion: 92,
        productos: ['Lácteos', 'Cárnicos envasados'],
        subniveles: [],
        actualizado: new Date().toISOString()
      }
    ]
  };

  function mostrarError(mensaje) {
    if (errorContainer) {
      errorContainer.textContent = mensaje;
      errorContainer.style.display = 'block';
      setTimeout(() => {
        errorContainer.style.display = 'none';
      }, 5000);
    } else {
      alert(mensaje);
    }
  }

  function renderSublevels(count) {
    sublevelsContainer.innerHTML = '';
    if (count > 0) {
      for (let i = 1; i <= count; i++) {
        const div = document.createElement('div');
        div.className = 'sublevel-dimensions';
        div.innerHTML = `
          <strong>Subnivel ${i}</strong>
          <label>Ancho (m)</label>
          <input type="number" name="sublevelWidth${i}" min="0.01" step="0.01" required />
          <label>Alto (m)</label>
          <input type="number" name="sublevelHeight${i}" min="0.01" step="0.01" required />
          <label>Largo (m)</label>
          <input type="number" name="sublevelLength${i}" min="0.01" step="0.01" required />
          <label>Distancia al siguiente nivel (m)</label>
          <input type="number" name="sublevelDistance${i}" min="0" step="0.01" value="0" />
        `;
        sublevelsContainer.appendChild(div);
      }
    }
  }

  function loadFromStorage(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.warn('Error leyendo storage', error);
      return null;
    }
  }

  function saveToStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn('Error guardando storage', error);
    }
  }

  function ensureBaseData() {
    const storedAreas = loadFromStorage(STORAGE_KEYS.areas);
    const storedZonas = loadFromStorage(STORAGE_KEYS.zonas);

    if (!storedAreas || !storedAreas.length) {
      saveToStorage(STORAGE_KEYS.areas, DEFAULT_DATA.areas);
    }

    if (!storedZonas || !storedZonas.length) {
      saveToStorage(STORAGE_KEYS.zonas, DEFAULT_DATA.zonas);
    }

    areas = loadFromStorage(STORAGE_KEYS.areas) || [];
    zonas = loadFromStorage(STORAGE_KEYS.zonas) || [];
  }

  function persistData() {
    saveToStorage(STORAGE_KEYS.areas, areas);
    saveToStorage(STORAGE_KEYS.zonas, zonas);
  }

  function capacidadTotal(zona) {
    return Number((zona.ancho * zona.alto * zona.largo).toFixed(2));
  }

  function nivelOcupacion(zona) {
    const ocupacion = Math.min(100, Math.max(0, Number(zona.ocupacion || 0)));
    if (ocupacion < 50) return 'low';
    if (ocupacion <= 80) return 'medium';
    return 'high';
  }

  function formatDate(iso) {
    if (!iso) return '—';
    const date = new Date(iso);
    return date.toLocaleString('es-PE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function nombreArea(id) {
    if (!id) return 'Sin asignar';
    const area = areas.find(a => a.id === id);
    return area ? area.nombre : 'Sin asignar';
  }

  function updateCounters() {
    if (resumenAreasEl) resumenAreasEl.textContent = areas.length;
    if (resumenZonasEl) resumenZonasEl.textContent = zonas.length;
    if (resumenZonasSinAreaEl) {
      const sinArea = zonas.filter(z => !z.area_id).length;
      resumenZonasSinAreaEl.textContent = sinArea;
    }
  }

  function renderResumen() {
    if (!areas.length && !zonas.length) {
      registroLista.innerHTML = '<p class="vacio">No hay áreas ni zonas registradas.</p>';
      return;
    }

    let html = '<div class="resumen-grid">';

    areas.forEach(area => {
      const zonasArea = zonas.filter(z => z.area_id === area.id);
      const promedio = zonasArea.length
        ? zonasArea.reduce((acc, z) => acc + (Number(z.ocupacion) || 0), 0) / zonasArea.length
        : 0;

      html += `
        <div class="area-card">
          <div class="area-header">
            <h4>${area.nombre}</h4>
            <div class="area-actions">
              <button onclick="editarArea(${area.id})">✏️</button>
              <button onclick="eliminarArea(${area.id})">🗑️</button>
            </div>
          </div>
          <p>${area.descripcion || ''}</p>
          <p><strong>Dimensiones:</strong> ${area.ancho}m × ${area.alto}m × ${area.largo}m</p>
          <p><strong>Ocupación promedio:</strong> ${promedio ? promedio.toFixed(1) : '0'}%</p>
          <div class="zonas-list">
            ${zonasArea.length ? zonasArea.map(zona => `
              <div class="zona-item">
                <span>${zona.nombre} (${zona.tipo_almacenamiento}) - ${zona.ancho}m × ${zona.alto}m × ${zona.largo}m</span>
                <div class="zona-actions">
                  <button onclick="editarZona(${zona.id})">✏️</button>
                  <button onclick="eliminarZona(${zona.id})">🗑️</button>
                </div>
              </div>
            `).join('') : '<p class="vacio">No hay zonas en esta área</p>'}
          </div>
        </div>
      `;
    });

    const zonasSinArea = zonas.filter(z => !z.area_id);
    if (zonasSinArea.length) {
      html += `
        <div class="area-card">
          <h4>Zonas sin área asignada</h4>
          ${zonasSinArea.map(zona => `
            <div class="zona-item">
              <span>${zona.nombre} (${zona.tipo_almacenamiento}) - ${zona.ancho}m × ${zona.alto}m × ${zona.largo}m</span>
              <div class="zona-actions">
                <button onclick="editarZona(${zona.id})">✏️</button>
                <button onclick="eliminarZona(${zona.id})">🗑️</button>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    html += '</div>';
    registroLista.innerHTML = html;
  }

  function updateFilterOptions() {
    const filterAreaValue = filterAreaSelect?.value || '';
    if (zoneAreaSelect) {
      zoneAreaSelect.innerHTML = '<option value="">Seleccione un área</option>';
      areas.forEach(area => {
        const option = document.createElement('option');
        option.value = area.id;
        option.textContent = area.nombre;
        zoneAreaSelect.appendChild(option);
      });
    }

    if (filterAreaSelect) {
      filterAreaSelect.innerHTML = '<option value="">Todas las áreas</option>';
      areas.forEach(area => {
        const option = document.createElement('option');
        option.value = area.id;
        option.textContent = area.nombre;
        filterAreaSelect.appendChild(option);
      });
      filterAreaSelect.value = filterAreaValue;
    }
  }

  function getFilteredZonas() {
    return zonas.filter(zona => {
      const areaName = nombreArea(zona.area_id).toLowerCase();
      const zoneName = zona.nombre.toLowerCase();
      const buscar = filters.name.toLowerCase();
      const productMatch = filters.product
        ? (zona.productos || []).some(p => p.toLowerCase().includes(filters.product.toLowerCase()))
        : true;
      const capacity = Number(zona.ocupacion || 0);

      let capacidadMatch = true;
      if (filters.capacity === 'low') capacidadMatch = capacity < 50;
      if (filters.capacity === 'medium') capacidadMatch = capacity >= 50 && capacity <= 80;
      if (filters.capacity === 'high') capacidadMatch = capacity > 80;

      const nameMatch = buscar ? (areaName.includes(buscar) || zoneName.includes(buscar)) : true;
      const areaMatch = filters.area ? String(zona.area_id) === filters.area : true;

      return nameMatch && areaMatch && capacidadMatch && productMatch;
    });
  }

  function renderMetrics() {
    if (!metricsContainer) return;
    const zonasRegistradas = zonas.length;
    const capacidadTotalM3 = zonas.reduce((acc, zona) => acc + capacidadTotal(zona), 0);
    const ocupacionPromedio = zonasRegistradas
      ? zonas.reduce((acc, zona) => acc + (Number(zona.ocupacion) || 0), 0) / zonasRegistradas
      : 0;
    const zonasCriticas = zonas.filter(zona => Number(zona.ocupacion) >= ALERT_THRESHOLD).length;

    const areaMasOcupada = areas
      .map(area => {
        const zonasArea = zonas.filter(z => z.area_id === area.id);
        const promedio = zonasArea.length
          ? zonasArea.reduce((acc, z) => acc + (Number(z.ocupacion) || 0), 0) / zonasArea.length
          : 0;
        return { nombre: area.nombre, promedio };
      })
      .sort((a, b) => b.promedio - a.promedio)[0];

    metricsContainer.innerHTML = `
      <article class="metric-card">
        <span>Promedio de ocupación</span>
        <strong>${ocupacionPromedio.toFixed(1)}%</strong>
        <div class="metric-progress"><span style="width:${Math.min(100, ocupacionPromedio)}%"></span></div>
      </article>
      <article class="metric-card">
        <span>Capacidad total consolidada</span>
        <strong>${capacidadTotalM3.toFixed(1)} m³</strong>
        <p class="metric-detail">Calculada con base en las dimensiones de cada zona.</p>
      </article>
      <article class="metric-card">
        <span>Zonas en estado crítico</span>
        <strong>${zonasCriticas}</strong>
        <p class="metric-detail">Umbral configurado en ${ALERT_THRESHOLD}% de ocupación.</p>
      </article>
      <article class="metric-card">
        <span>Área con mayor ocupación promedio</span>
        <strong>${areaMasOcupada ? areaMasOcupada.nombre : 'Sin datos'}</strong>
        <p class="metric-detail">${areaMasOcupada ? areaMasOcupada.promedio.toFixed(1) + '%' : 'Registra zonas para generar esta métrica.'}</p>
      </article>
    `;
  }

  function renderAlerts() {
    if (!alertsContainer) return;
    const criticas = zonas
      .filter(zona => Number(zona.ocupacion) >= ALERT_THRESHOLD)
      .sort((a, b) => b.ocupacion - a.ocupacion);

    if (!criticas.length) {
      alertsContainer.style.display = 'none';
      alertsContainer.innerHTML = '';
      return;
    }

    alertsContainer.style.display = 'block';
    alertsContainer.innerHTML = `
      <strong>Alerta de capacidad:</strong> ${criticas.length} zona(s) superan el ${ALERT_THRESHOLD}% de ocupación.
      <ul>
        ${criticas
          .map(
            zona => `
              <li>
                <strong>${zona.nombre}</strong> en ${nombreArea(zona.area_id)} con ${Number(zona.ocupacion).toFixed(1)}% de ocupación.
              </li>
            `
          )
          .join('')}
      </ul>
    `;
  }

  function renderTable() {
    if (!tableBody) return;
    const filtered = getFilteredZonas();
    tableBody.innerHTML = '';

    if (!filtered.length) {
      if (emptyTableMessage) emptyTableMessage.style.display = 'block';
      return;
    }

    if (emptyTableMessage) emptyTableMessage.style.display = 'none';

    filtered
      .sort((a, b) => b.ocupacion - a.ocupacion)
      .forEach(zona => {
        const row = document.createElement('tr');
        const nivel = nivelOcupacion(zona);
        const productos = (zona.productos || []).join(', ') || 'Sin información';

        row.innerHTML = `
          <td>${nombreArea(zona.area_id)}</td>
          <td>${zona.nombre}</td>
          <td>${zona.tipo_almacenamiento}</td>
          <td>${capacidadTotal(zona).toFixed(1)}</td>
          <td>
            <span class="ocupacion-pill" data-level="${nivel}">${Number(zona.ocupacion).toFixed(1)}%</span>
          </td>
          <td>${productos}</td>
          <td>${formatDate(zona.actualizado)}</td>
        `;
        tableBody.appendChild(row);
      });
  }

  function resetFilters() {
    filters.name = '';
    filters.area = '';
    filters.capacity = '';
    filters.product = '';
    if (filterNameInput) filterNameInput.value = '';
    if (filterAreaSelect) filterAreaSelect.value = '';
    if (filterCapacitySelect) filterCapacitySelect.value = '';
    if (filterProductInput) filterProductInput.value = '';
    renderTable();
  }

  function syncUI() {
    updateCounters();
    renderResumen();
    updateFilterOptions();
    renderMetrics();
    renderAlerts();
    renderTable();
  }

  function handleAreaSubmit(event) {
    event.preventDefault();
    const nombre = areaForm.areaName.value.trim();
    const descripcion = areaForm.areaDesc.value.trim();
    const ancho = parseFloat(areaForm.areaWidth.value);
    const alto = parseFloat(areaForm.areaHeight.value);
    const largo = parseFloat(areaForm.areaLength.value);

    if (!nombre || !descripcion || [ancho, alto, largo].some(val => isNaN(val) || val <= 0)) {
      mostrarError('Debe completar todos los campos del área con valores válidos.');
      return;
    }

    const areaData = {
      id: areaForm.dataset.id ? Number(areaForm.dataset.id) : Date.now(),
      nombre,
      descripcion,
      ancho,
      alto,
      largo,
      actualizado: new Date().toISOString()
    };

    if (areaForm.dataset.id) {
      areas = areas.map(area => (area.id === areaData.id ? areaData : area));
    } else {
      areas.push(areaData);
    }

    persistData();
    areaForm.reset();
    delete areaForm.dataset.id;
    areaForm.style.display = 'none';
    syncUI();
  }

  function handleZonaSubmit(event) {
    event.preventDefault();

    const id = zoneForm.dataset.id ? Number(zoneForm.dataset.id) : Date.now();
    const nombre = zoneForm.zoneName.value.trim();
    const descripcion = zoneForm.zoneDesc.value.trim();
    const ancho = parseFloat(zoneForm.zoneWidth.value);
    const alto = parseFloat(zoneForm.zoneHeight.value);
    const largo = parseFloat(zoneForm.zoneLength.value);
    const tipo = zoneForm.storageType.value;
    const area_id = zoneForm.zoneArea.value ? Number(zoneForm.zoneArea.value) : null;
    const ocupacion = parseFloat(zoneForm.zoneUsage.value);
    const productos = zoneForm.zoneProducts.value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
    const sublevelsCount = parseInt(zoneForm.sublevelsCount.value) || 0;

    if (!nombre || !descripcion || !tipo || [ancho, alto, largo, ocupacion].some(val => isNaN(val) || val < 0)) {
      mostrarError('Complete todos los campos obligatorios de la zona con valores válidos.');
      return;
    }

    if (ocupacion > 100) {
      mostrarError('La ocupación no puede superar el 100%.');
      return;
    }

    const subniveles = [];
    for (let i = 1; i <= sublevelsCount; i++) {
      const anchoSub = parseFloat(zoneForm[`sublevelWidth${i}`]?.value);
      const altoSub = parseFloat(zoneForm[`sublevelHeight${i}`]?.value);
      const largoSub = parseFloat(zoneForm[`sublevelLength${i}`]?.value);
      const distancia = parseFloat(zoneForm[`sublevelDistance${i}`]?.value || 0);

      if ([anchoSub, altoSub, largoSub].some(val => isNaN(val) || val <= 0)) {
        mostrarError(`Dimensiones del subnivel ${i} deben ser válidas.`);
        return;
      }

      subniveles.push({ numero_subnivel: i, ancho: anchoSub, alto: altoSub, largo: largoSub, distancia });
    }

    const zonaData = {
      id,
      nombre,
      descripcion,
      ancho,
      alto,
      largo,
      tipo_almacenamiento: tipo,
      area_id,
      ocupacion,
      productos,
      subniveles,
      actualizado: new Date().toISOString()
    };

    if (zoneForm.dataset.id) {
      zonas = zonas.map(zona => (zona.id === id ? zonaData : zona));
    } else {
      zonas.push(zonaData);
    }

    persistData();
    zoneForm.reset();
    renderSublevels(0);
    delete zoneForm.dataset.id;
    zoneForm.style.display = 'none';
    syncUI();
  }

  function mostrarFormulario(tipo, datos = null) {
    if (tipo === 'area') {
      areaForm.style.display = 'block';
      zoneForm.style.display = 'none';

      if (datos) {
        areaForm.areaName.value = datos.nombre;
        areaForm.areaDesc.value = datos.descripcion || '';
        areaForm.areaWidth.value = datos.ancho;
        areaForm.areaHeight.value = datos.alto;
        areaForm.areaLength.value = datos.largo;
        areaForm.dataset.id = datos.id;
      } else {
        areaForm.reset();
        delete areaForm.dataset.id;
      }
    } else if (tipo === 'zona') {
      zoneForm.style.display = 'block';
      areaForm.style.display = 'none';
      updateFilterOptions();

      if (datos) {
        zoneForm.zoneName.value = datos.nombre;
        zoneForm.zoneDesc.value = datos.descripcion || '';
        zoneForm.zoneWidth.value = datos.ancho;
        zoneForm.zoneHeight.value = datos.alto;
        zoneForm.zoneLength.value = datos.largo;
        zoneForm.storageType.value = datos.tipo_almacenamiento;
        zoneForm.zoneArea.value = datos.area_id || '';
        zoneForm.zoneUsage.value = Number(datos.ocupacion || 0);
        zoneForm.zoneProducts.value = (datos.productos || []).join(', ');
        zoneForm.sublevelsCount.value = datos.subniveles?.length || 0;
        renderSublevels(datos.subniveles?.length || 0);

        datos.subniveles?.forEach((sub, index) => {
          const idx = index + 1;
          zoneForm[`sublevelWidth${idx}`].value = sub.ancho;
          zoneForm[`sublevelHeight${idx}`].value = sub.alto;
          zoneForm[`sublevelLength${idx}`].value = sub.largo;
          zoneForm[`sublevelDistance${idx}`].value = sub.distancia || 0;
        });

        zoneForm.dataset.id = datos.id;
      } else {
        zoneForm.reset();
        renderSublevels(0);
        delete zoneForm.dataset.id;
      }
    }
  }

  function editarArea(id) {
    const area = areas.find(area => area.id === id);
    if (area) {
      mostrarFormulario('area', area);
    }
  }

  function eliminarArea(id) {
    if (!confirm('¿Está seguro de eliminar esta área?')) return;

    areas = areas.filter(area => area.id !== id);
    zonas = zonas.map(zona => (zona.area_id === id ? { ...zona, area_id: null } : zona));
    persistData();
    syncUI();
  }

  function editarZona(id) {
    const zona = zonas.find(zona => zona.id === id);
    if (zona) {
      mostrarFormulario('zona', zona);
    }
  }

  function eliminarZona(id) {
    if (!confirm('¿Está seguro de eliminar esta zona?')) return;
    zonas = zonas.filter(zona => zona.id !== id);
    persistData();
    syncUI();
  }

  function exportarExcel() {
    const registros = getFilteredZonas();
    if (!registros.length) {
      mostrarError('No hay información para exportar con los filtros aplicados.');
      return;
    }

    const encabezados = ['Área', 'Zona', 'Tipo de almacenamiento', 'Capacidad (m3)', 'Ocupación (%)', 'Productos', 'Última actualización'];
    const filas = registros.map(zona => [
      nombreArea(zona.area_id),
      zona.nombre,
      zona.tipo_almacenamiento,
      capacidadTotal(zona).toFixed(1),
      Number(zona.ocupacion).toFixed(1),
      (zona.productos || []).join(' | '),
      formatDate(zona.actualizado)
    ]);

    const contenido = [encabezados, ...filas].map(row => row.map(cell => `"${cell}"`).join(';')).join('\n');
    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = 'reporte_areas_zonas.csv';
    enlace.click();
    URL.revokeObjectURL(url);
  }

  function exportarPDF() {
    const registros = getFilteredZonas();
    if (!registros.length) {
      mostrarError('No hay información para exportar con los filtros aplicados.');
      return;
    }

    const ventana = window.open('', '_blank');
    if (!ventana) {
      mostrarError('El bloqueador de ventanas emergentes impide generar el PDF.');
      return;
    }

    const tablaHTML = registros
      .map(
        zona => `
          <tr>
            <td>${nombreArea(zona.area_id)}</td>
            <td>${zona.nombre}</td>
            <td>${zona.tipo_almacenamiento}</td>
            <td>${capacidadTotal(zona).toFixed(1)}</td>
            <td>${Number(zona.ocupacion).toFixed(1)}%</td>
            <td>${(zona.productos || []).join(', ')}</td>
            <td>${formatDate(zona.actualizado)}</td>
          </tr>
        `
      )
      .join('');

    ventana.document.write(`
      <html>
        <head>
          <title>Reporte de ocupación de áreas y zonas</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { font-size: 20px; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
            th { background: #f0f4ff; text-align: left; }
            tr:nth-child(even) { background: #f9fbff; }
          </style>
        </head>
        <body>
          <h1>Reporte de ocupación de áreas y zonas</h1>
          <p>Generado el ${formatDate(new Date().toISOString())}</p>
          <table>
            <thead>
              <tr>
                <th>Área</th>
                <th>Zona</th>
                <th>Tipo</th>
                <th>Capacidad m³</th>
                <th>Ocupación</th>
                <th>Productos</th>
                <th>Última actualización</th>
              </tr>
            </thead>
            <tbody>${tablaHTML}</tbody>
          </table>
        </body>
      </html>
    `);
    ventana.document.close();
    ventana.focus();
    ventana.print();
  }

  function initListeners() {
    areaForm?.addEventListener('submit', handleAreaSubmit);
    zoneForm?.addEventListener('submit', handleZonaSubmit);

    if (sublevelsCountInput) {
      sublevelsCountInput.addEventListener('change', event => {
        const count = parseInt(event.target.value) || 0;
        renderSublevels(count);
      });
    }

    filterNameInput?.addEventListener('input', event => {
      filters.name = event.target.value;
      renderTable();
    });

    filterAreaSelect?.addEventListener('change', event => {
      filters.area = event.target.value;
      renderTable();
    });

    filterCapacitySelect?.addEventListener('change', event => {
      filters.capacity = event.target.value;
      renderTable();
    });

    filterProductInput?.addEventListener('input', event => {
      filters.product = event.target.value;
      renderTable();
    });

    resetFiltersBtn?.addEventListener('click', event => {
      event.preventDefault();
      resetFilters();
    });

    exportExcelBtn?.addEventListener('click', event => {
      event.preventDefault();
      exportarExcel();
    });

    exportPDFBtn?.addEventListener('click', event => {
      event.preventDefault();
      exportarPDF();
    });
  }

  function protegerRuta() {
    if (!localStorage.getItem('usuario_id')) {
      window.location.href = '../../pages/regis_login/login/login.html';
    }
  }

  function init() {
    protegerRuta();
    ensureBaseData();
    initListeners();
    syncUI();

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        ensureBaseData();
        syncUI();
      }
    });

    window.mostrarFormulario = mostrarFormulario;
    window.editarArea = editarArea;
    window.eliminarArea = eliminarArea;
    window.editarZona = editarZona;
    window.eliminarZona = eliminarZona;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
