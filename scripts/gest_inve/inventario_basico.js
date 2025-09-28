(() => {
  const API = {
    categorias: '../../scripts/php/guardar_categorias.php',
    subcategorias: '../../scripts/php/guardar_subcategorias.php',
    productos: '../../scripts/php/guardar_productos.php',
    areas:       '../../scripts/php/guardar_areas.php',
    zonas:         '../../scripts/php/guardar_zonas.php',
    movimiento:   '../../scripts/php/guardar_movimientos.php'
  };

  const categorias = [];
  const subcategorias = [];
  const productos = [];
  const areas = [];
  const zonas = [];
  let vistaActual = 'producto';
  let editProdId = null;
  let editCatId = null;
  let editSubcatId = null;

const EMP_ID = parseInt(localStorage.getItem('id_empresa'),10) || 0;


  const btnProductos = document.getElementById('btnProductos');
  const btnCategorias = document.getElementById('btnCategorias');
  const btnSubcategorias = document.getElementById('btnSubcategorias');
  const prodArea = document.getElementById('prodArea');
  const prodZona = document.getElementById('prodZona');

  const productoFormContainer = document.getElementById('productoFormContainer');
  const categoriaFormContainer = document.getElementById('categoriaFormContainer');
  const subcategoriaFormContainer = document.getElementById('subcategoriaFormContainer');

  const tabButtons = {
    producto: btnProductos,
    categoria: btnCategorias,
    subcategoria: btnSubcategorias
  };

  const tabContainers = {
    producto: productoFormContainer,
    categoria: categoriaFormContainer,
    subcategoria: subcategoriaFormContainer
  };

  const resumenProductosEl = document.getElementById('resumenProductos');
  const resumenCategoriasEl = document.getElementById('resumenCategorias');
  const resumenCriticosEl = document.getElementById('resumenCriticos');
  const tablaDescripcionEl = document.getElementById('tablaResumenDescripcion');

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
    const error = new Error(msg);
    error.status = res.status;
    error.payload = payload;
    throw error;
  }

  // OK → devolvemos el objeto parsado
  return payload;
}

  function showToast(message, type = 'info') {
    if (type === 'success' && typeof window.toastOk === 'function') {
      window.toastOk(message);
      return;
    }
    if (type === 'error' && typeof window.toastError === 'function') {
      window.toastError(message);
      return;
    }
    if (typeof window.toastInfo === 'function') {
      window.toastInfo(message);
      return;
    }

    const toast = document.createElement('div');
    toast.className = `toast-message toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  function actualizarIndicadores() {
    if (resumenProductosEl) {
      resumenProductosEl.textContent = productos.length;
    }
    if (resumenCategoriasEl) {
      resumenCategoriasEl.textContent = categorias.length;
    }
    if (resumenCriticosEl) {
      const criticos = productos.filter(p => {
        const stock = parseInt(p.stock, 10) || 0;
        const minimo = parseInt(p.stock_minimo, 10);
        if (Number.isFinite(minimo) && minimo > 0) {
          return stock <= minimo;
        }
        return stock <= 5;
      }).length;
      resumenCriticosEl.textContent = criticos;
    }
  }

  function mostrar(seccion) {
    Object.values(tabContainers).forEach(container => {
      if (container) {
        container.classList.add('d-none');
      }
    });

    Object.values(tabButtons).forEach(button => {
      if (button) {
        button.classList.remove('active');
        button.setAttribute('aria-selected', 'false');
      }
    });

    vistaActual = seccion;
    renderResumen();

    const activeContainer = tabContainers[seccion];
    if (activeContainer) {
      activeContainer.classList.remove('d-none');
    }

    const activeButton = tabButtons[seccion];
    if (activeButton) {
      activeButton.classList.add('active');
      activeButton.setAttribute('aria-selected', 'true');
    }
  }

  btnProductos?.addEventListener('click', () => mostrar('producto'));
  btnCategorias?.addEventListener('click', () => mostrar('categoria'));
  btnSubcategorias?.addEventListener('click', () => mostrar('subcategoria'));

  const prodForm = document.getElementById('productoForm');
  const catForm = document.getElementById('categoriaForm');
  const subcatForm = document.getElementById('subcategoriaForm');
  const prodCategoria = document.getElementById('prodCategoria');
  const prodSubcategoria = document.getElementById('prodSubcategoria');
 // Cada vez que cambie la categoría, repoblamos el select de subcategorías
prodCategoria?.addEventListener('change', () => {
  // parseInt devuelve NaN si está vacío; con || null forzamos null
  const catId = parseInt(prodCategoria.value) || null;
  actualizarSelectSubcategorias(catId);
});

  prodArea?.addEventListener('change', () => {
    if (prodZona) {
      prodZona.value = '';
    }
    actualizarSelectZonas(prodArea?.value || null);
  });
  const subcatCategoria = document.getElementById('subcatCategoria');
  const tablaResumen = document.querySelector('#tablaResumen tbody');
  const tablaHead = document.getElementById('tablaHead');
  const btnRecargarResumen = document.getElementById('btnRecargarResumen');
  const btnScanQR = document.getElementById('btnScanQR');
  const btnIngreso = document.getElementById('btnIngreso');
  const btnEgreso  = document.getElementById('btnEgreso');
  const movimientoModalElement = document.getElementById('movimientoModal');
  const movModal   = movimientoModalElement ? new bootstrap.Modal(movimientoModalElement) : null;
  const movTitle   = document.getElementById('movimientoTitle');
  const movProdSel = document.getElementById('movProdSelect');
  const movCant    = document.getElementById('movCantidad');
  const movGuardar = document.getElementById('movGuardar');
  let movTipo      = '';
  const qrReader   = document.getElementById('qrReader');
  let qrScanner;
  const scanModalElement = document.getElementById('scanModal');
  const scanModal = scanModalElement ? new bootstrap.Modal(scanModalElement) : null;
  const qrHelperText = document.getElementById('qrHelperText');
  const textoAyudaEscaneoBase = 'Coloca el código frente a la cámara para registrar el movimiento y confirma la operación antes de guardarla.';
  const textoAyudaProducto = 'Producto identificado. Selecciona el tipo de movimiento y confirma la cantidad antes de guardar.';
  const scanResult = document.getElementById('scanResult');
  const scanProdName = document.getElementById('scanProductoNombre');
  const scanProdCodigo = document.getElementById('scanProductoCodigo');
  const scanProdStock = document.getElementById('scanProductoStock');
  const scanTipoSelect = document.getElementById('scanMovimientoTipo');
  const scanCantidadInput = document.getElementById('scanMovimientoCantidad');
  const scanCantidadHelp = document.getElementById('scanCantidadAyuda');
  const scanRegistrar = document.getElementById('scanRegistrar');
  const scanReintentar = document.getElementById('scanReintentar');
  let scanProductoActual = null;
  let iniciarEscaneoPendiente = false;
  let scannerActivo = false;
  let preferredCameraId = null;
  let fallbackCameraId = null;
  let avisoCantidadCeroMostrado = false;

  async function detenerScanner() {
    if (!qrScanner || !scannerActivo) {
      return;
    }
    try {
      await qrScanner.stop();
    } catch (error) {
      console.warn('No se pudo detener el escáner', error);
    } finally {
      scannerActivo = false;
    }

    try {
      await qrScanner.clear();
    } catch (error) {
      console.debug('No se pudo limpiar el contenedor del escáner', error);
    }
  }

  const getScannerConfig = () => {
    const readerWidth = qrReader?.offsetWidth || 0;
    const maxBox = Math.min(420, Math.max(readerWidth - 40, 0));
    const size = Math.max(260, maxBox || 320);
    const config = {
      fps: 10,
      qrbox: { width: size, height: size },
      aspectRatio: 1
    };
    if (window.Html5QrcodeSupportedFormats?.QR_CODE) {
      config.formatsToSupport = [window.Html5QrcodeSupportedFormats.QR_CODE];
    }
    return config;
  };

  const obtenerStockNumerico = producto => {
    if (!producto) {
      return 0;
    }
    const raw = producto.stock ?? producto.stock_actual ?? 0;
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  function actualizarUIProductoEscaneado() {
    if (!scanProductoActual) {
      return;
    }
    if (scanProdName) {
      scanProdName.textContent = scanProductoActual.nombre || `Producto #${scanProductoActual.id}`;
    }
    if (scanProdCodigo) {
      scanProdCodigo.textContent = `ID interno: ${scanProductoActual.id}`;
    }
    if (scanProdStock) {
      scanProdStock.textContent = String(obtenerStockNumerico(scanProductoActual));
    }
  }

  function actualizarAyudaCantidad() {
    if (!scanProductoActual) {
      if (scanCantidadHelp) {
        scanCantidadHelp.textContent = 'Escanea un producto para registrar su movimiento.';
      }
      if (scanRegistrar) {
        scanRegistrar.disabled = true;
      }
      return;
    }

    if (!scanTipoSelect || !scanCantidadInput) {
      return;
    }

    const tipo = scanTipoSelect.value === 'egreso' ? 'egreso' : 'ingreso';
    const stockActual = obtenerStockNumerico(scanProductoActual);
    const rawCantidad = scanCantidadInput.value.trim();
    const cantidadActual = rawCantidad === '' ? 1 : parseInt(rawCantidad, 10);

    scanCantidadInput.min = '1';

    if (tipo === 'egreso') {
      if (stockActual <= 0) {
        scanCantidadInput.value = '';
        scanCantidadInput.disabled = true;
        scanCantidadInput.removeAttribute('max');
        if (scanCantidadHelp) {
          scanCantidadHelp.textContent = 'No hay unidades disponibles para registrar un egreso.';
        }
        if (scanRegistrar) {
          scanRegistrar.disabled = true;
        }
        return;
      }

      scanCantidadInput.disabled = false;
      scanCantidadInput.max = String(stockActual);
      if (rawCantidad !== '' && Number.isFinite(cantidadActual) && cantidadActual > stockActual) {
        scanCantidadInput.value = String(stockActual);
      }
      if (scanCantidadHelp) {
        const plural = stockActual === 1 ? '' : 'es';
        scanCantidadHelp.textContent = `Puedes retirar hasta ${stockActual} unidad${plural}.`;
      }
      if (scanRegistrar) {
        scanRegistrar.disabled = false;
      }
      return;
    }

    scanCantidadInput.disabled = false;
    scanCantidadInput.removeAttribute('max');
    if (scanCantidadHelp) {
      scanCantidadHelp.textContent = 'Las unidades ingresadas se sumarán al stock actual.';
    }
    if (scanRegistrar) {
      scanRegistrar.disabled = false;
    }
  }

  function prepararEscaneoUI() {
    scanProductoActual = null;
    scanResult?.classList.add('d-none');
    qrReader?.classList.remove('d-none');
    if (qrHelperText) {
      qrHelperText.textContent = textoAyudaEscaneoBase;
    }
    if (scanProdName) {
      scanProdName.textContent = 'Producto seleccionado';
    }
    if (scanProdCodigo) {
      scanProdCodigo.textContent = 'ID interno:';
    }
    if (scanProdStock) {
      scanProdStock.textContent = '0';
    }
    if (scanTipoSelect) {
      scanTipoSelect.value = 'ingreso';
      scanTipoSelect.disabled = true;
    }
    if (scanCantidadInput) {
      scanCantidadInput.value = '';
      scanCantidadInput.disabled = true;
      scanCantidadInput.removeAttribute('max');
    }
    avisoCantidadCeroMostrado = false;
    if (scanCantidadHelp) {
      scanCantidadHelp.textContent = 'Escanea un producto para registrar su movimiento.';
    }
    if (scanRegistrar) {
      scanRegistrar.disabled = true;
    }
  }

  function mostrarProductoEscaneado(producto) {
    if (!producto) {
      return;
    }
    scanProductoActual = producto;
    qrReader?.classList.add('d-none');
    scanResult?.classList.remove('d-none');
    if (qrHelperText) {
      qrHelperText.textContent = textoAyudaProducto;
    }
    if (scanTipoSelect) {
      scanTipoSelect.disabled = false;
      scanTipoSelect.value = 'ingreso';
    }
    if (scanCantidadInput) {
      scanCantidadInput.disabled = false;
      scanCantidadInput.value = '';
      scanCantidadInput.min = '1';
      scanCantidadInput.removeAttribute('max');
    }
    avisoCantidadCeroMostrado = false;
    if (scanRegistrar) {
      scanRegistrar.disabled = false;
    }
    actualizarUIProductoEscaneado();
    actualizarAyudaCantidad();
  }

  async function iniciarScanner() {
    if (!scanModalElement?.classList.contains('show')) {
      iniciarEscaneoPendiente = true;
      return;
    }
    if (scannerActivo) {
      return;
    }
    if (!qrReader) {
      showToast('No se encontró el lector QR en la interfaz', 'error');
      return;
    }

    if (!qrScanner) {
      qrScanner = new Html5Qrcode('qrReader');
    }

    const config = getScannerConfig();

    const startWithCamera = async cameraId => {
      if (!cameraId) {
        await qrScanner.start({ facingMode: { ideal: 'environment' } }, config, procesarLectura, handleScanError);
        return;
      }
      await qrScanner.start({ deviceId: { exact: cameraId } }, config, procesarLectura, handleScanError);
    };

    try {
      await startWithCamera(preferredCameraId);
      scannerActivo = true;
      iniciarEscaneoPendiente = false;
    } catch (error) {
      console.warn('No se pudo iniciar la cámara preferida, intentando alternativa.', error);
      if (fallbackCameraId && fallbackCameraId !== preferredCameraId) {
        try {
          await startWithCamera(fallbackCameraId);
          scannerActivo = true;
          iniciarEscaneoPendiente = false;
          return;
        } catch (fallbackError) {
          console.error('No se pudo iniciar la cámara alternativa', fallbackError);
        }
      }

      qrReader?.classList.add('d-none');
      scanModal?.hide();
      showToast('Error al iniciar la cámara', 'error');
    }
  }

  let lastScanError = '';
  const handleScanError = errorMessage => {
    if (typeof errorMessage !== 'string') {
      return;
    }
    if (errorMessage === lastScanError) {
      return;
    }
    lastScanError = errorMessage;
    console.debug('Scanner detectó un error/ruido', errorMessage);
  };

  async function procesarLectura(decodedText) {
    await detenerScanner();

    const productoId = parseInt(String(decodedText).trim(), 10);
    if (!Number.isFinite(productoId)) {
      showToast('Código QR no reconocido', 'error');
      prepararEscaneoUI();
      try {
        await iniciarScanner();
      } catch (reinicioError) {
        console.warn('No se pudo reiniciar el escáner tras un código inválido', reinicioError);
      }
      return;
    }

    let producto = productos.find(p => parseInt(p.id, 10) === productoId);

    if (!producto) {
      try {
        const remoto = await fetchAPI(`${API.productos}?empresa_id=${EMP_ID}&id=${productoId}`);
        if (remoto && remoto.id) {
          producto = remoto;
        }
      } catch (consultaError) {
        console.warn('No se pudo consultar el producto escaneado', consultaError);
      }
    }

    if (!producto) {
      showToast('El producto escaneado no se encuentra en el inventario.', 'error');
      prepararEscaneoUI();
      try {
        await iniciarScanner();
      } catch (reinicioError) {
        console.warn('No se pudo reiniciar el escáner tras un producto desconocido', reinicioError);
      }
      return;
    }
    mostrarProductoEscaneado(producto);
  }

  scanModalElement?.addEventListener('hidden.bs.modal', async () => {
    await detenerScanner();
    iniciarEscaneoPendiente = false;
    prepararEscaneoUI();
  });

  scanTipoSelect?.addEventListener('change', () => {
    actualizarAyudaCantidad();
  });

  scanCantidadInput?.addEventListener('input', () => {
    if (!scanCantidadInput) {
      return;
    }

    const raw = scanCantidadInput.value.trim();

    if (raw === '') {
      avisoCantidadCeroMostrado = false;
      actualizarAyudaCantidad();
      return;
    }

    let value = parseInt(raw, 10);

    if (!Number.isFinite(value)) {
      scanCantidadInput.value = '';
      actualizarAyudaCantidad();
      return;
    }

    if (value === 0) {
      if (!avisoCantidadCeroMostrado) {
        showToast('No se puede poner 0 a secas.', 'error');
        avisoCantidadCeroMostrado = true;
      }
      scanCantidadInput.value = '';
      actualizarAyudaCantidad();
      return;
    }

    avisoCantidadCeroMostrado = false;

    if (value < 0) {
      scanCantidadInput.value = '';
      actualizarAyudaCantidad();
      return;
    }

    if (scanProductoActual && scanTipoSelect?.value === 'egreso') {
      const stockActual = obtenerStockNumerico(scanProductoActual);
      if (stockActual > 0 && value > stockActual) {
        value = stockActual;
      }
    }
    scanCantidadInput.value = String(value);
    actualizarAyudaCantidad();
  });

  scanReintentar?.addEventListener('click', async () => {
    await detenerScanner();
    prepararEscaneoUI();
    try {
      await iniciarScanner();
    } catch (error) {
      console.warn('No se pudo reiniciar el escáner manualmente', error);
    }
  });

  scanRegistrar?.addEventListener('click', async () => {
    if (!scanProductoActual) {
      showToast('Escanea un producto antes de registrar el movimiento.', 'error');
      return;
    }

    const prodId = parseInt(scanProductoActual.id, 10);
    if (!Number.isFinite(prodId)) {
      showToast('El identificador del producto es inválido.', 'error');
      return;
    }

    const tipo = scanTipoSelect?.value === 'egreso' ? 'egreso' : 'ingreso';
    const rawCantidad = scanCantidadInput?.value?.trim() ?? '';
    const cantidad = rawCantidad === '' ? 1 : parseInt(rawCantidad, 10);

    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      showToast('La cantidad debe ser mayor a cero.', 'error');
      if (scanCantidadInput) {
        scanCantidadInput.value = '';
      }
      actualizarAyudaCantidad();
      return;
    }

    const stockActual = obtenerStockNumerico(scanProductoActual);

    if (tipo === 'egreso') {
      if (stockActual <= 0) {
        showToast('No hay unidades disponibles para egresar.', 'error');
        actualizarAyudaCantidad();
        return;
      }
      if (cantidad > stockActual) {
        showToast('La cantidad no puede exceder el stock disponible.', 'error');
        if (scanCantidadInput) {
          scanCantidadInput.value = String(stockActual);
        }
        actualizarAyudaCantidad();
        return;
      }
    }

    try {
      if (scanRegistrar) {
        scanRegistrar.disabled = true;
      }

      const movimientoPayload = {
        empresa_id: EMP_ID,
        producto_id: prodId,
        tipo,
        cantidad
      };
      const resultado = await fetchAPI(API.movimiento, 'POST', movimientoPayload);
      if (resultado?.success !== true) {
        throw new Error(resultado?.error || 'No se pudo registrar el movimiento');
      }

      const nuevoStock = (() => {
        const remoto = parseInt(resultado.stock_actual, 10);
        if (Number.isFinite(remoto)) {
          return remoto;
        }
        return tipo === 'ingreso' ? stockActual + cantidad : stockActual - cantidad;
      })();

      scanProductoActual.stock = nuevoStock;

      if (scanCantidadInput) {
        scanCantidadInput.value = '';
      }
      if (qrHelperText) {
        qrHelperText.textContent = 'Movimiento registrado. Puedes escanear otro código o ajustar el mismo producto.';
      }

      await cargarProductos();
      renderResumen();

      const productoActualizado = productos.find(p => parseInt(p.id, 10) === prodId);
      if (productoActualizado) {
        scanProductoActual = productoActualizado;
      }

      actualizarUIProductoEscaneado();
      actualizarAyudaCantidad();

      document.dispatchEvent(new CustomEvent('movimientoRegistrado', {
        detail: {
          productoId: prodId,
          tipo,
          cantidad,
          stockActual: nuevoStock
        }
      }));

      showToast(`Movimiento ${tipo} registrado`, 'success');
    } catch (error) {
      console.error(error);
      showToast('Error al registrar movimiento: ' + (error?.message || 'desconocido'), 'error');
    } finally {
      if (scanRegistrar) {
        scanRegistrar.disabled = false;
      }
      actualizarAyudaCantidad();
    }
  });

function poblarSelectProductos() {
  if (!movProdSel) return;
  movProdSel.innerHTML = '<option value="">Seleccione producto</option>';
  productos.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.nombre} (Stock: ${p.stock})`;
    movProdSel.appendChild(opt);
  });
}

btnScanQR?.addEventListener('click', async () => {
  if (!navigator.mediaDevices || !window.isSecureContext) {
    showToast('La cámara no es compatible o se requiere HTTPS/localhost', 'error');
    return;
  }

  if (!scanModal) {
    showToast('No se pudo abrir el escáner QR', 'error');
    return;
  }

  let testStream;
  try {
    testStream = await navigator.mediaDevices.getUserMedia({ video: true });
  } catch (error) {
    console.error('No se pudo obtener permiso para la cámara', error);
    showToast('Permiso de cámara denegado o no disponible', 'error');
    return;
  } finally {
    if (testStream) {
      testStream.getTracks().forEach(track => track.stop());
    }
  }

  let cameras = [];
  try {
    cameras = await Html5Qrcode.getCameras();
  } catch (error) {
    console.warn('No se pudieron enumerar las cámaras disponibles', error);
    cameras = [];
  }

  if (Array.isArray(cameras) && cameras.length > 0) {
    const backRegex = /(back|rear|environment)/i;
    const backCamera = cameras.find(cam => backRegex.test(cam.label));
    preferredCameraId = (backCamera || cameras[0]).id;
    const secondaryCamera = cameras.find(cam => cam.id !== preferredCameraId);
    fallbackCameraId = secondaryCamera ? secondaryCamera.id : null;
  } else {
    preferredCameraId = null;
    fallbackCameraId = null;
  }

  iniciarEscaneoPendiente = true;
  qrReader?.classList.remove('d-none');
  scanModal.show();
});

scanModalElement?.addEventListener('shown.bs.modal', async () => {
  prepararEscaneoUI();
  iniciarEscaneoPendiente = false;
  try {
    await iniciarScanner();
  } catch (error) {
    console.warn('No se pudo iniciar el escáner al abrir el modal', error);
  }
});

 btnIngreso?.addEventListener('click', () => {
    if (!movModal || !movTitle || !movCant) {
      console.warn('Modal de movimientos no disponible.');
      return;
    }
    movTipo = 'ingreso';
    movTitle.textContent = 'Registrar Ingreso';
    poblarSelectProductos();
    if (movCant) movCant.value = '';
    movModal.show();
  });
  btnEgreso?.addEventListener('click', () => {
    if (!movModal || !movTitle || !movCant) {
      console.warn('Modal de movimientos no disponible.');
      return;
    }
    movTipo = 'egreso';
    movTitle.textContent = 'Registrar Egreso';
    poblarSelectProductos();
    if (movCant) movCant.value = '';
    movModal.show();
  });





  function actualizarSelectCategorias() {
    [prodCategoria, subcatCategoria].forEach(select => {
      if (!select) return;
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
  if (!prodSubcategoria) return;
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

function actualizarSelectAreas(areaId = null, zonaId = null) {
  if (!prodArea) return;

  const previousValue = areaId !== null ? String(areaId) : prodArea.value;
  prodArea.innerHTML = '<option value="">Selecciona un área</option>';

  areas.forEach(area => {
    const opt = document.createElement('option');
    opt.value = area.id;
    opt.textContent = area.nombre;
    prodArea.appendChild(opt);
  });

  if (previousValue && areas.some(area => String(area.id) === previousValue)) {
    prodArea.value = previousValue;
  } else {
    prodArea.value = '';
  }

  const zonaObjetivo = zonaId === null ? '' : zonaId;
  actualizarSelectZonas(prodArea.value || null, zonaObjetivo);
}

function actualizarSelectZonas(areaId = null, zonaId = undefined) {
  if (!prodZona) return;

  const targetAreaValue = areaId !== null ? areaId : prodArea?.value || '';
  const targetAreaId = targetAreaValue ? parseInt(targetAreaValue, 10) : null;
  const hasExplicitZona = zonaId !== undefined;
  const previousZona = hasExplicitZona ? String(zonaId ?? '') : prodZona.value;

  prodZona.innerHTML = '';

  const placeholder = document.createElement('option');
  placeholder.value = '';

  const zonasFiltradas = targetAreaId
    ? zonas.filter(zona => parseInt(zona.area_id, 10) === targetAreaId)
    : [];
  const hasArea = Boolean(targetAreaId);
  const hasZonas = zonasFiltradas.length > 0;

  placeholder.textContent = hasArea
    ? (hasZonas ? 'Selecciona una zona' : 'No hay zonas registradas para esta área')
    : 'Selecciona un área para ver zonas';
  placeholder.selected = true;
  placeholder.disabled = hasArea && hasZonas;
  prodZona.appendChild(placeholder);

  prodZona.disabled = !hasArea || !hasZonas;

  zonasFiltradas.forEach(z => {
    const opt = document.createElement('option');
    opt.value = z.id;
    opt.textContent = `${z.nombre} (${z.tipo_almacenamiento || '—'})`;
    prodZona.appendChild(opt);
  });

  if (previousZona && zonasFiltradas.some(z => String(z.id) === previousZona)) {
    prodZona.value = previousZona;
  } else {
    prodZona.value = '';
  }
}

  async function cargarCategorias() {
    categorias.length = 0;
    const datos = await fetchAPI(
      `${API.categorias}?empresa_id=${EMP_ID}`
    );
    datos.forEach(c => categorias.push(c));
    actualizarSelectCategorias();
    actualizarIndicadores();
  }

  async function cargarSubcategorias() {
    subcategorias.length = 0;
    const datos = await fetchAPI(
      `${API.subcategorias}?empresa_id=${EMP_ID}`
    );
    datos.forEach(s => subcategorias.push(s));
    // Al iniciar, ninguna categoría está elegida → sólo placeholder
    actualizarSelectSubcategorias(null);
    actualizarIndicadores();
  }

  async function cargarAreas() {
    areas.length = 0;
    const datos = await fetchAPI(`${API.areas}?empresa_id=${EMP_ID}`);
    datos.forEach(a => areas.push(a));
    actualizarSelectAreas();
  }

async function cargarZonas() {
   zonas.length = 0;
  const datos = await fetchAPI(`${API.zonas}?empresa_id=${EMP_ID}`);
   datos.forEach(z => zonas.push(z));
  actualizarSelectZonas();
 }

movGuardar?.addEventListener('click', async () => {
  if (!movProdSel || !movCant) {
    console.warn('Formulario de movimiento incompleto.');
    return;
  }
  const prodId = parseInt(movProdSel.value, 10);
  const qty    = parseInt(movCant.value, 10);
  if (!prodId || qty <= 0) {
    showToast('Selecciona un producto y una cantidad válida', 'error');
    return;
  }
  // POST a nuevo endpoint
  try {
    const movimientoPayload = {
      empresa_id: EMP_ID,
      producto_id: prodId,
      cantidad: qty,
      tipo: movTipo
    };

    const resultado = await fetchAPI(
      API.movimiento,
      'POST',
      movimientoPayload
    );

    if (resultado?.success !== true) {
      throw new Error(resultado?.error || 'No se pudo registrar el movimiento');
    }

    movModal?.hide();
    await cargarProductos();
    renderResumen();
    showToast(`Movimiento ${movTipo} registrado`, 'success');
    document.dispatchEvent(new CustomEvent('movimientoRegistrado', {
      detail: {
        productoId: prodId,
        tipo: movimientoPayload.tipo,
        cantidad: movimientoPayload.cantidad,
        stockActual: resultado.stock_actual ?? null
      }
    }));
  } catch (err) {
    console.error(err);
    showToast('Error al registrar movimiento: ' + err.message, 'error');
  }
});

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
      p.volumen = volumen > 0 ? volumen.toFixed(2) + ' cm³' : '';
      productos.push(p);
    });
    actualizarIndicadores();
  }

  function renderResumen() {
    if (!tablaResumen || !tablaHead) {
      console.warn('Tabla de resumen no disponible en la vista actual.');
      return;
    }
    tablaResumen.innerHTML = '';
    tablaHead.innerHTML = '';

    if (tablaDescripcionEl) {
      if (vistaActual === 'producto') {
        const count = productos.length;
        tablaDescripcionEl.textContent = count
          ? `${count} producto${count === 1 ? '' : 's'} registrados`
          : 'Sin productos disponibles';
      } else if (vistaActual === 'categoria') {
        const count = categorias.length;
        tablaDescripcionEl.textContent = count
          ? `${count} categoría${count === 1 ? '' : 's'} disponibles`
          : 'Sin categorías registradas';
      } else {
        const count = subcategorias.length;
        tablaDescripcionEl.textContent = count
          ? `${count} subcategoría${count === 1 ? '' : 's'} registradas`
          : 'Sin subcategorías registradas';
      }
    }

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
        <button class="btn btn-sm btn-secondary me-1" data-accion="qr" data-tipo="producto" data-id="${p.id}">QR</button>
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

    actualizarIndicadores();
  }

catForm?.addEventListener('submit', async e => {
  e.preventDefault();
  // 1) Leer campos
  const nombre = document.getElementById('catNombre').value.trim();
  const descripcion = document.getElementById('catDescripcion').value.trim();
  if (!nombre) {
    showToast('El nombre es obligatorio', 'error');
    return;
  }

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
      showToast('Categoría editada correctamente', 'success');
    } else {
      await fetchAPI(
        `${API.categorias}?empresa_id=${EMP_ID}`,
        'POST',
        payload
      );
      showToast('Categoría guardada correctamente', 'success');
    }

    // 4) Reset y recarga
    catForm.reset();
    await cargarCategorias();

  } catch (err) {
    console.error(err);
    showToast('Error guardando categoría: ' + err.message, 'error');
  }
});


subcatForm?.addEventListener('submit', async e => {
  e.preventDefault();
  // 1) Leer campos
  const categoria_id = parseInt(document.getElementById('subcatCategoria').value, 10) || null;
  const nombre = document.getElementById('subcatNombre').value.trim();
  const descripcion = document.getElementById('subcatDescripcion').value.trim();
  if (!categoria_id) {
    showToast('Selecciona una categoría', 'error');
    return;
  }
  if (!nombre) {
    showToast('El nombre es obligatorio', 'error');
    return;
  }
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
      showToast('Subcategoría editada correctamente', 'success');
    } else {
      await fetchAPI(
        `${API.subcategorias}?empresa_id=${EMP_ID}`,
        'POST',
        payload
      );
      showToast('Subcategoría guardada correctamente', 'success');
    }

    // 4) Reset y recarga
    subcatForm.reset();
    await cargarSubcategorias();

  } catch (err) {
    console.error(err);
    showToast('Error guardando subcategoría: ' + err.message, 'error');
  }
});


prodForm?.addEventListener('submit', async e => {
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
      showToast('El nombre es obligatorio', 'error');
      return;
    }
    if (!categoria_id) {
      showToast('Selecciona una categoría', 'error');
      return;
    }

    const area_id = prodArea ? (parseInt(prodArea.value, 10) || null) : null;
    const zona_id = prodZona ? (parseInt(prodZona.value, 10) || null) : null;
    const data = {
      nombre,
      descripcion,
      categoria_id,
      subcategoria_id,
      area_id,
      zona_id,
      stock,
      precio_compra,
      dim_x,
      dim_y,
      dim_z
    };

    try {
      // 2) POST o PUT
      const base = API.productos;
if (editProdId) {
  await fetchAPI(
    `${base}?id=${editProdId}&empresa_id=${EMP_ID}`,
    'PUT',
    {...data, empresa_id: EMP_ID}
  );
  showToast('Producto editado correctamente', 'success');
  editProdId = null;
} else {
  // POST con filtro por empresa
    await fetchAPI(
    `${base}?empresa_id=${EMP_ID}`,
    'POST',
    {...data, empresa_id: EMP_ID}
  );
  showToast('Producto guardado correctamente', 'success');
}

      // 3) Reset y recarga de datos
      prodForm.reset();
      actualizarSelectAreas();
      await cargarProductos();
      await cargarAreas();
      await cargarZonas();
      renderResumen();

    } catch (err) {
      console.error(err);
      showToast('Error al guardar producto: ' + err.message, 'error');
    }
  });

  prodForm?.addEventListener('reset', () => {
    editProdId = null;
    setTimeout(() => {
      actualizarSelectAreas();
    }, 0);
  });

  tablaResumen?.addEventListener('click', async e => {
  const target = e.target instanceof HTMLElement ? e.target : null;
  if (!target) return;
  const id     = parseInt(target.dataset.id, 10);
  const tipo   = target.dataset.tipo;
  const accion = target.dataset.accion;
  if (!accion) return;

  if (accion === 'qr' && tipo === 'producto') {
    window.open(`../../scripts/php/generar_qr_producto.php?producto_id=${id}`, '_blank');
    return;
  }

  // 1) Eliminar
  if (accion === 'del') {
    // --- BORRAR PRODUCTO CON CONFIRMACIÓN ---
    if (tipo === 'producto') {
      // 1) Encuentra el producto para mostrar su nombre en el diálogo
      const prod = productos.find(p => p.id === id);
      const nombre = prod ? prod.nombre : 'este producto';
      // 2) Pregunta al usuario
      const ok = window.confirm(`¿Estás seguro de que quieres eliminar "${nombre}"? Esta acción no se puede deshacer.`);
      if (!ok) return; // si cancela, no hacemos nada

      // 3) Intentamos borrar y manejamos el caso de movimientos asociados
      let resultadoEliminacion = null;
      try {
        resultadoEliminacion = await fetchAPI(
          `${API.productos}?id=${id}&empresa_id=${EMP_ID}`,
          'DELETE'
        );
      } catch (err) {
        if (err.status === 409 && err.payload?.movimientos) {
          const movimientos = parseInt(err.payload.movimientos, 10) || 0;
          const confirmar = window.confirm(
            `El producto tiene ${movimientos} movimiento(s) registrado(s).\n` +
            'Si continúas, también se eliminarán esos movimientos históricos.\n' +
            '¿Deseas continuar y borrar todo?'
          );
          if (!confirmar) {
            showToast('El producto no se eliminó.', 'info');
            return;
          }
          try {
            resultadoEliminacion = await fetchAPI(
              `${API.productos}?id=${id}&empresa_id=${EMP_ID}&force=1`,
              'DELETE'
            );
          } catch (forceErr) {
            console.error('Error eliminando producto con movimientos:', forceErr);
            showToast(`No se pudo eliminar el producto: ${forceErr.message}`, 'error');
            return;
          }
        } else {
          console.error('Error eliminando producto:', err);
          showToast(`No se pudo eliminar el producto: ${err.message}`, 'error');
          return;
        }
      }

      await cargarProductos();
      renderResumen();

      const movimientosEliminados = resultadoEliminacion?.movimientos_eliminados || 0;
      let mensaje = 'Producto eliminado correctamente';
      if (movimientosEliminados > 0) {
        mensaje += ` junto con ${movimientosEliminados} movimiento(s) asociado(s).`;
      } else {
        mensaje += '.';
      }
      showToast(mensaje, 'success');

  // --- BORRAR CATEGORÍA + OPCIONES EN CASCADA ---
  } else if (tipo === 'categoria') {
    // 1) Subcategorías de esta categoría
    const subs = subcategorias.filter(sc => sc.categoria_id === id);
    let eliminarSubs = true;
    if (subs.length) {
      eliminarSubs = confirm(
        `Esta categoría tiene ${subs.length} subcategoría(s).\n¿Quieres eliminar también las subcategorías relacionadas?`
      );
    }
    if (eliminarSubs) {
      for (const sc of subs) {
        // 2) Productos de cada subcategoría
        const prods = productos.filter(p => p.subcategoria_id === sc.id);
        let eliminarProds = true;
        if (prods.length) {
          eliminarProds = confirm(
            `La subcategoría "${sc.nombre}" tiene ${prods.length} producto(s).\n¿Eliminar también los productos asociados?`
          );
        }
        if (eliminarProds) {
          for (const p of prods) {
            await fetchAPI(
              `${API.productos}?id=${p.id}&empresa_id=${EMP_ID}`,
              'DELETE'
            );
          }
        }
        // 3) Borrar la subcategoría
        await fetchAPI(
          `${API.subcategorias}?id=${sc.id}&empresa_id=${EMP_ID}`,
          'DELETE'
        );
      }
    }
    // 4) Borrar finalmente la categoría
    await fetchAPI(
      `${API.categorias}?id=${id}&empresa_id=${EMP_ID}`,
      'DELETE'
    );
    await cargarCategorias();
    await cargarSubcategorias();
    await cargarProductos();

  // --- BORRAR SUBCATEGORÍA + OPCIÓN DE BORRAR PRODUCTOS ---
  } else if (tipo === 'subcategoria') {
    const prods = productos.filter(p => p.subcategoria_id === id);
    let eliminarProds = true;
    if (prods.length) {
      eliminarProds = confirm(
        `Esta subcategoría tiene ${prods.length} producto(s).\n¿Eliminar también los productos asociados?`
      );
    }
    if (eliminarProds) {
      for (const p of prods) {
        await fetchAPI(
          `${API.productos}?id=${p.id}&empresa_id=${EMP_ID}`,
          'DELETE'
        );
      }
    }
    await fetchAPI(
      `${API.subcategorias}?id=${id}&empresa_id=${EMP_ID}`,
      'DELETE'
    );
    await cargarSubcategorias();
    await cargarProductos();
  }

  // Siempre refrescamos la vista
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
    const areaId = p.area_id ? parseInt(p.area_id, 10) : null;
    const zonaId = p.zona_id ? parseInt(p.zona_id, 10) : null;
    actualizarSelectAreas(areaId, zonaId);
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
    await cargarAreas();
    await cargarProductos();
    await cargarZonas();
    renderResumen();
    showToast('Resumen recargado', 'info');
  });

  (async function init() {
    await cargarCategorias();
    await cargarSubcategorias();
    await cargarAreas();
    await cargarZonas();
    await cargarProductos();
    renderResumen();
  })();
})();
