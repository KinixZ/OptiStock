(() => {
  const API = {
    categorias: '../../scripts/php/guardar_categorias.php',
    subcategorias: '../../scripts/php/guardar_subcategorias.php',
    productos: '../../scripts/php/guardar_productos.php',
    zonas:         '../../scripts/php/guardar_zonas.php'
  };

  const categorias = [];
  const subcategorias = [];
  const productos = [];
  const zonas        = [];
  let vistaActual = 'producto';
  let editProdId = null;
  let editCatId = null;
  let editSubcatId = null;

const EMP_ID = parseInt(localStorage.getItem('id_empresa'),10) || 0;


  const btnProductos = document.getElementById('btnProductos');
  const btnCategorias = document.getElementById('btnCategorias');
  const btnSubcategorias = document.getElementById('btnSubcategorias');
  const prodZona = document.getElementById('prodZona');

  const productoFormContainer = document.getElementById('productoFormContainer');
  const categoriaFormContainer = document.getElementById('categoriaFormContainer');
  const subcategoriaFormContainer = document.getElementById('subcategoriaFormContainer');

async function fetchAPI(url, method = 'GET', data) {
  const options = { method };
  if (data) {
    options.headers = { 'Content-Type': 'application/json' };
    options.body    = JSON.stringify(data);
  }
  const res = await fetch(url, options);
  // clonamos la respuesta para poder leer el texto si json() falla
  const clone = res.clone();

  // Intentamos parsear el JSON
  let payload;
  try {
    payload = await res.json();
  } catch (e) {
    const text = await clone.text();
    console.error(`⚠️ fetchAPI: respuesta HTTP ${res.status} no es JSON:\n`, text);
    throw new Error(`HTTP ${res.status} – respuesta no-JSON: ${text.slice(0,200)}`);
  }

   // Si hubo cualquier código ≠2xx, volcamos el JSON y lanzamos
  if (!res.ok) {
    console.warn(`⚠️ fetchAPI: HTTP ${res.status}`, payload);
    const msg = payload.error || `Error HTTP ${res.status}`;
    throw new Error(msg);
  }

  // OK → devolvemos el objeto parsado
  return payload;
}

  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  function mostrar(seccion) {
    productoFormContainer.classList.add('d-none');
    categoriaFormContainer.classList.add('d-none');
    subcategoriaFormContainer.classList.add('d-none');

    vistaActual = seccion;
    renderResumen();
    if (seccion === 'producto') productoFormContainer.classList.remove('d-none');
    if (seccion === 'categoria') categoriaFormContainer.classList.remove('d-none');
    if (seccion === 'subcategoria') subcategoriaFormContainer.classList.remove('d-none');
  }

  btnProductos.addEventListener('click', () => mostrar('producto'));
  btnCategorias.addEventListener('click', () => mostrar('categoria'));
  btnSubcategorias.addEventListener('click', () => mostrar('subcategoria'));

  const prodForm = document.getElementById('productoForm');
  const catForm = document.getElementById('categoriaForm');
  const subcatForm = document.getElementById('subcategoriaForm');
  const prodCategoria = document.getElementById('prodCategoria');
  const prodSubcategoria = document.getElementById('prodSubcategoria');
 // Cada vez que cambie la categoría, repoblamos el select de subcategorías
prodCategoria.addEventListener('change', () => {
  // parseInt devuelve NaN si está vacío; con || null forzamos null
  const catId = parseInt(prodCategoria.value) || null;
  actualizarSelectSubcategorias(catId);
});
  const subcatCategoria = document.getElementById('subcatCategoria');
  const tablaResumen = document.querySelector('#tablaResumen tbody');
  const tablaHead = document.getElementById('tablaHead');
  const btnRecargarResumen = document.getElementById('btnRecargarResumen');

  function actualizarSelectCategorias() {
    [prodCategoria, subcatCategoria].forEach(select => {
      select.innerHTML = '<option value="">Seleccione categoría</option>';
      categorias.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.nombre;
        select.appendChild(opt);
      });
    });
  }

function actualizarSelectSubcategorias(categoriaId) {
  prodSubcategoria.innerHTML = '<option value="">Seleccione subcategoría</option>';
  // Si no hay categoría elegida, salimos con sólo el placeholder
  if (!categoriaId) return;
  // Filtramos y añadimos las que coincidan
  subcategorias
    .filter(sc => parseInt(sc.categoria_id, 10) === categoriaId)
    .forEach(sc => {
      const opt = document.createElement('option');
      opt.value = sc.id;
      opt.textContent = sc.nombre;
      prodSubcategoria.appendChild(opt);
    });
}

function actualizarSelectZonas() {
   prodZona.innerHTML = '<option value="">Seleccione zona</option>';
   zonas.forEach(z => {
     const opt = document.createElement('option');
     opt.value = z.id;
     opt.textContent = `${z.nombre} (${z.tipo_almacenamiento || '—'})`;
     prodZona.appendChild(opt);
   });
 }

  async function cargarCategorias() {
    categorias.length = 0;
    const datos = await fetchAPI(
    `${API.categorias}?empresa_id=${EMP_ID}`
  );
    datos.forEach(c => categorias.push(c));
    actualizarSelectCategorias();
  }

  async function cargarSubcategorias() {
  subcategorias.length = 0;
  const datos = await fetchAPI(
    `${API.subcategorias}?empresa_id=${EMP_ID}`
  );
  datos.forEach(s => subcategorias.push(s));
  // Al iniciar, ninguna categoría está elegida → sólo placeholder
  actualizarSelectSubcategorias(null);
}

async function cargarZonas() {
   zonas.length = 0;
  const datos = await fetchAPI(`${API.zonas}?empresa_id=${EMP_ID}`);
   datos.forEach(z => zonas.push(z));
  actualizarSelectZonas();
 }


  async function cargarProductos() {
     productos.length = 0;
  const datos = await fetchAPI(`${API.productos}?empresa_id=${EMP_ID}`);
    datos.forEach(p => {
      // Asegurarnos que son números
      const x = parseFloat(p.dim_x) || 0;
      const y = parseFloat(p.dim_y) || 0;
      const z = parseFloat(p.dim_z) || 0;
      // Calcular volumen en cm³
      const volumen = x * y * z;
      // Formatear con dos decimales, o vacío si falta algún dato
      p.volumen = (volumen > 0)
        ? volumen.toFixed(2) + ' cm³'
        : '';
      productos.push(p);
    });
  }

  function renderResumen() {
    tablaResumen.innerHTML = '';
    tablaHead.innerHTML = '';

if (vistaActual === 'producto') {
  tablaHead.innerHTML = `
    <tr>
      <th>Imagen</th>
      <th>Nombre</th>
      <th>Área</th>
      <th>Zona</th>
      <th>Descripción</th>
      <th>Categoría</th>
      <th>Subcategoría</th>
      <th>Volumen (cm³)</th>
      <th>Stock</th>
      <th>Precio compra</th>
      <th>Acciones</th>
    </tr>`;

  productos.forEach(p => {
const cat = p.categoria_nombre   || '';
const sub = p.subcategoria_nombre || '';
    const zona= p.zona_nombre || '';
    const area= p.area_nombre || '';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.imagenBase64 ? `<img src="${p.imagenBase64}" width="50" class="img-thumbnail">` : ''}</td>
      <td>${p.nombre}</td>
      <td>${area}</td>
      <td>${zona}</td>
      <td>${p.descripcion}</td>
      <td>${cat}</td>
      <td>${sub}</td>
      <td>${p.volumen}</td>
      <td>${p.stock}</td>
      <td>${p.precio_compra}</td>
      <td>
        <button class="btn btn-sm btn-primary me-1" data-accion="edit" data-tipo="producto" data-id="${p.id}">Editar</button>
        <button class="btn btn-sm btn-danger" data-accion="del" data-tipo="producto" data-id="${p.id}">Eliminar</button>
      </td>
    `;
    tablaResumen.appendChild(tr);
  });
} else if (vistaActual === 'categoria') {
      tablaHead.innerHTML = `
        <tr>
          <th>Nombre</th>
          <th>Descripción</th>
          <th>Subcategorías</th>
          <th>Acciones</th>
        </tr>`;
      categorias.forEach(c => {
        const subcats = subcategorias
          .filter(sc => sc.categoria_id === c.id)
          .map(sc => sc.nombre)
          .join(', ');
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${c.nombre}</td>
          <td>${c.descripcion}</td>
          <td>${subcats}</td>
          <td>
            <button class="btn btn-sm btn-primary me-1" data-accion="edit" data-tipo="categoria" data-id="${c.id}">Editar</button>
            <button class="btn btn-sm btn-danger" data-accion="del" data-tipo="categoria" data-id="${c.id}">Eliminar</button>
          </td>`;
        tablaResumen.appendChild(tr);
      });
    } else if (vistaActual === 'subcategoria') {
      tablaHead.innerHTML = `
        <tr>
          <th>Nombre</th>
          <th>Categoría</th>
          <th>Descripción</th>
          <th>Acciones</th>
        </tr>`;
      subcategorias.forEach(sc => {
        const cat = categorias.find(c => c.id === sc.categoria_id)?.nombre || '';
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${sc.nombre}</td>
          <td>${cat}</td>
          <td>${sc.descripcion}</td>
          <td>
            <button class="btn btn-sm btn-primary me-1" data-accion="edit" data-tipo="subcategoria" data-id="${sc.id}">Editar</button>
            <button class="btn btn-sm btn-danger" data-accion="del" data-tipo="subcategoria" data-id="${sc.id}">Eliminar</button>
          </td>`;
        tablaResumen.appendChild(tr);
      });
    }
  }

catForm.addEventListener('submit', async e => {
  e.preventDefault();
  // 1) Leer campos
  const nombre      = document.getElementById('catNombre').value.trim();
  const descripcion = document.getElementById('catDescripcion').value.trim();
  if (!nombre) { alert('El nombre es obligatorio'); return; }

  // 2) Payload con empresa
  const payload = { nombre, descripcion, empresa_id: EMP_ID };

  try {
    // 3) POST o PUT
    if (editCatId) {
      await fetchAPI(
        `${API.categorias}?id=${editCatId}&empresa_id=${EMP_ID}`,
        'PUT',
        payload
      );
      showToast('Categoría editada correctamente');
    } else {
      await fetchAPI(
        `${API.categorias}?empresa_id=${EMP_ID}`,
        'POST',
        payload
      );
      showToast('Categoría guardada correctamente');
    }

    // 4) Reset y recarga
    catForm.reset();
    await cargarCategorias();

  } catch (err) {
    console.error(err);
    showToast('Error guardando categoría: ' + err.message);
  }
});


subcatForm.addEventListener('submit', async e => {
  e.preventDefault();
  // 1) Leer campos
const categoria_id = parseInt(document.getElementById('subcatCategoria').value, 10) || null;
const nombre       = document.getElementById('subcatNombre').value.trim();
const descripcion  = document.getElementById('subcatDescripcion').value.trim();
if (!categoria_id) { alert('Selecciona una categoría'); return; }
if (!nombre)       { alert('El nombre es obligatorio');     return; }
  // 2) Payload con empresa
  const payload = { categoria_id, nombre, descripcion, empresa_id: EMP_ID };

  try {
    // 3) POST o PUT
    if (editSubcatId) {
      await fetchAPI(
        `${API.subcategorias}?id=${editSubcatId}&empresa_id=${EMP_ID}`,
        'PUT',
        payload
      );
      showToast('Subcategoría editada correctamente');
    } else {
      await fetchAPI(
        `${API.subcategorias}?empresa_id=${EMP_ID}`,
        'POST',
        payload
      );
      showToast('Subcategoría guardada correctamente');
    }

    // 4) Reset y recarga
    subcatForm.reset();
    await cargarSubcategorias();

  } catch (err) {
    console.error(err);
    showToast('Error guardando subcategoría: ' + err.message);
  }
});


prodForm.addEventListener('submit', async e => {
    e.preventDefault();

    // 1) Leer campos de forma fiable
    const nombre = document.getElementById('prodNombre').value.trim();
    const descripcion = document.getElementById('prodDescripcion').value.trim();
    const categoria_id = parseInt(document.getElementById('prodCategoria').value) || null;
    const subcategoria_id = parseInt(document.getElementById('prodSubcategoria').value) || null;
    const stock = parseInt(document.getElementById('prodStock').value) || 0;
    const precio_compra = parseFloat(document.getElementById('prodPrecio').value) || 0;
    const dim_x = parseFloat(document.getElementById('prodDimX').value) || 0;
    const dim_y = parseFloat(document.getElementById('prodDimY').value) || 0;
    const dim_z = parseFloat(document.getElementById('prodDimZ').value) || 0;

    // Validaciones mínimas
    if (!nombre) {
      alert('El nombre es obligatorio');
      return;
    }
    if (!categoria_id) {
      alert('Selecciona una categoría');
      return;
    }

    const data = { nombre, descripcion, categoria_id, subcategoria_id, zona_id: parseInt(prodZona.value) || null,
                   stock, precio_compra, dim_x, dim_y, dim_z };

    try {
      // 2) POST o PUT
      const base = API.productos;
if (editProdId) {
  await fetchAPI(
    `${base}?id=${editProdId}&empresa_id=${EMP_ID}`,
    'PUT',
    {...data, empresa_id: EMP_ID}
  );
  showToast('Producto editado correctamente');
  editProdId = null;
} else {
  // POST con filtro por empresa
    await fetchAPI(
    `${base}?empresa_id=${EMP_ID}`,
    'POST',
    {...data, empresa_id: EMP_ID}
  );
  showToast('Producto guardado correctamente');
}

      // 3) Reset y recarga de datos
      prodForm.reset();
      await cargarProductos();
      await cargarZonas();
      renderResumen();

    } catch (err) {
      console.error(err);
      showToast('Error al guardar producto: ' + err.message);
    }
  });

tablaResumen.addEventListener('click', async e => {
  const id     = parseInt(e.target.dataset.id, 10);
  const tipo   = e.target.dataset.tipo;
  const accion = e.target.dataset.accion;
  if (!accion) return;

  // 1) Eliminar
  if (accion === 'del') {
    if (tipo === 'producto') {
  await fetchAPI(
    `${API.productos}?id=${id}&empresa_id=${EMP_ID}`,
    'DELETE'
  );
  await cargarProductos();
} else if (tipo === 'categoria') {
      await fetchAPI(`${API.categorias}?id=${id}`, 'DELETE');
      await cargarCategorias();
      await cargarSubcategorias();
      await cargarProductos();
    } else if (tipo === 'subcategoria') {
      await fetchAPI(`${API.subcategorias}?id=${id}`, 'DELETE');
      await cargarSubcategorias();
      await cargarProductos();
    }
    await cargarProductos();    // ← recalc volumen
    await cargarZonas();
    renderResumen();
    return;
  }

  // 2) Editar producto
  if (accion === 'edit' && tipo === 'producto') {
    const p = productos.find(pr => parseInt(pr.id, 10) === id);
    if (!p) return;
    mostrar('producto');
    document.getElementById('prodNombre').value      = p.nombre;
    document.getElementById('prodDescripcion').value = p.descripcion;
    prodCategoria.value  = parseInt(p.categoria_id,10) || '';
    actualizarSelectSubcategorias(parseInt(p.categoria_id,10));
    prodSubcategoria.value = parseInt(p.subcategoria_id,10) || '';
    const dims = (p.dimensiones || '').split('x');
    document.getElementById('prodDimX').value   = dims[0] || '';
    document.getElementById('prodDimY').value   = dims[1] || '';
    document.getElementById('prodDimZ').value   = dims[2] || '';
    document.getElementById('prodStock').value  = p.stock;
    document.getElementById('prodPrecio').value = p.precio_compra;
    editProdId = id;
    return;
  }

  // 3) Editar categoría
  if (accion === 'edit' && tipo === 'categoria') {
    const c = categorias.find(cat => parseInt(cat.id, 10) === id);
    if (!c) return;
    mostrar('categoria');
    // los inputs de categoría tienen id="catNombre" y id="catDescripcion"
    document.getElementById('catNombre').value      = c.nombre;
    document.getElementById('catDescripcion').value = c.descripcion;
    editCatId = id;
    return;
  }

  // 4) Editar subcategoría
  if (accion === 'edit' && tipo === 'subcategoria') {
    const sc = subcategorias.find(s => parseInt(s.id, 10) === id);
    if (!sc) return;
    mostrar('subcategoria');
    // select de categorías y inputs de subcategoría por su id
    document.getElementById('subcatCategoria').value   = parseInt(sc.categoria_id,10) || '';
    document.getElementById('subcatNombre').value      = sc.nombre;
    document.getElementById('subcatDescripcion').value = sc.descripcion;
    editSubcatId = id;
    return;
  }
});

  // Botón para recargar el resumen
  btnRecargarResumen?.addEventListener('click', async () => {
    await cargarCategorias();
    await cargarSubcategorias();
    await cargarProductos();
    await cargarZonas();
    renderResumen();
    showToast('Resumen recargado');
  });

  (async function init() {
    await cargarCategorias();
    await cargarSubcategorias();
    await cargarZonas();
    await cargarProductos();
    renderResumen();
  })();
})();
