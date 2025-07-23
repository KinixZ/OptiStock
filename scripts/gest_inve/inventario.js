const API = {
  categorias: '/scripts/php/guardar_categorias.php',
  subcategorias: '/scripts/php/guardar_subcategorias.php',
  productos: '/scripts/php/guardar_productos.php'
};

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

// Cargar listas iniciales
async function cargarCategorias() {
  const data = await fetchAPI(API.categorias);
  const selectCat = document.getElementById('subcategoriaCategoria');
  const prodCat = document.getElementById('productoCategoria');
  selectCat.innerHTML = '<option value="">Categoría</option>';
  prodCat.innerHTML = '<option value="">Categoría</option>';
  data.forEach(c => {
    const opt1 = document.createElement('option');
    opt1.value = c.id;
    opt1.textContent = c.nombre;
    selectCat.appendChild(opt1);
    const opt2 = opt1.cloneNode(true);
    prodCat.appendChild(opt2);
  });
  listarCategorias(data);
}

async function cargarSubcategorias() {
  const data = await fetchAPI(API.subcategorias);
  const select = document.getElementById('productoSubcategoria');
  select.innerHTML = '<option value="">Subcategoría</option>';
  data.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.nombre;
    select.appendChild(opt);
  });
  listarSubcategorias(data);
}

async function cargarProductos() {
  const data = await fetchAPI(API.productos);
  listarProductos(data);
}

function listarCategorias(lista) {
  const ul = document.getElementById('categoriasLista');
  ul.innerHTML = '';
  lista.forEach(item => {
    const li = document.createElement('li');

    const name = document.createElement('span');
    name.textContent = item.nombre;
    const actions = document.createElement('div');
    actions.className = 'item-actions';
    const editBtn = document.createElement('button');
    editBtn.textContent = 'Editar';
    editBtn.className = 'edit-btn';
    editBtn.onclick = () => editarCategoria(item);
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Eliminar';
    delBtn.className = 'delete-btn';
    delBtn.onclick = () => eliminarCategoria(item.id);
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    li.appendChild(name);
    li.appendChild(actions);

    li.textContent = item.nombre;
    li.onclick = () => editarCategoria(item);

    ul.appendChild(li);
  });
}

function listarSubcategorias(lista) {
  const ul = document.getElementById('subcategoriasLista');
  ul.innerHTML = '';
  lista.forEach(item => {
    const li = document.createElement('li');

    const name = document.createElement('span');
    name.textContent = item.nombre;
    const actions = document.createElement('div');
    actions.className = 'item-actions';
    const editBtn = document.createElement('button');
    editBtn.textContent = 'Editar';
    editBtn.className = 'edit-btn';
    editBtn.onclick = () => editarSubcategoria(item);
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Eliminar';
    delBtn.className = 'delete-btn';
    delBtn.onclick = () => eliminarSubcategoria(item.id);
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    li.appendChild(name);
    li.appendChild(actions);

    li.textContent = item.nombre;
    li.onclick = () => editarSubcategoria(item);

    ul.appendChild(li);
  });
}

function listarProductos(lista) {
  const ul = document.getElementById('productosLista');
  ul.innerHTML = '';
  lista.forEach(item => {
    const li = document.createElement('li');

    const name = document.createElement('span');
    name.textContent = `${item.nombre} - Stock: ${item.stock}`;
    const actions = document.createElement('div');
    actions.className = 'item-actions';
    const editBtn = document.createElement('button');
    editBtn.textContent = 'Editar';
    editBtn.className = 'edit-btn';
    editBtn.onclick = () => editarProducto(item);
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Eliminar';
    delBtn.className = 'delete-btn';
    delBtn.onclick = () => eliminarProducto(item.id);
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    li.appendChild(name);
    li.appendChild(actions);

    li.textContent = `${item.nombre} - Stock: ${item.stock}`;
    li.onclick = () => editarProducto(item);

    ul.appendChild(li);
  });
}

// Formularios
const categoriaForm = document.getElementById('categoriaForm');
const subcategoriaForm = document.getElementById('subcategoriaForm');
const productoForm = document.getElementById('productoForm');

categoriaForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('categoriaId').value;
  const data = {
    nombre: document.getElementById('categoriaNombre').value,
    descripcion: document.getElementById('categoriaDesc').value
  };
  if (id) await fetchAPI(`${API.categorias}?id=${id}`, 'PUT', data);
  else await fetchAPI(API.categorias, 'POST', data);
  categoriaForm.reset();
  await cargarCategorias();
});

subcategoriaForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('subcategoriaId').value;
  const data = {
    categoria_id: document.getElementById('subcategoriaCategoria').value,
    nombre: document.getElementById('subcategoriaNombre').value,
    descripcion: document.getElementById('subcategoriaDesc').value
  };
  if (id) await fetchAPI(`${API.subcategorias}?id=${id}`, 'PUT', data);
  else await fetchAPI(API.subcategorias, 'POST', data);
  subcategoriaForm.reset();
  await cargarSubcategorias();
});

productoForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('productoId').value;
  const data = {
    nombre: document.getElementById('productoNombre').value,
    descripcion: document.getElementById('productoDesc').value,
    categoria_id: document.getElementById('productoCategoria').value,
    subcategoria_id: document.getElementById('productoSubcategoria').value,
    stock: parseInt(document.getElementById('productoStock').value || '0'),
    precio_compra: parseFloat(document.getElementById('productoPrecio').value || '0')
  };
  if (id) await fetchAPI(`${API.productos}?id=${id}`, 'PUT', data);
  else await fetchAPI(API.productos, 'POST', data);
  productoForm.reset();
  await cargarProductos();
});

function editarCategoria(item) {
  document.getElementById('categoriaId').value = item.id;
  document.getElementById('categoriaNombre').value = item.nombre;
  document.getElementById('categoriaDesc').value = item.descripcion || '';
}

function editarSubcategoria(item) {
  document.getElementById('subcategoriaId').value = item.id;
  document.getElementById('subcategoriaCategoria').value = item.categoria_id || '';
  document.getElementById('subcategoriaNombre').value = item.nombre;
  document.getElementById('subcategoriaDesc').value = item.descripcion || '';
}

function editarProducto(item) {
  document.getElementById('productoId').value = item.id;
  document.getElementById('productoNombre').value = item.nombre;
  document.getElementById('productoDesc').value = item.descripcion || '';
  document.getElementById('productoCategoria').value = item.categoria_id || '';
  document.getElementById('productoSubcategoria').value = item.subcategoria_id || '';
  document.getElementById('productoStock').value = item.stock;
  document.getElementById('productoPrecio').value = item.precio_compra;
}


async function eliminarCategoria(id) {
  if (confirm('¿Seguro que desea eliminar la categoría?') && confirm('Confirme la eliminación')) {
    await fetchAPI(`${API.categorias}?id=${id}`, 'DELETE');
    await cargarCategorias();
    await cargarSubcategorias();
    await cargarProductos();
  }
}

async function eliminarSubcategoria(id) {
  if (confirm('¿Seguro que desea eliminar la subcategoría?') && confirm('Confirme la eliminación')) {
    await fetchAPI(`${API.subcategorias}?id=${id}`, 'DELETE');
    await cargarSubcategorias();
    await cargarProductos();
  }
}

async function eliminarProducto(id) {
  if (confirm('¿Seguro que desea eliminar el producto?') && confirm('Confirme la eliminación')) {
    await fetchAPI(`${API.productos}?id=${id}`, 'DELETE');
    await cargarProductos();
  }
}



// Inicializar
(async function(){
  await cargarCategorias();
  await cargarSubcategorias();
  await cargarProductos();
})();
