(() => {
  const API = {
    categorias: '../../scripts/php/guardar_categorias.php',
    subcategorias: '../../scripts/php/guardar_subcategorias.php',
    productos: '../../scripts/php/guardar_productos.php'
  };

  const empresaId = localStorage.getItem('id_empresa') || '';

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
      options.body = JSON.stringify(data);
    }
    const res = await fetch(url, options);
    if (!res.ok) throw new Error('Error en la solicitud');
    return res.json();
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
  const subcatCategoria = document.getElementById('subcatCategoria');
  const tablaResumen = document.querySelector('#tablaResumen tbody');
  const tablaHead = document.getElementById('tablaHead');

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

  function actualizarSelectSubcategorias() {
    prodSubcategoria.innerHTML = '<option value="">Seleccione subcategoría</option>';
    subcategorias.forEach(sc => {
      const opt = document.createElement('option');
      opt.value = sc.id;
      opt.textContent = sc.nombre;
      prodSubcategoria.appendChild(opt);
    });
  }

  async function cargarCategorias() {
    categorias.length = 0;
    const url = empresaId ? `${API.categorias}?empresa_id=${empresaId}` : API.categorias;
    const datos = await fetchAPI(url);
    datos.forEach(c => categorias.push(c));
    actualizarSelectCategorias();
  }

  async function cargarSubcategorias() {
    subcategorias.length = 0;
    const url = empresaId ? `${API.subcategorias}?empresa_id=${empresaId}` : API.subcategorias;
    const datos = await fetchAPI(url);
    datos.forEach(s => subcategorias.push(s));
    actualizarSelectSubcategorias();
  }

  async function cargarProductos() {
    productos.length = 0;
    const url = empresaId ? `${API.productos}?empresa_id=${empresaId}` : API.productos;
    const datos = await fetchAPI(url);
    datos.forEach(p => productos.push(p));
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
      descripcion: catForm.catDescripcion.value,
      empresa_id: parseInt(empresaId)
    };

    if (editCatId) {
      await fetchAPI(`${API.categorias}?id=${editCatId}&empresa_id=${empresaId}`, 'PUT', data);
      editCatId = null;
    } else {
      await fetchAPI(`${API.categorias}?empresa_id=${empresaId}`, 'POST', data);
    }

    catForm.reset();
    await cargarCategorias();
  });

  subcatForm.addEventListener('submit', async e => {
    e.preventDefault();
    const data = {
      nombre: subcatForm.subcatNombre.value,
      descripcion: subcatForm.subcatDescripcion.value,
      categoria_id: parseInt(subcatForm.subcatCategoria.value) || null,
      empresa_id: parseInt(empresaId)
    };
    if (editSubcatId) {
      await fetchAPI(`${API.subcategorias}?id=${editSubcatId}&empresa_id=${empresaId}`, 'PUT', data);
      editSubcatId = null;
    } else {
      await fetchAPI(`${API.subcategorias}?empresa_id=${empresaId}`, 'POST', data);
    }
    subcatForm.reset();
    await cargarSubcategorias();
  });

  prodForm.addEventListener('submit', async e => {
    e.preventDefault();
    const categoria_id = parseInt(prodCategoria.value) || null;
    const subcategoria_id = parseInt(prodSubcategoria.value) || null;
    if (!categoria_id) {
      alert('Advertencia: faltan campos por rellenar');
      return;
    }
    const data = {
      nombre: prodForm.prodNombre.value,
      descripcion: prodForm.prodDescripcion.value,
      categoria_id,
      subcategoria_id,
      dimensiones: prodForm.prodDimensiones.value,
      stock: parseInt(prodForm.prodStock.value) || 0,
      precio_compra: parseFloat(prodForm.prodPrecio.value) || 0,
      empresa_id: parseInt(empresaId)
    };

    if (editProdId) {
      await fetchAPI(`${API.productos}?id=${editProdId}&empresa_id=${empresaId}`, 'PUT', data);
      editProdId = null;
    } else {
      await fetchAPI(`${API.productos}?empresa_id=${empresaId}`, 'POST', data);
    }
    prodForm.reset();
    await cargarProductos();
  });

  tablaResumen.addEventListener('click', async e => {
    const id = parseInt(e.target.dataset.id);
    const tipo = e.target.dataset.tipo;
    const accion = e.target.dataset.accion;
    if (!accion) return;

    if (accion === 'del') {
      if (tipo === 'producto') {
        await fetchAPI(`${API.productos}?id=${id}&empresa_id=${empresaId}`, 'DELETE');
        await cargarProductos();
      } else if (tipo === 'categoria') {
        await fetchAPI(`${API.categorias}?id=${id}&empresa_id=${empresaId}`, 'DELETE');
        await cargarCategorias();
        await cargarSubcategorias();
        await cargarProductos();
      } else if (tipo === 'subcategoria') {
        await fetchAPI(`${API.subcategorias}?id=${id}&empresa_id=${empresaId}`, 'DELETE');
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
          actualizarSelectSubcategorias();
          prodSubcategoria.value = p.subcategoria_id || '';
          prodForm.prodDimensiones.value = p.dimensiones;
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

  (async function init() {
    await cargarCategorias();
    await cargarSubcategorias();
    await cargarProductos();
    renderResumen();
  })();
})();
