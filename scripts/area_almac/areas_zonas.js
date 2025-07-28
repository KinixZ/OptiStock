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
  const { areas, zonas } = data;
  
  if (!areas.length && !zonas.length) {
    registroLista.innerHTML = `
      <p class="vacio">No hay áreas ni zonas registradas.</p>
    `;
    return;
  }

  let html = '<div class="resumen-grid">';
  
  // Mostrar áreas con sus zonas
  areas.forEach(area => {
    const zonasArea = zonas.filter(z => z.area_id == area.id);
    
    html += `
      <div class="area-card">
        <div class="area-header">
          <h4>${area.nombre}</h4>
          <div class="area-actions">
            <button onclick="editarArea(${area.id})">✏️</button>
            <button onclick="eliminarArea(${area.id})">🗑️</button>
          </div>
        </div>
        
        <div class="zonas-list">
          ${zonasArea.length > 0 ? 
            zonasArea.map(zona => `
              <div class="zona-item">
                <span>${zona.nombre} (${zona.tipo_almacenamiento}) - ${zona.ancho}m × ${zona.alto}m × ${zona.largo}m</span>
                <div class="zona-actions">
                  <button onclick="editarZona(${zona.id})">✏️</button>
                </div>
              </div>
            `).join('') : 
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
      await fetchAPI(`${API_ENDPOINTS.zonas}?id=${id}&empresa_id=${empresaId}`, 'PUT', zonaData);
    } else {
      // Creación
      await fetchAPI(API_ENDPOINTS.zonas, 'POST', zonaData);
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
  if (confirm('¿Está seguro de eliminar esta área?') && confirm('Esta acción es irreversible, confirme de nuevo.')) {
    try {
      await fetchAPI(`${API_ENDPOINTS.areas}?id=${id}&empresa_id=${empresaId}`, 'DELETE');
      await cargarYMostrarRegistros();
    } catch (error) {
      console.error('Error eliminando área:', error);
    }
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

async function eliminarZona(id) {
  if (confirm('¿Está seguro de eliminar esta zona?') && confirm('Esta acción es irreversible, confirme de nuevo.')) {
    try {
      await fetchAPI(`${API_ENDPOINTS.zonas}?id=${id}&empresa_id=${empresaId}`, 'DELETE');
      await cargarYMostrarRegistros();
    } catch (error) {
      console.error('Error eliminando zona:', error);
    }
  }
}

// Event listeners
if (sublevelsCountInput) {
  sublevelsCountInput.addEventListener('change', (e) => {
    const count = parseInt(e.target.value) || 0;
    renderSublevels(count);
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








