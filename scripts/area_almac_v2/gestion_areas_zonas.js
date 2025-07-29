(function() {
  const areaBtn = document.getElementById('nuevaArea');
  const zonaBtn = document.getElementById('nuevaZona');
  const formArea = document.getElementById('formArea');
  const formZona = document.getElementById('formZona');
  const lista = document.getElementById('lista');
  const volumenSpan = document.getElementById('areaVolumen');
  const tipoSelect = document.getElementById('zonaTipo');
  const areaSelect = document.getElementById('zonaArea');

  const tiposZona = [
    'Rack', 'Mostrador', 'Caja', 'Estantería', 'Refrigeración', 'Congelador',
    'Piso', 'Contenedor', 'Palet', 'Carro', 'Cajón', 'Jaula', 'Estiba',
    'Bodega', 'Silo', 'Tanque', 'Gabinete', 'Vitrina', 'Armario', 'Otro'
  ];

  function llenarTipos() {
    tiposZona.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.toLowerCase();
      opt.textContent = t;
      tipoSelect.appendChild(opt);
    });
  }

  function cargarAreas() {
    fetch('../../scripts/php/guardar_areas.php?empresa_id=' + localStorage.getItem('id_empresa'))
      .then(r => r.json())
      .then(data => {
        areaSelect.innerHTML = '<option value="">Seleccione</option>';
        data.forEach(a => {
          const opt = document.createElement('option');
          opt.value = a.id;
          opt.textContent = a.nombre;
          areaSelect.appendChild(opt);
        });
      });
  }

  function mostrarLista() {
    Promise.all([
      fetch('../../scripts/php/guardar_areas.php?empresa_id=' + localStorage.getItem('id_empresa')).then(r => r.json()),
      fetch('../../scripts/php/guardar_zonas.php?empresa_id=' + localStorage.getItem('id_empresa')).then(r => r.json())
    ]).then(([areas, zonas]) => {
      lista.innerHTML = '';
      areas.forEach(area => {
        const div = document.createElement('div');
        div.innerHTML = `<h3>${area.nombre}</h3>`;
        const relacionadas = zonas.filter(z => z.area_id == area.id);
        if (relacionadas.length) {
          const ul = document.createElement('ul');
          relacionadas.forEach(z => {
            const li = document.createElement('li');
            li.textContent = `${z.nombre} (${z.tipo_almacenamiento})`;
            ul.appendChild(li);
          });
          div.appendChild(ul);
        }
        lista.appendChild(div);
      });
    });
  }

  function calcularVolumen() {
    const largo = parseFloat(document.getElementById('areaLargo').value) || 0;
    const ancho = parseFloat(document.getElementById('areaAncho').value) || 0;
    const alto = parseFloat(document.getElementById('areaAlto').value) || 0;
    volumenSpan.textContent = (largo * ancho * alto).toFixed(2);
  }

  areaBtn.addEventListener('click', () => {
    formArea.classList.toggle('hidden');
    formZona.classList.add('hidden');
  });
  zonaBtn.addEventListener('click', () => {
    formZona.classList.toggle('hidden');
    formArea.classList.add('hidden');
    cargarAreas();
  });

  formArea.addEventListener('input', calcularVolumen);
  formArea.addEventListener('submit', e => {
    e.preventDefault();
    const data = {
      nombre: document.getElementById('areaNombre').value,
      descripcion: document.getElementById('areaDescripcion').value,
      largo: parseFloat(document.getElementById('areaLargo').value),
      ancho: parseFloat(document.getElementById('areaAncho').value),
      alto: parseFloat(document.getElementById('areaAlto').value),
      empresa_id: parseInt(localStorage.getItem('id_empresa'))
    };
    fetch('../../scripts/php/guardar_areas.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(() => {
      formArea.reset();
      calcularVolumen();
      formArea.classList.add('hidden');
      mostrarLista();
    });
  });

  formZona.addEventListener('submit', e => {
    e.preventDefault();
    const data = {
      nombre: document.getElementById('zonaNombre').value,
      descripcion: document.getElementById('zonaDescripcion').value,
      largo: parseFloat(document.getElementById('zonaLargo').value),
      ancho: parseFloat(document.getElementById('zonaAncho').value),
      alto: parseFloat(document.getElementById('zonaAlto').value),
      tipo_almacenamiento: document.getElementById('zonaTipo').value,
      subniveles: document.getElementById('zonaSubniveles').value ? [{ numero_subnivel: 1 }] : [],
      distancia: parseFloat(document.getElementById('zonaDistancia').value) || 0,
      area_id: parseInt(document.getElementById('zonaArea').value) || null,
      empresa_id: parseInt(localStorage.getItem('id_empresa'))
    };
    fetch('../../scripts/php/guardar_zonas.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(() => {
      formZona.reset();
      formZona.classList.add('hidden');
      mostrarLista();
    });
  });

  llenarTipos();
  mostrarLista();
})();
