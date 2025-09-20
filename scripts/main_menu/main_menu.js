// Toggle sidebar collapse/expand
const body = document.body;
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.querySelector('.sidebar');
const accessLogsList = document.getElementById('accessLogsList');
const highRotationList = document.getElementById('highRotationList');
const zoneCapacityList = document.getElementById('zoneCapacityList');
const alertSettingsBtn = document.getElementById('alertSettingsBtn');
const alertModal = document.getElementById('alertModal');
const alertMovCriticos = document.getElementById('alertMovCriticos');
const alertFallosInventario = document.getElementById('alertFallosInventario');
const saveAlertSettings = document.getElementById('saveAlertSettings');
const cancelAlertSettings = document.getElementById('cancelAlertSettings');
const topbarSearchInput = document.querySelector('.topbar .search-bar input');
const topbarSearchIcon = document.querySelector('.topbar .search-bar i');

let navegadorTimeZone = null;

try {
    const resolved = new Intl.DateTimeFormat().resolvedOptions();
    if (resolved && resolved.timeZone) {
        navegadorTimeZone = resolved.timeZone;
    }
} catch (error) {
    console.warn('No se pudo obtener la zona horaria del navegador.', error);
}

const DASHBOARD_STORAGE_KEY = 'optistockDashboardState';

const defaultDashboardState = {
    products: [
        { id: 'p-001', nombre: 'Baterías AA', stock: 5, minimo: 8, area: 'Almacén Central', zona: 'Zona A1' },
        { id: 'p-002', nombre: 'Mouse Inalámbrico', stock: 3, minimo: 6, area: 'Almacén Central', zona: 'Zona B2' },
        { id: 'p-003', nombre: 'Teclados', stock: 2, minimo: 5, area: 'Sucursal Norte', zona: 'Zona C3' },
        { id: 'p-004', nombre: 'Monitor 24"', stock: 1, minimo: 4, area: 'Depósito Externo', zona: 'Zona D4' }
    ],
    activity: [
        {
            id: 'mov-01',
            tipo: 'entrada',
            productoId: 'p-001',
            producto: 'Baterías AA',
            unidades: 50,
            area: 'Almacén Central',
            zona: 'Zona A1',
            descripcion: 'Ingreso de 50 unidades de Baterías AA',
            timestamp: Date.now() - 15 * 60 * 1000
        },
        {
            id: 'mov-02',
            tipo: 'salida',
            productoId: 'p-003',
            producto: 'Teclados',
            unidades: 2,
            area: 'Sucursal Norte',
            zona: 'Zona C3',
            descripcion: 'Egreso de 2 unidades de Teclados',
            timestamp: Date.now() - 60 * 60 * 1000
        },
        {
            id: 'mov-03',
            tipo: 'transferencia',
            productoId: 'p-004',
            producto: 'Monitor 24"',
            unidades: 10,
            area: 'Depósito Externo',
            zona: 'Zona D4',
            descripcion: 'Transferencia de 10 Monitores a Zona D4',
            timestamp: Date.now() - 3 * 60 * 60 * 1000
        },
        {
            id: 'mov-04',
            tipo: 'entrada',
            productoId: 'p-002',
            producto: 'Mouse Inalámbrico',
            unidades: 25,
            area: 'Almacén Central',
            zona: 'Zona B2',
            descripcion: 'Ingreso de 25 Mouse Inalámbricos',
            timestamp: Date.now() - 5 * 60 * 60 * 1000
        }
    ]
};

function normalizeDashboardState(state) {
    const clone = { products: [], activity: [] };
    if (state && Array.isArray(state.products)) {
        state.products.forEach(item => {
            if (!item || !item.id) return;
            const producto = {
                id: String(item.id),
                nombre: item.nombre || 'Producto sin nombre',
                stock: Number.isFinite(item.stock) ? item.stock : 0,
                minimo: Number.isFinite(item.minimo) ? item.minimo : 0,
                area: item.area || '',
                zona: item.zona || ''
            };
            clone.products.push(producto);
        });
    }

    if (state && Array.isArray(state.activity)) {
        state.activity.forEach(item => {
            if (!item || !item.id) return;
            clone.activity.push({
                id: String(item.id),
                tipo: item.tipo === 'salida' ? 'salida' : item.tipo === 'transferencia' ? 'transferencia' : 'entrada',
                productoId: String(item.productoId || ''),
                producto: item.producto || 'Producto',
                unidades: Number.isFinite(item.unidades) ? item.unidades : 0,
                area: item.area || '',
                zona: item.zona || '',
                descripcion: item.descripcion || '',
                timestamp: Number.isFinite(item.timestamp) ? item.timestamp : Date.now()
            });
        });
    }

    if (!clone.products.length) {
        clone.products = defaultDashboardState.products.map(p => ({ ...p }));
    }
    if (!clone.activity.length) {
        clone.activity = defaultDashboardState.activity.map(a => ({ ...a }));
    }
    return clone;
}

function readDashboardState() {
    let stored = null;
    try {
        const rawLocal = localStorage.getItem(DASHBOARD_STORAGE_KEY);
        if (rawLocal) {
            stored = JSON.parse(rawLocal);
        }
    } catch (error) {
        console.warn('No se pudo leer el estado del dashboard desde localStorage', error);
    }

    if (!stored) {
        try {
            const rawSession = sessionStorage.getItem(DASHBOARD_STORAGE_KEY);
            if (rawSession) {
                stored = JSON.parse(rawSession);
            }
        } catch (error) {
            console.warn('No se pudo leer el estado del dashboard desde sessionStorage', error);
        }
    }

    if (!stored) {
        stored = defaultDashboardState;
    }

    return normalizeDashboardState(stored);
}

let dashboardState = readDashboardState();

const warehouseLayout = {
    'Almacén Central': ['Zona A1', 'Zona A2', 'Zona B1', 'Zona B2'],
    'Sucursal Norte': ['Zona C1', 'Zona C2', 'Zona C3'],
    'Sucursal Sur': ['Zona S1', 'Zona S2'],
    'Depósito Externo': ['Zona D4', 'Zona D5']
};

const stockAlertList = document.querySelector('#stockAlertsCard .stock-alert-list');
const recentActivityList = document.querySelector('#recentActivityCard .activity-list');
const activeAlertsValue = document.getElementById('activeAlertsValue');
const movimientosHoyValue = document.getElementById('movimientosHoyValue');
const zonasCriticasValue = document.getElementById('zonasCriticasValue');

const registrarEntradaBtn = document.getElementById('registrarEntradaBtn');
const registrarSalidaBtn = document.getElementById('registrarSalidaBtn');
const movementModalEl = document.getElementById('movementModal');
const movementBackdrop = document.getElementById('movementBackdrop');
const movementModalTitle = document.getElementById('movementModalTitle');
const movementModalEyebrow = document.getElementById('movementModalEyebrow');
const movementForm = document.getElementById('movementForm');
const movementProductSelect = document.getElementById('movementProduct');
const movementUnitsInput = document.getElementById('movementUnits');
const movementAreaGroup = document.getElementById('movementAreaGroup');
const movementZoneGroup = document.getElementById('movementZoneGroup');
const movementAreaSelect = document.getElementById('movementArea');
const movementZoneSelect = document.getElementById('movementZone');
const movementZoneHelp = document.getElementById('movementZoneHelp');
const movementStockSummary = document.getElementById('movementStockSummary');
const movementCloseBtn = document.getElementById('movementCloseBtn');
const movementCancelBtn = document.getElementById('movementCancel');

let movementMode = 'entrada';

function persistDashboardState() {
    try {
        localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(dashboardState));
    } catch (error) {
        console.warn('No se pudo guardar el estado del dashboard en localStorage', error);
    }
    try {
        sessionStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(dashboardState));
    } catch (error) {
        console.warn('No se pudo guardar el estado del dashboard en sessionStorage', error);
    }
}

function getAvailableAreas() {
    const areas = new Set(Object.keys(warehouseLayout));
    dashboardState.products.forEach(producto => {
        if (producto.area) {
            areas.add(producto.area);
        }
    });
    return Array.from(areas).sort((a, b) => a.localeCompare(b, 'es'));
}

function getZonesForArea(area) {
    const zonas = new Set();
    if (warehouseLayout[area]) {
        warehouseLayout[area].forEach(z => zonas.add(z));
    }
    dashboardState.products.forEach(producto => {
        if (producto.area === area && producto.zona) {
            zonas.add(producto.zona);
        }
    });
    return Array.from(zonas).sort((a, b) => a.localeCompare(b, 'es'));
}

function populateAreaSelect(selectedArea = '') {
    if (!movementAreaSelect) return;
    movementAreaSelect.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Seleccione área';
    placeholder.disabled = true;
    if (!selectedArea) {
        placeholder.selected = true;
    }
    movementAreaSelect.appendChild(placeholder);
    getAvailableAreas().forEach(area => {
        const opt = document.createElement('option');
        opt.value = area;
        opt.textContent = area;
        if (area === selectedArea) {
            opt.selected = true;
        }
        movementAreaSelect.appendChild(opt);
    });
}

function populateZoneSelect(area = '', selectedZone = '') {
    if (!movementZoneSelect) return;
    movementZoneSelect.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = area ? 'Seleccione zona' : 'Seleccione un área primero';
    placeholder.disabled = true;
    if (!selectedZone) {
        placeholder.selected = true;
    }
    movementZoneSelect.appendChild(placeholder);

    movementZoneSelect.disabled = !area;
    if (movementZoneHelp) {
        movementZoneHelp.style.display = area ? '' : 'none';
    }

    if (!area) {
        return;
    }

    const zonasDisponibles = getZonesForArea(area);
    if (!zonasDisponibles.length) {
        movementZoneSelect.disabled = true;
        return;
    }

    zonasDisponibles.forEach(zona => {
        const opt = document.createElement('option');
        opt.value = zona;
        opt.textContent = zona;
        if (zona === selectedZone) {
            opt.selected = true;
        }
        movementZoneSelect.appendChild(opt);
    });
}

function populateProductSelect(selectedId = '') {
    if (!movementProductSelect) return;
    movementProductSelect.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Seleccione producto';
    placeholder.disabled = true;
    if (!selectedId) {
        placeholder.selected = true;
    }
    movementProductSelect.appendChild(placeholder);
    dashboardState.products.forEach(producto => {
        const opt = document.createElement('option');
        opt.value = producto.id;
        opt.textContent = `${producto.nombre} (Stock: ${producto.stock})`;
        if (producto.id === selectedId) {
            opt.selected = true;
        }
        movementProductSelect.appendChild(opt);
    });
}

function updateStockSummary(productId) {
    if (!movementStockSummary) return;
    const producto = dashboardState.products.find(p => p.id === productId);
    movementStockSummary.textContent = producto ? producto.stock : '0';
}

function toggleMovementFields() {
    if (!movementAreaGroup || !movementZoneGroup) return;
    const isEntrada = movementMode === 'entrada';
    const method = isEntrada ? 'remove' : 'add';
    movementAreaGroup.classList[method]('is-hidden');
    movementZoneGroup.classList[method]('is-hidden');
    if (movementAreaSelect) {
        movementAreaSelect.required = isEntrada;
    }
    if (movementZoneSelect) {
        movementZoneSelect.required = isEntrada;
    }
    if (movementZoneHelp) {
        movementZoneHelp.style.display = isEntrada ? '' : 'none';
    }
}

function openMovementModal(type = 'entrada') {
    if (!movementModalEl || !movementForm) return;
    if (!dashboardState.products.length) {
        notifyDashboard('Agrega productos al inventario antes de registrar movimientos.');
        return;
    }
    movementMode = type;
    movementForm.dataset.mode = type;
    const isEntrada = type === 'entrada';
    if (movementModalTitle) {
        movementModalTitle.textContent = isEntrada ? 'Registrar entrada' : 'Registrar salida';
    }
    if (movementModalEyebrow) {
        movementModalEyebrow.textContent = isEntrada ? 'Entrada' : 'Salida';
    }
    populateProductSelect();
    if (movementUnitsInput) {
        movementUnitsInput.value = '';
    }
    if (movementAreaSelect) {
        populateAreaSelect();
    }
    if (movementZoneSelect) {
        populateZoneSelect('');
    }
    updateStockSummary('');
    toggleMovementFields();
    movementModalEl.classList.add('is-open');
    movementModalEl.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}

function closeMovementModal() {
    if (!movementModalEl) return;
    movementModalEl.classList.remove('is-open');
    movementModalEl.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}

function notifyDashboard(message) {
    if (typeof window.toastInfo === 'function') {
        window.toastInfo(message);
        return;
    }
    if (typeof window.toastOk === 'function') {
        window.toastOk(message);
        return;
    }
    alert(message);
}

function formatMovementDescription(item) {
    if (!item) return '';
    const unidades = item.unidades || 0;
    const unidadesLabel = `${unidades} ${unidades === 1 ? 'unidad' : 'unidades'}`;
    if (item.descripcion) {
        return item.descripcion;
    }
    if (item.tipo === 'salida') {
        return `Egreso de ${unidadesLabel} de ${item.producto}`;
    }
    if (item.tipo === 'transferencia') {
        return `Transferencia de ${unidadesLabel} de ${item.producto}`;
    }
    return `Ingreso de ${unidadesLabel} de ${item.producto}`;
}

function formatRelativeTime(timestamp) {
    if (!Number.isFinite(timestamp)) {
        return '';
    }
    const diffMs = Date.now() - timestamp;
    if (diffMs < 60000) {
        return 'Hace instantes';
    }
    const diffMinutes = Math.round(diffMs / 60000);
    if (diffMinutes < 60) {
        return `Hace ${diffMinutes} min`;
    }
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) {
        return `Hace ${diffHours} h`;
    }
    const diffDays = Math.round(diffHours / 24);
    return diffDays === 1 ? 'Hace 1 día' : `Hace ${diffDays} días`;
}

function renderStockAlerts() {
    if (!stockAlertList) return;
    stockAlertList.innerHTML = '';
    const lowStock = dashboardState.products
        .filter(producto => producto.stock <= producto.minimo)
        .sort((a, b) => a.stock - b.stock);

    if (!lowStock.length) {
        const empty = document.createElement('li');
        empty.className = 'stock-alert-item';
        empty.innerHTML = '<div class="stock-alert-info"><div class="stock-alert-icon"><i class="fas fa-check"></i></div><div><div class="stock-alert-name">Inventario equilibrado</div><div class="stock-alert-detail">No hay productos con stock crítico</div></div></div>';
        stockAlertList.appendChild(empty);
        return;
    }

    lowStock.forEach(producto => {
        const li = document.createElement('li');
        li.className = 'stock-alert-item';
        li.innerHTML = `
            <div class="stock-alert-info">
                <div class="stock-alert-icon"><i class="fas fa-box-open"></i></div>
                <div>
                    <div class="stock-alert-name">${producto.nombre}</div>
                    <div class="stock-alert-detail">${producto.area || 'Sin área'} - ${producto.zona || 'Sin zona'}</div>
                </div>
            </div>
            <div class="stock-alert-stock">${producto.stock} ${producto.stock === 1 ? 'unidad' : 'unidades'}</div>`;
        stockAlertList.appendChild(li);
    });
}

function renderRecentActivity() {
    if (!recentActivityList) return;
    recentActivityList.innerHTML = '';
    const items = dashboardState.activity
        .slice()
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 6);

    if (!items.length) {
        const empty = document.createElement('li');
        empty.className = 'activity-item';
        empty.innerHTML = '<div class="activity-icon"><i class="fas fa-inbox"></i></div><div class="activity-details"><div class="activity-description">Sin movimientos registrados</div><div class="activity-time">Comienza registrando tus primeras entradas o salidas</div></div>';
        recentActivityList.appendChild(empty);
        return;
    }

    items.forEach(item => {
        const li = document.createElement('li');
        li.className = 'activity-item';
        const icon = item.tipo === 'salida' ? 'fa-arrow-up' : item.tipo === 'transferencia' ? 'fa-exchange-alt' : 'fa-arrow-down';
        li.innerHTML = `
            <div class="activity-icon"><i class="fas ${icon}"></i></div>
            <div class="activity-details">
                <div class="activity-description">${formatMovementDescription(item)}</div>
                <div class="activity-time">${formatRelativeTime(item.timestamp)}</div>
            </div>`;
        recentActivityList.appendChild(li);
    });
}

function renderSummaryCards() {
    const lowStockCount = dashboardState.products.filter(producto => producto.stock <= producto.minimo).length;
    if (activeAlertsValue) {
        activeAlertsValue.textContent = String(lowStockCount);
    }

    if (movimientosHoyValue) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const movementsToday = dashboardState.activity.filter(item => {
            const date = new Date(item.timestamp);
            return date >= today;
        }).length;
        movimientosHoyValue.textContent = String(movementsToday);
    }

    if (zonasCriticasValue) {
        const zonas = new Set();
        dashboardState.products.forEach(producto => {
            if (producto.stock <= producto.minimo && producto.zona) {
                zonas.add(`${producto.area}::${producto.zona}`);
            }
        });
        zonasCriticasValue.textContent = String(zonas.size);
    }
}

function renderDashboardWidgets() {
    renderStockAlerts();
    renderRecentActivity();
    renderSummaryCards();
}

function handleMovementSubmit(event) {
    event.preventDefault();
    if (!movementForm) return;
    const productId = movementProductSelect ? movementProductSelect.value : '';
    const unidades = movementUnitsInput ? parseInt(movementUnitsInput.value, 10) : 0;
    if (!productId) {
        notifyDashboard('Selecciona un producto del inventario.');
        return;
    }
    if (!Number.isFinite(unidades) || unidades <= 0) {
        notifyDashboard('Ingresa una cantidad válida de unidades.');
        return;
    }

    const producto = dashboardState.products.find(p => p.id === productId);
    if (!producto) {
        notifyDashboard('No se encontró el producto seleccionado.');
        return;
    }

    if (movementMode === 'salida' && unidades > producto.stock) {
        notifyDashboard('La cantidad excede el stock disponible.');
        return;
    }

    if (movementMode === 'entrada') {
        const area = movementAreaSelect ? movementAreaSelect.value : '';
        const zona = movementZoneSelect ? movementZoneSelect.value : '';
        if (!area || !zona) {
            notifyDashboard('Selecciona el área y la zona destino.');
            return;
        }
        producto.area = area;
        producto.zona = zona;
        producto.stock += unidades;
    } else {
        producto.stock = Math.max(0, producto.stock - unidades);
    }

    const movimiento = {
        id: `mov-${Date.now()}`,
        tipo: movementMode,
        productoId: producto.id,
        producto: producto.nombre,
        unidades,
        area: producto.area,
        zona: producto.zona,
        descripcion: movementMode === 'salida'
            ? `Egreso de ${unidades} ${unidades === 1 ? 'unidad' : 'unidades'} de ${producto.nombre}`
            : `Ingreso de ${unidades} ${unidades === 1 ? 'unidad' : 'unidades'} de ${producto.nombre}`,
        timestamp: Date.now()
    };

    dashboardState.activity.unshift(movimiento);
    dashboardState.activity = dashboardState.activity.slice(0, 25);
    persistDashboardState();
    renderDashboardWidgets();
    closeMovementModal();
    notifyDashboard('Movimiento registrado correctamente.');
    document.dispatchEvent(new CustomEvent('movimientoRegistrado', { detail: movimiento }));
}

if (movementProductSelect) {
    movementProductSelect.addEventListener('change', () => {
        const producto = dashboardState.products.find(p => p.id === movementProductSelect.value);
        updateStockSummary(movementProductSelect.value);
        if (movementMode === 'entrada' && producto) {
            populateAreaSelect(producto.area);
            populateZoneSelect(producto.area, producto.zona);
        }
    });
}

movementAreaSelect?.addEventListener('change', () => {
    populateZoneSelect(movementAreaSelect.value);
});

movementForm?.addEventListener('submit', handleMovementSubmit);
movementCloseBtn?.addEventListener('click', closeMovementModal);
movementCancelBtn?.addEventListener('click', closeMovementModal);
movementBackdrop?.addEventListener('click', closeMovementModal);

registrarEntradaBtn?.addEventListener('click', () => openMovementModal('entrada'));
registrarSalidaBtn?.addEventListener('click', () => openMovementModal('salida'));

document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && movementModalEl && movementModalEl.classList.contains('is-open')) {
        closeMovementModal();
    }
});

const FALLBACK_TIME_ZONE_LABEL = (() => {
    const offsetMinutes = -new Date().getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const absMinutes = Math.abs(offsetMinutes);
    const hours = String(Math.floor(absMinutes / 60)).padStart(2, '0');
    const minutes = String(absMinutes % 60).padStart(2, '0');
    return `GMT${sign}${hours}:${minutes}`;
})();

let timeZoneLabel = FALLBACK_TIME_ZONE_LABEL;

try {
    const tzFormatOptions = { timeZoneName: 'short' };
    if (navegadorTimeZone) {
        tzFormatOptions.timeZone = navegadorTimeZone;
    }
    const tzParts = new Intl.DateTimeFormat('es', tzFormatOptions).formatToParts(new Date());
    const tzNamePart = tzParts.find(part => part.type === 'timeZoneName');
    if (tzNamePart && tzNamePart.value) {
        timeZoneLabel = tzNamePart.value;
    }
} catch (error) {
    console.warn('No se pudo determinar la etiqueta de zona horaria del navegador.', error);
}

// Selected theme colors
let colorSidebarSeleccionado = getComputedStyle(document.documentElement)
    .getPropertyValue('--sidebar-color')
    .trim();
let colorTopbarSeleccionado = getComputedStyle(document.documentElement)
    .getPropertyValue('--topbar-color')
    .trim();


// Request browser permission for push notifications
function requestPushPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

function sendPushNotification(title, message) {
    if (!('Notification' in window)) {
        alert(message);
        return;
    }

    const notify = () => new Notification(title, {
        body: message,
        icon: '../../images/optistockLogo.png'
    });

    if (Notification.permission === 'granted') {
        notify();
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(perm => {
            if (perm === 'granted') notify();
            else alert(message);
        });
    } else {
        alert(message);
    }
}

function normalizeHex(hexColor) {
    if (!hexColor) return null;
    let hex = hexColor.trim();
    if (!hex.startsWith('#')) return null;
    hex = hex.slice(1);
    if (hex.length === 3) {
        hex = hex.split('').map(ch => ch + ch).join('');
    }
    if (hex.length !== 6) return null;
    return hex.toLowerCase();
}

function getContrastingColor(hexColor) {
    const hex = normalizeHex(hexColor);
    if (!hex) return '#ffffff';
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#000000' : '#ffffff';
}

function hexToRgb(hexColor) {
    const hex = normalizeHex(hexColor);
    if (!hex) return null;
    return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16)
    };
}

function updatePrimaryPalette(baseColor) {
    const rgb = hexToRgb(baseColor);
    if (!rgb) return;
    const { r, g, b } = rgb;
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty('--primary-color', baseColor);
    rootStyle.setProperty('--primary-soft', `rgba(${r}, ${g}, ${b}, 0.16)`);
    rootStyle.setProperty('--primary-border-soft', `rgba(${r}, ${g}, ${b}, 0.12)`);
    rootStyle.setProperty('--primary-border-strong', `rgba(${r}, ${g}, ${b}, 0.22)`);
    rootStyle.setProperty('--primary-border-heavy', `rgba(${r}, ${g}, ${b}, 0.32)`);
    rootStyle.setProperty('--primary-surface-extra', `rgba(${r}, ${g}, ${b}, 0.08)`);
    rootStyle.setProperty('--primary-surface', `rgba(${r}, ${g}, ${b}, 0.12)`);
    rootStyle.setProperty('--primary-surface-strong', `rgba(${r}, ${g}, ${b}, 0.18)`);
    rootStyle.setProperty('--primary-surface-heavy', `rgba(${r}, ${g}, ${b}, 0.24)`);
    rootStyle.setProperty('--primary-outline', `rgba(${r}, ${g}, ${b}, 0.18)`);
    rootStyle.setProperty('--primary-outline-strong', `rgba(${r}, ${g}, ${b}, 0.28)`);
    rootStyle.setProperty('--primary-shadow-soft', `rgba(${r}, ${g}, ${b}, 0.35)`);
    rootStyle.setProperty('--primary-shadow-strong', `rgba(${r}, ${g}, ${b}, 0.5)`);
    rootStyle.setProperty('--primary-shadow-heavy', `rgba(${r}, ${g}, ${b}, 0.65)`);
    rootStyle.setProperty('--header-gradient', baseColor);
}

function applySidebarColor(color) {
    if (!color) return;
    document.documentElement.style.setProperty('--sidebar-color', color);
    document.documentElement.style.setProperty('--sidebar-text-color', getContrastingColor(color));
}

function applyTopbarColor(color) {
    if (!color) return;
    const textColor = getContrastingColor(color);
    document.documentElement.style.setProperty('--topbar-color', color);
    document.documentElement.style.setProperty('--topbar-text-color', textColor);
    document.documentElement.style.setProperty('--header-text-color', textColor);
    document.documentElement.style.setProperty('--header-muted-color', textColor);
    updatePrimaryPalette(color);
}


const metricsData = {
    highRotation: [
        { producto: 'Baterías AA', cantidad: 120 },
        { producto: 'Mouse Inalámbrico', cantidad: 75 },
        { producto: 'Teclados', cantidad: 60 }
    ],
    zoneCapacity: [
        { zona: 'A1', porcentaje: 95 },
        { zona: 'B2', porcentaje: 90 }
    ]
};

function renderHighRotation() {
    if (!highRotationList) return;
    highRotationList.innerHTML = '';
    metricsData.highRotation.forEach(item => {
        const li = document.createElement('li');
        li.className = 'activity-item';
        li.innerHTML = `<div class="activity-icon"><i class="fas fa-box"></i></div>
            <div class="activity-details"><div class="activity-description">${item.producto}</div>
            <div class="activity-time">${item.cantidad} mov.</div></div>`;
        highRotationList.appendChild(li);
    });
}

function renderZoneCapacity() {
    if (!zoneCapacityList) return;
    zoneCapacityList.innerHTML = '';
    metricsData.zoneCapacity.forEach(item => {
        const li = document.createElement('li');
        li.className = 'activity-item';
        li.innerHTML = `<div class="activity-icon"><i class="fas fa-map-marker-alt"></i></div>
            <div class="activity-details"><div class="activity-description">Zona ${item.zona}</div>
            <div class="activity-time">${item.porcentaje}% ocupación</div></div>`;
        zoneCapacityList.appendChild(li);
    });
}

function loadMetrics() {
    renderHighRotation();
    renderZoneCapacity();
}

function saveHomeData() {
    persistDashboardState();
    const data = {
        empresaTitulo: document.getElementById('empresaTitulo')?.textContent || '',
        highRotation: document.getElementById('highRotationList')?.innerHTML || '',
        zoneCapacity: document.getElementById('zoneCapacityList')?.innerHTML || '',
        accessLogs: document.getElementById('accessLogsList')?.innerHTML || ''
    };
    sessionStorage.setItem('homeData', JSON.stringify(data));
}

function restoreHomeData() {
    try {
        const storedState = sessionStorage.getItem(DASHBOARD_STORAGE_KEY);
        if (storedState) {
            dashboardState = normalizeDashboardState(JSON.parse(storedState));
        }
    } catch (error) {
        console.warn('No se pudo restaurar el estado del dashboard desde sessionStorage', error);
    }

    const raw = sessionStorage.getItem('homeData');
    if (!raw) {
        renderDashboardWidgets();
        return;
    }
    try {
        const data = JSON.parse(raw);
        const empresaTitulo = document.getElementById('empresaTitulo');
        if (empresaTitulo && data.empresaTitulo) empresaTitulo.textContent = data.empresaTitulo;
        const highRotation = document.getElementById('highRotationList');
        if (highRotation && data.highRotation) highRotation.innerHTML = data.highRotation;
        const zoneCapacity = document.getElementById('zoneCapacityList');
        if (zoneCapacity && data.zoneCapacity) zoneCapacity.innerHTML = data.zoneCapacity;
        const accessLogs = document.getElementById('accessLogsList');
        if (accessLogs && data.accessLogs) accessLogs.innerHTML = data.accessLogs;
    } catch (e) {
        console.error('Error restoring home data', e);
    }
    renderDashboardWidgets();
}

function formatRelativeDate(date) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    let diffDays = Math.round((today - targetDay) / 86400000);
    if (diffDays <= 0) return "Hoy";
    if (diffDays === 1) return "Ayer";
    if (diffDays < 30) return `${diffDays} días`;
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths === 1) return "1 mes";
    if (diffMonths < 12) return `${diffMonths} meses`;
    const diffYears = Math.floor(diffMonths / 12);
    return diffYears === 1 ? "1 año" : `${diffYears} años`;
}

function formatTime(date) {
    try {
        const options = {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        };
        if (navegadorTimeZone) {
            options.timeZone = navegadorTimeZone;
        }
        return new Intl.DateTimeFormat('es', options).format(date);
    } catch (error) {
        let hours = date.getHours();
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours || 12;
        return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
    }
}
function loadAccessLogs() {
    if (!accessLogsList) return;
    const idEmpresa = localStorage.getItem('id_empresa') || '';
    fetch(`/scripts/php/get_access_logs.php?id_empresa=${idEmpresa}`)
        .then(res => {
            if (!res.ok) throw new Error('Error al obtener los accesos');
            return res.json();
        })
        .then(data => {
            if (!data.success) return;
            accessLogsList.innerHTML = "";
            data.logs.forEach(log => {
                const li = document.createElement('li');
                li.className = 'activity-item';

                const rawFecha = (log.fecha || '').trim();
                const [fechaParte = '', horaParte = ''] = rawFecha ? rawFecha.split(/\s+/) : [''];
                const isoString = fechaParte ? `${fechaParte}T${horaParte || '00:00:00'}Z` : '';
                let parsedDate = isoString ? new Date(isoString) : null;
                if (parsedDate && Number.isNaN(parsedDate.getTime())) {
                    parsedDate = null;
                }

                const displayParts = [];
                let tooltipText = rawFecha;

                if (parsedDate) {
                    const relative = formatRelativeDate(parsedDate);
                    if (relative) {
                        displayParts.push(relative);
                    }

                    const formattedTime = formatTime(parsedDate);
                    if (formattedTime) {
                        displayParts.push(formattedTime);
                    }

                    try {
                        const tooltipOptions = {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                        };
                        if (navegadorTimeZone) {
                            tooltipOptions.timeZone = navegadorTimeZone;
                        }
                        tooltipText = new Intl.DateTimeFormat('es', tooltipOptions).format(parsedDate);
                    } catch (error) {
                        tooltipText = parsedDate.toLocaleString();
                    }
                }

                const zoneSuffix = timeZoneLabel ? ` (${timeZoneLabel})` : '';
                let activityTime = displayParts.join(' · ');
                if (activityTime) {
                    activityTime += zoneSuffix;
                } else if (tooltipText) {
                    activityTime = `${tooltipText}${zoneSuffix}`;
                } else {
                    activityTime = zoneSuffix.trim();
                }

                const tooltipTextWithZone = tooltipText ? `${tooltipText}${zoneSuffix}` : zoneSuffix.trim();

                const iconDiv = document.createElement('div');
                iconDiv.className = 'activity-icon';
                const avatar = document.createElement('img');
                avatar.src = log.foto_perfil || '/images/profile.jpg';
                avatar.className = 'activity-avatar';
                const fullName = `${log.nombre || ''} ${log.apellido || ''}`.trim();
                avatar.alt = fullName || 'Usuario';
                iconDiv.appendChild(avatar);

                const detailsDiv = document.createElement('div');
                detailsDiv.className = 'activity-details';

                const descriptionDiv = document.createElement('div');
                descriptionDiv.className = 'activity-description';
                const descriptionParts = [fullName, log.rol || '', log.accion || ''].filter(Boolean);
                descriptionDiv.textContent = descriptionParts.join(' - ');

                const timeDiv = document.createElement('div');
                timeDiv.className = 'activity-time';
                timeDiv.textContent = activityTime;
                if (tooltipTextWithZone) {
                    timeDiv.title = tooltipTextWithZone;
                }

                detailsDiv.appendChild(descriptionDiv);
                detailsDiv.appendChild(timeDiv);

                li.appendChild(iconDiv);
                li.appendChild(detailsDiv);

                accessLogsList.appendChild(li);
            });
        })
        .catch(err => console.error('Error loading access logs:', err));
}


// Toggle sidebar on button click
if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', function() {
        if (window.innerWidth <= 992) {
            const isActive = sidebar.classList.toggle('active');
            body.classList.toggle('sidebar-open', isActive);
        }
    });
}

// Close sidebar when clicking outside on mobile
document.addEventListener('click', function(e) {
    if (!sidebar || !menuToggle) return;
    if (window.innerWidth <= 992 &&
        !sidebar.contains(e.target) &&
        !menuToggle.contains(e.target)) {
        sidebar.classList.remove('active');
        body.classList.remove('sidebar-open');
    }
});

// Handle window resize
window.addEventListener('resize', function() {
    if (!sidebar) return;
    if (window.innerWidth > 992) {
        sidebar.classList.remove('active');
        body.classList.remove('sidebar-open');
    }
});

// Tutorial Steps
const tutorialSteps = [
    {
        title: "Bienvenido a OPTISTOCK",
        content: "Este tutorial te guiará por las principales funciones del sistema. OPTISTOCK es una solución completa para la gestión de almacenes que te ayudará a optimizar tus operaciones.",
        element: null
    },
    {
        title: "Dashboard Principal",
        content: "Aquí encontrarás un resumen visual de las métricas más importantes: productos con stock bajo, movimientos recientes y accesos de empleados.",
        element: document.querySelector('.dashboard-grid'),
        centerCard: true,
        preventScroll: true
    },
    {
        title: "Funciones Rápidas Flash",
        content: "Los botones 'Ingreso Flash' y 'Egreso Flash' te permiten registrar movimientos de productos ya existentes de manera rápida mediante escaneo de códigos QR o barras.",
        element: document.querySelector('.quick-actions')
    },
    {
        title: "Áreas y Zonas de Almacén",
        content: "Desde este módulo podrás gestionar todas las áreas y zonas de tu almacén, asignar ubicaciones y configurar la distribución física de tus productos.",
        element: document.querySelector('.sidebar-menu a[data-page="area_almac_v2/gestion_areas_zonas.html"]')
    },
    {
        title: "Gestión de Inventario",
        content: "El corazón del sistema. Aquí podrás registrar nuevos productos, actualizar existencias, realizar transferencias y gestionar todo tu inventario de manera eficiente.",
        element: document.querySelector('.sidebar-menu a[data-page="gest_inve/inventario_basico.html"]')
    },
    {
        title: "Administración de Usuarios",
        content: "Gestiona los accesos, permisos y roles de todos los usuarios del sistema. Asigna responsabilidades y controla quién puede realizar cada operación.",
        element: document.querySelector('.sidebar-menu a[data-page="admin_usuar/administracion_usuarios.html"]')
    },
    {
        title: "Generación de Reportes",
        content: "Crea reportes detallados de inventario, movimientos y cualquier otra información relevante para la toma de decisiones.",
        element: document.querySelector('.sidebar-menu a[data-page="reports/reportes.html"]')
    },
    {
        title: "Registro de Actividades",
        content: "Supervisa todas las actividades realizadas en la pagina por ti y por otros empleados que se vayan sumando a tu empresa.",
        element: document.querySelector('.sidebar-menu a[data-page="control_log/log.html"]')
    },{
        title: "Cuenta",
        content: "Visualiza y modifica tu informacion y la de tu empresa. Cambia tu foto de perfil o el logotipo de tu empresa desde aca.",
        element: document.querySelector('.sidebar-menu a[data-page="account_suscrip/account_suscrip.html"]')
    },
    {
        title: "Personalización",
        content: "Puedes personalizar el sistema cambiando colores, reorganizando accesos rápidos y adaptando la interfaz a las necesidades de tu empresa.",
        element: document.querySelector('.sidebar-footer .btn')
    }
];

// Tutorial State
let currentStep = 0;
const tutorialOverlayBg = document.getElementById('tutorialOverlayBg');
const tutorialCardContainer = document.getElementById('tutorialCardContainer');
const tutorialCard = document.getElementById('tutorialCard');
const tutorialTitle = document.getElementById('tutorialTitle');
const tutorialContent = document.getElementById('tutorialContent');
const tutorialIndicator = document.getElementById('tutorialIndicator');
const nextTutorial = document.getElementById('nextTutorial');
const skipTutorial = document.getElementById('skipTutorial');
const closeTutorial = document.getElementById('closeTutorial');
let tutorialHole = null;

// Show tutorial only the first time each user logs in
function checkFirstVisit() {
    const userId = localStorage.getItem('usuario_id');
    if (!userId) return;
    if (!localStorage.getItem(`tutorialShown_${userId}`)) {
        startTutorial();
    }
}

// Start the tutorial
function startTutorial() {
    currentStep = 0;
    showTutorialStep(currentStep);
    tutorialOverlayBg.style.display = 'block';
    tutorialCardContainer.style.display = 'flex';
}

// Show specific tutorial step
function showTutorialStep(step) {
    if (step >= tutorialSteps.length) {
        endTutorial();
        return;
    }

    currentStep = step;
    const stepData = tutorialSteps[step];

    // Update content
    tutorialTitle.textContent = stepData.title;
    tutorialContent.innerHTML = `<p>${stepData.content}</p>`;
    tutorialIndicator.textContent = `Paso ${step + 1} de ${tutorialSteps.length}`;

    // Update next button text for last step
    if (step === tutorialSteps.length - 1) {
        nextTutorial.textContent = 'Finalizar';
    } else {
        nextTutorial.textContent = 'Siguiente';
    }

    // Reset card positioning styles before applying new values
    tutorialCard.style.transform = 'none';
    tutorialCard.style.top = '';
    tutorialCard.style.left = '';
    tutorialCard.style.right = '';
    tutorialCard.style.bottom = '';

    // Remove previous spotlight
    document.querySelectorAll('.tutorial-spotlight').forEach(el => {
        el.classList.remove('tutorial-spotlight');
    });

    // Remove previous hole
    if (tutorialHole) {
        tutorialHole.remove();
        tutorialHole = null;
    }

    // Highlight element if specified
    if (stepData.element) {
        // Add spotlight class to element
        stepData.element.classList.add('tutorial-spotlight');

        // Create hole in overlay
        const rect = stepData.element.getBoundingClientRect();
        tutorialHole = document.createElement('div');
        tutorialHole.className = 'tutorial-hole';
        tutorialHole.style.width = `${rect.width}px`;
        tutorialHole.style.height = `${rect.height}px`;
        tutorialHole.style.left = `${rect.left}px`;
        tutorialHole.style.top = `${rect.top}px`;
        tutorialOverlayBg.appendChild(tutorialHole);

        // Position card near the element
        if (stepData.centerCard) {
            tutorialCard.style.top = '50%';
            tutorialCard.style.left = '50%';
            tutorialCard.style.transform = 'translate(-50%, -50%)';
        } else {
            const cardWidth = Math.min(tutorialCard.offsetWidth || 480, window.innerWidth - 40);
            const cardLeft = Math.min(
                window.innerWidth - cardWidth - 20,
                Math.max(20, rect.left + (rect.width / 2) - (cardWidth / 2))
            );

            const cardTop = rect.bottom + 20;
            if (cardTop + tutorialCard.offsetHeight > window.innerHeight) {
                // If card doesn't fit below, position it above
                tutorialCard.style.top = `${rect.top - tutorialCard.offsetHeight - 20}px`;
            } else {
                tutorialCard.style.top = `${cardTop}px`;
            }
            tutorialCard.style.left = `${cardLeft}px`;
            tutorialCard.style.transform = 'none';
        }

        if (!stepData.preventScroll) {
            // Scroll element into view if needed
            setTimeout(() => {
                stepData.element.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }, 300);
        }
    } else {
        // Center card for introductory steps
        tutorialCard.style.top = '50%';
        tutorialCard.style.left = '50%';
        tutorialCard.style.transform = 'translate(-50%, -50%)';
    }
}

// End tutorial
function endTutorial() {
    tutorialOverlayBg.style.display = 'none';
    tutorialCardContainer.style.display = 'none';
    document.querySelectorAll('.tutorial-spotlight').forEach(el => {
        el.classList.remove('tutorial-spotlight');
    });
    if (tutorialHole) {
        tutorialHole.remove();
        tutorialHole = null;
    }
    const userId = localStorage.getItem('usuario_id');
    if (userId) {
        localStorage.setItem(`tutorialShown_${userId}`, 'true');
    }
}

// Event Listeners
nextTutorial.addEventListener('click', () => {
    showTutorialStep(currentStep + 1);
});

skipTutorial.addEventListener('click', endTutorial);
closeTutorial.addEventListener('click', endTutorial);

// Check for first visit when page loads
window.addEventListener('DOMContentLoaded', checkFirstVisit);

// Reposition tutorial elements when the viewport changes
window.addEventListener('resize', () => {
    if (tutorialOverlayBg.style.display === 'block') {
        showTutorialStep(currentStep);
    }
});

window.addEventListener('scroll', () => {
    if (tutorialOverlayBg.style.display === 'block') {
        showTutorialStep(currentStep);
    }
}, true);

// Menu item click handler
const menuItems = document.querySelectorAll('.sidebar-menu a');
menuItems.forEach(item => {
    item.addEventListener('click', function(e) {
        e.preventDefault();
        
        menuItems.forEach(i => i.classList.remove('active'));
        this.classList.add('active');
        
        const pageTitle = this.textContent.trim();
        document.querySelector('.topbar-title').textContent = pageTitle;
    });
});

// Notification bell click handler
document.querySelector('.notification-bell').addEventListener('click', function() {
    alert('Mostrar notificaciones\n\n- Movimiento no autorizado detectado\n- Nuevo reporte disponible\n- Inventario actualizado');
});

// Quick actions buttons
document.getElementById('ingresoFlashBtn').addEventListener('click', function() {
    alert('Función Ingreso Flash activada\n\nEscanea el código del producto para registrar su ingreso al almacén');
});

document.getElementById('egresoFlashBtn').addEventListener('click', function() {
    alert('Función Egreso Flash activada\n\nEscanea el código del producto para registrar su salida del almacén');
});

// Manual tutorial trigger for testing (remove in production)
document.addEventListener('keydown', function(e) {
    if (e.key === 'F2') {
        startTutorial();
    }
});

// Alert settings handlers
if (alertSettingsBtn) {
    alertSettingsBtn.addEventListener('click', () => {
        if (!alertModal) return;
        alertMovCriticos.checked = JSON.parse(localStorage.getItem('alertMovCriticos') || 'true');
        alertFallosInventario.checked = JSON.parse(localStorage.getItem('alertFallosInventario') || 'true');
        alertModal.style.display = 'flex';
    });
}
if (saveAlertSettings) {
    saveAlertSettings.addEventListener('click', () => {
        localStorage.setItem('alertMovCriticos', alertMovCriticos.checked);
        localStorage.setItem('alertFallosInventario', alertFallosInventario.checked);
        alertModal.style.display = 'none';
    });
}
if (cancelAlertSettings) {
    cancelAlertSettings.addEventListener('click', () => {
        alertModal.style.display = 'none';
    });
}

function notifyUnauthorizedMovement(msg) {
    if (JSON.parse(localStorage.getItem('alertMovCriticos') || 'true')) {
        sendPushNotification('Alerta de Seguridad', msg);

        alert(msg);

    }
}

document.addEventListener('movimientoNoAutorizado', e => {
    notifyUnauthorizedMovement(e.detail || 'Movimiento no autorizado detectado');
});

document.addEventListener("DOMContentLoaded", function () {
    requestPushPermission();
    const mainContent = document.getElementById('mainContent');
    let contenidoInicial = mainContent.innerHTML;
    let estaEnInicio = true;

    function removeSearchBodyClass() {
        document.body.classList.remove('search-page-body');
    }

    function showSearchLoader(target) {
        if (!target) return;
        target.innerHTML = `
            <div class="search-loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Cargando buscador global...</p>
            </div>
        `;
    }

    function ensureGlobalSearchModule(query) {
        const sanitizedQuery = (query || '').trim();

        if (sanitizedQuery) {
            localStorage.setItem('pendingGlobalSearchQuery', sanitizedQuery);
        } else {
            localStorage.removeItem('pendingGlobalSearchQuery');
        }

        const invokeInitializer = () => {
            if (typeof window.initializeGlobalSearchPage === 'function') {
                window.initializeGlobalSearchPage(sanitizedQuery);
            }
        };

        if (typeof window.initializeGlobalSearchPage === 'function') {
            invokeInitializer();
            return;
        }

        const existingLoader = document.querySelector('script[data-global-search-loader="true"]');
        if (existingLoader) {
            existingLoader.addEventListener('load', invokeInitializer, { once: true });
            return;
        }

        const script = document.createElement('script');
        script.src = '../../scripts/main_menu/global_search.js';
        script.async = false;
        script.dataset.globalSearchLoader = 'true';
        script.onload = invokeInitializer;
        document.body.appendChild(script);
    }

    function openGlobalSearch(query) {
        const sanitizedQuery = (query || '').trim();
        const topbarTitle = document.querySelector('.topbar-title');

        if (!mainContent) {
            const searchUrl = sanitizedQuery ? `global_search.html?q=${encodeURIComponent(sanitizedQuery)}` : 'global_search.html';
            window.location.href = searchUrl;
            return;
        }

        if (estaEnInicio) {
            saveHomeData();
            estaEnInicio = false;
        }

        document.querySelectorAll('.sidebar-menu a').forEach(link => link.classList.remove('active'));

        showSearchLoader(mainContent);

        fetch('../main_menu/global_search.html')
            .then(res => res.text())
            .then(html => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const incomingMain = doc.querySelector('main');
                const bodyClasses = doc.body ? Array.from(doc.body.classList) : [];

                removeSearchBodyClass();
                if (bodyClasses.length) {
                    document.body.classList.add(...bodyClasses);
                }

                if (incomingMain) {
                    mainContent.innerHTML = '';
                    mainContent.appendChild(incomingMain);
                } else if (doc.body) {
                    mainContent.innerHTML = doc.body.innerHTML;
                } else {
                    mainContent.innerHTML = html;
                }

                if (topbarTitle) {
                    topbarTitle.textContent = 'Buscador global';
                }

                ensureGlobalSearchModule(sanitizedQuery);
            })
            .catch(err => {
                removeSearchBodyClass();
                mainContent.innerHTML = `<div class="search-error-state">No se pudo cargar el buscador global. ${err}</div>`;
            });
    }

    if (topbarSearchInput) {
        topbarSearchInput.addEventListener('keydown', event => {
            if (event.key === 'Enter') {
                event.preventDefault();
                openGlobalSearch(topbarSearchInput.value.trim());
            }
        });
    }

    if (topbarSearchIcon) {
        topbarSearchIcon.addEventListener('click', () => {
            const query = topbarSearchInput ? topbarSearchInput.value.trim() : '';
            openGlobalSearch(query);
        });
    }

    renderDashboardWidgets();
    loadMetrics();
    loadAccessLogs();
    restoreHomeData();
    window.addEventListener('beforeunload', saveHomeData);
    document.addEventListener('movimientoRegistrado', loadMetrics);

    // Mostrar nombre y rol del usuario
    const nombre = localStorage.getItem('usuario_nombre');
    const rol = localStorage.getItem('usuario_rol');
    const userNameEl = document.querySelector('.user-name');
    const userRoleEl = document.querySelector('.user-role');

    if (nombre && userNameEl) userNameEl.textContent = nombre;
    if (rol && userRoleEl) userRoleEl.textContent = rol;

    let fotoPerfil = localStorage.getItem('foto_perfil') || '/images/profile.jpg';
if (fotoPerfil && !fotoPerfil.startsWith('/')) {
  fotoPerfil = '/' + fotoPerfil;
}
const userImgEl = document.querySelector('.user-profile img');
if (userImgEl) {
  userImgEl.onerror = () => { userImgEl.src = '/images/profile.jpg'; };
  userImgEl.src = fotoPerfil;
}


    // Submenú usuario
    const dropdownButton = document.getElementById("dropdownMenuButton");
    const userMenu = document.getElementById("userMenu");
    if (dropdownButton && userMenu) {
        dropdownButton.addEventListener("click", function () {
            userMenu.style.display = userMenu.style.display === "block" ? "none" : "block";
        });
    }

    // Botón cerrar sesión
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", function (e) {
            e.preventDefault();
            fetch("/scripts/php/logout.php", {
                method: "POST",
                credentials: "include"
            })
            .then(res => res.json())
            .then(data => {
                console.log("✅ Logout:", data.message || data);
                localStorage.clear();
                window.location.href = "../../pages/regis_login/login/login.html";
            })
            .catch(err => {
                console.error("❌ Error cerrando sesión:", err);
                alert("Error al cerrar sesión.");
            });
        });
    }

    // Verificación empresa
    const userId = localStorage.getItem('usuario_id');
    if (!userId) {
        alert("No hay sesión activa.");
        window.location.href = "../../pages/regis_login/login/login.html";
        return;
    }

    fetch('/scripts/php/check_empresa.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario_id: userId })
    })
    .then(response => response.json())
    .then(data => {
        console.log("🔍 check_empresa.php:", data);
        if (data.success) {
    const tituloEmpresa = document.getElementById('empresaTitulo');
    if (tituloEmpresa) {
        tituloEmpresa.textContent = `Bienvenido a ${data.empresa_nombre}`;
    }
    document.querySelectorAll('.empresa-elements').forEach(el => el.style.display = 'block');
    localStorage.setItem('id_empresa', data.empresa_id); // 🟢 GUARDAMOS EL ID

    const msg = document.getElementById('message');
    if (msg) msg.style.display = 'none';

    // 🟢 LLAMAMOS A CONFIGURACIÓN VISUAL
    cargarConfiguracionVisual(data.empresa_id);

    // 🟢 ACTIVAMOS LA OPCIÓN PARA PERSONALIZAR

let colorSidebarSeleccionado = null;
let colorTopbarSeleccionado = null;

const openColorModal = document.getElementById('openColorModal');
const colorModal = document.getElementById('colorModal');

openColorModal.addEventListener('click', () => {
    colorModal.style.display = 'flex';
});

colorModal.addEventListener('click', (e) => {
    if (e.target === colorModal) {
        colorModal.style.display = 'none';
    }
});

// Selección de colores
document.querySelectorAll('#sidebarColors button').forEach(btn => {
    btn.addEventListener('click', () => {
        colorSidebarSeleccionado = btn.dataset.color;
        document.querySelectorAll('#sidebarColors button').forEach(b => b.style.border = '2px solid #ccc');
        btn.style.border = '3px solid black';
        applySidebarColor(colorSidebarSeleccionado);

        if (colorTopbarSeleccionado) {
            applyTopbarColor(colorTopbarSeleccionado);
        }
    });
});

document.querySelectorAll('#topbarColors button').forEach(btn => {
    btn.addEventListener('click', () => {
        colorTopbarSeleccionado = btn.dataset.color;
        document.querySelectorAll('#topbarColors button').forEach(b => b.style.border = '2px solid #ccc');
        btn.style.border = '3px solid black';
        applyTopbarColor(colorTopbarSeleccionado);
    });
});

document.getElementById('guardarConfigVisual').addEventListener('click', () => {
    const empresaId = data.empresa_id;
    const menuItems = Array.from(document.querySelectorAll('.sidebar-menu a'));
    const ordenSidebar = menuItems.map(el => el.dataset.page);

    if (!colorSidebarSeleccionado || !colorTopbarSeleccionado) {
        alert("⚠️ Selecciona ambos colores.");
        return;
    }

    fetch('/scripts/php/guardar_configuracion_empresa.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            id_empresa: parseInt(empresaId),
            color_sidebar: colorSidebarSeleccionado,
            color_topbar: colorTopbarSeleccionado,
            orden_sidebar: ordenSidebar
        })
    })
    .then(res => res.json())
    .then(response => {
        if (response.success) {
            alert("✅ Configuración guardada.");
            location.reload();
        } else {
            alert("❌ No se pudo guardar.");
        }
    });

    colorModal.style.display = 'none';
});

}
 else {
            const modal = document.getElementById("modalEmpresa");
            const goToRegistro = document.getElementById("goToRegistroEmpresa");
            if (modal && goToRegistro) {
                modal.style.display = "flex";
                goToRegistro.addEventListener("click", () => {
                    window.location.href = '../regis_login/regist/regist_empresa.html';
                });
            }
        }
    })
    .catch(err => {
        console.error("❌ Error consultando empresa:", err);
    });

    // Sidebar: navegación SPA
    const menuItems = document.querySelectorAll('.sidebar-menu a[data-page]');
    menuItems.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();

            // Marcar activo
            menuItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');

            // Cambiar título topbar
            const titulo = this.textContent.trim();
            document.querySelector('.topbar-title').textContent = titulo;

            const pageUrl = this.getAttribute('data-page');

            if (pageUrl === 'inicio') {
                mainContent.innerHTML = contenidoInicial;
                restoreHomeData();
                estaEnInicio = true;
                removeSearchBodyClass();
                return;
            }

            if (estaEnInicio) {
                saveHomeData();
                estaEnInicio = false;
            }

            fetch(`../${pageUrl}`)
                .then(res => res.text())
                .then(html => {
                    mainContent.innerHTML = html;
                    removeSearchBodyClass();

                    const scripts = mainContent.querySelectorAll("script");
                    scripts.forEach(oldScript => {
                        const newScript = document.createElement("script");
                        Array.from(oldScript.attributes).forEach(attr => {
                            newScript.setAttribute(attr.name, attr.value);
                        });
                        if (oldScript.src) {
                            newScript.async = false;
                        } else {
                            newScript.textContent = oldScript.textContent;
                        }
                        document.body.appendChild(newScript);
                    });
                })
                .catch(err => {
                    mainContent.innerHTML = `<p>Error cargando la página: ${err}</p>`;
                });
        });
    });

    // Si viene ?load en la URL, cargar la página solicitada automáticamente
const params = new URLSearchParams(window.location.search);
if (params.has("load")) {
    const page = params.get("load");

    // Cambiar el título en la topbar
    const name = page.split('/').pop().replace('.html', '').replace(/_/g, ' ');
    document.querySelector('.topbar-title').textContent = name.charAt(0).toUpperCase() + name.slice(1);

    // Cargar el contenido en el mainContent
    fetch(`../${page}`)
        .then(res => res.text())
        .then(html => {
            const mainContent = document.getElementById("mainContent");
            mainContent.innerHTML = html;
            estaEnInicio = false;
            removeSearchBodyClass();

            // Ejecutar scripts embebidos si los hay
            const scripts = mainContent.querySelectorAll("script");
            scripts.forEach(script => {
                const newScript = document.createElement("script");
                if (script.src) {
                    newScript.src = script.src;
                    newScript.async = false;
                } else {
                    newScript.textContent = script.textContent;
                }
                document.body.appendChild(newScript);
            });
        })
        .catch(err => {
            document.getElementById("mainContent").innerHTML = `<p>Error cargando la vista: ${err}</p>`;
        });
    }

    // 🟢 Si se solicitó cargar una vista desde el registro, hazlo ahora
const vistaPendiente = localStorage.getItem('cargarVista');
if (vistaPendiente) {
    localStorage.removeItem('cargarVista'); // limpiamos

    // Cargar HTML en mainContent
    fetch(`../${vistaPendiente}`)
        .then(res => res.text())
        .then(html => {
            const mainContent = document.getElementById("mainContent");
            mainContent.innerHTML = html;
            estaEnInicio = false;
            removeSearchBodyClass();

            // Ejecutar los scripts externos/internos del HTML cargado
            const scripts = mainContent.querySelectorAll("script");
            scripts.forEach(oldScript => {
                const newScript = document.createElement("script");
                Array.from(oldScript.attributes).forEach(attr => {
                    newScript.setAttribute(attr.name, attr.value);
                });
                if (oldScript.src) {
                    newScript.async = false;
                } else {
                    newScript.textContent = oldScript.textContent;
                }
                document.body.appendChild(newScript);
            });

            // Actualizar topbar (opcional)
            const titulo = vistaPendiente.split('/').pop().replace('.html', '').replace(/_/g, ' ');
            const topbarTitle = document.querySelector('.topbar-title');
            if (topbarTitle) {
                topbarTitle.textContent = titulo.charAt(0).toUpperCase() + titulo.slice(1);
            }
        })
        .catch(err => {
            const mainContent = document.getElementById("mainContent");
            if (mainContent) {
                mainContent.innerHTML = `<p>Error cargando la vista: ${err}</p>`;
            }
        });
    }
});

function cargarConfiguracionVisual(idEmpresa) {
    fetch('/scripts/php/get_configuracion_empresa.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_empresa: idEmpresa })
    })
    .then(res => res.json())
    .then(({ success, config }) => {
        if (success && config) {
            if (config.color_sidebar) {
                applySidebarColor(config.color_sidebar);
                colorSidebarSeleccionado = config.color_sidebar;
                document.querySelectorAll('#sidebarColors button').forEach(b => b.style.border = '2px solid #ccc');
                const btn = document.querySelector(`#sidebarColors button[data-color="${config.color_sidebar}"]`);
                if (btn) btn.style.border = '3px solid black';

            }
            if (config.color_topbar) {
                applyTopbarColor(config.color_topbar);

                colorTopbarSeleccionado = config.color_topbar;
                document.querySelectorAll('#topbarColors button').forEach(b => b.style.border = '2px solid #ccc');
                const btn = document.querySelector(`#topbarColors button[data-color="${config.color_topbar}"]`);
                if (btn) btn.style.border = '3px solid black';
            }

            if (config.orden_sidebar) {
                const orden = JSON.parse(config.orden_sidebar);
                const menu = document.querySelector('.sidebar-menu');
                const items = Array.from(menu.children);
                orden.forEach(page => {
                    const item = items.find(i => i.dataset.page === page);
                    if (item) menu.appendChild(item);
                });
            }
        }
    });
}
