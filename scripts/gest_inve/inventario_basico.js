(() => {
  const API = {
    categorias: '../../scripts/php/guardar_categorias.php',
    subcategorias: '../../scripts/php/guardar_subcategorias.php',
    productos: '../../scripts/php/guardar_productos.php'
  };

  const categorias = [];
  const subcategorias = [];
  const productos = [];
  let vistaActual = 'producto';
  let editProdId = null;
  let editCatId = null;
  let editSubcatId = null;

  const btnProductos = document.getElementById('btnProductos');
  const btnCategorias = document.getElementById('btnCategorias');
  const btnSubcategorias = document.getElementById('btnSubcategorias');

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

  // Intentamos parsear el JSON (éxito o error vienen en JSON)
  let payload;
  try {
    payload = await res.json();
  } catch (e) {
    throw new Error('Respuesta no es JSON válido');
  }

  // Si hubo cualquier código ≠2xx, lanzamos con el mensaje del servidor
  if (!res.ok) {
    const msg = payload.error || 'Error en la solicitud';
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
    .filter(sc => sc.categoria_id === categoriaId)
    .forEach(sc => {
      const opt = document.createElement('option');
      opt.value = sc.id;
      opt.textContent = sc.nombre;
      prodSubcategoria.appendChild(opt);
    });
}


  async function cargarCategorias() {
    categorias.length = 0;
    const datos = await fetchAPI(API.categorias);
    datos.forEach(c => categorias.push(c));
    actualizarSelectCategorias();
  }

  async function cargarSubcategorias() {
  subcategorias.length = 0;
  const datos = await fetchAPI(API.subcategorias);
  datos.forEach(s => subcategorias.push(s));
  // Al iniciar, ninguna categoría está elegida → sólo placeholder
  actualizarSelectSubcategorias(null);
}

  async function cargarProductos() {
    productos.length = 0;
    const datos = await fetchAPI(API.productos);
    datos.forEach(p => {
      const dims = [p.dim_x, p.dim_y, p.dim_z]
        .filter(v => v !== null && v !== undefined)
        .join('x');
      p.dimensiones = dims;
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
      <th>Descripción</th>
      <th>Categoría</th>
      <th>Subcategoría</th>
      <th>Dimensiones</th>
      <th>Stock</th>
      <th>Precio compra</th>
      <th>Acciones</th>
    </tr>`;

  productos.forEach(p => {
    const cat = categorias.find(c => c.id === p.categoria_id)?.nombre || '';
    const sub = subcategorias.find(s => s.id === p.subcategoria_id)?.nombre || '';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.imagenBase64 ? `<img src="${p.imagenBase64}" width="50" class="img-thumbnail">` : ''}</td>
      <td>${p.nombre}</td>
      <td>${p.descripcion}</td>
      <td>${cat}</td>
      <td>${sub}</td>
      <td>${p.dimensiones}</td>
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
    const data = {
      nombre: catForm.catNombre.value,
      descripcion: catForm.catDescripcion.value
    };

    if (editCatId) {
      await fetchAPI(`${API.categorias}?id=${editCatId}`, 'PUT', data);
      editCatId = null;
      showToast('Categoría editada correctamente');
    } else {
      await fetchAPI(API.categorias, 'POST', data);
      showToast('Categoría guardada correctamente');
    }

    catForm.reset();
    await cargarCategorias();
  });

  subcatForm.addEventListener('submit', async e => {
    e.preventDefault();
    const data = {
      nombre: subcatForm.subcatNombre.value,
      descripcion: subcatForm.subcatDescripcion.value,
      categoria_id: parseInt(subcatForm.subcatCategoria.value) || null
    };
    if (editSubcatId) {
      await fetchAPI(`${API.subcategorias}?id=${editSubcatId}`, 'PUT', data);
      editSubcatId = null;
      showToast('Subcategoría editada correctamente');
    } else {
      await fetchAPI(API.subcategorias, 'POST', data);
      showToast('Subcategoría guardada correctamente');
    }
    subcatForm.reset();
    await cargarSubcategorias();
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

    const data = { nombre, descripcion, categoria_id, subcategoria_id,
                   stock, precio_compra, dim_x, dim_y, dim_z };

    try {
      // 2) POST o PUT
      if (editProdId) {
        await fetchAPI(`${API.productos}?id=${editProdId}`, 'PUT', data);
        showToast('Producto editado correctamente');
        editProdId = null;
      } else {
        await fetchAPI(API.productos, 'POST', data);
        showToast('Producto guardado correctamente');
      }

      // 3) Reset y recarga de datos
      prodForm.reset();
      await cargarProductos();
      renderResumen();

    } catch (err) {
      console.error(err);
      showToast('Error al guardar producto: ' + err.message);
    }
  });

  tablaResumen.addEventListener('click', async e => {
    const id = parseInt(e.target.dataset.id);
    const tipo = e.target.dataset.tipo;
    const accion = e.target.dataset.accion;
    if (!accion) return;

    if (accion === 'del') {
      if (tipo === 'producto') {
        await fetchAPI(`${API.productos}?id=${id}`, 'DELETE');
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
      renderResumen();
    }

    if (accion === 'edit') {
      if (tipo === 'producto') {
        const p = productos.find(pr => pr.id === id);
        if (p) {
          mostrar('producto');
          prodForm.prodNombre.value = p.nombre;
          prodForm.prodDescripcion.value = p.descripcion;
          prodCategoria.value = p.categoria_id || '';
          actualizarSelectSubcategorias(p.categoria_id);
          prodSubcategoria.value = p.subcategoria_id || '';
          const dims = (p.dimensiones || '').split('x');
          prodForm.prodDimX.value = dims[0] || '';
          prodForm.prodDimY.value = dims[1] || '';
          prodForm.prodDimZ.value = dims[2] || '';
          prodForm.prodStock.value = p.stock;
          prodForm.prodPrecio.value = p.precio_compra;
          editProdId = id;
        }
      } else if (tipo === 'categoria') {
        const c = categorias.find(cat => cat.id === id);
        if (c) {
          mostrar('categoria');
          catForm.catNombre.value = c.nombre;
          catForm.catDescripcion.value = c.descripcion;
          editCatId = id;
        }
      } else if (tipo === 'subcategoria') {
        const sc = subcategorias.find(s => s.id === id);
        if (sc) {
          mostrar('subcategoria');
          subcatCategoria.value = sc.categoria_id || '';
          subcatForm.subcatNombre.value = sc.nombre;
          subcatForm.subcatDescripcion.value = sc.descripcion;
          editSubcatId = id;
        }
      }
    }
  });

  btnRecargarResumen?.addEventListener('click', async () => {
    await cargarCategorias();
    await cargarSubcategorias();
    await cargarProductos();
    renderResumen();
    showToast('Resumen recargado');
  });

  (async function init() {
    await cargarCategorias();
    await cargarSubcategorias();
    await cargarProductos();
    renderResumen();
  })();
})();
