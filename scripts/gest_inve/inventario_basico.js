(() => {
  // Datos en memoria
  const categorias = [];
  const subcategorias = [];
  const productos = [];
  let catId = 1;
  let subcatId = 1;
  let prodId = 1;
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

  // Formularios
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
        const cat = categorias.find(c => c.id === p.categoriaId)?.nombre || '';
        const sub = subcategorias.find(s => s.id === p.subcategoriaId)?.nombre || '';
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${p.nombre}</td>
          <td>${p.descripcion}</td>
          <td>${cat}</td>
          <td>${sub}</td>
          <td>${p.dimensiones}</td>
          <td>${p.stock}</td>
          <td>${p.precio}</td>
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
          .filter(sc => sc.categoriaId === c.id)
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
        const cat = categorias.find(c => c.id === sc.categoriaId)?.nombre || '';
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
    productos.forEach(p => {
      const cat = categorias.find(c => c.id === p.categoriaId)?.nombre || '';
      const sub = subcategorias.find(s => s.id === p.subcategoriaId)?.nombre || '';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${p.nombre}</td>
        <td>${p.descripcion}</td>
        <td>${cat}</td>
        <td>${sub}</td>
        <td>${p.dimensiones}</td>
        <td>${p.stock}</td>
        <td>${p.precio}</td>
      `;
      tablaResumen.appendChild(tr);
    });
  }

  // Guardar categoría
  catForm.addEventListener('submit', e => {
    e.preventDefault();
    if (editCatId) {
      const c = categorias.find(cat => cat.id === editCatId);
      if (c) {
        c.nombre = catForm.catNombre.value;
        c.descripcion = catForm.catDescripcion.value;
      }
      editCatId = null;
    } else {
      categorias.push({ id: catId++, nombre: catForm.catNombre.value, descripcion: catForm.catDescripcion.value });
    }
    catForm.reset();
    actualizarSelectCategorias();
    renderResumen();
    categorias.push({ id: catId++, nombre: catForm.catNombre.value, descripcion: catForm.catDescripcion.value });
    catForm.reset();
    actualizarSelectCategorias();
  });

  // Guardar subcategoría
  subcatForm.addEventListener('submit', e => {
    e.preventDefault();
    const data = {
      nombre: subcatForm.subcatNombre.value,
      descripcion: subcatForm.subcatDescripcion.value,
      categoriaId: parseInt(subcatForm.subcatCategoria.value) || null
    };
    if (editSubcatId) {
      const sc = subcategorias.find(s => s.id === editSubcatId);
      if (sc) Object.assign(sc, data);
      editSubcatId = null;
    } else {
      subcategorias.push({ id: subcatId++, ...data });
    }
    subcatForm.reset();
    actualizarSelectSubcategorias();
    renderResumen();
    subcategorias.push({
      id: subcatId++,
      nombre: subcatForm.subcatNombre.value,
      descripcion: subcatForm.subcatDescripcion.value,
      categoriaId: parseInt(subcatForm.subcatCategoria.value) || null
    });
    subcatForm.reset();
    actualizarSelectSubcategorias();
  });

  // Guardar producto
  prodForm.addEventListener('submit', e => {
    e.preventDefault();
    const categoriaId = parseInt(prodCategoria.value) || null;
    const subcategoriaId = parseInt(prodSubcategoria.value) || null;
    if (!categoriaId) {
      alert('Advertencia: faltan campos por rellenar');
    }
    const data = {
    productos.push({
      id: prodId++,
      nombre: prodForm.prodNombre.value,
      descripcion: prodForm.prodDescripcion.value,
      categoriaId,
      subcategoriaId,
      dimensiones: prodForm.prodDimensiones.value,
      stock: parseInt(prodForm.prodStock.value) || 0,
      precio: parseFloat(prodForm.prodPrecio.value) || 0
    };
    if (editProdId) {
      const p = productos.find(pr => pr.id === editProdId);
      if (p) Object.assign(p, data);
      editProdId = null;
    } else {
      productos.push({ id: prodId++, ...data });
    }
    prodForm.reset();
    renderResumen();
  });

  tablaResumen.addEventListener('click', e => {
    const id = parseInt(e.target.dataset.id);
    const tipo = e.target.dataset.tipo;
    const accion = e.target.dataset.accion;
    if (!accion) return;
    if (accion === 'del') {
      if (tipo === 'producto') {
        const i = productos.findIndex(p => p.id === id);
        if (i > -1) productos.splice(i, 1);
      } else if (tipo === 'categoria') {
        const i = categorias.findIndex(c => c.id === id);
        if (i > -1) categorias.splice(i, 1);
        actualizarSelectCategorias();
      } else if (tipo === 'subcategoria') {
        const i = subcategorias.findIndex(sc => sc.id === id);
        if (i > -1) subcategorias.splice(i, 1);
        actualizarSelectSubcategorias();
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
          prodCategoria.value = p.categoriaId || '';
          actualizarSelectSubcategorias();
          prodSubcategoria.value = p.subcategoriaId || '';
          prodForm.prodDimensiones.value = p.dimensiones;
          prodForm.prodStock.value = p.stock;
          prodForm.prodPrecio.value = p.precio;
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
          subcatCategoria.value = sc.categoriaId || '';
          subcatForm.subcatNombre.value = sc.nombre;
          subcatForm.subcatDescripcion.value = sc.descripcion;
          editSubcatId = id;
        }
      }
    }
  });
    });
    prodForm.reset();
    renderResumen();
  });
})();
