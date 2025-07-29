(function() {
  const areaBtn = document.getElementById('nuevaArea');
  const zonaBtn = document.getElementById('nuevaZona');
  const formArea = document.getElementById('formArea');
  const formZona = document.getElementById('formZona');
  const resumen = document.getElementById('resumen');
  const volumenSpan = document.getElementById('areaVolumen');
  const zonaVolumenSpan = document.getElementById('zonaVolumen');

  const tipoSelect = document.getElementById('zonaTipo');
  const areaSelect = document.getElementById('zonaArea');


  const lista = document.getElementById('lista');
  const volumenSpan = document.getElementById('areaVolumen');
  const tipoSelect = document.getElementById('zonaTipo');
  const areaSelect = document.getElementById('zonaArea');

  const tiposZona = [
    'Rack', 'Mostrador', 'Caja', 'Estantería', 'Refrigeración', 'Congelador',
    'Piso', 'Contenedor', 'Palet', 'Carro', 'Cajón', 'Jaula', 'Estiba',
    'Bodega', 'Silo', 'Tanque', 'Gabinete', 'Vitrina', 'Armario', 'Otro'
  ];


  function getAreas() {
    const stored = localStorage.getItem('areas');
    try { return stored ? JSON.parse(stored) : []; } catch (e) { return []; }
  }

  function getZonas() {
    const stored = localStorage.getItem('zonas');
    try { return stored ? JSON.parse(stored) : []; } catch (e) { return []; }
  }

  function saveAreas(data) {
    localStorage.setItem('areas', JSON.stringify(data));
  }

  function saveZonas(data) {
    localStorage.setItem('zonas', JSON.stringify(data));
  }


  function llenarTipos() {
    tiposZona.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.toLowerCase();
      opt.textContent = t;
      tipoSelect.appendChild(opt);
    });
  }

  function cargarAreas() {

    const areas = getAreas();
    areaSelect.innerHTML = '<option value="">Seleccione</option>';
    areas.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.id;
      opt.textContent = a.nombre;
      areaSelect.appendChild(opt);
    });
  }

  function mostrarResumenAreas() {
    const areas = getAreas();
    const zonas = getZonas();
    resumen.innerHTML = '';
    areas.forEach(area => {
      const div = document.createElement('div');
      div.className = 'resumen-item';
      const vol = (area.largo * area.ancho * area.alto).toFixed(2);
      div.innerHTML = `<h3>${area.nombre}</h3>
        <p>${area.descripcion}</p>
        <p>Dimensiones: ${area.largo} x ${area.ancho} x ${area.alto} m</p>
        <p>Volumen: ${vol} m³</p>`;
      const relacionadas = zonas.filter(z => z.area_id === area.id);
      if (relacionadas.length) {
        const ul = document.createElement('ul');
        relacionadas.forEach(z => {
          const li = document.createElement('li');
          li.textContent = `${z.nombre} (${z.tipo})`;
          ul.appendChild(li);
        });
        div.appendChild(ul);
      }
      resumen.appendChild(div);

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
  function mostrarResumenAreas() {
  function mostrarLista() {
    Promise.all([
      fetch('../../scripts/php/guardar_areas.php?empresa_id=' + localStorage.getItem('id_empresa')).then(r => r.json()),
      fetch('../../scripts/php/guardar_zonas.php?empresa_id=' + localStorage.getItem('id_empresa')).then(r => r.json())
    ]).then(([areas, zonas]) => {
      resumen.innerHTML = '';
      areas.forEach(area => {
        const div = document.createElement('div');
        div.className = 'resumen-item';
        div.innerHTML = `<h3>${area.nombre}</h3>
          <p>${area.descripcion}</p>
          <p>Dimensiones: ${area.largo} x ${area.ancho} x ${area.alto} m</p>
          <p>Volumen: ${parseFloat(area.volumen).toFixed(2)} m³</p>`;

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
        resumen.appendChild(div);
      });

    });
  }

  function mostrarResumenZonas() {

    const zonas = getZonas();
    const areas = getAreas();
    resumen.innerHTML = '';
    zonas.forEach(z => {
      const area = areas.find(a => a.id === z.area_id);
      const div = document.createElement('div');
      div.className = 'resumen-item';
      const volumen = (z.largo * z.ancho * z.alto).toFixed(2);
      div.innerHTML = `<h3>${z.nombre}</h3>
        <p>${z.descripcion}</p>
        <p>Dimensiones: ${z.largo} x ${z.ancho} x ${z.alto} m</p>
        <p>Volumen: ${volumen} m³</p>
        <p>Área: ${area ? area.nombre : 'Sin asignar'}</p>`;
      resumen.appendChild(div);

    Promise.all([
      fetch('../../scripts/php/guardar_zonas.php?empresa_id=' + localStorage.getItem('id_empresa')).then(r => r.json()),
      fetch('../../scripts/php/guardar_areas.php?empresa_id=' + localStorage.getItem('id_empresa')).then(r => r.json())
    ]).then(([zonas, areas]) => {
      resumen.innerHTML = '';
      zonas.forEach(z => {
        const area = areas.find(a => a.id == z.area_id);
        const div = document.createElement('div');
        div.className = 'resumen-item';
        const volumen = (z.largo * z.ancho * z.alto).toFixed(2);
        div.innerHTML = `<h3>${z.nombre}</h3>
          <p>${z.descripcion}</p>
          <p>Dimensiones: ${z.largo} x ${z.ancho} x ${z.alto} m</p>
          <p>Volumen: ${volumen} m³</p>
          <p>Área: ${area ? area.nombre : 'Sin asignar'}</p>`;
        resumen.appendChild(div);

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

  function calcularVolumenZona() {
    const largo = parseFloat(document.getElementById('zonaLargo').value) || 0;
    const ancho = parseFloat(document.getElementById('zonaAncho').value) || 0;
    const alto = parseFloat(document.getElementById('zonaAlto').value) || 0;
    zonaVolumenSpan.textContent = (largo * ancho * alto).toFixed(2);
  }

  areaBtn.addEventListener('click', () => {
    formArea.classList.remove('hidden');
    formZona.classList.add('hidden');
    mostrarResumenAreas();
  });
  zonaBtn.addEventListener('click', () => {
    formZona.classList.remove('hidden');
    formArea.classList.add('hidden');
    cargarAreas();
    mostrarResumenZonas();
  });

  formArea.addEventListener('input', calcularVolumen);
  formZona.addEventListener('input', calcularVolumenZona);

  formArea.addEventListener('submit', e => {
    e.preventDefault();
    const areas = getAreas();
    const data = {
      id: Date.now(),

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

      alto: parseFloat(document.getElementById('areaAlto').value)
    };
    areas.push(data);
    saveAreas(areas);
    formArea.reset();
    calcularVolumen();
    mostrarResumenAreas();

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
      mostrarResumenAreas();
      mostrarLista();
    });

  });

  formZona.addEventListener('submit', e => {
    e.preventDefault();

    const zonas = getZonas();
    const data = {
      id: Date.now(),

    const data = {

      nombre: document.getElementById('zonaNombre').value,
      descripcion: document.getElementById('zonaDescripcion').value,
      largo: parseFloat(document.getElementById('zonaLargo').value),
      ancho: parseFloat(document.getElementById('zonaAncho').value),
      alto: parseFloat(document.getElementById('zonaAlto').value),

      tipo: document.getElementById('zonaTipo').value,
      subniveles: parseInt(document.getElementById('zonaSubniveles').value) || 0,
      distancia: parseFloat(document.getElementById('zonaDistancia').value) || 0,
      area_id: parseInt(document.getElementById('zonaArea').value) || null
    };
    zonas.push(data);
    saveZonas(zonas);
    formZona.reset();
    mostrarResumenZonas();

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
      mostrarResumenZonas();
      mostrarLista();
    });

  });

  llenarTipos();
  formArea.classList.remove('hidden');
  mostrarResumenAreas();

})();


  mostrarLista();
})();

