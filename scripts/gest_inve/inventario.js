
// Detectar ruta base para que funcione tanto embebido en main_menu
// como al abrir la página directamente desde /pages
const BASE_URL = window.location.pathname.includes('pages/') ? '../../' : './';

const API = {
  categorias: `${BASE_URL}scripts/php/guardar_categorias.php`,
  subcategorias: `${BASE_URL}scripts/php/guardar_subcategorias.php`,
  productos: `${BASE_URL}scripts/php/guardar_productos.php`
};

let categorias = [];
let subcategorias = [];
let productos = [];

function actualizarDatalist(id, items) {
  const dl = document.getElementById(id);
  if (!dl) return;
  dl.innerHTML = '';
  items.forEach(texto => {
    const opt = document.createElement('option');
    opt.value = texto;
    dl.appendChild(opt);
  });
}

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
  actualizarDatalist('sugerenciasCategoria', categorias.map(c => c.nombre));
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
  actualizarDatalist('sugerenciasSubcategoria', subcategorias.map(s => s.nombre));
  renderSubcategorias();
}

async function cargarProductos() {
  productos = await fetchAPI(API.productos);
  actualizarDatalist('sugerenciasProducto', productos.map(p => p.nombre));
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

// Configuración global
const AppConfig = {
  API: {
    categorias: '/scripts/php/guardar_categorias.php',
    subcategorias: '/scripts/php/guardar_subcategorias.php',
    productos: '/scripts/php/guardar_productos.php'
  },
  selectors: {
    tabs: '.tab-btn',
    panels: '.tab-panel',
    addButtons: '.btn-add',
    forms: {
      categoria: '#categoriaForm',
      subcategoria: '#subcategoriaForm',
      producto: '#productoForm'
    }
  }
};

// Estado de la aplicación
const AppState = {
  categorias: [],
  subcategorias: [],
  productos: [],
  currentTab: 'productos'
};

// Utilidades
const AppUtils = {
  async fetchAPI(url, method = 'GET', data) {
    const options = { method };
    if (data) {
      options.headers = { 'Content-Type': 'application/json' };
      options.body = JSON.stringify(data);
    }
    const res = await fetch(url, options);
    if (!res.ok) throw new Error('Error en la solicitud');
    return res.json();
  },

  updateDatalist(id, items) {
    const dl = document.getElementById(id);
    if (!dl) return;
    dl.innerHTML = '';
    items.forEach(texto => {
      const opt = document.createElement('option');
      opt.value = texto;
      dl.appendChild(opt);
    });
  },

  filterList(lista, texto, campos) {
    if (!texto) return lista;
    const t = texto.toLowerCase();
    return lista.filter(item => campos.some(c => String(item[c]).toLowerCase().includes(t)));
  },

  showAlert(message, type = 'error') {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    document.body.appendChild(alert);
    setTimeout(() => alert.remove(), 3000);
  }
};

// Controladores de datos
const DataController = {
  async loadCategorias() {
    try {
      AppState.categorias = await AppUtils.fetchAPI(AppConfig.API.categorias);
      this.updateCategorySelects();
      this.renderCategorias();
    } catch (error) {
      console.error('Error cargando categorías:', error);
      AppUtils.showAlert('Error al cargar categorías');
    }
  },

  async loadSubcategorias() {
    try {
      AppState.subcategorias = await AppUtils.fetchAPI(AppConfig.API.subcategorias);
      this.updateSubcategorySelect();
      this.renderSubcategorias();
    } catch (error) {
      console.error('Error cargando subcategorías:', error);
      AppUtils.showAlert('Error al cargar subcategorías');
    }
  },

  async loadProductos() {
    try {
      AppState.productos = await AppUtils.fetchAPI(AppConfig.API.productos);
      AppUtils.updateDatalist('sugerenciasProducto', AppState.productos.map(p => p.nombre));
      this.renderProductos();
      this.checkLowStock();
    } catch (error) {
      console.error('Error cargando productos:', error);
      AppUtils.showAlert('Error al cargar productos');
    }
  },

  updateCategorySelects() {
    const selects = [
      document.getElementById('subcategoriaCategoria'),
      document.getElementById('productoCategoria')
    ];
    
    selects.forEach(select => {
      if (!select) return;
      select.innerHTML = '<option value="">Categoría</option>';
      AppState.categorias.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.nombre;
        select.appendChild(opt);
      });
    });
    
    AppUtils.updateDatalist('sugerenciasCategoria', AppState.categorias.map(c => c.nombre));
  },

  updateSubcategorySelect() {
    const select = document.getElementById('productoSubcategoria');
    if (!select) return;
    
    select.innerHTML = '<option value="">Subcategoría</option>';
    AppState.subcategorias.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.nombre;
      select.appendChild(opt);
    });
    
    AppUtils.updateDatalist('sugerenciasSubcategoria', AppState.subcategorias.map(s => s.nombre));
  },

  renderCategorias() {
    const filtro = document.getElementById('buscarCategoria')?.value || '';
    const lista = AppUtils.filterList(AppState.categorias, filtro, ['nombre', 'descripcion']);
    const ul = document.getElementById('categoriasLista');
    if (!ul) return;
    
    ul.innerHTML = '';
    lista.forEach(item => {
      const li = document.createElement('li');
      li.className = 'item-card';
      li.innerHTML = `
        <div class="item-header">
          <span class="item-name">${item.nombre}</span>
          <div class="item-actions">
            <button class="edit-btn" title="Editar">✏️</button>
            <button class="delete-btn" title="Eliminar">🗑️</button>
          </div>
        </div>
        ${item.descripcion ? `<div class="item-details">${item.descripcion}</div>` : ''}
      `;
      
      li.querySelector('.edit-btn').addEventListener('click', () => FormController.editCategoria(item));
      li.querySelector('.delete-btn').addEventListener('click', () => this.deleteCategoria(item.id));
      ul.appendChild(li);
    });
  },

  renderSubcategorias() {
    const filtro = document.getElementById('buscarSubcategoria')?.value || '';
    const lista = AppUtils.filterList(AppState.subcategorias, filtro, ['nombre', 'descripcion']);
    const ul = document.getElementById('subcategoriasLista');
    if (!ul) return;
    
    ul.innerHTML = '';
    lista.forEach(item => {
      const cat = AppState.categorias.find(c => c.id === item.categoria_id);
      const li = document.createElement('li');
      li.className = 'item-card';
      li.innerHTML = `
        <div class="item-header">
          <span class="item-name">${item.nombre}</span>
          <div class="item-actions">
            <button class="edit-btn" title="Editar">✏️</button>
            <button class="delete-btn" title="Eliminar">🗑️</button>
          </div>
        </div>
        <div class="item-details">
          ${cat ? `Categoría: ${cat.nombre}` : ''}
          ${item.descripcion ? `<br>${item.descripcion}` : ''}
        </div>
      `;
      
      li.querySelector('.edit-btn').addEventListener('click', () => FormController.editSubcategoria(item));
      li.querySelector('.delete-btn').addEventListener('click', () => this.deleteSubcategoria(item.id));
      ul.appendChild(li);
    });
  },

  renderProductos() {
    const filtro = document.getElementById('buscarProducto')?.value || '';
    const lista = AppUtils.filterList(AppState.productos, filtro, ['nombre', 'descripcion']);
    const ul = document.getElementById('productosLista');
    if (!ul) return;
    
    ul.innerHTML = '';
    lista.forEach(p => {
      const cat = AppState.categorias.find(c => c.id === p.categoria_id);
      const subcat = AppState.subcategorias.find(s => s.id === p.subcategoria_id);
      
      const li = document.createElement('li');
      li.className = `item-card ${p.stock <= 5 ? 'stock-bajo' : ''}`;
      li.innerHTML = `
        <div class="item-header">
          <span class="item-name">${p.nombre}</span>
          <div class="item-actions">
            <button class="edit-btn" title="Editar">✏️</button>
            <button class="delete-btn" title="Eliminar">🗑️</button>
          </div>
        </div>
        <div class="item-details">
          Stock: ${p.stock} | Precio: $${p.precio_compra.toFixed(2)}
          ${cat ? `<br>Categoría: ${cat.nombre}` : ''}
          ${subcat ? ` > ${subcat.nombre}` : ''}
        </div>
      `;
      
      li.querySelector('.edit-btn').addEventListener('click', () => FormController.editProducto(p));
      li.querySelector('.delete-btn').addEventListener('click', () => this.deleteProducto(p.id));
      ul.appendChild(li);
    });
  },

  checkLowStock() {
    const alerta = document.getElementById('alertasStock');
    if (!alerta) return;
    
    const criticos = AppState.productos.filter(p => p.stock <= 5);
    if (criticos.length) {
      alerta.innerHTML = `
        <strong>Stock crítico:</strong> 
        ${criticos.map(p => `${p.nombre} (${p.stock})`).join(', ')}
      `;
    } else {
      alerta.textContent = '';
    }
  },

  async deleteCategoria(id) {
    if (!confirm('¿Eliminar esta categoría y todas sus subcategorías?')) return;
    
    try {
      await AppUtils.fetchAPI(`${AppConfig.API.categorias}?id=${id}`, 'DELETE');
      await this.loadCategorias();
      await this.loadSubcategorias();
      await this.loadProductos();
      AppUtils.showAlert('Categoría eliminada', 'success');
    } catch (error) {
      console.error('Error eliminando categoría:', error);
      AppUtils.showAlert('Error al eliminar categoría');
    }
  },

  async deleteSubcategoria(id) {
    if (!confirm('¿Eliminar esta subcategoría?')) return;
    
    try {
      await AppUtils.fetchAPI(`${AppConfig.API.subcategorias}?id=${id}`, 'DELETE');
      await this.loadSubcategorias();
      await this.loadProductos();
      AppUtils.showAlert('Subcategoría eliminada', 'success');
    } catch (error) {
      console.error('Error eliminando subcategoría:', error);
      AppUtils.showAlert('Error al eliminar subcategoría');
    }
  },

  async deleteProducto(id) {
    if (!confirm('¿Eliminar este producto?')) return;
    
    try {
      await AppUtils.fetchAPI(`${AppConfig.API.productos}?id=${id}`, 'DELETE');
      await this.loadProductos();
      AppUtils.showAlert('Producto eliminado', 'success');
    } catch (error) {
      console.error('Error eliminando producto:', error);
      AppUtils.showAlert('Error al eliminar producto');
    }
  }
};

// Controladores de formularios
const FormController = {
  initForms() {
    this.setupForm(AppConfig.selectors.forms.categoria, this.handleCategoria);
    this.setupForm(AppConfig.selectors.forms.subcategoria, this.handleSubcategoria);
    this.setupForm(AppConfig.selectors.forms.producto, this.handleProducto);
  },

  setupForm(selector, handler) {
    const form = document.querySelector(selector);
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handler.call(this, form);
    });
    
    // Botón cancelar
    const cancelBtn = form.querySelector('.btn-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.resetForm(form));
    }
  },

  async handleCategoria(form) {
    const id = form.querySelector('#categoriaId').value;
    const data = {
      nombre: form.querySelector('#categoriaNombre').value,
      descripcion: form.querySelector('#categoriaDesc').value
    };
    
    try {
      if (id) {
        await AppUtils.fetchAPI(`${AppConfig.API.categorias}?id=${id}`, 'PUT', data);
        AppUtils.showAlert('Categoría actualizada', 'success');
      } else {
        await AppUtils.fetchAPI(AppConfig.API.categorias, 'POST', data);
        AppUtils.showAlert('Categoría creada', 'success');
      }
      
      this.resetForm(form);
      await DataController.loadCategorias();
    } catch (error) {
      console.error('Error guardando categoría:', error);
      AppUtils.showAlert('Error al guardar categoría');
    }
  },

  async handleSubcategoria(form) {
    const id = form.querySelector('#subcategoriaId').value;
    const data = {
      categoria_id: form.querySelector('#subcategoriaCategoria').value,
      nombre: form.querySelector('#subcategoriaNombre').value,
      descripcion: form.querySelector('#subcategoriaDesc').value
    };
    
    try {
      if (id) {
        await AppUtils.fetchAPI(`${AppConfig.API.subcategorias}?id=${id}`, 'PUT', data);
        AppUtils.showAlert('Subcategoría actualizada', 'success');
      } else {
        await AppUtils.fetchAPI(AppConfig.API.subcategorias, 'POST', data);
        AppUtils.showAlert('Subcategoría creada', 'success');
      }
      
      this.resetForm(form);
      await DataController.loadSubcategorias();
    } catch (error) {
      console.error('Error guardando subcategoría:', error);
      AppUtils.showAlert('Error al guardar subcategoría');
    }
  },

  async handleProducto(form) {
    const id = form.querySelector('#productoId').value;
    const data = {
      nombre: form.querySelector('#productoNombre').value,
      descripcion: form.querySelector('#productoDesc').value,
      categoria_id: form.querySelector('#productoCategoria').value,
      subcategoria_id: form.querySelector('#productoSubcategoria').value,
      stock: parseInt(form.querySelector('#productoStock').value || '0'),
      precio_compra: parseFloat(form.querySelector('#productoPrecio').value || '0')
    };
    
    try {
      if (id) {
        await AppUtils.fetchAPI(`${AppConfig.API.productos}?id=${id}`, 'PUT', data);
        AppUtils.showAlert('Producto actualizado', 'success');
      } else {
        await AppUtils.fetchAPI(AppConfig.API.productos, 'POST', data);
        AppUtils.showAlert('Producto creado', 'success');
      }
      
      this.resetForm(form);
      await DataController.loadProductos();
    } catch (error) {
      console.error('Error guardando producto:', error);
      AppUtils.showAlert('Error al guardar producto');
    }
  },

  resetForm(form) {
    form.reset();
    form.querySelector('[type="hidden"]').value = '';
  },

  editCategoria(item) {
    const form = document.querySelector(AppConfig.selectors.forms.categoria);
    if (!form) return;
    
    form.querySelector('#categoriaId').value = item.id;
    form.querySelector('#categoriaNombre').value = item.nombre;
    form.querySelector('#categoriaDesc').value = item.descripcion || '';
    
    // Cambiar a pestaña de categorías
    TabController.switchTab('categorias');
  },

  editSubcategoria(item) {
    const form = document.querySelector(AppConfig.selectors.forms.subcategoria);
    if (!form) return;
    
    form.querySelector('#subcategoriaId').value = item.id;
    form.querySelector('#subcategoriaCategoria').value = item.categoria_id || '';
    form.querySelector('#subcategoriaNombre').value = item.nombre;
    form.querySelector('#subcategoriaDesc').value = item.descripcion || '';
    
    // Cambiar a pestaña de subcategorías
    TabController.switchTab('subcategorias');
  },

  editProducto(item) {
    const form = document.querySelector(AppConfig.selectors.forms.producto);
    if (!form) return;
    
    form.querySelector('#productoId').value = item.id;
    form.querySelector('#productoNombre').value = item.nombre;
    form.querySelector('#productoDesc').value = item.descripcion || '';
    form.querySelector('#productoCategoria').value = item.categoria_id || '';
    form.querySelector('#productoSubcategoria').value = item.subcategoria_id || '';
    form.querySelector('#productoStock').value = item.stock;
    form.querySelector('#productoPrecio').value = item.precio_compra;
    
    // Cambiar a pestaña de productos
    TabController.switchTab('productos');

  }
};

// Controlador de pestañas
const TabController = {
  init() {
    document.querySelectorAll(AppConfig.selectors.tabs).forEach(tab => {
      tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
    });
    
    // Botones "Nuevo"
    document.querySelectorAll(AppConfig.selectors.addButtons).forEach(btn => {
      const panelId = btn.closest('.tab-panel')?.id;
      btn.addEventListener('click', () => {
        this.switchTab(panelId);
        const formSelector = AppConfig.selectors.forms[panelId.slice(0, -1)]; // elimina 's' final
        const form = document.querySelector(formSelector);
        if (form) FormController.resetForm(form);
      });
    });
  },

  switchTab(tabId) {
    if (!tabId || AppState.currentTab === tabId) return;
    
    // Actualizar pestañas
    document.querySelectorAll(AppConfig.selectors.tabs).forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabId);
    });
    
    // Actualizar paneles
    document.querySelectorAll(AppConfig.selectors.panels).forEach(panel => {
      panel.classList.toggle('active', panel.id === tabId);
    });
    
    AppState.currentTab = tabId;
  }
};

// Controlador de exportaciones
const ExportController = {
  init() {
    document.getElementById('exportarExcel')?.addEventListener('click', this.exportExcel);
    document.getElementById('exportarPDF')?.addEventListener('click', this.exportPDF);
  },

  exportExcel() {
    try {
      const header = ['Nombre', 'Categoría', 'Subcategoría', 'Stock', 'Precio', 'Descripción'];
      const data = AppState.productos.map(p => {
        const cat = AppState.categorias.find(c => c.id === p.categoria_id)?.nombre || '';
        const subcat = AppState.subcategorias.find(s => s.id === p.subcategoria_id)?.nombre || '';
        return [p.nombre, cat, subcat, p.stock, p.precio_compra, p.descripcion || ''];
      });
      
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
      XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
      XLSX.writeFile(wb, 'inventario.xlsx');
      AppUtils.showAlert('Exportado a Excel', 'success');
    } catch (error) {
      console.error('Error exportando a Excel:', error);
      AppUtils.showAlert('Error al exportar a Excel');
    }
  },

  exportPDF() {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      
      // Título
      doc.setFontSize(18);
      doc.text('Inventario de Productos', 14, 16);
      
      // Fecha
      doc.setFontSize(10);
      doc.text(`Generado: ${new Date().toLocaleString()}`, 14, 22);
      
      // Tabla
      const headers = ['Nombre', 'Categoría', 'Stock', 'Precio'];
      const data = AppState.productos.map(p => {
        const cat = AppState.categorias.find(c => c.id === p.categoria_id)?.nombre || '';
        return [p.nombre, cat, p.stock, `$${p.precio_compra.toFixed(2)}`];
      });
      
      doc.autoTable({
        head: [headers],
        body: data,
        startY: 28,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [140, 109, 253] } // color primario
      });
      
      doc.save('inventario.pdf');
      AppUtils.showAlert('Exportado a PDF', 'success');
    } catch (error) {
      console.error('Error exportando a PDF:', error);
      AppUtils.showAlert('Error al exportar a PDF');
    }
  }
};


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

// Controlador de búsquedas
const SearchController = {
  init() {
    ['buscarCategoria', 'buscarSubcategoria', 'buscarProducto'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', () => {
        switch(id) {
          case 'buscarCategoria': DataController.renderCategorias(); break;
          case 'buscarSubcategoria': DataController.renderSubcategorias(); break;
          case 'buscarProducto': DataController.renderProductos(); break;
        }
      });
    });
  }
};

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', async () => {
  try {
    TabController.init();
    FormController.initForms();
    ExportController.init();
    SearchController.init();
    
    await DataController.loadCategorias();
    await DataController.loadSubcategorias();
    await DataController.loadProductos();
    
    // Mostrar pestaña de productos por defecto
    TabController.switchTab('productos');
  } catch (error) {
    console.error('Error inicializando la aplicación:', error);
    AppUtils.showAlert('Error al cargar la aplicación');
  }
});

