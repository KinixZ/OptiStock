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
const stockAlertList = document.getElementById('stockAlertList');
const stockAlertsRefreshBtn = document.getElementById('stockAlertsRefreshBtn');
const stockAlertsMenuBtn = document.getElementById('stockAlertsMenuBtn');
const stockAlertsMenu = document.getElementById('stockAlertsMenu');
const stockAlertThresholdInput = document.getElementById('stockAlertThreshold');
const stockAlertApplyBtn = document.getElementById('stockAlertApplyBtn');
const stockAlertCancelBtn = document.getElementById('stockAlertCancelBtn');
const recentActivityList = document.getElementById('recentActivityList');
const recentActivityRefreshBtn = document.getElementById('recentActivityRefreshBtn');
const notificationWrapper = document.querySelector('.notification-wrapper');
const notificationBell = document.getElementById('notificationBell');
const notificationTray = document.getElementById('notificationTray');
const notificationList = document.getElementById('notificationList');
const notificationBadge = document.querySelector('.notification-badge');
const notificationCounter = document.querySelector('.notification-tray__counter');
const notificationViewAll = document.getElementById('notificationViewAll');

let activeEmpresaId = null;
let activeUsuarioId = null;
let activeUsuarioRol = null;
let lastNotificationsFetch = 0;
const NOTIFICATION_REFRESH_MS = 60 * 1000;
const STOCK_ALERT_REFRESH_MS = 30 * 1000;
let notificationAbortController = null;
let notificationPollIntervalId = null;
let stockAlertPollIntervalId = null;
let cachedNotifications = [];
let serverNotifications = [];
let criticalStockNotifications = [];
let criticalStockState = new Map();

let navegadorTimeZone = null;

try {
    const resolved = new Intl.DateTimeFormat().resolvedOptions();
    if (resolved && resolved.timeZone) {
        navegadorTimeZone = resolved.timeZone;
    }
} catch (error) {
    console.warn('No se pudo obtener la zona horaria del navegador.', error);
}

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

const DEFAULT_STOCK_ALERT_THRESHOLD = 10;
const STOCK_THRESHOLD_STORAGE_PREFIX = 'stockAlertThreshold';

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

function formatRelativeNotificationTime(dateString) {
    if (!dateString) return '';

    const normalized = dateString.replace(' ', 'T');
    const referenceDate = new Date(normalized);

    if (Number.isNaN(referenceDate.getTime())) {
        return '';
    }

    const now = new Date();
    const diffMs = now.getTime() - referenceDate.getTime();

    if (diffMs < 0) {
        const futureSeconds = Math.abs(Math.floor(diffMs / 1000));
        const futureMinutes = Math.floor(futureSeconds / 60);
        if (futureMinutes < 1) return 'Disponible en segundos';
        if (futureMinutes < 60) {
            return `Disponible en ${futureMinutes} minuto${futureMinutes === 1 ? '' : 's'}`;
        }
        const futureHours = Math.floor(futureMinutes / 60);
        if (futureHours < 24) {
            return `Disponible en ${futureHours} hora${futureHours === 1 ? '' : 's'}`;
        }
        const futureDays = Math.floor(futureHours / 24);
        return `Disponible en ${futureDays} día${futureDays === 1 ? '' : 's'}`;
    }

    const diffSeconds = Math.floor(diffMs / 1000);
    if (diffSeconds < 60) {
        return 'Hace unos segundos';
    }
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) {
        return `Hace ${diffMinutes} minuto${diffMinutes === 1 ? '' : 's'}`;
    }
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
        return `Hace ${diffHours} hora${diffHours === 1 ? '' : 's'}`;
    }
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) {
        return `Hace ${diffDays} día${diffDays === 1 ? '' : 's'}`;
    }

    return referenceDate.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short'
    });
}

function getNotificationIcon(prioridad) {
    switch ((prioridad || '').toLowerCase()) {
        case 'alta':
            return 'fa-exclamation-triangle';
        case 'baja':
            return 'fa-info-circle';
        default:
            return 'fa-clipboard-list';
    }
}

function resolveNotificationRoute(route) {
    if (!route) return null;
    const trimmed = route.trim();
    if (!trimmed) return null;
    if (trimmed.toLowerCase() === 'inicio') return null;
    if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
    }
    if (trimmed.startsWith('/')) {
        return trimmed;
    }
    if (trimmed.startsWith('../')) {
        return trimmed;
    }
    return trimmed;
}

function renderNotificationPlaceholder(message, options = {}) {
    if (!notificationList) return;

    const { modifier } = options;

    notificationList.innerHTML = '';

    const listItem = document.createElement('li');
    listItem.className = 'notification-tray__item notification-tray__item--placeholder';
    if (modifier === 'error') {
        listItem.classList.add('notification-tray__item--error');
    }

    const content = document.createElement('div');
    content.className = 'notification-tray__content';

    const paragraph = document.createElement('p');
    paragraph.className = 'notification-tray__placeholder-text';
    paragraph.textContent = message;

    content.appendChild(paragraph);
    listItem.appendChild(content);
    notificationList.appendChild(listItem);
}

function updateNotificationCounters(counts) {
    const normalized = typeof counts === 'object' && counts !== null ? counts : {};
    const totalCount = Number.isFinite(normalized.totalCount) ? Math.max(normalized.totalCount, 0) : 0;
    const newCount = Number.isFinite(normalized.newCount) ? Math.max(normalized.newCount, 0) : 0;

    if (notificationCounter) {
        if (totalCount === 0) {
            notificationCounter.textContent = 'Sin notificaciones';
        } else if (newCount > 0) {
            const nuevasLabel = newCount === 1 ? '1 notificación nueva' : `${newCount} notificaciones nuevas`;
            const totalLabel = totalCount === 1 ? '1 en total' : `${totalCount} en total`;
            notificationCounter.textContent = `${nuevasLabel} · ${totalLabel}`;
        } else {
            notificationCounter.textContent = totalCount === 1
                ? '1 notificación disponible'
                : `${totalCount} notificaciones disponibles`;
        }
    }

    if (notificationBadge) {
        if (totalCount > 0) {
            notificationBadge.textContent = totalCount > 99 ? '99+' : String(totalCount);
            notificationBadge.classList.remove('notification-badge--hidden');
        } else {
            notificationBadge.textContent = '';
            notificationBadge.classList.add('notification-badge--hidden');
        }
    }
}

function renderNotifications(notifications = []) {
    if (!notificationList) return;

    const normalizedNotifications = Array.isArray(notifications) ? notifications : [];
    cachedNotifications = normalizedNotifications;

    notificationList.innerHTML = '';

    if (!normalizedNotifications.length) {
        renderNotificationPlaceholder('No hay notificaciones disponibles en este momento.');
        updateNotificationCounters({ totalCount: 0, newCount: 0 });
        return;
    }

    let newCount = 0;
    const totalCount = normalizedNotifications.length;

    normalizedNotifications.forEach(notification => {
        const listItem = document.createElement('li');
        listItem.className = 'notification-tray__item';

        if ((notification.prioridad || '').toLowerCase() === 'alta') {
            listItem.classList.add('notification-tray__item--critical');
        }

        const isNew = Boolean(
            notification.es_nueva ?? ['Pendiente', 'Enviada'].includes(notification.estado)
        );

        if (isNew) {
            newCount += 1;
            listItem.classList.add('notification-tray__item--new');
        }

        const iconWrapper = document.createElement('div');
        iconWrapper.className = 'notification-tray__icon';

        const icon = document.createElement('i');
        icon.className = `fas ${getNotificationIcon(notification.prioridad)}`;
        iconWrapper.appendChild(icon);

        const content = document.createElement('div');
        content.className = 'notification-tray__content';

        const title = document.createElement('h4');
        title.textContent = notification.titulo || 'Notificación';

        const message = document.createElement('p');
        message.textContent = notification.mensaje || '';

        const time = document.createElement('span');
        time.className = 'notification-tray__time';
        time.textContent = formatRelativeNotificationTime(notification.fecha_disponible_desde);

        content.append(title, message, time);
        listItem.append(iconWrapper, content);

        const targetRoute = resolveNotificationRoute(notification.ruta_destino);
        if (targetRoute) {
            const openTarget = () => {
                if (typeof window.loadPageIntoMainFromNotifications === 'function') {
                    window.loadPageIntoMainFromNotifications(targetRoute, {
                        title: notification.titulo || ''
                    });
                } else {
                    window.location.href = targetRoute;
                }
            };

            listItem.classList.add('notification-tray__item--actionable');
            listItem.tabIndex = 0;
            listItem.addEventListener('click', () => {
                openTarget();
                if (notificationWrapper) {
                    notificationWrapper.classList.remove('open');
                }
                if (notificationBell) {
                    notificationBell.setAttribute('aria-expanded', 'false');
                }
            });
            listItem.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openTarget();
                    if (notificationWrapper) {
                        notificationWrapper.classList.remove('open');
                    }
                    if (notificationBell) {
                        notificationBell.setAttribute('aria-expanded', 'false');
                    }
                }
            });
        }

        notificationList.appendChild(listItem);
    });

    updateNotificationCounters({ totalCount, newCount });
}

function parseNotificationTimestamp(notification) {
    if (!notification) return 0;
    const source = notification.fecha_disponible_desde || notification.creado_en || notification.actualizado_en;
    if (!source) return 0;
    const normalized = String(source).replace(' ', 'T');
    const parsed = Date.parse(normalized);
    return Number.isNaN(parsed) ? 0 : parsed;
}

function sortNotificationsByPriorityAndDate(notifications) {
    const priorityOrder = { alta: 0, media: 1, baja: 2 };
    return notifications.slice().sort((a, b) => {
        const rawPriorityA = (a && a.prioridad) ? a.prioridad.toLowerCase() : '';
        const rawPriorityB = (b && b.prioridad) ? b.prioridad.toLowerCase() : '';
        const priorityA = Object.prototype.hasOwnProperty.call(priorityOrder, rawPriorityA)
            ? priorityOrder[rawPriorityA]
            : 3;
        const priorityB = Object.prototype.hasOwnProperty.call(priorityOrder, rawPriorityB)
            ? priorityOrder[rawPriorityB]
            : 3;
        if (priorityA !== priorityB) {
            return priorityA - priorityB;
        }

        const dateA = parseNotificationTimestamp(a);
        const dateB = parseNotificationTimestamp(b);
        if (dateA !== dateB) {
            return dateB - dateA;
        }

        const idA = a && a.id != null ? String(a.id) : '';
        const idB = b && b.id != null ? String(b.id) : '';
        return idA.localeCompare(idB);
    });
}

function refreshNotificationUI() {
    const combined = sortNotificationsByPriorityAndDate([
        ...criticalStockNotifications,
        ...serverNotifications
    ]);
    renderNotifications(combined);
}

function parseNotificationTimestamp(notification) {
    if (!notification) return 0;
    const source = notification.fecha_disponible_desde || notification.creado_en || notification.actualizado_en;
    if (!source) return 0;
    const normalized = String(source).replace(' ', 'T');
    const parsed = Date.parse(normalized);
    return Number.isNaN(parsed) ? 0 : parsed;
}

function sortNotificationsByPriorityAndDate(notifications) {
    const priorityOrder = { alta: 0, media: 1, baja: 2 };
    return notifications.slice().sort((a, b) => {
        const rawPriorityA = (a && a.prioridad) ? a.prioridad.toLowerCase() : '';
        const rawPriorityB = (b && b.prioridad) ? b.prioridad.toLowerCase() : '';
        const priorityA = Object.prototype.hasOwnProperty.call(priorityOrder, rawPriorityA)
            ? priorityOrder[rawPriorityA]
            : 3;
        const priorityB = Object.prototype.hasOwnProperty.call(priorityOrder, rawPriorityB)
            ? priorityOrder[rawPriorityB]
            : 3;
        if (priorityA !== priorityB) {
            return priorityA - priorityB;
        }

        const dateA = parseNotificationTimestamp(a);
        const dateB = parseNotificationTimestamp(b);
        if (dateA !== dateB) {
            return dateB - dateA;
        }

        const idA = a && a.id != null ? String(a.id) : '';
        const idB = b && b.id != null ? String(b.id) : '';
        return idA.localeCompare(idB);
    });
}

function refreshNotificationUI() {
    const combined = sortNotificationsByPriorityAndDate([
        ...criticalStockNotifications,
        ...serverNotifications
    ]);
    renderNotifications(combined);
}

async function fetchNotifications(options = {}) {
    if (!notificationList || !activeEmpresaId) {
        return;
    }

    const { force = false } = options;
    const now = Date.now();

    if (!force && now - lastNotificationsFetch < NOTIFICATION_REFRESH_MS) {
        return;
    }

    if (notificationAbortController) {
        notificationAbortController.abort();
    }

    notificationAbortController = new AbortController();
    const { signal } = notificationAbortController;

    if (!cachedNotifications.length) {
        renderNotificationPlaceholder('Cargando notificaciones...');
    }

    const params = new URLSearchParams();
    params.set('id_empresa', activeEmpresaId);
    if (activeUsuarioId) {
        params.set('id_usuario', activeUsuarioId);
    }
    if (activeUsuarioRol) {
        params.set('rol', activeUsuarioRol);
    }
    params.set('limite', '20');

    try {
        const response = await fetch(`/scripts/php/get_notifications.php?${params.toString()}`, {
            signal,
            cache: 'no-store'
        });

        if (!response.ok) {
            throw new Error(`Error ${response.status}`);
        }

        const data = await response.json();

        if (!data || data.success !== true) {
            throw new Error(data && data.message ? data.message : 'No se pudo obtener la respuesta del servidor.');
        }

        lastNotificationsFetch = Date.now();
        serverNotifications = Array.isArray(data.notifications) ? data.notifications : [];
        refreshNotificationUI();
    } catch (error) {
        if (error.name === 'AbortError') {
            return;
        }

        console.error('No se pudieron cargar las notificaciones:', error);
        if (!serverNotifications.length && !criticalStockNotifications.length) {
            renderNotificationPlaceholder('No se pudieron cargar las alertas.', { modifier: 'error' });
            updateNotificationCounters({ totalCount: 0, newCount: 0 });
        } else {
            refreshNotificationUI();
        }
    } finally {
        notificationAbortController = null;
    }
}

function startNotificationPolling() {
    if (notificationPollIntervalId) {
        return;
    }

    notificationPollIntervalId = window.setInterval(() => {
        fetchNotifications();
    }, NOTIFICATION_REFRESH_MS);
}

function stopNotificationPolling() {
    if (!notificationPollIntervalId) {
        return;
    }

    clearInterval(notificationPollIntervalId);
    notificationPollIntervalId = null;
    lastNotificationsFetch = 0;
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


function getStockThresholdStorageKey() {
    const empresaId = localStorage.getItem('id_empresa') || '0';
    return `${STOCK_THRESHOLD_STORAGE_PREFIX}_${empresaId}`;
}

function getStockAlertThreshold() {
    const key = getStockThresholdStorageKey();
    const raw = localStorage.getItem(key);
    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed >= 0) {
        return parsed;
    }
    return DEFAULT_STOCK_ALERT_THRESHOLD;
}

function setStockAlertThreshold(value) {
    const sanitized = Math.max(0, Math.round(Number(value) || 0));
    localStorage.setItem(getStockThresholdStorageKey(), String(sanitized));
    if (stockAlertThresholdInput) {
        stockAlertThresholdInput.value = sanitized;
    }
    return sanitized;
}

function setButtonLoading(button, loading) {
    if (!button) return;
    const icon = button.querySelector('i');
    button.disabled = !!loading;
    if (icon) {
        icon.classList.toggle('fa-spin', !!loading);
    }
}

function setListState(listElement, message, iconClass = 'fas fa-info-circle', stateClass = 'card-empty-state') {
    if (!listElement) return;
    listElement.innerHTML = '';
    const li = document.createElement('li');
    li.className = stateClass;
    const icon = document.createElement('i');
    icon.className = iconClass;
    const span = document.createElement('span');
    span.textContent = message;
    li.appendChild(icon);
    li.appendChild(span);
    listElement.appendChild(li);
}

function parseDateFromMysql(mysqlDate) {
    if (!mysqlDate) return null;
    const normalized = mysqlDate.replace(' ', 'T');
    let parsed = new Date(`${normalized}Z`);
    if (Number.isNaN(parsed.getTime())) {
        parsed = new Date(normalized);
    }
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getCriticalProductKey(producto) {
    if (!producto) return '';
    if (producto.id) return `id-${producto.id}`;
    if (producto.producto_id) return `pid-${producto.producto_id}`;
    if (producto.codigo_barras) return `barcode-${producto.codigo_barras}`;
    if (producto.codigo) return `code-${producto.codigo}`;
    const nombre = (producto.nombre || '').toLowerCase().replace(/\s+/g, '-');
    const zona = producto.zona_id ? `-zona-${producto.zona_id}` : '';
    const area = producto.area_id ? `-area-${producto.area_id}` : '';
    return `nombre-${nombre}${zona}${area}`;
}

function buildCriticalStockNotification(producto, threshold, markAsNew, preservedTimestamp) {
    const stockValue = Number(producto && producto.stock);
    const unidades = Number.isFinite(stockValue) ? stockValue : 0;
    const nombre = ((producto && producto.nombre) || 'Producto sin nombre').trim();
    const locationParts = [];
    if (producto && producto.zona_nombre) locationParts.push(producto.zona_nombre);
    if (producto && producto.area_nombre) locationParts.push(producto.area_nombre);
    const ubicacion = locationParts.filter(Boolean).join(' · ');
    const ubicacionTexto = ubicacion ? ` en ${ubicacion}` : '';
    const timestamp = preservedTimestamp || new Date().toISOString().slice(0, 19).replace('T', ' ');

    const limiteTexto = Number.isFinite(threshold)
        ? ` Límite configurado: ${threshold} ${threshold === 1 ? 'unidad' : 'unidades'}.`
        : '';

    return {
        id: `critical-stock-${getCriticalProductKey(producto)}`,
        titulo: `Stock crítico: ${nombre}`,
        mensaje: `Quedan ${unidades} ${unidades === 1 ? 'unidad' : 'unidades'} disponibles${ubicacionTexto}.${limiteTexto}`,
        prioridad: 'Alta',
        fecha_disponible_desde: timestamp,
        ruta_destino: 'gest_inve/inventario_basico.html',
        estado: 'Enviada',
        es_nueva: !!markAsNew,
        tipo_destinatario: 'Usuario',
        es_local: true
    };
}

function updateCriticalStockNotifications(productos, threshold) {
    const previousState = new Map(criticalStockState);
    const nextState = new Map();
    const newlyTriggered = [];

    productos.forEach(producto => {
        const key = getCriticalProductKey(producto);
        if (!key) return;

        const previousEntry = previousState.get(key);
        const alreadyAlerted = previousEntry && previousEntry.alerted === true;
        const preservedTimestamp = previousEntry && previousEntry.notification
            ? previousEntry.notification.fecha_disponible_desde
            : null;
        const notification = buildCriticalStockNotification(producto, threshold, !alreadyAlerted, preservedTimestamp);

        nextState.set(key, {
            alerted: true,
            notification
        });

        if (!alreadyAlerted) {
            newlyTriggered.push(notification);
        }
    });

    if (!productos.length) {
        criticalStockNotifications = [];
        criticalStockState.clear();
    } else {
        criticalStockState = nextState;
        criticalStockNotifications = Array.from(nextState.values()).map(entry => entry.notification);
    }

    if (newlyTriggered.length && JSON.parse(localStorage.getItem('alertMovCriticos') || 'true')) {
        newlyTriggered.forEach(notification => {
            const mensaje = notification.mensaje || 'Se detectó stock crítico en inventario.';
            sendPushNotification(notification.titulo, mensaje);
        });
    }

    refreshNotificationUI();
}

function buildDateDisplay(date) {
    if (!date || Number.isNaN(date.getTime())) {
        return { display: '', tooltip: '' };
    }

    const parts = [];
    const relative = formatRelativeDate(date);
    if (relative) {
        parts.push(relative);
    }
    const formattedTime = formatTime(date);
    if (formattedTime) {
        parts.push(formattedTime);
    }

    let display = parts.join(' · ');
    if (display && timeZoneLabel) {
        display += ` (${timeZoneLabel})`;
    }

    let tooltip = '';
    try {
        const tooltipOptions = {
            dateStyle: 'medium',
            timeStyle: 'short'
        };
        if (navegadorTimeZone) {
            tooltipOptions.timeZone = navegadorTimeZone;
        }
        tooltip = new Intl.DateTimeFormat('es', tooltipOptions).format(date);
    } catch (error) {
        tooltip = date.toLocaleString();
    }

    if (tooltip && timeZoneLabel) {
        tooltip += ` (${timeZoneLabel})`;
    }

    return { display, tooltip };
}

function toggleStockAlertMenu(forceOpen) {
    if (!stockAlertsMenu) return;
    const shouldOpen = typeof forceOpen === 'boolean'
        ? forceOpen
        : !stockAlertsMenu.classList.contains('is-open');
    stockAlertsMenu.classList.toggle('is-open', shouldOpen);
    if (stockAlertsMenuBtn) {
        stockAlertsMenuBtn.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
    }
    if (shouldOpen && stockAlertThresholdInput) {
        stockAlertThresholdInput.focus();
        stockAlertThresholdInput.select();
    }
}


const metricsData = {
    zoneCapacity: [
        { zona: 'A1', porcentaje: 95 },
        { zona: 'B2', porcentaje: 90 }
    ]
};

async function loadHighRotation() {
    if (!highRotationList) return;

    const empresaId = localStorage.getItem('id_empresa');
    if (!empresaId) {
        setListState(highRotationList, 'Registra tu empresa para ver los productos con mayor rotación.', 'fas fa-info-circle', 'card-empty-state');
        return;
    }

    setListState(highRotationList, 'Cargando rotación...', 'fas fa-circle-notch', 'card-loading-state');

    try {
        const response = await fetch(`/scripts/php/get_high_rotation.php?id_empresa=${encodeURIComponent(empresaId)}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const payload = await response.json();
        if (payload && payload.success === false) {
            setListState(highRotationList, payload.message || 'No fue posible obtener la rotación.', 'fas fa-info-circle', 'card-empty-state');
            return;
        }

        const productos = Array.isArray(payload?.productos)
            ? payload.productos
            : (Array.isArray(payload) ? payload : []);

        if (!productos.length) {
            setListState(highRotationList, 'Sin movimientos registrados en las últimas 24 horas.', 'fas fa-info-circle', 'card-empty-state');
            return;
        }

        highRotationList.innerHTML = '';

        productos.forEach(item => {
            const li = document.createElement('li');
            li.className = 'activity-item';

            const iconWrapper = document.createElement('div');
            iconWrapper.className = 'activity-icon';
            const icon = document.createElement('i');
            icon.className = 'fas fa-box';
            iconWrapper.appendChild(icon);

            const details = document.createElement('div');
            details.className = 'activity-details';

            const nameDiv = document.createElement('div');
            nameDiv.className = 'activity-description';
            nameDiv.textContent = item.producto_nombre || 'Producto sin nombre';

            const movementDiv = document.createElement('div');
            movementDiv.className = 'activity-time';
            const totalMovimientos = Number.isFinite(item.total_movimientos)
                ? item.total_movimientos
                : Number(item.total_movimientos) || 0;
            movementDiv.textContent = `${totalMovimientos} mov.`;

            const totalUnidades = Number.isFinite(item.total_unidades)
                ? item.total_unidades
                : Number(item.total_unidades) || 0;
            const ultimaFecha = parseDateFromMysql(item.ultima_fecha);
            const tooltipPartes = [`Unidades movidas: ${totalUnidades}`];
            tooltipPartes.push(`Movimientos registrados: ${totalMovimientos}`);
            if (ultimaFecha) {
                const { display, tooltip } = buildDateDisplay(ultimaFecha);
                if (display) {
                    tooltipPartes.push(`Último movimiento: ${display}`);
                }
                if (tooltip) {
                    tooltipPartes.push(tooltip);
                }
            }
            movementDiv.title = tooltipPartes.join('\n');

            details.appendChild(nameDiv);
            details.appendChild(movementDiv);

            li.appendChild(iconWrapper);
            li.appendChild(details);

            highRotationList.appendChild(li);
        });
    } catch (error) {
        console.error('Error loading high rotation data:', error);
        setListState(highRotationList, 'No se pudo cargar la rotación. Intenta nuevamente.', 'fas fa-triangle-exclamation', 'card-empty-state');
    }
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

async function loadStockAlerts() {
    if (!stockAlertList) return;

    const threshold = getStockAlertThreshold();
    if (stockAlertThresholdInput) {
        stockAlertThresholdInput.value = threshold;
    }

    const empresaId = localStorage.getItem('id_empresa');
    if (!empresaId) {
        setListState(stockAlertList, 'Registra tu empresa para ver las alertas de stock.', 'fas fa-info-circle', 'card-empty-state');
        updateCriticalStockNotifications([], threshold);
        return;
    }

    setButtonLoading(stockAlertsRefreshBtn, true);
    setListState(stockAlertList, 'Cargando inventario...', 'fas fa-circle-notch', 'card-loading-state');

    try {
        const response = await fetch(`/scripts/php/guardar_productos.php?empresa_id=${encodeURIComponent(empresaId)}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const payload = await response.json();
        const productos = Array.isArray(payload) ? payload : [];

        const filtrados = productos
            .filter(prod => {
                const stockValue = Number(prod.stock);
                if (!Number.isFinite(stockValue)) {
                    return threshold >= 0; // stock no definido se considera crítico
                }
                return stockValue <= threshold;
            })
            .sort((a, b) => (Number(a.stock) || 0) - (Number(b.stock) || 0));

        updateCriticalStockNotifications(filtrados, threshold);

        stockAlertList.innerHTML = '';

        if (!filtrados.length) {
            setListState(stockAlertList, 'Todo el inventario está por encima del límite configurado.', 'fas fa-check-circle', 'card-empty-state');
            return;
        }

        filtrados.slice(0, 8).forEach(prod => {
            const li = document.createElement('li');
            li.className = 'stock-alert-item';

            const infoDiv = document.createElement('div');
            infoDiv.className = 'stock-alert-info';

            const iconDiv = document.createElement('div');
            iconDiv.className = 'stock-alert-icon';
            const icon = document.createElement('i');
            icon.className = 'fas fa-box-open';
            iconDiv.appendChild(icon);

            const textWrapper = document.createElement('div');

            const nameDiv = document.createElement('div');
            nameDiv.className = 'stock-alert-name';
            nameDiv.textContent = (prod.nombre || 'Producto sin nombre').trim();

            const detailDiv = document.createElement('div');
            detailDiv.className = 'stock-alert-detail';
            const locationParts = [];
            if (prod.zona_nombre) locationParts.push(prod.zona_nombre);
            if (prod.area_nombre) locationParts.push(prod.area_nombre);
            const ubicacion = locationParts.filter(Boolean).join(' · ');
            detailDiv.textContent = ubicacion || 'Sin ubicación asignada';

            textWrapper.appendChild(nameDiv);
            textWrapper.appendChild(detailDiv);

            infoDiv.appendChild(iconDiv);
            infoDiv.appendChild(textWrapper);

            const stockDiv = document.createElement('div');
            stockDiv.className = 'stock-alert-stock';
            const stockValue = Number(prod.stock);
            const unidades = Number.isFinite(stockValue) ? stockValue : 0;
            stockDiv.textContent = `${unidades} ${unidades === 1 ? 'unidad' : 'unidades'}`;

            li.appendChild(infoDiv);
            li.appendChild(stockDiv);

            stockAlertList.appendChild(li);
        });
    } catch (error) {
        console.error('Error loading stock alerts:', error);
        setListState(stockAlertList, 'No se pudo cargar el inventario. Intenta nuevamente.', 'fas fa-triangle-exclamation', 'card-empty-state');
    } finally {
        setButtonLoading(stockAlertsRefreshBtn, false);
    }
}

function startStockAlertAutoRefresh() {
    if (stockAlertPollIntervalId) {
        return;
    }

    stockAlertPollIntervalId = window.setInterval(() => {
        loadStockAlerts();
    }, STOCK_ALERT_REFRESH_MS);
}

function stopStockAlertAutoRefresh() {
    if (!stockAlertPollIntervalId) {
        return;
    }

    clearInterval(stockAlertPollIntervalId);
    stockAlertPollIntervalId = null;
}

async function loadRecentMovements() {
    if (!recentActivityList) return;

    const empresaId = localStorage.getItem('id_empresa');
    if (!empresaId) {
        setListState(recentActivityList, 'Registra tu empresa para ver los movimientos recientes.', 'fas fa-info-circle', 'card-empty-state');
        return;
    }

    setButtonLoading(recentActivityRefreshBtn, true);
    setListState(recentActivityList, 'Cargando movimientos...', 'fas fa-circle-notch', 'card-loading-state');

    try {
        const response = await fetch(`/scripts/php/get_recent_movements.php?id_empresa=${encodeURIComponent(empresaId)}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const payload = await response.json();
        if (payload && payload.success === false) {
            setListState(recentActivityList, payload.message || 'No hay movimientos recientes.', 'fas fa-info-circle', 'card-empty-state');
            return;
        }

        const movimientos = Array.isArray(payload?.movimientos) ? payload.movimientos : (Array.isArray(payload) ? payload : []);

        if (!movimientos.length) {
            setListState(recentActivityList, 'No se encontraron movimientos de inventario recientes.', 'fas fa-info-circle', 'card-empty-state');
            return;
        }

        recentActivityList.innerHTML = '';

        movimientos.slice(0, 5).forEach(mov => {
            const tipo = (mov.tipo || '').toLowerCase();
            let movementClass = 'mov-ajuste';
            let iconClass = 'fa-exchange-alt';
            let verbo = 'Movimiento';
            if (tipo === 'ingreso') {
                movementClass = 'mov-ingreso';
                iconClass = 'fa-arrow-down';
                verbo = 'Ingreso';
            } else if (tipo === 'egreso') {
                movementClass = 'mov-egreso';
                iconClass = 'fa-arrow-up';
                verbo = 'Egreso';
            } else {
                verbo = 'Ajuste';
            }

            const li = document.createElement('li');
            li.className = `activity-item ${movementClass}`;

            const iconWrapper = document.createElement('div');
            iconWrapper.className = 'activity-icon';
            const icon = document.createElement('i');
            icon.className = `fas ${iconClass}`;
            iconWrapper.appendChild(icon);

            const details = document.createElement('div');
            details.className = 'activity-details';

            const description = document.createElement('div');
            description.className = 'activity-description';
            const cantidad = Number(mov.cantidad);
            const unidades = Number.isFinite(cantidad) ? cantidad : 0;
            let descripcionTexto = `${verbo} de ${unidades} ${unidades === 1 ? 'unidad' : 'unidades'}`;
            const producto = (mov.producto_nombre || '').trim();
            if (producto) {
                descripcionTexto += ` de ${producto}`;
            }
            const ubicacion = [mov.zona_nombre, mov.area_nombre]
                .map(part => (part || '').trim())
                .filter(Boolean)
                .join(' · ');
            if (ubicacion) {
                descripcionTexto += ` (${ubicacion})`;
            }
            description.textContent = descripcionTexto;

            const meta = document.createElement('div');
            meta.className = 'activity-time';
            const fecha = parseDateFromMysql(mov.fecha_movimiento);
            const { display, tooltip } = buildDateDisplay(fecha);
            const responsable = [mov.usuario_nombre, mov.usuario_apellido]
                .map(part => (part || '').trim())
                .filter(Boolean)
                .join(' ');
            const stockActual = Number(mov.stock_actual);

            const metaPartes = [];
            if (display) {
                metaPartes.push(display);
            }
            if (responsable) {
                metaPartes.push(`Por ${responsable}`);
            }
            if (Number.isFinite(stockActual)) {
                metaPartes.push(`Stock actual: ${stockActual}`);
            }
            meta.textContent = metaPartes.join(' · ');
            if (tooltip) {
                meta.title = tooltip;
            }

            details.appendChild(description);
            details.appendChild(meta);

            li.appendChild(iconWrapper);
            li.appendChild(details);

            recentActivityList.appendChild(li);
        });
    } catch (error) {
        console.error('Error loading recent movements:', error);
        setListState(recentActivityList, 'No se pudieron cargar los movimientos. Inténtalo nuevamente.', 'fas fa-triangle-exclamation', 'card-empty-state');
    } finally {
        setButtonLoading(recentActivityRefreshBtn, false);
    }
}

function loadMetrics() {
    loadHighRotation();
    renderZoneCapacity();
    loadStockAlerts();
    loadRecentMovements();
}

function saveHomeData() {
    const data = {
        empresaTitulo: document.getElementById('empresaTitulo')?.textContent || '',
        highRotation: document.getElementById('highRotationList')?.innerHTML || '',
        zoneCapacity: document.getElementById('zoneCapacityList')?.innerHTML || '',
        accessLogs: document.getElementById('accessLogsList')?.innerHTML || '',
        stockAlerts: document.getElementById('stockAlertList')?.innerHTML || '',
        recentActivity: document.getElementById('recentActivityList')?.innerHTML || ''
    };
    sessionStorage.setItem('homeData', JSON.stringify(data));
}

function restoreHomeData() {
    const raw = sessionStorage.getItem('homeData');
    if (!raw) return;
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
        const stockAlerts = document.getElementById('stockAlertList');
        if (stockAlerts && data.stockAlerts) stockAlerts.innerHTML = data.stockAlerts;
        const recentActivity = document.getElementById('recentActivityList');
        if (recentActivity && data.recentActivity) recentActivity.innerHTML = data.recentActivity;
    } catch (e) {
        console.error('Error restoring home data', e);
    }
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
const openTutorialBtn = document.getElementById('openTutorialBtn');
let tutorialHole = null;

const updateLocalTutorialFlag = (isSeen) => {
    const userId = localStorage.getItem('usuario_id');
    if (!userId) return;
    localStorage.setItem(`tutorialVisto_${userId}`, isSeen ? '1' : '0');
    localStorage.removeItem(`tutorialShown_${userId}`);
};

async function checkFirstVisit() {
    const userId = localStorage.getItem('usuario_id');
    if (!userId) return;

    try {
        const response = await fetch('/scripts/php/get_tutorial_status.php', {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (data.success) {
            const alreadySeen = Number(data.tutorial_visto) === 1;
            updateLocalTutorialFlag(alreadySeen);
            if (!alreadySeen) {
                startTutorial();
            }
        } else {
            const storedFlag = localStorage.getItem(`tutorialVisto_${userId}`);
            if (storedFlag !== '1') {
                startTutorial();
            }
        }
    } catch (error) {
        console.error('Error al verificar el estado del tutorial:', error);
        const storedFlag = localStorage.getItem(`tutorialVisto_${userId}`);
        if (storedFlag !== '1') {
            startTutorial();
        }
    }
}

// Start the tutorial
function startTutorial() {
    currentStep = 0;
    tutorialOverlayBg.style.display = 'block';
    tutorialCardContainer.style.display = 'flex';
    requestAnimationFrame(() => {
        showTutorialStep(currentStep);
    });
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
    markTutorialAsSeen();
}

function markTutorialAsSeen() {
    const userId = localStorage.getItem('usuario_id');
    if (!userId) {
        return;
    }

    if (localStorage.getItem(`tutorialVisto_${userId}`) === '1') {
        return;
    }

    fetch('/scripts/php/update_tutorial_status.php', {
        method: 'POST',
        credentials: 'include'
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                updateLocalTutorialFlag(true);
            } else {
                console.warn('No se pudo actualizar el estado del tutorial:', data.message);
            }
        })
        .catch(error => {
            console.error('Error al actualizar el estado del tutorial:', error);
        });
}

// Event Listeners
nextTutorial.addEventListener('click', () => {
    showTutorialStep(currentStep + 1);
});

skipTutorial.addEventListener('click', endTutorial);
closeTutorial.addEventListener('click', endTutorial);

if (openTutorialBtn) {
    openTutorialBtn.addEventListener('click', () => {
        startTutorial();
    });
}

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

// Notification tray handlers
if (notificationWrapper && notificationBell && notificationTray) {
    const closeTray = () => {
        if (!notificationWrapper.classList.contains('open')) {
            return;
        }

        notificationWrapper.classList.remove('open');
        notificationBell.setAttribute('aria-expanded', 'false');
    };

    notificationBell.addEventListener('click', event => {
        event.stopPropagation();
        const isOpen = notificationWrapper.classList.toggle('open');
        notificationBell.setAttribute('aria-expanded', String(isOpen));

        if (isOpen) {
            fetchNotifications();
            notificationTray.focus();
        }
    });

    document.addEventListener('click', event => {
        if (!notificationWrapper.contains(event.target)) {
            closeTray();
        }
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            closeTray();
            notificationBell.focus();
        }
    });
}

if (notificationViewAll) {
    notificationViewAll.addEventListener('click', () => {
        const targetNotification = cachedNotifications.find(notification => resolveNotificationRoute(notification.ruta_destino));

        if (targetNotification) {
            const targetRoute = resolveNotificationRoute(targetNotification.ruta_destino);
            if (targetRoute) {
                if (typeof window.loadPageIntoMainFromNotifications === 'function') {
                    window.loadPageIntoMainFromNotifications(targetRoute, {
                        title: targetNotification.titulo || ''
                    });
                } else {
                    window.location.href = targetRoute;
                }
            }
        } else {
            fetchNotifications({ force: true });
        }

        if (notificationWrapper) {
            notificationWrapper.classList.remove('open');
        }
        if (notificationBell) {
            notificationBell.setAttribute('aria-expanded', 'false');
        }
    });
}

// Quick actions QR scanner
const ingresoFlashBtn = document.getElementById('ingresoFlashBtn');
const egresoFlashBtn = document.getElementById('egresoFlashBtn');
const flashScanModalElement = document.getElementById('flashScanModal');
const flashScanModal = flashScanModalElement && typeof bootstrap !== 'undefined'
    ? new bootstrap.Modal(flashScanModalElement)
    : null;
const flashQrReader = document.getElementById('flashQrReader');
const flashQrHelperText = document.getElementById('flashQrHelperText');
const flashScanResult = document.getElementById('flashScanResult');
const flashScanProdName = document.getElementById('flashScanProductoNombre');
const flashScanProdCodigo = document.getElementById('flashScanProductoCodigo');
const flashScanProdStock = document.getElementById('flashScanProductoStock');
const flashScanTipoDisplay = document.getElementById('flashScanMovimientoResumen');
const flashScanCantidadInput = document.getElementById('flashScanMovimientoCantidad');
const flashScanCantidadHelp = document.getElementById('flashScanCantidadAyuda');
const flashScanRegistrar = document.getElementById('flashScanRegistrar');
const flashScanReintentar = document.getElementById('flashScanReintentar');
const flashToastStack = document.getElementById('flashToastStack');

const FLASH_API = {
    productos: '../../scripts/php/guardar_productos.php',
    movimiento: '../../scripts/php/guardar_movimientos.php'
};

const FLASH_EMPRESA_ID = parseInt(localStorage.getItem('id_empresa'), 10) || 0;
const FLASH_TEXTOS = {
    base: 'Coloca el código frente a la cámara para registrar el movimiento y confirma la operación antes de guardarla.',
    producto: 'Producto identificado. Confirma la cantidad antes de guardar el movimiento.'
};

let flashQrScanner = null;
let flashScannerActivo = false;
let flashPreferredCameraId = null;
let flashFallbackCameraId = null;
let flashProductoActual = null;
let flashMovimientoForzado = 'ingreso';
let flashIniciarEscaneoPendiente = false;
let flashAvisoCantidadCero = false;
let flashLastScanError = '';

function flashActualizarMovimientoUI() {
    if (!flashScanTipoDisplay) {
        return;
    }

    const esEgreso = flashMovimientoForzado === 'egreso';
    flashScanTipoDisplay.textContent = esEgreso ? 'Egreso' : 'Ingreso';
    flashScanTipoDisplay.classList.toggle('bg-danger', esEgreso);
    flashScanTipoDisplay.classList.toggle('bg-success', !esEgreso);
}

function flashShowToast(message, type = 'info') {
    if (!flashToastStack || typeof bootstrap === 'undefined') {
        alert(message);
        return;
    }

    const tipoClase = type === 'success'
        ? 'text-bg-success'
        : type === 'error'
            ? 'text-bg-danger'
            : 'text-bg-primary';

    const toast = document.createElement('div');
    toast.className = `toast align-items-center ${tipoClase} border-0 shadow`;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Cerrar"></button>
        </div>
    `;

    flashToastStack.appendChild(toast);
    const delay = type === 'error' ? 3600 : 2600;
    const toastInstance = new bootstrap.Toast(toast, { delay });
    toastInstance.show();
    toast.addEventListener('hidden.bs.toast', () => toast.remove());
}

async function flashFetchJSON(url, method = 'GET', payload) {
    const options = { method };
    if (payload) {
        options.headers = { 'Content-Type': 'application/json' };
        options.body = JSON.stringify(payload);
    }

    const response = await fetch(url, options);
    const text = await response.text();
    let data;
    try {
        data = text ? JSON.parse(text) : {};
    } catch (error) {
        throw new Error(`Respuesta no válida del servidor (${response.status})`);
    }

    if (!response.ok) {
        const mensaje = data?.error || `Error HTTP ${response.status}`;
        throw new Error(mensaje);
    }

    return data;
}

function flashObtenerStock(producto) {
    if (!producto) return 0;
    const raw = producto.stock ?? producto.stock_actual ?? 0;
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : 0;
}

function flashActualizarUIProducto() {
    if (!flashProductoActual) return;
    if (flashScanProdName) {
        flashScanProdName.textContent = flashProductoActual.nombre || `Producto #${flashProductoActual.id}`;
    }
    if (flashScanProdCodigo) {
        flashScanProdCodigo.textContent = `ID interno: ${flashProductoActual.id}`;
    }
    if (flashScanProdStock) {
        flashScanProdStock.textContent = String(flashObtenerStock(flashProductoActual));
    }
}

function flashActualizarAyudaCantidad() {
    if (!flashProductoActual) {
        if (flashScanCantidadHelp) {
            flashScanCantidadHelp.textContent = 'Escanea un producto para registrar su movimiento.';
        }
        if (flashScanRegistrar) {
            flashScanRegistrar.disabled = true;
        }
        return;
    }

    if (!flashScanCantidadInput) return;

    const tipo = flashMovimientoForzado === 'egreso' ? 'egreso' : 'ingreso';
    const stockActual = flashObtenerStock(flashProductoActual);
    const rawCantidad = flashScanCantidadInput.value.trim();
    const cantidad = rawCantidad === '' ? 1 : parseInt(rawCantidad, 10);

    flashScanCantidadInput.min = '1';

    if (tipo === 'egreso') {
        if (stockActual <= 0) {
            flashScanCantidadInput.value = '';
            flashScanCantidadInput.disabled = true;
            flashScanCantidadInput.removeAttribute('max');
            if (flashScanCantidadHelp) {
                flashScanCantidadHelp.textContent = 'No hay unidades disponibles para registrar un egreso.';
            }
            if (flashScanRegistrar) {
                flashScanRegistrar.disabled = true;
            }
            return;
        }

        flashScanCantidadInput.disabled = false;
        flashScanCantidadInput.max = String(stockActual);
        if (rawCantidad !== '' && Number.isFinite(cantidad) && cantidad > stockActual) {
            flashScanCantidadInput.value = String(stockActual);
        }
        if (flashScanCantidadHelp) {
            const plural = stockActual === 1 ? '' : 'es';
            flashScanCantidadHelp.textContent = `Puedes retirar hasta ${stockActual} unidad${plural}.`;
        }
        if (flashScanRegistrar) {
            flashScanRegistrar.disabled = false;
        }
        return;
    }

    flashScanCantidadInput.disabled = false;
    flashScanCantidadInput.removeAttribute('max');
    if (flashScanCantidadHelp) {
        flashScanCantidadHelp.textContent = 'Las unidades ingresadas se sumarán al stock actual.';
    }
    if (flashScanRegistrar) {
        flashScanRegistrar.disabled = false;
    }
}

function flashPrepararUI() {
    flashProductoActual = null;
    flashQrReader?.classList.remove('d-none');
    flashScanResult?.classList.add('d-none');
    if (flashQrHelperText) {
        flashQrHelperText.textContent = FLASH_TEXTOS.base;
    }
    if (flashScanProdName) {
        flashScanProdName.textContent = 'Producto seleccionado';
    }
    if (flashScanProdCodigo) {
        flashScanProdCodigo.textContent = 'ID interno:';
    }
    if (flashScanProdStock) {
        flashScanProdStock.textContent = '0';
    }
    flashActualizarMovimientoUI();
    if (flashScanCantidadInput) {
        flashScanCantidadInput.value = '';
        flashScanCantidadInput.disabled = true;
        flashScanCantidadInput.removeAttribute('max');
    }
    flashAvisoCantidadCero = false;
    if (flashScanCantidadHelp) {
        flashScanCantidadHelp.textContent = 'Escanea un producto para registrar su movimiento.';
    }
    if (flashScanRegistrar) {
        flashScanRegistrar.disabled = true;
    }
}

function flashMostrarProducto(producto) {
    flashProductoActual = producto;
    flashQrReader?.classList.add('d-none');
    flashScanResult?.classList.remove('d-none');
    if (flashQrHelperText) {
        flashQrHelperText.textContent = FLASH_TEXTOS.producto;
    }
    flashActualizarMovimientoUI();
    if (flashScanCantidadInput) {
        flashScanCantidadInput.disabled = false;
        flashScanCantidadInput.value = '';
        flashScanCantidadInput.min = '1';
        flashScanCantidadInput.removeAttribute('max');
    }
    flashAvisoCantidadCero = false;
    if (flashScanRegistrar) {
        flashScanRegistrar.disabled = false;
    }
    flashActualizarUIProducto();
    flashActualizarAyudaCantidad();
}

async function flashDetenerScanner() {
    if (!flashQrScanner || !flashScannerActivo) return;

    try {
        await flashQrScanner.stop();
    } catch (error) {
        console.warn('No se pudo detener el escáner', error);
    } finally {
        flashScannerActivo = false;
    }

    try {
        await flashQrScanner.clear();
    } catch (error) {
        console.debug('No se pudo limpiar el contenedor del escáner', error);
    }
}

function flashGetScannerConfig() {
    const readerWidth = flashQrReader?.offsetWidth || 0;
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
}

async function flashIniciarScanner() {
    if (!flashScanModalElement?.classList.contains('show')) {
        flashIniciarEscaneoPendiente = true;
        return;
    }
    if (flashScannerActivo) {
        return;
    }
    if (!flashQrReader) {
        flashShowToast('No se encontró el lector QR en la interfaz', 'error');
        return;
    }
    if (typeof Html5Qrcode === 'undefined') {
        flashShowToast('El lector QR no está disponible en este navegador.', 'error');
        return;
    }

    if (!flashQrScanner) {
        flashQrScanner = new Html5Qrcode('flashQrReader');
    }

    const config = flashGetScannerConfig();

    const startWithCamera = async cameraId => {
        if (!cameraId) {
            await flashQrScanner.start({ facingMode: { ideal: 'environment' } }, config, flashProcesarLectura, flashHandleScanError);
            return;
        }
        await flashQrScanner.start({ deviceId: { exact: cameraId } }, config, flashProcesarLectura, flashHandleScanError);
    };

    try {
        await startWithCamera(flashPreferredCameraId);
        flashScannerActivo = true;
        flashIniciarEscaneoPendiente = false;
    } catch (error) {
        console.warn('No se pudo iniciar la cámara preferida, intentando alternativa.', error);
        if (flashFallbackCameraId && flashFallbackCameraId !== flashPreferredCameraId) {
            try {
                await startWithCamera(flashFallbackCameraId);
                flashScannerActivo = true;
                flashIniciarEscaneoPendiente = false;
                return;
            } catch (fallbackError) {
                console.error('No se pudo iniciar la cámara alternativa', fallbackError);
            }
        }

        flashQrReader?.classList.add('d-none');
        flashScanModal?.hide();
        flashShowToast('Error al iniciar la cámara', 'error');
    }
}

function flashHandleScanError(errorMessage) {
    if (typeof errorMessage !== 'string') return;
    if (errorMessage === flashLastScanError) return;
    flashLastScanError = errorMessage;
}

async function flashProcesarLectura(decodedText) {
    await flashDetenerScanner();

    const productoId = parseInt(String(decodedText).trim(), 10);
    if (!Number.isFinite(productoId)) {
        flashShowToast('Código QR no reconocido', 'error');
        flashPrepararUI();
        try {
            await flashIniciarScanner();
        } catch (error) {
            console.warn('No se pudo reiniciar el escáner tras un código inválido', error);
        }
        return;
    }

    let producto = null;
    try {
        producto = await flashFetchJSON(`${FLASH_API.productos}?empresa_id=${FLASH_EMPRESA_ID}&id=${productoId}`);
    } catch (error) {
        console.warn('No se pudo obtener el producto escaneado', error);
    }

    if (!producto || !producto.id) {
        flashShowToast('El producto escaneado no se encuentra en el inventario.', 'error');
        flashPrepararUI();
        try {
            await flashIniciarScanner();
        } catch (reinicioError) {
            console.warn('No se pudo reiniciar el escáner tras un producto desconocido', reinicioError);
        }
        return;
    }

    flashMostrarProducto(producto);
}

async function flashPrepararCamara() {
    if (!navigator.mediaDevices || !window.isSecureContext) {
        flashShowToast('La cámara no es compatible o se requiere HTTPS/localhost', 'error');
        return false;
    }

    let testStream;
    try {
        testStream = await navigator.mediaDevices.getUserMedia({ video: true });
    } catch (error) {
        console.error('No se pudo obtener permiso para la cámara', error);
        flashShowToast('Permiso de cámara denegado o no disponible', 'error');
        return false;
    } finally {
        if (testStream) {
            testStream.getTracks().forEach(track => track.stop());
        }
    }

    let cameras = [];
    if (typeof Html5Qrcode !== 'undefined') {
        try {
            cameras = await Html5Qrcode.getCameras();
        } catch (error) {
            console.warn('No se pudieron enumerar las cámaras disponibles', error);
            cameras = [];
        }
    }

    if (Array.isArray(cameras) && cameras.length > 0) {
        const backRegex = /(back|rear|environment)/i;
        const backCamera = cameras.find(cam => backRegex.test(cam.label));
        flashPreferredCameraId = (backCamera || cameras[0]).id;
        const secondary = cameras.find(cam => cam.id !== flashPreferredCameraId);
        flashFallbackCameraId = secondary ? secondary.id : null;
    } else {
        flashPreferredCameraId = null;
        flashFallbackCameraId = null;
    }

    return true;
}

async function flashAbrirScanner(tipo) {
    if (!flashScanModal) {
        flashShowToast('No se pudo abrir el escáner QR', 'error');
        return;
    }
    if (!FLASH_EMPRESA_ID) {
        flashShowToast('Registra una empresa antes de usar el escáner QR.', 'error');
        return;
    }

    const ok = await flashPrepararCamara();
    if (!ok) {
        return;
    }

    flashMovimientoForzado = tipo === 'egreso' ? 'egreso' : 'ingreso';
    flashActualizarMovimientoUI();
    flashPrepararUI();
    flashIniciarEscaneoPendiente = true;
    flashScanModal.show();
}

flashScanModalElement?.addEventListener('shown.bs.modal', async () => {
    flashPrepararUI();
    flashIniciarEscaneoPendiente = false;
    try {
        await flashIniciarScanner();
    } catch (error) {
        console.warn('No se pudo iniciar el escáner al abrir el modal', error);
    }
});

flashScanModalElement?.addEventListener('hidden.bs.modal', async () => {
    await flashDetenerScanner();
    flashIniciarEscaneoPendiente = false;
    flashPrepararUI();
});

flashScanCantidadInput?.addEventListener('input', () => {
    if (!flashScanCantidadInput) return;

    const raw = flashScanCantidadInput.value.trim();

    if (raw === '') {
        flashAvisoCantidadCero = false;
        flashActualizarAyudaCantidad();
        return;
    }

    let value = parseInt(raw, 10);

    if (!Number.isFinite(value)) {
        flashScanCantidadInput.value = '';
        flashActualizarAyudaCantidad();
        return;
    }

    if (value === 0) {
        if (!flashAvisoCantidadCero) {
            flashShowToast('La cantidad debe ser mayor a cero.', 'error');
            flashAvisoCantidadCero = true;
        }
        flashScanCantidadInput.value = '';
        flashActualizarAyudaCantidad();
        return;
    }

    flashAvisoCantidadCero = false;

    if (value < 0) {
        flashScanCantidadInput.value = '';
        flashActualizarAyudaCantidad();
        return;
    }

    if (flashProductoActual && flashMovimientoForzado === 'egreso') {
        const stockActual = flashObtenerStock(flashProductoActual);
        if (stockActual > 0 && value > stockActual) {
            value = stockActual;
        }
    }

    flashScanCantidadInput.value = String(value);
    flashActualizarAyudaCantidad();
});

flashScanReintentar?.addEventListener('click', async () => {
    await flashDetenerScanner();
    flashPrepararUI();
    try {
        await flashIniciarScanner();
    } catch (error) {
        console.warn('No se pudo reiniciar el escáner manualmente', error);
    }
});

flashScanRegistrar?.addEventListener('click', async () => {
    if (!flashProductoActual) {
        flashShowToast('Escanea un producto antes de registrar el movimiento.', 'error');
        return;
    }

    const prodId = parseInt(flashProductoActual.id, 10);
    if (!Number.isFinite(prodId)) {
        flashShowToast('El identificador del producto es inválido.', 'error');
        return;
    }
    const tipo = flashMovimientoForzado === 'egreso' ? 'egreso' : 'ingreso';
    const rawCantidad = flashScanCantidadInput?.value?.trim() ?? '';
    const cantidad = rawCantidad === '' ? 1 : parseInt(rawCantidad, 10);

    if (!Number.isFinite(cantidad) || cantidad <= 0) {
        flashShowToast('La cantidad debe ser mayor a cero.', 'error');
        if (flashScanCantidadInput) {
            flashScanCantidadInput.value = '';
        }
        flashActualizarAyudaCantidad();
        return;
    }

    const stockActual = flashObtenerStock(flashProductoActual);

    if (tipo === 'egreso') {
        if (stockActual <= 0) {
            flashShowToast('No hay unidades disponibles para egresar.', 'error');
            flashActualizarAyudaCantidad();
            return;
        }
        if (cantidad > stockActual) {
            flashShowToast('La cantidad no puede exceder el stock disponible.', 'error');
            if (flashScanCantidadInput) {
                flashScanCantidadInput.value = String(stockActual);
            }
            flashActualizarAyudaCantidad();
            return;
        }
    }

    try {
        if (flashScanRegistrar) {
            flashScanRegistrar.disabled = true;
        }

        const payload = {
            empresa_id: FLASH_EMPRESA_ID,
            producto_id: prodId,
            tipo,
            cantidad
        };

        const resultado = await flashFetchJSON(FLASH_API.movimiento, 'POST', payload);
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

        flashProductoActual.stock = nuevoStock;
        flashActualizarUIProducto();
        flashShowToast(`Movimiento ${tipo} registrado`, 'success');
        flashActualizarAyudaCantidad();
    } catch (error) {
        console.error(error);
        flashShowToast('Error al registrar movimiento: ' + (error?.message || 'desconocido'), 'error');
    } finally {
        if (flashScanRegistrar) {
            flashScanRegistrar.disabled = false;
        }
        flashActualizarAyudaCantidad();
    }
});

ingresoFlashBtn?.addEventListener('click', () => {
    flashAbrirScanner('ingreso');
});

egresoFlashBtn?.addEventListener('click', () => {
    flashAbrirScanner('egreso');
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

if (stockAlertsRefreshBtn) {
    stockAlertsRefreshBtn.addEventListener('click', () => {
        loadStockAlerts();
    });
}

if (recentActivityRefreshBtn) {
    recentActivityRefreshBtn.addEventListener('click', () => {
        loadRecentMovements();
    });
}

if (stockAlertsMenuBtn) {
    stockAlertsMenuBtn.addEventListener('click', event => {
        event.stopPropagation();
        toggleStockAlertMenu();
    });
}

if (stockAlertApplyBtn) {
    stockAlertApplyBtn.addEventListener('click', () => {
        const value = stockAlertThresholdInput ? stockAlertThresholdInput.value : DEFAULT_STOCK_ALERT_THRESHOLD;
        const sanitized = setStockAlertThreshold(value);
        toggleStockAlertMenu(false);
        loadStockAlerts();
        console.info(`Nuevo límite de stock para alertas: ${sanitized}`);
    });
}

if (stockAlertCancelBtn) {
    stockAlertCancelBtn.addEventListener('click', () => {
        if (stockAlertThresholdInput) {
            stockAlertThresholdInput.value = getStockAlertThreshold();
        }
        toggleStockAlertMenu(false);
    });
}

if (stockAlertThresholdInput) {
    stockAlertThresholdInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            if (stockAlertApplyBtn) {
                stockAlertApplyBtn.click();
            }
        }
    });
}

document.addEventListener('click', event => {
    if (!stockAlertsMenu || !stockAlertsMenu.classList.contains('is-open')) return;
    const target = event.target;
    if (stockAlertsMenu.contains(target) || (stockAlertsMenuBtn && stockAlertsMenuBtn.contains(target))) {
        return;
    }
    toggleStockAlertMenu(false);
});

document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
        toggleStockAlertMenu(false);
    }
});

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
        if (mainContent) {
            mainContent.classList.remove('search-page-host');
            const existingSearchRoot = mainContent.querySelector('.search-page-root');
            if (existingSearchRoot) {
                existingSearchRoot.classList.remove('search-page-root');
            }
        }
    }

    function normalizePageUrl(pageUrl) {
        if (!pageUrl) return '';
        const trimmed = pageUrl.trim();
        if (!trimmed) return '';
        if (/^https?:\/\//i.test(trimmed)) return trimmed;
        if (trimmed.startsWith('/')) return trimmed;
        if (trimmed.startsWith('../')) return trimmed;
        if (trimmed.startsWith('./')) return `../${trimmed.slice(2)}`;
        return `../${trimmed}`;
    }

    function setTopbarTitle(text) {
        if (!text) return;
        const topbarTitle = document.querySelector('.topbar-title');
        if (topbarTitle) {
            topbarTitle.textContent = text;
        }
    }

    function setActiveSidebarItem(page) {
        if (!page) return '';
        const normalized = page.replace(/^(\.\.\/)+/, '').replace(/^\//, '');
        let matchedLabel = '';
        document.querySelectorAll('.sidebar-menu a[data-page]').forEach(link => {
            const linkPage = link.getAttribute('data-page');
            if (linkPage === normalized) {
                link.classList.add('active');
                matchedLabel = link.textContent.trim();
            } else {
                link.classList.remove('active');
            }
        });
        return matchedLabel;
    }

    function executeEmbeddedScripts(container) {
        if (!container) return;
        const scripts = container.querySelectorAll('script');
        scripts.forEach(oldScript => {
            const newScript = document.createElement('script');
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
    }

    function loadPageIntoMain(pageUrl, options = {}) {
        const { title = '', pageId = '' } = options;
        const normalizedUrl = normalizePageUrl(pageUrl);

        if (!normalizedUrl) return;

        if (/^https?:\/\//i.test(normalizedUrl)) {
            window.location.href = normalizedUrl;
            return;
        }

        if (!mainContent) {
            window.location.href = normalizedUrl;
            return;
        }

        if (estaEnInicio) {
            saveHomeData();
            estaEnInicio = false;
        }

        removeSearchBodyClass();

        if (title) {
            setTopbarTitle(title);
        }

        const targetUrl = normalizePageUrl(pageId || pageUrl);

        fetch(targetUrl)
            .then(res => res.text())
            .then(html => {
                mainContent.innerHTML = html;
                executeEmbeddedScripts(mainContent);
            })
            .catch(err => {
                mainContent.innerHTML = `<p>Error cargando la página: ${err}</p>`;
            });
    }

    window.loadPageIntoMainFromNotifications = (pageUrl, options = {}) => {
        loadPageIntoMain(pageUrl, options);
    };

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
                    if (incomingMain.classList.contains('content')) {
                        incomingMain.classList.remove('content');
                    }
                    incomingMain.classList.add('search-page-root');
                    mainContent.appendChild(incomingMain);
                } else if (doc.body) {
                    mainContent.innerHTML = doc.body.innerHTML;
                    const fallbackRoot = mainContent.querySelector('.search-page');
                    if (fallbackRoot) {
                        fallbackRoot.classList.remove('content');
                        fallbackRoot.classList.add('search-page-root');
                    }
                } else {
                    mainContent.innerHTML = html;
                }

                mainContent.classList.add('search-page-host');

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

    restoreHomeData();
    loadMetrics();
    loadAccessLogs();
    window.addEventListener('beforeunload', saveHomeData);
    document.addEventListener('movimientoRegistrado', loadMetrics);

    // Mostrar nombre y rol del usuario
    const nombre = localStorage.getItem('usuario_nombre');
    const rol = localStorage.getItem('usuario_rol');
    activeUsuarioRol = rol || null;
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
    activeUsuarioId = userId ? parseInt(userId, 10) || null : null;
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
            activeEmpresaId = data.empresa_id;
            fetchNotifications({ force: true });
            startNotificationPolling();
            startStockAlertAutoRefresh();
            localStorage.setItem('id_empresa', data.empresa_id); // 🟢 GUARDAMOS EL ID
            loadStockAlerts();
            const tituloEmpresa = document.getElementById('empresaTitulo');
            if (tituloEmpresa) {
                tituloEmpresa.textContent = `Bienvenido a ${data.empresa_nombre}`;
            }
            document.querySelectorAll('.empresa-elements').forEach(el => el.style.display = 'block');

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

        } else {
            const modal = document.getElementById("modalEmpresa");
            const goToRegistro = document.getElementById("goToRegistroEmpresa");
            if (modal && goToRegistro) {
                modal.style.display = "flex";
                goToRegistro.addEventListener("click", () => {
                    window.location.href = '../regis_login/regist/regist_empresa.html';
                });
            }
            stopNotificationPolling();
            stopStockAlertAutoRefresh();
        }
    })
    .catch(err => {
        console.error("❌ Error consultando empresa:", err);
        stopNotificationPolling();
        stopStockAlertAutoRefresh();
    });

    // Sidebar: navegación SPA
    const menuItems = document.querySelectorAll('.sidebar-menu a[data-page]');
    menuItems.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();

            const pageUrl = this.getAttribute('data-page');

            if (pageUrl === 'inicio') {
                const label = setActiveSidebarItem('inicio') || this.textContent.trim();
                setTopbarTitle(label);
                mainContent.innerHTML = contenidoInicial;
                restoreHomeData();
                estaEnInicio = true;
                removeSearchBodyClass();
                loadMetrics();
                loadAccessLogs();
                return;
            }

            const label = setActiveSidebarItem(pageUrl) || this.textContent.trim();
            loadPageIntoMain(pageUrl, { title: label, pageId: pageUrl });
        });
    });

    window.navigateFromGlobalSearch = (targetUrl, meta = {}) => {
        if (!targetUrl) return;

        const pageId = meta.page || '';
        let label = '';
        if (pageId) {
            label = setActiveSidebarItem(pageId);
        } else {
            document.querySelectorAll('.sidebar-menu a[data-page]').forEach(link => link.classList.remove('active'));
        }

        if (!label) {
            label = meta.actionLabel || meta.title || document.querySelector('.topbar-title')?.textContent || '';
        }

        const effectiveTitle = label || 'Detalle';
        loadPageIntoMain(targetUrl, { title: effectiveTitle, pageId: pageId || targetUrl });
    };

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
