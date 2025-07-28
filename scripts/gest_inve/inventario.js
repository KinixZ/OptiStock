const API = {
  categorias: '/scripts/php/guardar_categorias.php',
  subcategorias: '/scripts/php/guardar_subcategorias.php',
  productos: '/scripts/php/guardar_productos.php'
};

let categorias = [];
let subcategorias = [];
let productos = [];

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

async function cargarCategorias() {
  categorias = await fetchAPI(API.categorias);
  const selectCat = document.getElementById('subcategoriaCategoria');
  const prodCat = document.getElementById('productoCategoria');
  selectCat.innerHTML = '<option value="">Categoría</option>';
  prodCat.innerHTML = '<option value="">Categoría</option>';
  categorias.forEach(c => {
    const opt1 = document.createElement('option');
    opt1.value = c.id;
    opt1.textContent = c.nombre;
    selectCat.appendChild(opt1);
    const opt2 = opt1.cloneNode(true);
    prodCat.appendChild(opt2);
  });
  renderCategorias();
}

async function cargarSubcategorias() {
  subcategorias = await fetchAPI(API.subcategorias);
  const select = document.getElementById('productoSubcategoria');
  select.innerHTML = '<option value="">Subcategoría</option>';
  subcategorias.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.nombre;
    select.appendChild(opt);
  });
  renderSubcategorias();
}

async function cargarProductos() {
  productos = await fetchAPI(API.productos);
  renderProductos();
  verificarStockCritico();
}

function filtrarLista(lista, texto, campos) {
  if (!texto) return lista;
  const t = texto.toLowerCase();
  return lista.filter(item => campos.some(c => String(item[c]).toLowerCase().includes(t)));
}

function renderCategorias() {
  const filtro = document.getElementById('buscarCategoria').value;
  const lista = filtrarLista(categorias, filtro, ['nombre', 'descripcion']);
  const ul = document.getElementById('categoriasLista');
  ul.innerHTML = '';
  lista.forEach(item => {
    const li = document.createElement('li');
    li.className = 'item-card';
    li.innerHTML = `<span class="item-name">${item.nombre}</span>`;
    const actions = document.createElement('div');
    actions.className = 'item-actions';
    const e = document.createElement('button');
    e.textContent = 'Editar';
    e.className = 'edit-btn';
    e.onclick = () => editarCategoria(item);
    const d = document.createElement('button');
    d.textContent = 'Eliminar';
    d.className = 'delete-btn';
    d.onclick = () => eliminarCategoria(item.id);
    actions.appendChild(e);
    actions.appendChild(d);
    li.appendChild(actions);
    ul.appendChild(li);
  });
}

function renderSubcategorias() {
  const filtro = document.getElementById('buscarSubcategoria').value;
  const lista = filtrarLista(subcategorias, filtro, ['nombre', 'descripcion']);
  const ul = document.getElementById('subcategoriasLista');
  ul.innerHTML = '';
  lista.forEach(item => {
    const li = document.createElement('li');
    li.className = 'item-card';
    li.innerHTML = `<span class="item-name">${item.nombre}</span>`;
    const actions = document.createElement('div');
    actions.className = 'item-actions';
    const e = document.createElement('button');
    e.textContent = 'Editar';
    e.className = 'edit-btn';
    e.onclick = () => editarSubcategoria(item);
    const d = document.createElement('button');
    d.textContent = 'Eliminar';
    d.className = 'delete-btn';
    d.onclick = () => eliminarSubcategoria(item.id);
    actions.appendChild(e);
    actions.appendChild(d);
    li.appendChild(actions);
    ul.appendChild(li);
  });
}

function renderProductos() {
  const filtro = document.getElementById('buscarProducto').value;
  const lista = filtrarLista(productos, filtro, ['nombre', 'descripcion']);
  const ul = document.getElementById('productosLista');
  ul.innerHTML = '';
  lista.forEach(p => {
    const li = document.createElement('li');
    li.className = 'item-card';
    if (p.stock <= 5) li.classList.add('stock-bajo');
    li.innerHTML = `<span class="item-name">${p.nombre} - Stock: ${p.stock}</span>`;
    const actions = document.createElement('div');
    actions.className = 'item-actions';
    const e = document.createElement('button');
    e.textContent = 'Editar';
    e.className = 'edit-btn';
    e.onclick = () => editarProducto(p);
    const d = document.createElement('button');
    d.textContent = 'Eliminar';
    d.className = 'delete-btn';
    d.onclick = () => eliminarProducto(p.id);
    actions.appendChild(e);
    actions.appendChild(d);
    li.appendChild(actions);
    ul.appendChild(li);
  });
}

function verificarStockCritico() {
  const alerta = document.getElementById('alertasStock');
  const criticos = productos.filter(p => p.stock <= 5);
  if (criticos.length) {
    alerta.textContent = 'Productos con stock crítico: ' + criticos.map(p => p.nombre).join(', ');
  } else {
    alerta.textContent = '';
  }
}

// Formularios
const categoriaForm = document.getElementById('categoriaForm');
const subcategoriaForm = document.getElementById('subcategoriaForm');
const productoForm = document.getElementById('productoForm');

categoriaForm.addEventListener('submit', async e => {
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

subcategoriaForm.addEventListener('submit', async e => {
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

productoForm.addEventListener('submit', async e => {
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

function exportarExcel() {
  const tabla = document.createElement('table');
  const header = ['Nombre', 'Stock', 'Precio'];
  const thead = tabla.createTHead();
  const hRow = thead.insertRow();
  header.forEach(t => { const th = document.createElement('th'); th.textContent = t; hRow.appendChild(th); });
  const tbody = tabla.createTBody();
  productos.forEach(p => {
    const r = tbody.insertRow();
    r.insertCell().textContent = p.nombre;
    r.insertCell().textContent = p.stock;
    r.insertCell().textContent = p.precio_compra;
  });
  const wb = XLSX.utils.table_to_book(tabla, { sheet: 'Productos' });
  XLSX.writeFile(wb, 'inventario.xlsx');
}

function exportarPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const rows = productos.map(p => [p.nombre, p.stock, p.precio_compra]);
  doc.text('Inventario', 14, 16);
  doc.autoTable({ head: [['Nombre','Stock','Precio']], body: rows, startY: 22, styles: { fontSize: 10 } });
  doc.save('inventario.pdf');
}

// Búsquedas y exportaciones
['buscarCategoria','buscarSubcategoria','buscarProducto'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', () => {
    renderCategorias();
    renderSubcategorias();
    renderProductos();
  });
});

document.getElementById('exportarExcel').addEventListener('click', exportarExcel);
document.getElementById('exportarPDF').addEventListener('click', exportarPDF);

(async function(){
  await cargarCategorias();
  await cargarSubcategorias();
  await cargarProductos();
})();
