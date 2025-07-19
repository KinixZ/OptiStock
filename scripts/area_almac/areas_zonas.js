// Manejo dinámico de subniveles
const sublevelsCountInput = document.getElementById('sublevelsCount');
const sublevelsContainer = document.getElementById('sublevelsContainer');

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

function mostrarFormulario(tipo) {
  document.getElementById('areaForm').style.display = (tipo === 'area') ? 'block' : 'none';
  document.getElementById('zoneForm').style.display = (tipo === 'zona') ? 'block' : 'none';
}

// Ejemplo de añadir área al panel resumen (ya conectado con submit del form)
function actualizarResumen() {
  const panel = document.getElementById('registroLista');
  panel.innerHTML = `
    <ul>
      <li>Área: Oficina Central</li>
      <li>Zona: Estantería A</li>
    </ul>
    <button onclick="mostrarFormulario('area')">Registrar otra Área</button>
    <button onclick="mostrarFormulario('zona')">Registrar otra Zona</button>
  `;
}

sublevelsCountInput.addEventListener('change', (e) => {
  const count = parseInt(e.target.value) || 0;
  renderSublevels(count);
});

// Validaciones básicas y manejo de submit para Área
document.getElementById('areaForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const areaName = e.target.areaName.value.trim();
  if (!areaName) {
    alert('El nombre del área es obligatorio');
    return;
  }

  // Aquí puedes conectar con el backend para guardar el área
  alert(`Área "${areaName}" guardada correctamente.`);
});

// Validaciones básicas y manejo de submit para Zona
document.getElementById('zoneForm').addEventListener('submit', (e) => {
  e.preventDefault();

  const zoneName = e.target.zoneName.value.trim();
  if (!zoneName) {
    alert('El nombre de la zona es obligatorio');
    return;
  }

  const width = parseFloat(e.target.zoneWidth.value);
  const height = parseFloat(e.target.zoneHeight.value);
  const length = parseFloat(e.target.zoneLength.value);

  if (!(width > 0 && height > 0 && length > 0)) {
    alert('Dimensiones físicas deben ser números positivos.');
    return;
  }

  const sublevelsCount = parseInt(e.target.sublevelsCount.value) || 0;
  for (let i = 1; i <= sublevelsCount; i++) {
    const w = parseFloat(e.target[`sublevelWidth${i}`].value);
    const h = parseFloat(e.target[`sublevelHeight${i}`].value);
    const l = parseFloat(e.target[`sublevelLength${i}`].value);

    if (!(w > 0 && h > 0 && l > 0)) {
      alert(`Dimensiones del subnivel ${i} deben ser números positivos.`);
      return;
    }
  }

  if (!e.target.storageType.value) {
    alert('Seleccione un tipo de almacenamiento.');
    return;
  }

  // Aquí puedes conectar con el backend para guardar la zona
  alert(`Zona "${zoneName}" guardada correctamente.`);
});
