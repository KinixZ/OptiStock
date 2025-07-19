// Elementos del DOM
const sublevelsCountInput = document.getElementById('sublevelsCount');
const sublevelsContainer = document.getElementById('sublevelsContainer');
const areaForm = document.querySelector('#areaForm.formulario');
const zoneForm = document.querySelector('#zoneForm.formulario');
const registroLista = document.getElementById('registroLista');

// Estado local simulado (en el futuro se reemplazará con datos del backend)
let registros = {
  areas: [],
  zonas: []
};

// Renderizar subniveles según cantidad
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

// Mostrar u ocultar formularios
function mostrarFormulario(tipo) {
  areaForm.style.display = (tipo === 'area') ? 'block' : 'none';
  zoneForm.style.display = (tipo === 'zona') ? 'block' : 'none';
}

// Actualizar el resumen de áreas y zonas registradas
function actualizarResumen() {
  if (registros.areas.length === 0 && registros.zonas.length === 0) {
    registroLista.innerHTML = `
      <p class="vacio">No hay áreas ni zonas registradas.</p>
      <button onclick="mostrarFormulario('area')">Registrar nueva Área</button>
      <button onclick="mostrarFormulario('zona')">Registrar nueva Zona</button>
    `;
    return;
  }

  let html = '<ul>';
  registros.areas.forEach(area => {
    html += `<li><strong>Área:</strong> ${area}</li>`;
  });
  registros.zonas.forEach(zona => {
    html += `<li><strong>Zona:</strong> ${zona}</li>`;
  });
  html += '</ul>';

  html += `
    <button onclick="mostrarFormulario('area')">Registrar otra Área</button>
    <button onclick="mostrarFormulario('zona')">Registrar otra Zona</button>
  `;

  registroLista.innerHTML = html;
}

// Escucha el cambio de cantidad de subniveles
sublevelsCountInput.addEventListener('change', (e) => {
  const count = parseInt(e.target.value) || 0;
  renderSublevels(count);
});

// Submit Área
areaForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const nombre = e.target.areaName.value.trim();
  if (!nombre) {
    alert('El nombre del área es obligatorio');
    return;
  }

  registros.areas.push(nombre);
  actualizarResumen();
  areaForm.reset();
  areaForm.style.display = 'none';
  alert(`Área "${nombre}" guardada correctamente.`);
});

// Submit Zona
zoneForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const zoneName = e.target.zoneName.value.trim();
  const width = parseFloat(e.target.zoneWidth.value);
  const height = parseFloat(e.target.zoneHeight.value);
  const length = parseFloat(e.target.zoneLength.value);
  const tipo = e.target.storageType.value;
  const sublevelsCount = parseInt(e.target.sublevelsCount.value) || 0;

  if (!zoneName || !tipo || !(width > 0 && height > 0 && length > 0)) {
    alert('Debe completar todos los campos obligatorios con valores válidos.');
    return;
  }

  for (let i = 1; i <= sublevelsCount; i++) {
    const w = parseFloat(e.target[`sublevelWidth${i}`].value);
    const h = parseFloat(e.target[`sublevelHeight${i}`].value);
    const l = parseFloat(e.target[`sublevelLength${i}`].value);
    if (!(w > 0 && h > 0 && l > 0)) {
      alert(`Dimensiones del subnivel ${i} deben ser válidas.`);
      return;
    }
  }

  registros.zonas.push(zoneName);
  actualizarResumen();
  zoneForm.reset();
  renderSublevels(0);
  zoneForm.style.display = 'none';
  alert(`Zona "${zoneName}" guardada correctamente.`);
});

// Inicializar estado al cargar
actualizarResumen();
