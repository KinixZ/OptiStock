// Elementos del DOM
const sublevelsCountInput = document.getElementById('sublevelsCount');
const sublevelsContainer = document.getElementById('sublevelsContainer');
const areaForm = document.getElementById('areaForm');
const zoneForm = document.getElementById('zoneForm');
const registroLista = document.getElementById('registroLista');
const zoneAreaSelect = document.getElementById('zoneArea');

// Estado local con localStorage
let registros = {
  areas: [], // {id, nombre}
  zonas: []  // {id, nombre, areaId, width, height, length, tipo, subniveles[]}
};

// Generar IDs únicos
function generarId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Cargar datos guardados
function cargarRegistros() {
  const guardados = localStorage.getItem('almacenRegistros');
  if (guardados) {
    registros = JSON.parse(guardados);
  }
}

// Guardar datos
function guardarRegistros() {
  localStorage.setItem('almacenRegistros', JSON.stringify(registros));
}

// Renderizar subniveles
function renderSublevels(count) {
  sublevelsContainer.innerHTML = '';
  if (count > 0) {
    for (let i = 1; i <= count; i++) {
      const div = document.createElement('div');
      div.classList.add('sublevel-dimensions');
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

// Actualizar select de áreas
function actualizarAreaSelect() {
  zoneAreaSelect.innerHTML = '<option value="">Seleccione un área</option>';
  registros.areas.forEach(area => {
    const option = document.createElement('option');
    option.value = area.id;
    option.textContent = area.nombre;
    zoneAreaSelect.appendChild(option);
  });
}

// Mostrar formularios
function mostrarFormulario(tipo, datos = null) {
  if (tipo === 'area') {
    areaForm.style.display = 'block';
    zoneForm.style.display = 'none';
    
    if (datos) {
      areaForm.areaName.value = datos.nombre;
      areaForm.dataset.id = datos.id;
    } else {
      areaForm.reset();
      delete areaForm.dataset.id;
    }
    
  } else if (tipo === 'zona') {
    zoneForm.style.display = 'block';
    areaForm.style.display = 'none';
    actualizarAreaSelect();
    
    if (datos) {
      zoneForm.zoneName.value = datos.nombre;
      zoneForm.zoneWidth.value = datos.width;
      zoneForm.zoneHeight.value = datos.height;
      zoneForm.zoneLength.value = datos.length;
      zoneForm.storageType.value = datos.tipo;
      zoneForm.sublevelsCount.value = datos.subniveles?.length || 0;
      zoneForm.zoneArea.value = datos.areaId || '';
      zoneForm.dataset.id = datos.id;
      
      renderSublevels(datos.subniveles?.length || 0);
      if (datos.subniveles) {
        // Rellenar datos de subniveles existentes
        datos.subniveles.forEach((sub, i) => {
          const idx = i + 1;
          zoneForm[`sublevelWidth${idx}`].value = sub.width;
          zoneForm[`sublevelHeight${idx}`].value = sub.height;
          zoneForm[`sublevelLength${idx}`].value = sub.length;
          zoneForm[`sublevelDistance${idx}`].value = sub.distance;
        });
      }
    } else {
      zoneForm.reset();
      renderSublevels(0);
      delete zoneForm.dataset.id;
    }
  }
}

// Actualizar resumen
function actualizarResumen() {
  if (registros.areas.length === 0 && registros.zonas.length === 0) {
    registroLista.innerHTML = `
      <p class="vacio">No hay áreas ni zonas registradas.</p>
      <button onclick="mostrarFormulario('area')">Registrar nueva Área</button>
      <button onclick="mostrarFormulario('zona')">Registrar nueva Zona</button>
    `;
    return;
  }

  let html = '<div class="resumen-grid">';
  
  // Mostrar áreas con sus zonas
  registros.areas.forEach(area => {
    const zonasArea = registros.zonas.filter(z => z.areaId === area.id);
    
    html += `
      <div class="area-card">
        <div class="area-header">
          <h4>${area.nombre}</h4>
          <div class="area-actions">
            <button onclick="editarArea('${area.id}')">✏️</button>
            <button onclick="eliminarArea('${area.id}')">🗑️</button>
          </div>
        </div>
        
        <div class="zonas-list">
          ${zonasArea.length > 0 ? 
            zonasArea.map(zona => `
              <div class="zona-item">
                <span>${zona.nombre} (${zona.tipo}) - ${zona.width}m × ${zona.height}m × ${zona.length}m</span>
                <div class="zona-actions">
                  <button onclick="editarZona('${zona.id}')">✏️</button>
                </div>
              </div>
            `).join('') : 
            '<p class="vacio">No hay zonas en esta área</p>'}
        </div>
      </div>
    `;
  });
  
  // Mostrar zonas sin área asignada
  const zonasSinArea = registros.zonas.filter(z => !z.areaId);
  if (zonasSinArea.length > 0) {
    html += `
      <div class="area-card">
        <h4>Zonas sin área asignada</h4>
        ${zonasSinArea.map(zona => `
          <div class="zona-item">
            <span>${zona.nombre} (${zona.tipo}) - ${zona.width}m × ${zona.height}m × ${zona.length}m</span>
            <div class="zona-actions">
              <button onclick="editarZona('${zona.id}')">✏️</button>
              <button onclick="eliminarZona('${zona.id}')">🗑️</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  html += '</div>';
  html += `
    <div class="action-buttons">
      <button onclick="mostrarFormulario('area')">+ Nueva Área</button>
      <button onclick="mostrarFormulario('zona')">+ Nueva Zona</button>
    </div>
  `;

  registroLista.innerHTML = html;
}

// Manejar formulario de área
areaForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const nombre = e.target.areaName.value.trim();
  const id = areaForm.dataset.id || generarId();
  
  if (!nombre) {
    alert('El nombre del área es obligatorio');
    return;
  }

  // Si es edición
  if (areaForm.dataset.id) {
    const areaIndex = registros.areas.findIndex(a => a.id === id);
    if (areaIndex !== -1) {
      registros.areas[areaIndex].nombre = nombre;
    }
  } 
  // Si es nuevo
  else {
    registros.areas.push({ id, nombre });
  }

  guardarRegistros();
  actualizarResumen();
  areaForm.reset();
  areaForm.style.display = 'none';
});

// Manejar formulario de zona
zoneForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const id = zoneForm.dataset.id || generarId();
  const nombre = e.target.zoneName.value.trim();
  const width = parseFloat(e.target.zoneWidth.value);
  const height = parseFloat(e.target.zoneHeight.value);
  const length = parseFloat(e.target.zoneLength.value);
  const tipo = e.target.storageType.value;
  const areaId = e.target.zoneArea.value || null;
  const sublevelsCount = parseInt(e.target.sublevelsCount.value) || 0;

  // Validaciones
  if (!nombre || !tipo || !(width > 0 && height > 0 && length > 0)) {
    alert('Debe completar todos los campos obligatorios con valores válidos.');
    return;
  }

  // Recolectar subniveles
  const subniveles = [];
  for (let i = 1; i <= sublevelsCount; i++) {
    const w = parseFloat(e.target[`sublevelWidth${i}`]?.value);
    const h = parseFloat(e.target[`sublevelHeight${i}`]?.value);
    const l = parseFloat(e.target[`sublevelLength${i}`]?.value);
    const d = parseFloat(e.target[`sublevelDistance${i}`]?.value || 0);
    
    if (!(w > 0 && h > 0 && l > 0)) {
      alert(`Dimensiones del subnivel ${i} deben ser válidas.`);
      return;
    }
    
    subniveles.push({ width: w, height: h, length: l, distance: d });
  }

  // Crear/actualizar zona
  const zonaData = {
    id, nombre, width, height, length, tipo, areaId, subniveles
  };

  if (zoneForm.dataset.id) {
    // Edición
    const zonaIndex = registros.zonas.findIndex(z => z.id === id);
    if (zonaIndex !== -1) {
      registros.zonas[zonaIndex] = zonaData;
    }
  } else {
    // Nueva zona
    registros.zonas.push(zonaData);
  }

  guardarRegistros();
  actualizarResumen();
  zoneForm.reset();
  renderSublevels(0);
  zoneForm.style.display = 'none';
});

// Funciones de edición/eliminación
function editarArea(id) {
  const area = registros.areas.find(a => a.id === id);
  if (area) mostrarFormulario('area', area);
}

function eliminarArea(id) {
  if (confirm('¿Está seguro de eliminar esta área? Las zonas asociadas quedarán sin área asignada.')) {
    registros.areas = registros.areas.filter(a => a.id !== id);
    // Quitar referencia de área en zonas
    registros.zonas.forEach(z => {
      if (z.areaId === id) z.areaId = null;
    });
    guardarRegistros();
    actualizarResumen();
  }
}

function editarZona(id) {
  const zona = registros.zonas.find(z => z.id === id);
  if (zona) mostrarFormulario('zona', zona);
}

function eliminarZona(id) {
  if (confirm('¿Está seguro de eliminar esta zona?')) {
    registros.zonas = registros.zonas.filter(z => z.id !== id);
    guardarRegistros();
    actualizarResumen();
  }
}

// Event listeners
sublevelsCountInput?.addEventListener('change', (e) => {
  const count = parseInt(e.target.value) || 0;
  renderSublevels(count);
});

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  cargarRegistros();
  actualizarResumen();
  
  // Hacer funciones disponibles globalmente
  window.mostrarFormulario = mostrarFormulario;
  window.editarArea = editarArea;
  window.eliminarArea = eliminarArea;
  window.editarZona = editarZona;
  window.eliminarZona = eliminarZona;
});