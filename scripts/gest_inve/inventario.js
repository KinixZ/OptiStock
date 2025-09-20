const AppConfig = {
  API: {
    categorias: '../../scripts/php/guardar_categorias.php',
    subcategorias: '../../scripts/php/guardar_subcategorias.php',
    productos: '../../scripts/php/guardar_productos.php'
  },
  selectors: {
    tabs: '.tab-btn',
    panels: '.tab-panel',
    addButtons: '.btn-add',
    transferButton: '#abrirTransferencia',
    forms: {
      categoria: '#categoriaForm',
      subcategoria: '#subcategoriaForm',
      producto: '#productoForm',
      transferencia: '#transferenciaForm'
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
      this.updateSummary();
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
      this.updateSummary();
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
      TransferController.updateOptions();
      this.updateSummary();
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
          ${p.dim_x ? `<br>Dimensiones: ${p.dim_x}x${p.dim_y}x${p.dim_z}` : ''}
          ${cat ? `<br>Categoría: ${cat.nombre}` : ''}
          ${subcat ? ` > ${subcat.nombre}` : ''}
        </div>
        <div class="item-qr">
          ${p.codigo_qr ? `<img src="../../${p.codigo_qr}" alt="QR ${p.nombre}" class="qr-img"><br><a href="../../${p.codigo_qr}" download>Descargar QR</a>` : ''}
        </div>
      `;
      
      li.querySelector('.edit-btn').addEventListener('click', () => FormController.editProducto(p));
      li.querySelector('.delete-btn').addEventListener('click', () => this.deleteProducto(p.id));
      ul.appendChild(li);
    });
  },

  updateSummary() {
    const totalProductosEl = document.getElementById('resumenProductos');
    const totalProductos = AppState.productos.length;
    if (totalProductosEl) {
      totalProductosEl.textContent = totalProductos;
    }

    const totalProductosTexto = document.getElementById('resumenTotalProductos');
    if (totalProductosTexto) {
      totalProductosTexto.textContent = totalProductos;
    }

    const totalRegistros = document.getElementById('resumenTotalRegistros');
    if (totalRegistros) {
      const etiqueta = totalProductos === 1 ? 'registro' : 'registros';
      totalRegistros.textContent = `${totalProductos} ${etiqueta}`;
    }

    const totalCategoriasEl = document.getElementById('resumenCategorias');
    if (totalCategoriasEl) {
      totalCategoriasEl.textContent = AppState.categorias.length;
    }

    const criticosEl = document.getElementById('resumenCriticos');
    if (criticosEl) {
      const criticos = AppState.productos.filter(p => (Number(p.stock) || 0) <= 5);
      criticosEl.textContent = criticos.length;
    }

    const resumenBody = document.getElementById('resumenInventarioBody');
    const resumenVacio = document.getElementById('resumenInventarioVacio');
    if (resumenBody) {
      resumenBody.innerHTML = '';

      if (!AppState.productos.length) {
        if (resumenVacio) {
          resumenVacio.hidden = false;
        }
        return;
      }

      if (resumenVacio) {
        resumenVacio.hidden = true;
      }

      const categoriasMap = new Map(AppState.categorias.map(c => [c.id, c]));
      const subcategoriasMap = new Map(AppState.subcategorias.map(s => [s.id, s]));

      AppState.productos.forEach(p => {
        const categoriaNombre = p.categoria_nombre || categoriasMap.get(p.categoria_id)?.nombre || '—';
        const subcategoriaNombre = p.subcategoria_nombre || subcategoriasMap.get(p.subcategoria_id)?.nombre || '—';
        const volumen = (Number(p.dim_x) || 0) * (Number(p.dim_y) || 0) * (Number(p.dim_z) || 0);
        const volumenTexto = volumen
          ? volumen.toLocaleString('es-ES', { maximumFractionDigits: 2 })
          : '—';
        const stockTexto = (Number(p.stock) || 0).toLocaleString('es-ES');
        const precioNumero = Number(p.precio_compra) || 0;
        const precioTexto = `$ ${precioNumero.toLocaleString('es-ES', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })}`;
        const descripcion = (p.descripcion || '').trim();
        const descripcionTexto = descripcion
          ? `${descripcion.slice(0, 60)}${descripcion.length > 60 ? '…' : ''}`
          : 'Sin descripción';
        const avatarTexto = (p.nombre || '?')
          .split(' ')
          .map(parte => parte.trim()[0])
          .filter(Boolean)
          .slice(0, 2)
          .join('')
          .toUpperCase() || '?';
        const qrDisabled = p.codigo_qr ? '' : ' disabled aria-disabled="true"';

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>
            <div class="summary-product">
              <span class="summary-avatar">${avatarTexto}</span>
              <div class="summary-product__info">
                <span class="summary-product__name">${p.nombre || 'Sin nombre'}</span>
                <span class="summary-product__meta">${descripcionTexto}</span>
              </div>
            </div>
          </td>
          <td>${p.area_nombre || '—'}</td>
          <td>${p.zona_nombre || '—'}</td>
          <td>${categoriaNombre}</td>
          <td>${subcategoriaNombre}</td>
          <td>${volumenTexto}</td>
          <td>${stockTexto}</td>
          <td>${precioTexto}</td>
          <td>
            <div class="summary-actions">
              <button type="button" class="summary-action-btn summary-action-btn--qr"${qrDisabled}>QR</button>
              <button type="button" class="summary-action-btn summary-action-btn--edit">Editar</button>
              <button type="button" class="summary-action-btn summary-action-btn--delete">Eliminar</button>
            </div>
          </td>
        `;

        const qrBtn = tr.querySelector('.summary-action-btn--qr');
        if (qrBtn && p.codigo_qr) {
          qrBtn.addEventListener('click', () => {
            window.open(`../../${p.codigo_qr}`, '_blank');
          });
        }

        const editBtn = tr.querySelector('.summary-action-btn--edit');
        if (editBtn) {
          editBtn.addEventListener('click', () => FormController.editProducto(p));
        }

        const deleteBtn = tr.querySelector('.summary-action-btn--delete');
        if (deleteBtn) {
          deleteBtn.addEventListener('click', () => this.deleteProducto(p.id));
        }

        resumenBody.appendChild(tr);
      });
    }
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

    const criticosEl = document.getElementById('resumenCriticos');
    if (criticosEl) {
      criticosEl.textContent = criticos.length;
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

// Controlador de transferencias
const TransferController = {
  init() {
    this.modalElement = document.getElementById('transferenciaModal');
    this.form = document.querySelector(AppConfig.selectors.forms.transferencia);
    this.productSelect = document.getElementById('transferenciaProducto');
    this.areaSelect = document.getElementById('transferenciaArea');
    this.zonaSelect = document.getElementById('transferenciaZona');
    this.modal = this.modalElement ? new bootstrap.Modal(this.modalElement) : null;
    this.zonasData = [];

    const transferBtn = document.querySelector(AppConfig.selectors.transferButton);
    if (transferBtn) {
      transferBtn.addEventListener('click', () => this.open());
    }

    if (this.form) {
      this.form.addEventListener('submit', (event) => {
        event.preventDefault();
        this.handleSubmit();
      });
    }

    if (this.areaSelect) {
      this.areaSelect.addEventListener('change', () => this.filterZonas());
    }

    if (this.modalElement) {
      this.modalElement.addEventListener('hidden.bs.modal', () => {
        this.form?.reset();
        this.filterZonas();
      });
    }
  },

  open() {
    this.modal?.show();
  },

  close() {
    this.modal?.hide();
  },

  updateOptions() {
    if (!this.form) return;

    this.updateProductos();
    this.updateAreas();
    this.updateZonas();
    this.filterZonas();
  },

  updateProductos() {
    if (!this.productSelect) return;

    const currentValue = this.productSelect.value;
    this.productSelect.innerHTML = '';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Selecciona un producto';
    placeholder.disabled = true;
    placeholder.selected = true;
    this.productSelect.appendChild(placeholder);

    AppState.productos.forEach((producto) => {
      const option = document.createElement('option');
      option.value = producto.id;
      option.textContent = producto.nombre || `Producto #${producto.id}`;
      this.productSelect.appendChild(option);
    });

    this.productSelect.disabled = AppState.productos.length === 0;

    if (currentValue && this.productSelect.querySelector(`option[value="${currentValue}"]`)) {
      this.productSelect.value = currentValue;
    }
  },

  updateAreas() {
    if (!this.areaSelect) return;

    const currentValue = this.areaSelect.value;
    this.areaSelect.innerHTML = '';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Selecciona un área';
    placeholder.selected = true;
    this.areaSelect.appendChild(placeholder);

    const areasMap = new Map();
    AppState.productos.forEach((producto) => {
      if (producto.area_id && producto.area_nombre) {
        areasMap.set(String(producto.area_id), producto.area_nombre);
      }
    });

    Array.from(areasMap.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .forEach(([id, nombre]) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = nombre;
        this.areaSelect.appendChild(option);
      });

    if (currentValue && this.areaSelect.querySelector(`option[value="${currentValue}"]`)) {
      this.areaSelect.value = currentValue;
    }
  },

  updateZonas() {
    if (!this.zonaSelect) return;

    const currentValue = this.zonaSelect.value;
    this.zonaSelect.innerHTML = '';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Selecciona una zona';
    placeholder.selected = true;
    this.zonaSelect.appendChild(placeholder);

    const zonasMap = new Map();
    AppState.productos.forEach((producto) => {
      if (producto.zona_id && producto.zona_nombre) {
        zonasMap.set(String(producto.zona_id), {
          id: String(producto.zona_id),
          nombre: producto.zona_nombre,
          areaId: producto.area_id ? String(producto.area_id) : ''
        });
      }
    });

    this.zonasData = Array.from(zonasMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));

    this.zonasData.forEach((zona) => {
      const option = document.createElement('option');
      option.value = zona.id;
      option.textContent = zona.nombre;
      if (zona.areaId) {
        option.dataset.areaId = zona.areaId;
      }
      this.zonaSelect.appendChild(option);
    });

    if (currentValue && this.zonaSelect.querySelector(`option[value="${currentValue}"]`)) {
      this.zonaSelect.value = currentValue;
    }
  },

  filterZonas() {
    if (!this.zonaSelect) return;

    const areaId = this.areaSelect?.value || '';
    Array.from(this.zonaSelect.options).forEach((option) => {
      if (!option.value) {
        option.hidden = false;
        option.disabled = false;
        return;
      }

      const optionArea = option.dataset.areaId || '';
      const visible = !areaId || !optionArea || optionArea === areaId;
      option.hidden = !visible;
      option.disabled = !visible;
    });

    if (this.zonaSelect.value) {
      const selected = this.zonaSelect.selectedOptions[0];
      if (selected && (selected.hidden || selected.disabled)) {
        this.zonaSelect.value = '';
      }
    }
  },

  handleSubmit() {
    if (!this.form || !this.productSelect) return;

    const productoId = this.productSelect.value;
    const areaId = this.areaSelect?.value || '';
    const zonaId = this.zonaSelect?.value || '';
    const cantidad = Number(document.getElementById('transferenciaCantidad')?.value || 0);

    if (!productoId) {
      AppUtils.showAlert('Selecciona un producto para transferir');
      return;
    }

    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      AppUtils.showAlert('Ingresa una cantidad válida a transferir');
      return;
    }

    const producto = AppState.productos.find((item) => String(item.id) === productoId);
    if (!producto) {
      AppUtils.showAlert('No se encontró el producto seleccionado');
      return;
    }

    const stockDisponible = Number(producto.stock) || 0;
    if (cantidad > stockDisponible) {
      AppUtils.showAlert('La cantidad supera el stock disponible del producto');
      return;
    }

    const areaNombre = areaId && this.areaSelect
      ? this.areaSelect.options[this.areaSelect.selectedIndex].textContent.trim()
      : '';
    const zonaNombre = zonaId && this.zonaSelect
      ? this.zonaSelect.options[this.zonaSelect.selectedIndex].textContent.trim()
      : '';

    producto.area_id = areaId ? Number(areaId) : null;
    producto.area_nombre = areaNombre || null;
    producto.zona_id = zonaId ? Number(zonaId) : null;
    producto.zona_nombre = zonaNombre || null;

    DataController.updateSummary();
    this.updateAreas();
    this.updateZonas();
    this.close();
    this.form.reset();
    this.filterZonas();

    const destinoPartes = [];
    if (areaNombre) destinoPartes.push(areaNombre);
    if (zonaNombre) destinoPartes.push(zonaNombre);
    const destinoTexto = destinoPartes.length ? destinoPartes.join(' · ') : 'destino sin especificar';

    AppUtils.showAlert(
      `${cantidad} unidad${cantidad === 1 ? '' : 'es'} de ${producto.nombre} ` +
        `se registraron para transferir a ${destinoTexto}.`,
      'success'
    );
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
    const catValue = form.querySelector('#productoCategoria').value;
    const subcatValue = form.querySelector('#productoSubcategoria').value;
    const data = {
      nombre: form.querySelector('#productoNombre').value,
      descripcion: form.querySelector('#productoDesc').value,
      categoria_id: catValue ? parseInt(catValue) : null,
      subcategoria_id: subcatValue ? parseInt(subcatValue) : null,
      dimensiones: `${form.querySelector('#productoDimX').value}x${form.querySelector('#productoDimY').value}x${form.querySelector('#productoDimZ').value}`,
      stock: parseInt(form.querySelector('#productoStock').value || '0'),
      precio_compra: parseFloat(form.querySelector('#productoPrecio').value || '0'),
      dim_x: parseFloat(form.querySelector('#productoDimX').value || '0'),
      dim_y: parseFloat(form.querySelector('#productoDimY').value || '0'),
      dim_z: parseFloat(form.querySelector('#productoDimZ').value || '0')
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
      ModalController.closeProducto();
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
    const dims = (item.dimensiones || '').split('x');
    form.querySelector('#productoDimX').value = dims[0] || '';
    form.querySelector('#productoDimY').value = dims[1] || '';
    form.querySelector('#productoDimZ').value = dims[2] || '';
    form.querySelector('#productoStock').value = item.stock;
    form.querySelector('#productoPrecio').value = item.precio_compra;
    form.querySelector('#productoDimX').value = item.dim_x || '';
    form.querySelector('#productoDimY').value = item.dim_y || '';
    form.querySelector('#productoDimZ').value = item.dim_z || '';

    ModalController.openProducto('Editar producto');
  }
};

// Controlador de modales
const ModalController = {
  productoModal: null,
  productoTitle: null,

  init() {
    const modalElement = document.getElementById('productoModal');
    if (!modalElement || typeof bootstrap === 'undefined') return;

    this.productoModal = new bootstrap.Modal(modalElement);
    this.productoTitle = modalElement.querySelector('.modal-title');

    modalElement.addEventListener('hidden.bs.modal', () => {
      const form = document.querySelector(AppConfig.selectors.forms.producto);
      if (form) FormController.resetForm(form);
      this.setProductoTitle('Nuevo producto');
    });
  },

  setProductoTitle(text) {
    if (this.productoTitle) {
      this.productoTitle.textContent = text;
    }
  },

  openProducto(title = 'Nuevo producto') {
    if (!this.productoModal) return;
    this.setProductoTitle(title);
    this.productoModal.show();
  },

  closeProducto() {
    this.productoModal?.hide();
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
      if (panelId === 'productos') {
        btn.addEventListener('click', () => {
          const form = document.querySelector(AppConfig.selectors.forms.producto);
          if (form) FormController.resetForm(form);
          ModalController.openProducto('Nuevo producto');
        });
        return;
      }

      btn.addEventListener('click', () => {
        this.switchTab(panelId);
        const formSelector = AppConfig.selectors.forms[panelId?.slice(0, -1)]; // elimina 's' final
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
  await DataController.loadCategorias();
  await DataController.loadSubcategorias();
  await DataController.loadProductos();
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
    ModalController.init();
    ExportController.init();
    TransferController.init();
    SearchController.init();

    document.getElementById('recargarResumen')?.addEventListener('click', async () => {
      await DataController.loadCategorias();
      await DataController.loadSubcategorias();
      await DataController.loadProductos();
    });
    
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

