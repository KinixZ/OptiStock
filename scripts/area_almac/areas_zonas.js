(() => {
// Configuración de la API
// Detectar la ruta base para que el módulo funcione si la aplicación
// se aloja en la raíz o en un subdirectorio
const BASE_URL = window.location.pathname.includes('pages/') ? '../../' : './';
const API_ENDPOINTS = {
  areas: `${BASE_URL}scripts/php/guardar_areas.php`,
  zonas: `${BASE_URL}scripts/php/guardar_zonas.php`
};
const empresaId = localStorage.getItem('id_empresa');

// Elementos del DOM
const sublevelsCountInput = document.getElementById('sublevelsCount');
const sublevelsContainer = document.getElementById('sublevelsContainer');
const areaForm = document.getElementById('areaForm');
const zoneForm = document.getElementById('zoneForm');
const registroLista = document.getElementById('registroLista');
const zoneAreaSelect = document.getElementById('zoneArea');
const errorContainer = document.getElementById('error-message');
const resumenAreasEl = document.getElementById('totalAreas');
const resumenZonasEl = document.getElementById('totalZonas');
const resumenZonasSinAreaEl = document.getElementById('zonasSinArea');
const areaFilterSelect = document.getElementById('areaFilter');
const zonaFilterSelect = document.getElementById('zonaFilter');
const areasInventoryBody = document.getElementById('areasInventoryBody');
const zonasInventoryBody = document.getElementById('zonasInventoryBody');
const exportAreasPdfBtn = document.getElementById('exportAreasPdf');
const exportAreasExcelBtn = document.getElementById('exportAreasExcel');
const exportZonasPdfBtn = document.getElementById('exportZonasPdf');
const exportZonasExcelBtn = document.getElementById('exportZonasExcel');
const tablaAreasRegistradas = document.getElementById('tablaAreasRegistradas');
const tablaZonasRegistradas = document.getElementById('tablaZonasRegistradas');
const reasignacionOverlay = document.getElementById('reasignacionOverlay');
const reasignacionMensaje = document.getElementById('reasignacionMensaje');
const reasignacionSelect = document.getElementById('reasignacionSelect');
const reasignacionError = document.getElementById('reasignacionError');
const confirmarReasignacionBtn = document.getElementById('confirmarReasignacion');
const cancelarReasignacionBtn = document.getElementById('cancelarReasignacion');

let datosActuales = { areas: [], zonas: [] };
let zonaPendienteReasignacion = null;

// Utilidades de caché en localStorage
function getCache(key) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch (e) {
    return null;
  }
}

function setCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    /* ignore */
  }
}

function obtenerValorNumerico(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
}

function formatearNumero(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) {
    return '-';
  }
  return Number.isInteger(numero) ? numero.toString() : numero.toFixed(2);
}

function formatearDimensiones(ancho, alto, largo) {
  return [formatearNumero(ancho), formatearNumero(alto), formatearNumero(largo)].join(' × ');
}

function contarProductosZona(zona) {
  if (!zona) return 0;
  let total = obtenerValorNumerico(zona.productos_activos ?? zona.productos ?? zona.total_productos);

  if (Array.isArray(zona.subniveles) && zona.subniveles.length) {
    total += zona.subniveles.reduce((acc, subnivel) => {
      return acc + obtenerValorNumerico(subnivel.productos_activos ?? subnivel.productos ?? subnivel.total_productos);
    }, 0);
  }

  return total;
}

function contarProductosArea(area, zonas = datosActuales.zonas) {
  if (!area) return 0;
  const base = obtenerValorNumerico(area.productos_activos ?? area.productos ?? area.total_productos);
  const relacionadas = Array.isArray(zonas) ? zonas.filter(z => `${z.area_id}` === `${area.id}`) : [];
  const totalZonas = relacionadas.reduce((acc, zona) => acc + contarProductosZona(zona), 0);
  return base + totalZonas;
}

function formatearProductosActivos(total) {
  const cantidad = obtenerValorNumerico(total);
  return `${cantidad} producto${cantidad === 1 ? '' : 's'}`;
}

function obtenerNombreArea(areaId) {
  const area = datosActuales.areas.find(a => `${a.id}` === `${areaId}`);
  return area ? area.nombre : 'Sin área asignada';
}

function construirSubtituloExport(dataset, countLabel) {
  const exporter = window.ReportExporter || null;
  const empresaNombre = exporter?.getEmpresaNombre
    ? exporter.getEmpresaNombre()
    : 'OptiStock';
  const timestamp = exporter?.formatTimestamp
    ? exporter.formatTimestamp()
    : new Date().toLocaleString();

  let conteo = '';
  if (typeof countLabel === 'function') {
    conteo = countLabel(dataset.rowCount);
  } else if (exporter?.pluralize) {
    conteo = exporter.pluralize(dataset.rowCount, 'registro');
  } else {
    conteo = `${dataset.rowCount} registros`;
  }

  return [
    `Empresa: ${empresaNombre}`,
    conteo,
    `Generado: ${timestamp}`
  ].filter(Boolean).join(' · ');
}

async function guardarReporteAlmacen(blob, fileName, notes) {
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
      source: 'Áreas y zonas de almacén',
      notes
    });
  } catch (error) {
    console.warn('No se pudo guardar el reporte en el historial:', error);
  }
}

async function exportarInventarioAlmacen({ formato, tabla, meta = {} }) {
  const exporter = window.ReportExporter;
  if (!exporter) {
    mostrarError('No se pudo cargar el módulo de exportación. Recarga la página e inténtalo nuevamente.');
    return;
  }
  if (!(tabla instanceof HTMLTableElement)) {
    mostrarError('No se encontró la tabla para exportar.');
    return;
  }

  const dataset = exporter.extractTableData(tabla);
  if (!dataset || !dataset.rowCount) {
    mostrarError('No hay registros disponibles para exportar.');
    return;
  }

  const subtitle = construirSubtituloExport(dataset, meta.countLabel);
  const historyLabel = meta.historyLabel || meta.title || 'reporte';
  const notes = {
    pdf: meta.notes?.pdf || `Exportación de ${historyLabel} a PDF`,
    excel: meta.notes?.excel || `Exportación de ${historyLabel} a Excel`
  };

  try {
    if (formato === 'pdf') {
      const result = exporter.exportTableToPdf({
        table: tabla,
        data: dataset,
        title: meta.title || 'Reporte',
        subtitle,
        fileName: `${meta.fileNameBase || 'reporte'}.pdf`,
        orientation: meta.orientation || 'landscape'
      });
      if (result?.blob) {
        await guardarReporteAlmacen(result.blob, result.fileName, notes.pdf);
      }
      return;
    }

    if (formato === 'excel') {
      const result = exporter.exportTableToExcel({
        table: tabla,
        data: dataset,
        fileName: `${meta.fileNameBase || 'reporte'}.xlsx`,
        sheetName: meta.sheetName || 'Datos'
      });
      if (result?.blob) {
        await guardarReporteAlmacen(result.blob, result.fileName, notes.excel);
      }
      return;
    }
  } catch (error) {
    console.error('Error al exportar el reporte:', error);
    if (error && error.message === 'PDF_LIBRARY_MISSING') {
      mostrarError('La librería para generar PDF no está disponible. Actualiza la página e inténtalo nuevamente.');
      return;
    }
    if (error && error.message === 'EXCEL_LIBRARY_MISSING') {
      mostrarError('La librería para generar Excel no está disponible. Actualiza la página e inténtalo nuevamente.');
      return;
    }
    mostrarError('No se pudo generar el reporte solicitado. Inténtalo nuevamente.');
  }
}

function renderInventoryTables() {
  if (!areasInventoryBody || !zonasInventoryBody) {
    return;
  }

  const filtroAreas = areaFilterSelect ? areaFilterSelect.value : 'todas';
  const filtroZonas = zonaFilterSelect ? zonaFilterSelect.value : 'todas';

  const areasFiltradas = datosActuales.areas.filter(area => {
    const productos = contarProductosArea(area);
    if (filtroAreas === 'con') return productos > 0;
    if (filtroAreas === 'sin') return productos === 0;
    return true;
  });

  if (!areasFiltradas.length) {
    areasInventoryBody.innerHTML = '<tr class="empty-row"><td colspan="4">No hay áreas que coincidan con el filtro seleccionado.</td></tr>';
  } else {
    areasInventoryBody.innerHTML = areasFiltradas.map(area => {
      const zonasRelacionadas = datosActuales.zonas.filter(zona => `${zona.area_id}` === `${area.id}`);
      const productos = contarProductosArea(area);
      return `
        <tr>
          <td>${area.nombre || 'Sin nombre'}</td>
          <td>${zonasRelacionadas.length}</td>
          <td>${formatearProductosActivos(productos)}</td>
          <td>${formatearDimensiones(area.ancho, area.alto, area.largo)}</td>
        </tr>
      `;
    }).join('');
  }

  const zonasFiltradas = datosActuales.zonas.filter(zona => {
    const productos = contarProductosZona(zona);
    if (filtroZonas === 'con') return productos > 0;
    if (filtroZonas === 'sin') return productos === 0;
    return true;
  });

  if (!zonasFiltradas.length) {
    zonasInventoryBody.innerHTML = '<tr class="empty-row"><td colspan="4">No hay zonas que coincidan con el filtro seleccionado.</td></tr>';
  } else {
    zonasInventoryBody.innerHTML = zonasFiltradas.map(zona => {
      const productos = contarProductosZona(zona);
      return `
        <tr>
          <td>${zona.nombre || 'Sin nombre'}</td>
          <td>${obtenerNombreArea(zona.area_id)}</td>
          <td>${formatearProductosActivos(productos)}</td>
          <td>${formatearDimensiones(zona.ancho, zona.alto, zona.largo)}</td>
        </tr>
      `;
    }).join('');
  }
}

function cerrarReasignacionZona() {
  if (reasignacionOverlay) {
    reasignacionOverlay.hidden = true;
  }
  zonaPendienteReasignacion = null;
  if (reasignacionSelect) {
    reasignacionSelect.innerHTML = '';
  }
  if (reasignacionError) {
    reasignacionError.textContent = '';
  }
}

function abrirReasignacionZona(zona) {
  if (!reasignacionOverlay || !reasignacionMensaje || !reasignacionSelect) {
    return;
  }

  const otrasZonas = datosActuales.zonas
    .filter(z => `${z.id}` !== `${zona.id}`)
    .sort((a, b) => {
      const mismaAreaA = `${a.area_id}` === `${zona.area_id}` ? 0 : 1;
      const mismaAreaB = `${b.area_id}` === `${zona.area_id}` ? 0 : 1;
      if (mismaAreaA !== mismaAreaB) {
        return mismaAreaA - mismaAreaB;
      }
      return (a.nombre || '').localeCompare(b.nombre || '');
    });

  if (!otrasZonas.length) {
    mostrarError('Esta zona contiene productos activos y no hay otras zonas disponibles para reasignarlos. Crea o habilita otra zona antes de eliminarla.');
    return;
  }

  zonaPendienteReasignacion = zona;
  const productos = contarProductosZona(zona);
  reasignacionMensaje.textContent = `La zona "${zona.nombre}" tiene ${formatearProductosActivos(productos)}. Selecciona otra zona para trasladarlos antes de eliminarla.`;
  reasignacionSelect.innerHTML = '<option value="">Selecciona una zona disponible</option>';

  otrasZonas.forEach(otraZona => {
    const label = `${otraZona.nombre || 'Zona sin nombre'} • ${obtenerNombreArea(otraZona.area_id)}`;
    const option = document.createElement('option');
    option.value = otraZona.id;
    option.textContent = label;
    reasignacionSelect.appendChild(option);
  });

  if (reasignacionError) {
    reasignacionError.textContent = '';
  }

  reasignacionOverlay.hidden = false;
}
// Función para llamadas API mejorada
async function fetchAPI(endpoint, method = 'GET', data = null) {
  try {
    const options = { method, credentials: 'include', headers: {} };

    if (data && method !== 'GET') {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(data);
    }

    const response = await fetch(endpoint, options);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Error ${response.status}: ${text}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error en fetchAPI:', error);
    mostrarError(error.message || 'Error de conexión con el servidor');
    throw error;
  }
}

function esRespuestaSolicitud(payload) {
  return Boolean(
    payload &&
    typeof payload === 'object' &&
    payload.success === true &&
    payload.solicitud &&
    typeof payload.solicitud === 'object'
  );
}

function manejarRespuestaSolicitud(payload, mensajeSolicitud, mensajeInmediato = '') {
  if (esRespuestaSolicitud(payload)) {
    mostrarError('');
    if (typeof showToast === 'function') {
      showToast(mensajeSolicitud, 'success');
    } else if (typeof window !== 'undefined' && typeof window.toastOk === 'function') {
      window.toastOk(mensajeSolicitud);
    } else {
      alert(mensajeSolicitud);
    }
    return true;
  }
  if (mensajeInmediato) {
    if (typeof showToast === 'function') {
      showToast(mensajeInmediato, 'success');
    } else if (typeof window !== 'undefined' && typeof window.toastOk === 'function') {
      window.toastOk(mensajeInmediato);
    } else {
      alert(mensajeInmediato);
    }
  }
  return false;
}


// Función para mostrar errores
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

// Renderizar subniveles
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

// Cargar áreas para el select
async function cargarAreas() {
  try {
    const areas = await fetchAPI(`${API_ENDPOINTS.areas}?empresa_id=${empresaId}`);
    zoneAreaSelect.innerHTML = '<option value="">Seleccione un área</option>';
    
    areas.forEach(area => {
      const option = document.createElement('option');
      option.value = area.id;
      option.textContent = area.nombre;
      zoneAreaSelect.appendChild(option);
    });
    
    return areas;
  } catch (error) {
    console.error('Error cargando áreas:', error);
    return [];
  }
}

// Mostrar formularios
async function mostrarFormulario(tipo, datos = null) {
  try {
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
      
      await cargarAreas();
      
      if (datos) {
        zoneForm.zoneName.value = datos.nombre;
        zoneForm.zoneDesc.value = datos.descripcion || '';
        zoneForm.zoneWidth.value = datos.ancho;
        zoneForm.zoneHeight.value = datos.alto;
        zoneForm.zoneLength.value = datos.largo;
        zoneForm.storageType.value = datos.tipo_almacenamiento;
        zoneForm.sublevelsCount.value = datos.subniveles?.length || 0;
        zoneForm.zoneArea.value = datos.area_id || '';
        zoneForm.dataset.id = datos.id;
        
        renderSublevels(datos.subniveles?.length || 0);
        
        if (datos.subniveles) {
          datos.subniveles.forEach((sub, i) => {
            const idx = i + 1;
            const widthInput = zoneForm.querySelector(`[name="sublevelWidth${idx}"]`);
            const heightInput = zoneForm.querySelector(`[name="sublevelHeight${idx}"]`);
            const lengthInput = zoneForm.querySelector(`[name="sublevelLength${idx}"]`);
            const distanceInput = zoneForm.querySelector(`[name="sublevelDistance${idx}"]`);
            
            if (widthInput) widthInput.value = sub.ancho;
            if (heightInput) heightInput.value = sub.alto;
            if (lengthInput) lengthInput.value = sub.largo;
            if (distanceInput) distanceInput.value = sub.distancia;
          });
        }
      } else {
        zoneForm.reset();
        renderSublevels(0);
        delete zoneForm.dataset.id;
      }
    }
  } catch (error) {
    console.error('Error mostrando formulario:', error);
    mostrarError('Error al cargar el formulario');
  }
}

// Cargar y mostrar todos los registros
async function cargarYMostrarRegistros() {
  try {
    const [areas, zonas] = await Promise.all([
      fetchAPI(`${API_ENDPOINTS.areas}?empresa_id=${empresaId}`),
      fetchAPI(`${API_ENDPOINTS.zonas}?empresa_id=${empresaId}`)
    ]);
    setCache('areas', areas);
    setCache('zonas', zonas);
    mostrarResumen({ areas, zonas });
  } catch (error) {
    console.error('Error cargando registros:', error);
    const areas = getCache('areas') || [];
    const zonas = getCache('zonas') || [];
    mostrarResumen({ areas, zonas });
  }
}

// Mostrar resumen en el panel
function mostrarResumen(data) {
  const areas = Array.isArray(data?.areas) ? data.areas : [];
  const zonas = Array.isArray(data?.zonas) ? data.zonas : [];

  datosActuales = {
    areas: [...areas],
    zonas: [...zonas]
  };

  if (resumenAreasEl) {
    resumenAreasEl.textContent = areas.length;
  }

  if (resumenZonasEl) {
    resumenZonasEl.textContent = zonas.length;
  }

  if (resumenZonasSinAreaEl) {
    const sinArea = zonas.filter(z => !z.area_id).length;
    resumenZonasSinAreaEl.textContent = sinArea;
  }

  if (!areas.length && !zonas.length) {
    registroLista.innerHTML = `
      <p class="vacio">No hay áreas ni zonas registradas.</p>
    `;
    renderInventoryTables();
    return;
  }

  let html = '<div class="resumen-grid">';

  // Mostrar áreas con sus zonas
  areas.forEach(area => {
    const zonasArea = zonas.filter(z => z.area_id == area.id);
    const productosArea = contarProductosArea(area, zonas);

    html += `
      <div class="area-card">
        <div class="area-header">
          <div class="area-meta">
            <h4>${area.nombre}</h4>
            <span class="area-products">${formatearProductosActivos(productosArea)} activos</span>
          </div>
          <div class="area-actions">
            <button onclick="editarArea(${area.id})">✏️</button>
            <button onclick="eliminarArea(${area.id})">🗑️</button>
          </div>
        </div>

        <div class="zonas-list">
          ${zonasArea.length > 0 ?
            zonasArea.map(zona => {
              const productosZona = contarProductosZona(zona);
              return `
                <div class="zona-item">
                  <span>
                    ${zona.nombre} (${zona.tipo_almacenamiento}) - ${formatearDimensiones(zona.ancho, zona.alto, zona.largo)}
                    <span class="zona-products">${formatearProductosActivos(productosZona)} activos</span>
                  </span>
                  <div class="zona-actions">
                    <button onclick="editarZona(${zona.id})">✏️</button>
                  </div>
                </div>
              `;
            }).join('') :
            '<p class="vacio">No hay zonas en esta área</p>'}
        </div>
      </div>
    `;
  });

  // Mostrar zonas sin área asignada
  const zonasSinArea = zonas.filter(z => !z.area_id);
  if (zonasSinArea.length > 0) {
    html += `
      <div class="area-card">
        <h4>Zonas sin área asignada</h4>
        ${zonasSinArea.map(zona => `
          <div class="zona-item">
            <span>
              ${zona.nombre} (${zona.tipo_almacenamiento}) - ${formatearDimensiones(zona.ancho, zona.alto, zona.largo)}
              <span class="zona-products">${formatearProductosActivos(contarProductosZona(zona))} activos</span>
            </span>
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

  renderInventoryTables();
}

// Manejar formulario de área
areaForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const nombre = areaForm.areaName.value.trim();
  const descripcion = areaForm.areaDesc.value.trim();
  const ancho = parseFloat(areaForm.areaWidth.value);
  const alto = parseFloat(areaForm.areaHeight.value);
  const largo = parseFloat(areaForm.areaLength.value);
  const id = areaForm.dataset.id;

  if (!nombre || isNaN(ancho) || isNaN(alto) || isNaN(largo)) {
    mostrarError('Debe completar todos los campos del área');
    return;
  }

  const areaData = { nombre, descripcion, ancho, alto, largo, empresa_id: parseInt(empresaId) };

  try {
    if (id) {
      await fetchAPI(`${API_ENDPOINTS.areas}?id=${id}&empresa_id=${empresaId}`, 'PUT', areaData);
    } else {
      await fetchAPI(API_ENDPOINTS.areas, 'POST', areaData);
    }
    
    await cargarYMostrarRegistros();
    areaForm.reset();
    areaForm.style.display = 'none';
  } catch (error) {
    console.error('Error guardando área:', error);
  }
});

// Manejar formulario de zona
zoneForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = zoneForm.dataset.id;
  const nombre = zoneForm.zoneName.value.trim();
  const descripcion = zoneForm.zoneDesc.value.trim();
  const ancho = parseFloat(zoneForm.zoneWidth.value);
  const alto = parseFloat(zoneForm.zoneHeight.value);
  const largo = parseFloat(zoneForm.zoneLength.value);
  const tipo = zoneForm.storageType.value;
  const area_id = zoneForm.zoneArea.value || null;
  const sublevelsCount = parseInt(zoneForm.sublevelsCount.value) || 0;

  // Validaciones
  if (!nombre || !descripcion || !tipo || isNaN(ancho) || isNaN(alto) || isNaN(largo)) {
    mostrarError('Debe completar todos los campos obligatorios con valores válidos.');
    return;
  }

  // Recolectar subniveles
  const subniveles = [];
  for (let i = 1; i <= sublevelsCount; i++) {
    const ancho = parseFloat(zoneForm.querySelector(`[name="sublevelWidth${i}"]`)?.value);
    const alto = parseFloat(zoneForm.querySelector(`[name="sublevelHeight${i}"]`)?.value);
    const largo = parseFloat(zoneForm.querySelector(`[name="sublevelLength${i}"]`)?.value);
    const distancia = parseFloat(zoneForm.querySelector(`[name="sublevelDistance${i}"]`)?.value || 0);
    
    if (isNaN(ancho) || isNaN(alto) || isNaN(largo)) {
      mostrarError(`Dimensiones del subnivel ${i} deben ser válidas.`);
      return;
    }
    
    subniveles.push({
      numero_subnivel: i,
      ancho,
      alto,
      largo,
      distancia
    });
  }

  try {
  const zonaData = {
      nombre,
      descripcion,
      ancho,
      alto,
      largo,
      tipo_almacenamiento: tipo,
      area_id,
      subniveles,
      empresa_id: parseInt(empresaId)
    };

    if (id) {
      // Edición
      const respuesta = await fetchAPI(`${API_ENDPOINTS.zonas}?id=${id}&empresa_id=${empresaId}`, 'PUT', zonaData);
      manejarRespuestaSolicitud(
        respuesta,
        'Solicitud de actualización de zona enviada para revisión.',
        'Zona actualizada correctamente'
      );
    } else {
      // Creación
      const respuesta = await fetchAPI(API_ENDPOINTS.zonas, 'POST', zonaData);
      manejarRespuestaSolicitud(
        respuesta,
        'Solicitud de creación de zona enviada para revisión.',
        'Zona registrada correctamente'
      );
    }

    await cargarYMostrarRegistros();
    zoneForm.reset();
    renderSublevels(0);
    zoneForm.style.display = 'none';
  } catch (error) {
    console.error('Error guardando zona:', error);
  }
});

// Funciones de edición/eliminación
async function editarArea(id) {
  try {
    const area = await fetchAPI(`${API_ENDPOINTS.areas}?id=${id}&empresa_id=${empresaId}`);
    mostrarFormulario('area', area);
  } catch (error) {
    console.error('Error cargando área:', error);
  }
}

async function eliminarArea(id) {
  const area = datosActuales.areas.find(a => `${a.id}` === `${id}`);
  if (area) {
    const productosActivos = contarProductosArea(area);
    if (productosActivos > 0) {
      mostrarError('No es posible eliminar esta área porque tiene productos activos en sus zonas. Reasigna o vacía las ubicaciones antes de continuar.');
      return;
    }
  }

  if (!confirm('¿Está seguro de eliminar esta área?') || !confirm('Esta acción es irreversible, confirme de nuevo.')) {
    return;
  }

  try {
    const respuesta = await fetchAPI(`${API_ENDPOINTS.areas}?id=${id}&empresa_id=${empresaId}`, 'DELETE');
    manejarRespuestaSolicitud(
      respuesta,
      'Solicitud de eliminación de área enviada para revisión.',
      'Área eliminada correctamente'
    );
    await cargarYMostrarRegistros();
  } catch (error) {
    console.error('Error eliminando área:', error);
  }
}

async function editarZona(id) {
  try {
    const zona = await fetchAPI(`${API_ENDPOINTS.zonas}?id=${id}&empresa_id=${empresaId}`);
    mostrarFormulario('zona', zona);
  } catch (error) {
    console.error('Error cargando zona:', error);
  }
}

async function ejecutarEliminacionZona(id, zonaDestino = null) {
  try {
    const params = new URLSearchParams({ id, empresa_id: empresaId });
    if (zonaDestino) {
      params.set('reasignar_a', zonaDestino);
    }

    const respuesta = await fetchAPI(`${API_ENDPOINTS.zonas}?${params.toString()}`, 'DELETE');
    manejarRespuestaSolicitud(
      respuesta,
      'Solicitud de eliminación de zona enviada para revisión.',
      'Zona eliminada correctamente'
    );
    await cargarYMostrarRegistros();
  } catch (error) {
    console.error('Error eliminando zona:', error);
  }
}

async function eliminarZona(id) {
  const zona = datosActuales.zonas.find(z => `${z.id}` === `${id}`);
  if (zona) {
    const productosActivos = contarProductosZona(zona);
    if (productosActivos > 0) {
      abrirReasignacionZona(zona);
      return;
    }
  }

  if (!confirm('¿Está seguro de eliminar esta zona?') || !confirm('Esta acción es irreversible, confirme de nuevo.')) {
    return;
  }

  await ejecutarEliminacionZona(id);
}

// Event listeners
if (sublevelsCountInput) {
  sublevelsCountInput.addEventListener('change', (e) => {
    const count = parseInt(e.target.value) || 0;
    renderSublevels(count);
  });
}

if (areaFilterSelect) {
  areaFilterSelect.addEventListener('change', renderInventoryTables);
}

if (zonaFilterSelect) {
  zonaFilterSelect.addEventListener('change', renderInventoryTables);
}

if (exportAreasPdfBtn) {
  exportAreasPdfBtn.addEventListener('click', () => {
    exportarInventarioAlmacen({
      formato: 'pdf',
      tabla: tablaAreasRegistradas,
      meta: {
        title: 'Áreas registradas del almacén',
        fileNameBase: 'areas_almacen',
        sheetName: 'Áreas',
        historyLabel: 'Áreas registradas',
        countLabel: total => (total === 1 ? '1 área registrada' : `${total} áreas registradas`),
        orientation: 'landscape'
      }
    });
  });
}

if (exportAreasExcelBtn) {
  exportAreasExcelBtn.addEventListener('click', () => {
    exportarInventarioAlmacen({
      formato: 'excel',
      tabla: tablaAreasRegistradas,
      meta: {
        title: 'Áreas registradas del almacén',
        fileNameBase: 'areas_almacen',
        sheetName: 'Áreas',
        historyLabel: 'Áreas registradas',
        countLabel: total => (total === 1 ? '1 área registrada' : `${total} áreas registradas`),
        orientation: 'landscape'
      }
    });
  });
}

if (exportZonasPdfBtn) {
  exportZonasPdfBtn.addEventListener('click', () => {
    exportarInventarioAlmacen({
      formato: 'pdf',
      tabla: tablaZonasRegistradas,
      meta: {
        title: 'Zonas registradas del almacén',
        fileNameBase: 'zonas_almacen',
        sheetName: 'Zonas',
        historyLabel: 'Zonas registradas',
        countLabel: total => (total === 1 ? '1 zona registrada' : `${total} zonas registradas`),
        orientation: 'landscape'
      }
    });
  });
}

if (exportZonasExcelBtn) {
  exportZonasExcelBtn.addEventListener('click', () => {
    exportarInventarioAlmacen({
      formato: 'excel',
      tabla: tablaZonasRegistradas,
      meta: {
        title: 'Zonas registradas del almacén',
        fileNameBase: 'zonas_almacen',
        sheetName: 'Zonas',
        historyLabel: 'Zonas registradas',
        countLabel: total => (total === 1 ? '1 zona registrada' : `${total} zonas registradas`),
        orientation: 'landscape'
      }
    });
  });
}

if (cancelarReasignacionBtn) {
  cancelarReasignacionBtn.addEventListener('click', (event) => {
    event.preventDefault();
    cerrarReasignacionZona();
  });
}

if (confirmarReasignacionBtn) {
  confirmarReasignacionBtn.addEventListener('click', async (event) => {
    event.preventDefault();

    if (!zonaPendienteReasignacion) {
      cerrarReasignacionZona();
      return;
    }

    if (!reasignacionSelect || !reasignacionSelect.value) {
      if (reasignacionError) {
        reasignacionError.textContent = 'Selecciona una zona destino para continuar.';
      }
      return;
    }

    const destinoId = reasignacionSelect.value;
    const zonaDestino = datosActuales.zonas.find(z => `${z.id}` === `${destinoId}`);
    if (!zonaDestino) {
      if (reasignacionError) {
        reasignacionError.textContent = 'La zona seleccionada no está disponible. Intenta nuevamente.';
      }
      return;
    }

    const productosTrasladar = contarProductosZona(zonaPendienteReasignacion);
    if (productosTrasladar === 0) {
      if (reasignacionError) {
        reasignacionError.textContent = 'La zona ya no tiene productos activos. Actualiza la vista e inténtalo otra vez.';
      }
      return;
    }

    const zonaId = zonaPendienteReasignacion.id;
    cerrarReasignacionZona();

    const destinoNombre = `${zonaDestino.nombre || 'zona destino'} (${obtenerNombreArea(zonaDestino.area_id)})`;
    if (!confirm(`Se reasignarán ${formatearProductosActivos(productosTrasladar)} a ${destinoNombre} y se eliminará la zona original. ¿Deseas continuar?`)) {
      return;
    }

    await ejecutarEliminacionZona(zonaId, destinoId);
  });
}

if (reasignacionOverlay) {
  reasignacionOverlay.addEventListener('click', (event) => {
    if (event.target === reasignacionOverlay) {
      cerrarReasignacionZona();
    }
  });
}

// Inicialización
async function initAreasZonas() {
  // Verificar sesión
  if (!localStorage.getItem('usuario_id')) {
    window.location.href = '../../pages/regis_login/login/login.html';
    return;
  }

  // No additional listeners: se configuran arriba

  // Mostrar datos en caché si existen
  const cachedAreas = getCache('areas');
  const cachedZonas = getCache('zonas');
  if (cachedAreas || cachedZonas) {
    mostrarResumen({ areas: cachedAreas || [], zonas: cachedZonas || [] });
  }

  // Cargar datos iniciales desde el servidor
  await cargarYMostrarRegistros();

  // Actualizar cuando la vista vuelva a mostrarse
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      cargarYMostrarRegistros();
    }
  });

  // Hacer funciones disponibles globalmente
  window.mostrarFormulario = mostrarFormulario;
  window.editarArea = editarArea;
  window.eliminarArea = eliminarArea;
  window.editarZona = editarZona;
  window.eliminarZona = eliminarZona;

}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAreasZonas);
} else {
  initAreasZonas();
}
})();








