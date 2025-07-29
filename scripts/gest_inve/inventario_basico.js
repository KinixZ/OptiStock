(() => {
  // Datos en memoria
  const categorias = [];
  const subcategorias = [];
  const productos = [];
  let catId = 1;
  let subcatId = 1;
  let prodId = 1;

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
    categorias.push({ id: catId++, nombre: catForm.catNombre.value, descripcion: catForm.catDescripcion.value });
    catForm.reset();
    actualizarSelectCategorias();
  });

  // Guardar subcategoría
  subcatForm.addEventListener('submit', e => {
    e.preventDefault();
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
    productos.push({
      id: prodId++,
      nombre: prodForm.prodNombre.value,
      descripcion: prodForm.prodDescripcion.value,
      categoriaId,
      subcategoriaId,
      dimensiones: prodForm.prodDimensiones.value,
      stock: parseInt(prodForm.prodStock.value) || 0,
      precio: parseFloat(prodForm.prodPrecio.value) || 0
    });
    prodForm.reset();
    renderResumen();
  });
})();
