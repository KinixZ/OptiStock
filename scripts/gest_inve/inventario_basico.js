(() => {
  const BASE_URL = window.location.pathname.includes('pages/') ? '../../' : './';
  const API = {
    categorias: `${BASE_URL}scripts/php/guardar_categorias.php`,
    subcategorias: `${BASE_URL}scripts/php/guardar_subcategorias.php`,
    productos: `${BASE_URL}scripts/php/guardar_productos.php`
  };
  const empresaId = localStorage.getItem('id_empresa');
  if (!empresaId) return;

  let categorias = [];
  let subcategorias = [];
  let productos = [];
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

  const prodForm = document.getElementById('productoForm');
  const catForm = document.getElementById('categoriaForm');
  const subcatForm = document.getElementById('subcategoriaForm');
  const prodCategoria = document.getElementById('prodCategoria');
  const prodSubcategoria = document.getElementById('prodSubcategoria');
  const subcatCategoria = document.getElementById('subcatCategoria');
  const tablaResumen = document.querySelector('#tablaResumen tbody');
  const tablaHead = document.getElementById('tablaHead');

  async function fetchAPI(url, method = 'GET', data) {
    const options = { method };
    if (data) {
      options.headers = { 'Content-Type': 'application/json' };
      options.body = JSON.stringify(data);
    }
    const res = await fetch(url, options);
    if (!res.ok) throw new Error('Solicitud inválida');
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
    categorias = await fetchAPI(`${API.categorias}?empresa_id=${empresaId}`);
    actualizarSelectCategorias();
  }

  async function cargarSubcategorias() {
    subcategorias = await fetchAPI(`${API.subcategorias}?empresa_id=${empresaId}`);
    actualizarSelectSubcategorias();
  }

  async function cargarProductos() {
    productos = await fetchAPI(`${API.productos}?empresa_id=${empresaId}`);
  }

  function renderResumen() {
    tablaResumen.innerHTML = '';
    tablaHead.innerHTML = '';
    if (vistaActual === 'producto') {
      tablaHead.innerHTML = `
        <tr>
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
        const cat = categorias.find(c => c.id == p.categoria_id)?.nombre || '';
        const sub = subcategorias.find(s => s.id == p.subcategoria_id)?.nombre || '';
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${p.nombre}</td>
          <td>${p.descripcion || ''}</td>
          <td>${cat}</td>
          <td>${sub}</td>
          <td>${p.dimensiones || ''}</td>
          <td>${p.stock}</td>
          <td>${p.precio_compra}</td>
          <td>
            <button class="btn btn-sm btn-primary me-1" data-accion="edit" data-tipo="producto" data-id="${p.id}">Editar</button>
            <button class="btn btn-sm btn-danger" data-accion="del" data-tipo="producto" data-id="${p.id}">Eliminar</button>
          </td>`;
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
        const subcats = subcategorias.filter(sc => sc.categoria_id == c.id).map(sc => sc.nombre).join(', ');
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${c.nombre}</td>
          <td>${c.descripcion || ''}</td>
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
        const cat = categorias.find(c => c.id == sc.categoria_id)?.nombre || '';
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${sc.nombre}</td>
          <td>${cat}</td>
          <td>${sc.descripcion || ''}</td>
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
      await fetchAPI(API.categorias, 'POST', data);
    }
    catForm.reset();
    await cargarCategorias();
    await cargarSubcategorias();
    renderResumen();
  });

  subcatForm.addEventListener('submit', async e => {
    e.preventDefault();
    const data = {
      nombre: subcatForm.subcatNombre.value,
      descripcion: subcatForm.subcatDescripcion.value,
      categoria_id: parseInt(subcatCategoria.value) || null,
      empresa_id: parseInt(empresaId)
    };
    if (editSubcatId) {
      await fetchAPI(`${API.subcategorias}?id=${editSubcatId}&empresa_id=${empresaId}`, 'PUT', data);
      editSubcatId = null;
    } else {
      await fetchAPI(API.subcategorias, 'POST', data);
    }
    subcatForm.reset();
    await cargarSubcategorias();
    renderResumen();
  });

  prodForm.addEventListener('submit', async e => {
    e.preventDefault();
    const categoria_id = parseInt(prodCategoria.value) || null;
    if (!categoria_id) alert('Advertencia: faltan campos por rellenar');
    const data = {
      nombre: prodForm.prodNombre.value,
      descripcion: prodForm.prodDescripcion.value,
      categoria_id,
      subcategoria_id: parseInt(prodSubcategoria.value) || null,
      dimensiones: prodForm.prodDimensiones.value,
      stock: parseInt(prodForm.prodStock.value) || 0,
      precio_compra: parseFloat(prodForm.prodPrecio.value) || 0,
      empresa_id: parseInt(empresaId)
    };
    if (editProdId) {
      await fetchAPI(`${API.productos}?id=${editProdId}&empresa_id=${empresaId}`, 'PUT', data);
      editProdId = null;
    } else {
      await fetchAPI(API.productos, 'POST', data);
    }
    prodForm.reset();
    await cargarProductos();
    renderResumen();
  });

  tablaResumen.addEventListener('click', async e => {
    const id = parseInt(e.target.dataset.id);
    const tipo = e.target.dataset.tipo;
    const accion = e.target.dataset.accion;
    if (!accion) return;
    if (accion === 'del') {
      if (confirm('¿Eliminar?')) {
        if (tipo === 'producto') {
          await fetchAPI(`${API.productos}?id=${id}&empresa_id=${empresaId}`, 'DELETE');
        } else if (tipo === 'categoria') {
          await fetchAPI(`${API.categorias}?id=${id}&empresa_id=${empresaId}`, 'DELETE');
        } else if (tipo === 'subcategoria') {
          await fetchAPI(`${API.subcategorias}?id=${id}&empresa_id=${empresaId}`, 'DELETE');
        }
        await cargarCategorias();
        await cargarSubcategorias();
        await cargarProductos();
        renderResumen();
      }
    }
    if (accion === 'edit') {
      if (tipo === 'producto') {
        const p = productos.find(pr => pr.id == id);
        if (p) {
          mostrar('producto');
          prodForm.prodNombre.value = p.nombre;
          prodForm.prodDescripcion.value = p.descripcion || '';
          prodCategoria.value = p.categoria_id || '';
          await cargarSubcategorias();
          prodSubcategoria.value = p.subcategoria_id || '';
          prodForm.prodDimensiones.value = p.dimensiones || '';
          prodForm.prodStock.value = p.stock;
          prodForm.prodPrecio.value = p.precio_compra;
          editProdId = id;
        }
      } else if (tipo === 'categoria') {
        const c = categorias.find(cat => cat.id == id);
        if (c) {
          mostrar('categoria');
          catForm.catNombre.value = c.nombre;
          catForm.catDescripcion.value = c.descripcion || '';
          editCatId = id;
        }
      } else if (tipo === 'subcategoria') {
        const sc = subcategorias.find(s => s.id == id);
        if (sc) {
          mostrar('subcategoria');
          subcatCategoria.value = sc.categoria_id || '';
          subcatForm.subcatNombre.value = sc.nombre;
          subcatForm.subcatDescripcion.value = sc.descripcion || '';
          editSubcatId = id;
        }
      }
    }
  });

  async function init() {
    await cargarCategorias();
    await cargarSubcategorias();
    await cargarProductos();
    renderResumen();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
