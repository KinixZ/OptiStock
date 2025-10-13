// Toggle sidebar collapse/expand
const body = document.body;
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.querySelector('.sidebar');
const accessLogsList = document.getElementById('accessLogsList');
const highRotationList = document.getElementById('highRotationList');
const zoneCapacityList = document.getElementById('zoneCapacityList');
const spaceOptimizationList = document.getElementById('spaceOptimizationList');
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
const notificationClearButton = document.getElementById('notificationClear');

const DASHBOARD_HISTORY_STORAGE_PREFIX = 'dashboardStatsHistory';

const dashboardNumberFormatter = (() => {
    try {
        return new Intl.NumberFormat('es-MX');
    } catch (error) {
        console.warn('No se pudo crear el formateador numérico para el dashboard.', error);
        return null;
    }
})();

const DASHBOARD_STATS_CONFIG = {
    alerts: { positiveIsGood: false, singular: 'alerta', plural: 'alertas' },
    movements: { positiveIsGood: true, singular: 'movimiento', plural: 'movimientos' },
    criticalZones: { positiveIsGood: false, singular: 'zona crítica', plural: 'zonas críticas' }
};

const dashboardStatsElements = Object.keys(DASHBOARD_STATS_CONFIG).reduce((acc, key) => {
    const card = document.querySelector(`.stat-card[data-stat="${key}"]`);
    if (card) {
        acc[key] = {
            card,
            valueEl: card.querySelector('[data-stat-value]'),
            trendEl: card.querySelector('[data-stat-trend]')
        };
    }
    return acc;
}, {});

let activeEmpresaId = null;
let activeUsuarioId = null;
let activeUsuarioRol = null;
let lastNotificationsFetch = 0;
const NOTIFICATION_REFRESH_MS = 60 * 1000;
const STOCK_ALERT_REFRESH_MS = 30 * 1000;
let notificationAbortController = null;
let notificationPollIntervalId = null;
let stockAlertPollIntervalId = null;
const PENDING_REQUEST_REFRESH_MS = NOTIFICATION_REFRESH_MS;
let pendingRequestsAbortController = null;
let pendingRequestsPollIntervalId = null;
let pendingRequestNotifications = [];
let pendingRequestState = new Map();
let lastPendingRequestsFetch = 0;
let cachedNotifications = [];
let serverNotifications = [];
let criticalStockNotifications = [];
let capacityAlertNotifications = [];
let criticalStockState = new Map();
let capacityAlertState = new Map();
let autoArchiveInProgress = false;

const NOTIFICATION_PRIORITIES = ['Alta', 'Media', 'Baja'];
const NOTIFICATION_STATES = ['Pendiente', 'Enviada', 'Leida', 'Archivada'];
const NOTIFICATION_TARGETS = ['General', 'Rol', 'Usuario'];

function normalizeNotificationDateTime(value) {
    if (!value) {
        return null;
    }

    const raw = String(value).trim();
    if (!raw) {
        return null;
    }

    const directMatch = raw.match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}:\d{2}))?$/);
    if (directMatch) {
        const [, datePart, timePart] = directMatch;
        return `${datePart} ${timePart || '00:00:00'}`;
    }

    const parsedDate = new Date(raw);
    if (Number.isNaN(parsedDate.getTime())) {
        return null;
    }

    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const day = String(parsedDate.getDate()).padStart(2, '0');
    const hours = String(parsedDate.getHours()).padStart(2, '0');
    const minutes = String(parsedDate.getMinutes()).padStart(2, '0');
    const seconds = String(parsedDate.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function sanitizeNotificationForPersistence(notification) {
    if (!notification || typeof notification !== 'object') {
        return null;
    }

    const titulo = typeof notification.titulo === 'string'
        ? notification.titulo.trim()
        : String(notification.titulo ?? '').trim();
    const mensaje = typeof notification.mensaje === 'string'
        ? notification.mensaje.trim()
        : String(notification.mensaje ?? '').trim();

    if (!titulo || !mensaje) {
        return null;
    }

    const prioridadRaw = typeof notification.prioridad === 'string'
        ? notification.prioridad.trim()
        : '';
    const prioridad = NOTIFICATION_PRIORITIES.includes(prioridadRaw)
        ? prioridadRaw
        : 'Media';

    const estadoRaw = typeof notification.estado === 'string'
        ? notification.estado.trim()
        : '';
    const estado = NOTIFICATION_STATES.includes(estadoRaw)
        ? estadoRaw
        : 'Pendiente';

    const tipoRaw = typeof notification.tipo_destinatario === 'string'
        ? notification.tipo_destinatario.trim()
        : 'General';
    const tipoDestinatario = NOTIFICATION_TARGETS.includes(tipoRaw)
        ? tipoRaw
        : 'General';

    let rolDestinatario = '';
    if (tipoDestinatario === 'Rol') {
        const rawRol = notification.rol_destinatario ?? activeUsuarioRol ?? '';
        rolDestinatario = String(rawRol).trim();
    }

    let idUsuarioDestinatario = 0;
    if (tipoDestinatario === 'Usuario') {
        const rawId = Number.parseInt(notification.id_usuario_destinatario, 10);
        if (Number.isFinite(rawId) && rawId > 0) {
            idUsuarioDestinatario = rawId;
        } else if (Number.isFinite(activeUsuarioId) && activeUsuarioId > 0) {
            idUsuarioDestinatario = activeUsuarioId;
        }
    }

    const rutaDestinoRaw = typeof notification.ruta_destino === 'string'
        ? notification.ruta_destino.trim()
        : String(notification.ruta_destino ?? '').trim();
    const rutaDestino = rutaDestinoRaw ? rutaDestinoRaw.slice(0, 255) : '';

    const fechaDisponible = normalizeNotificationDateTime(
        notification.fecha_disponible_desde
        || notification.creado_en
        || notification.actualizado_en
    ) || new Date().toISOString().slice(0, 19).replace('T', ' ');

    return {
        titulo: titulo.slice(0, 150),
        mensaje: mensaje.slice(0, 2000),
        prioridad,
        estado,
        tipo_destinatario: tipoDestinatario,
        rol_destinatario: rolDestinatario.slice(0, 60),
        id_usuario_destinatario: idUsuarioDestinatario,
        ruta_destino: rutaDestino,
        fecha_disponible_desde: fechaDisponible
    };
}

async function persistNotifications(notifications = []) {
    if (!Array.isArray(notifications) || !notifications.length) {
        return;
    }

    if (!activeEmpresaId) {
        return;
    }

    const prepared = notifications
        .filter(notification => notification && notification.es_local !== false)
        .map(notification => sanitizeNotificationForPersistence(notification))
        .filter(Boolean);

    if (!prepared.length) {
        return;
    }

    try {
        const response = await fetch('/scripts/php/save_notifications.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_empresa: activeEmpresaId,
                id_usuario: activeUsuarioId || 0,
                notifications: prepared
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();

        if (!result || result.success !== true) {
            throw new Error(result && result.message ? result.message : 'No se pudo guardar el historial de notificaciones.');
        }

        notifications.forEach(notification => {
            if (notification && typeof notification === 'object') {
                notification.es_local = false;
            }
        });

        refreshNotificationUI();

        if (result.stored > 0) {
            fetchNotifications({ force: true });
        }
    } catch (error) {
        console.error('No se pudieron guardar las notificaciones en la base de datos:', error);
    }
}

const CAPACITY_ZONE_THRESHOLD = 90;
const CAPACITY_AREA_THRESHOLD = 90;

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

const CRITICAL_STOCK_TOAST_CONTAINER_ID = 'criticalStockToastContainer';
const CRITICAL_STOCK_TOAST_DURATION = 7000;

// Selected theme colors
let colorSidebarSeleccionado = getComputedStyle(document.documentElement)
    .getPropertyValue('--sidebar-color')
    .trim();
let colorTopbarSeleccionado = getComputedStyle(document.documentElement)
    .getPropertyValue('--topbar-color')
    .trim();


function getDashboardHistoryStorageKey() {
    let empresaId = '0';
    if (typeof localStorage !== 'undefined') {
        try {
            const stored = localStorage.getItem('id_empresa');
            if (stored) {
                empresaId = stored;
            }
        } catch (error) {
            console.warn('No se pudo acceder al identificador de empresa para el historial del dashboard.', error);
        }
    }
    return `${DASHBOARD_HISTORY_STORAGE_PREFIX}_${empresaId}`;
}

function readDashboardHistory() {
    if (typeof localStorage === 'undefined') {
        return {};
    }
    try {
        const raw = localStorage.getItem(getDashboardHistoryStorageKey());
        if (!raw) {
            return {};
        }
        const parsed = JSON.parse(raw);
        return (parsed && typeof parsed === 'object') ? parsed : {};
    } catch (error) {
        console.warn('No se pudo leer el historial del dashboard.', error);
        return {};
    }
}

function writeDashboardHistory(history) {
    if (typeof localStorage === 'undefined') {
        return;
    }
    try {
        localStorage.setItem(getDashboardHistoryStorageKey(), JSON.stringify(history));
    } catch (error) {
        console.warn('No se pudo guardar el historial del dashboard.', error);
    }
}

function pruneDashboardHistory(history, maxDays = 30) {
    if (!history || typeof history !== 'object') {
        return;
    }
    const dates = Object.keys(history).filter(Boolean).sort();
    while (dates.length > maxDays) {
        const oldest = dates.shift();
        if (oldest && Object.prototype.hasOwnProperty.call(history, oldest)) {
            delete history[oldest];
        }
    }
}

function formatDateKey(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        return '';
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function addDays(baseDate, offsetDays) {
    if (!(baseDate instanceof Date) || Number.isNaN(baseDate.getTime())) {
        return new Date(NaN);
    }
    const clone = new Date(baseDate.getTime());
    clone.setDate(clone.getDate() + offsetDays);
    return clone;
}

function formatStatNumber(value) {
    if (!Number.isFinite(value)) {
        return '0';
    }
    if (dashboardNumberFormatter) {
        try {
            return dashboardNumberFormatter.format(value);
        } catch (error) {
            console.warn('No se pudo formatear el número del dashboard.', error);
        }
    }
    return String(value);
}

function findPreviousStatValue(history, todayKey, statKey) {
    if (!history || typeof history !== 'object') {
        return null;
    }
    const candidates = Object.keys(history)
        .filter(date => date && date < todayKey)
        .sort();
    for (let i = candidates.length - 1; i >= 0; i -= 1) {
        const entry = history[candidates[i]];
        if (!entry || typeof entry !== 'object') {
            continue;
        }
        const numeric = Number(entry[statKey]);
        if (Number.isFinite(numeric)) {
            return numeric;
        }
    }
    return null;
}

function renderDashboardStat(statKey, currentValue, previousValue) {
    const elements = dashboardStatsElements[statKey];
    const config = DASHBOARD_STATS_CONFIG[statKey];
    if (!elements || !config) {
        return;
    }

    const sanitizedCurrent = Number.isFinite(currentValue) ? currentValue : Number(currentValue) || 0;

    if (elements.valueEl) {
        elements.valueEl.textContent = formatStatNumber(sanitizedCurrent);
    }

    const trendEl = elements.trendEl;
    if (!trendEl) {
        return;
    }

    trendEl.classList.remove('positive', 'negative', 'neutral');

    let trendClass = 'neutral';
    let iconClass = 'fa-minus';
    let trendText = 'Sin datos previos';

    if (Number.isFinite(previousValue)) {
        const diff = sanitizedCurrent - previousValue;
        if (diff === 0) {
            trendText = 'Sin cambios';
        } else {
            const absDiff = Math.abs(diff);
            const formattedDiff = formatStatNumber(absDiff);
            const unit = absDiff === 1 ? config.singular : config.plural;
            const signSymbol = diff > 0 ? '+' : '−';
            iconClass = diff > 0 ? 'fa-arrow-up' : 'fa-arrow-down';
            const improvement = diff > 0 ? config.positiveIsGood : !config.positiveIsGood;
            trendClass = improvement ? 'positive' : 'negative';
            trendText = `${signSymbol}${formattedDiff} ${unit} vs ayer`;
        }
    }

    trendEl.classList.add(trendClass);
    trendEl.innerHTML = `<i class="fas ${iconClass}"></i> ${trendText}`;
}

function updateDashboardStat(statKey, currentValue, options = {}) {
    const numericCurrent = Number(currentValue);
    const sanitizedCurrent = Number.isFinite(numericCurrent) ? numericCurrent : 0;
    const today = new Date();
    const todayKey = formatDateKey(today);

    if (!todayKey) {
        renderDashboardStat(statKey, sanitizedCurrent, null);
        return;
    }

    if (typeof localStorage === 'undefined') {
        renderDashboardStat(statKey, sanitizedCurrent, null);
        return;
    }

    const history = readDashboardHistory();
    const providedPrevRaw = options?.previousDayValue;
    if (providedPrevRaw !== undefined && providedPrevRaw !== null) {
        const providedPrev = Number(providedPrevRaw);
        if (Number.isFinite(providedPrev)) {
            const yesterdayKey = formatDateKey(addDays(today, -1));
            if (yesterdayKey) {
                history[yesterdayKey] = history[yesterdayKey] || {};
                history[yesterdayKey][statKey] = providedPrev;
            }
        }
    }

    const previousValue = findPreviousStatValue(history, todayKey, statKey);

    renderDashboardStat(statKey, sanitizedCurrent, previousValue);

    history[todayKey] = history[todayKey] || {};
    history[todayKey][statKey] = sanitizedCurrent;

    pruneDashboardHistory(history);
    writeDashboardHistory(history);
}

function countMovementsForDate(movimientos, targetDate) {
    if (!Array.isArray(movimientos)) {
        return 0;
    }
    const targetKey = formatDateKey(targetDate);
    if (!targetKey) {
        return 0;
    }
    return movimientos.reduce((acc, movimiento) => {
        const fecha = parseDateFromMysql(movimiento && movimiento.fecha_movimiento);
        if (!fecha) {
            return acc;
        }
        return formatDateKey(fecha) === targetKey ? acc + 1 : acc;
    }, 0);
}


function getCriticalStockToastContainer() {
    let container = document.getElementById(CRITICAL_STOCK_TOAST_CONTAINER_ID);
    if (!container) {
        container = document.createElement('div');
        container.id = CRITICAL_STOCK_TOAST_CONTAINER_ID;
        container.className = 'critical-stock-toast-container';
        container.setAttribute('aria-live', 'polite');
        container.setAttribute('aria-atomic', 'true');
        document.body.appendChild(container);
    }
    return container;
}

function showCriticalStockAlert(title, message) {
    const container = getCriticalStockToastContainer();
    const toast = document.createElement('article');
    toast.className = 'critical-stock-toast';
    toast.setAttribute('role', 'status');

    const titleEl = document.createElement('p');
    titleEl.className = 'critical-stock-toast__title';
    titleEl.textContent = title.trim();

    const messageEl = document.createElement('p');
    messageEl.className = 'critical-stock-toast__message';
    messageEl.textContent = message.trim();

    toast.appendChild(titleEl);
    toast.appendChild(messageEl);

    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('is-visible');
    });

    const removeToast = () => {
        toast.classList.remove('is-visible');
        toast.addEventListener('transitionend', () => {
            toast.remove();
            if (!container.hasChildNodes()) {
                container.remove();
            }
        }, { once: true });
    };

    const timeoutId = setTimeout(removeToast, CRITICAL_STOCK_TOAST_DURATION);

    toast.addEventListener('click', () => {
        clearTimeout(timeoutId);
        removeToast();
    });
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
        const titleSource = notification.titulo == null ? '' : notification.titulo;
        const rawTitle = typeof titleSource === 'string'
            ? titleSource.trim()
            : String(titleSource).trim();
        title.textContent = rawTitle || 'Notificación';

        const message = document.createElement('p');
        const messageSource = notification.mensaje == null ? '' : notification.mensaje;
        const rawMessage = typeof messageSource === 'string'
            ? messageSource.trim()
            : String(messageSource).trim();
        message.textContent = rawMessage;

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
                handleNotificationResolved(notification);
                if (notificationWrapper) {
                    notificationWrapper.classList.remove('open');
                }
                if (notificationBell) {
                    notificationBell.setAttribute('aria-expanded', 'false');
                }
                autoArchiveSeenNotifications();
            });
            listItem.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openTarget();
                    handleNotificationResolved(notification);
                    if (notificationWrapper) {
                        notificationWrapper.classList.remove('open');
                    }
                    if (notificationBell) {
                        notificationBell.setAttribute('aria-expanded', 'false');
                    }
                    autoArchiveSeenNotifications();
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

function buildNotificationIdentity(notification) {
    if (!notification || typeof notification !== 'object') {
        return '';
    }

    const titulo = (notification.titulo || '').toString().trim().toLowerCase();
    const mensaje = (notification.mensaje || '').toString().trim().toLowerCase();
    const ruta = (notification.ruta_destino || '').toString().trim().toLowerCase();
    const fecha = (
        notification.fecha_disponible_desde
        || notification.creado_en
        || notification.actualizado_en
        || ''
    ).toString().trim().slice(0, 19).replace('T', ' ');

    return `${titulo}__${mensaje}__${ruta}__${fecha}`;
}

function getNotificationNumericId(notification) {
    if (!notification || typeof notification !== 'object') {
        return null;
    }

    const parsed = Number.parseInt(notification.id, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
    }

    return null;
}

function markPendingRequestDismissedByIdentity(identity) {
    if (!identity || !pendingRequestState.size) {
        return false;
    }

    let updated = false;
    pendingRequestState = new Map(Array.from(pendingRequestState.entries()).map(([key, entry]) => {
        if (!entry || !entry.notification) {
            return [key, entry];
        }

        if (buildNotificationIdentity(entry.notification) !== identity) {
            return [key, entry];
        }

        if (entry.dismissed) {
            return [key, entry];
        }

        updated = true;
        return [key, { ...entry, dismissed: true }];
    }));

    return updated;
}

function removeNotificationLocally(notification) {
    if (!notification || typeof notification !== 'object') {
        return false;
    }

    let changed = false;
    const id = getNotificationNumericId(notification);
    const identity = buildNotificationIdentity(notification);

    if (id !== null) {
        const nextServer = serverNotifications.filter(item => getNotificationNumericId(item) !== id);
        if (nextServer.length !== serverNotifications.length) {
            serverNotifications = nextServer;
            changed = true;
        }
    }

    if (identity) {
        const filterByIdentity = collection => collection.filter(item => buildNotificationIdentity(item) !== identity);

        const nextCritical = filterByIdentity(criticalStockNotifications);
        if (nextCritical.length !== criticalStockNotifications.length) {
            criticalStockNotifications = nextCritical;
            changed = true;
        }

        const nextCapacity = filterByIdentity(capacityAlertNotifications);
        if (nextCapacity.length !== capacityAlertNotifications.length) {
            capacityAlertNotifications = nextCapacity;
            changed = true;
        }

        const nextPending = filterByIdentity(pendingRequestNotifications);
        if (nextPending.length !== pendingRequestNotifications.length) {
            pendingRequestNotifications = nextPending;
            changed = true;
        }

        if (markPendingRequestDismissedByIdentity(identity)) {
            changed = true;
        }
    }

    return changed;
}

function removeServerNotificationsByIdSet(idSet) {
    if (!(idSet instanceof Set) || idSet.size === 0) {
        return false;
    }

    const nextServer = serverNotifications.filter(notification => {
        const id = getNotificationNumericId(notification);
        return id === null || !idSet.has(id);
    });

    const changed = nextServer.length !== serverNotifications.length;
    if (changed) {
        serverNotifications = nextServer;
    }

    return changed;
}

function dismissAllPendingRequests() {
    if (!pendingRequestState.size) {
        return false;
    }

    let updated = false;
    pendingRequestState = new Map(Array.from(pendingRequestState.entries()).map(([key, entry]) => {
        if (!entry || entry.dismissed) {
            return [key, entry];
        }

        updated = true;
        return [key, { ...entry, dismissed: true }];
    }));

    return updated;
}

function clearGeneratedNotifications(options = {}) {
    const { includePending = false } = options;
    let changed = false;

    if (criticalStockNotifications.length) {
        criticalStockNotifications = [];
        changed = true;
    }

    if (capacityAlertNotifications.length) {
        capacityAlertNotifications = [];
        changed = true;
    }

    if (includePending) {
        if (pendingRequestNotifications.length) {
            pendingRequestNotifications = [];
            changed = true;
        }

        if (dismissAllPendingRequests()) {
            changed = true;
        }
    }

    return changed;
}

function handleNotificationResolved(notification) {
    if (!notification) {
        return;
    }

    const changed = removeNotificationLocally(notification);
    if (changed) {
        refreshNotificationUI();
    }

    const id = getNotificationNumericId(notification);
    if (id === null) {
        return;
    }

    archiveServerNotifications([id]).catch(error => {
        console.error('No se pudo eliminar la notificación resuelta:', error);
        fetchNotifications({ force: true });
    });
}

async function autoArchiveSeenNotifications() {
    if (autoArchiveInProgress) {
        return;
    }

    const hasCached = Array.isArray(cachedNotifications) && cachedNotifications.length > 0;
    const hasGenerated = criticalStockNotifications.length > 0 || capacityAlertNotifications.length > 0;

    if (!hasCached && !hasGenerated) {
        return;
    }

    autoArchiveInProgress = true;

    const idsToArchive = hasCached
        ? cachedNotifications
            .map(notification => getNotificationNumericId(notification))
            .filter(id => id !== null)
        : [];

    const idsSet = new Set(idsToArchive);

    const previousState = {
        server: serverNotifications.slice(),
        critical: criticalStockNotifications.slice(),
        capacity: capacityAlertNotifications.slice()
    };

    try {
        if (idsSet.size) {
            await archiveServerNotifications(Array.from(idsSet));
        }

        const stateChanged = removeServerNotificationsByIdSet(idsSet);
        const clearedGenerated = clearGeneratedNotifications();

        if (stateChanged || clearedGenerated || idsSet.size === 0) {
            refreshNotificationUI();
        }
    } catch (error) {
        console.error('No se pudieron eliminar las notificaciones vistas:', error);
        serverNotifications = previousState.server;
        criticalStockNotifications = previousState.critical;
        capacityAlertNotifications = previousState.capacity;
        refreshNotificationUI();
        fetchNotifications({ force: true });
    } finally {
        autoArchiveInProgress = false;
    }
}

function refreshNotificationUI() {
    const identityMap = new Map();
    const merged = [];

    [
        ...pendingRequestNotifications,
        ...criticalStockNotifications,
        ...capacityAlertNotifications,
        ...serverNotifications
    ].forEach(notification => {
        if (!notification) {
            return;
        }

        const identity = buildNotificationIdentity(notification);

        if (!identity) {
            merged.push(notification);
            return;
        }

        if (!identityMap.has(identity)) {
            identityMap.set(identity, notification);
            merged.push(notification);
            return;
        }

        const existing = identityMap.get(identity);
        if (existing && existing.es_local && notification.es_local === false) {
            const index = merged.indexOf(existing);
            if (index !== -1) {
                merged[index] = notification;
            } else {
                merged.push(notification);
            }
            identityMap.set(identity, notification);
        }
    });

    const sorted = sortNotificationsByPriorityAndDate(merged);
    renderNotifications(sorted);
}

async function archiveServerNotifications(notificationIds = []) {
    if (!Array.isArray(notificationIds) || !notificationIds.length || !activeEmpresaId) {
        return { success: true, archived: 0 };
    }

    const payloadIds = notificationIds
        .map(id => Number.parseInt(id, 10))
        .filter(id => Number.isFinite(id) && id > 0);

    if (!payloadIds.length) {
        return { success: true, archived: 0 };
    }

    const response = await fetch('/scripts/php/archive_notifications.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            id_empresa: activeEmpresaId,
            notification_ids: payloadIds
        })
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();

    if (!result || result.success !== true) {
        throw new Error(result && result.message ? result.message : 'No se pudieron eliminar las notificaciones.');
    }

    return result;
}

async function clearNotificationTray() {
    const hasServerNotifications = Array.isArray(cachedNotifications) && cachedNotifications.length > 0;
    const hasGeneratedNotifications = (
        pendingRequestNotifications.length > 0
        || criticalStockNotifications.length > 0
        || capacityAlertNotifications.length > 0
    );

    if (!hasServerNotifications && !hasGeneratedNotifications) {
        return;
    }

    const originalLabel = notificationClearButton ? notificationClearButton.textContent : '';

    if (notificationClearButton) {
        notificationClearButton.disabled = true;
        notificationClearButton.textContent = 'Vaciando...';
    }

    const previousState = {
        server: serverNotifications.slice(),
        critical: criticalStockNotifications.slice(),
        capacity: capacityAlertNotifications.slice(),
        pendingState: new Map(pendingRequestState),
        pending: pendingRequestNotifications.slice()
    };

    const idsToArchive = (Array.isArray(cachedNotifications) ? cachedNotifications : [])
        .map(notification => Number.parseInt(notification && notification.id, 10))
        .filter(id => Number.isFinite(id) && id > 0);

    const idsToArchiveSet = new Set(idsToArchive);

    try {
        if (idsToArchiveSet.size) {
            await archiveServerNotifications(Array.from(idsToArchiveSet));
        }

        const stateChanged = removeServerNotificationsByIdSet(idsToArchiveSet);
        const clearedGenerated = clearGeneratedNotifications({ includePending: true });

        if (stateChanged || clearedGenerated || idsToArchiveSet.size === 0) {
            refreshNotificationUI();
        }

        fetchNotifications({ force: true });
    } catch (error) {
        console.error('No se pudieron eliminar las notificaciones:', error);
        serverNotifications = previousState.server;
        criticalStockNotifications = previousState.critical;
        capacityAlertNotifications = previousState.capacity;
        pendingRequestState = new Map(previousState.pendingState);
        pendingRequestNotifications = previousState.pending;
        refreshNotificationUI();
    } finally {
        if (notificationClearButton) {
            notificationClearButton.disabled = false;
            notificationClearButton.textContent = originalLabel || 'Vaciar bandeja';
        }
    }
}

async function fetchPendingRequestNotifications(options = {}) {
    if (!notificationList) {
        return;
    }

    if (!activeEmpresaId) {
        if (pendingRequestNotifications.length || pendingRequestState.size) {
            pendingRequestNotifications = [];
            pendingRequestState.clear();
            refreshNotificationUI();
        }
        return;
    }

    const { force = false } = options;
    const now = Date.now();
    if (!force && now - lastPendingRequestsFetch < PENDING_REQUEST_REFRESH_MS) {
        return;
    }

    if (pendingRequestsAbortController) {
        pendingRequestsAbortController.abort();
    }

    pendingRequestsAbortController = new AbortController();
    const { signal } = pendingRequestsAbortController;

    try {
        const params = new URLSearchParams({ estado: 'en_proceso' });
        params.set('id_empresa', activeEmpresaId);

        const response = await fetch(`/scripts/php/solicitudes_admin.php?${params.toString()}`, {
            signal,
            cache: 'no-store'
        });

        if (!response.ok) {
            throw new Error(`Error ${response.status}`);
        }

        const data = await response.json();

        if (!data || data.success !== true) {
            throw new Error(data && data.message ? data.message : 'No se pudo obtener las solicitudes pendientes.');
        }

        lastPendingRequestsFetch = Date.now();
        const items = Array.isArray(data.items) ? data.items : [];
        updatePendingRequestNotifications(items);
    } catch (error) {
        if (error.name === 'AbortError') {
            return;
        }

        console.error('No se pudieron cargar las solicitudes pendientes:', error);
    } finally {
        if (pendingRequestsAbortController && pendingRequestsAbortController.signal === signal) {
            pendingRequestsAbortController = null;
        }
    }
}

function startPendingRequestsPolling() {
    if (pendingRequestsPollIntervalId) {
        return;
    }

    pendingRequestsPollIntervalId = window.setInterval(() => {
        fetchPendingRequestNotifications();
    }, PENDING_REQUEST_REFRESH_MS);
}

function stopPendingRequestsPolling() {
    if (pendingRequestsPollIntervalId) {
        clearInterval(pendingRequestsPollIntervalId);
        pendingRequestsPollIntervalId = null;
    }

    if (pendingRequestsAbortController) {
        pendingRequestsAbortController.abort();
        pendingRequestsAbortController = null;
    }

    lastPendingRequestsFetch = 0;
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
        fetchPendingRequestNotifications();
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

    startPendingRequestsPolling();
}

function stopNotificationPolling() {
    if (!notificationPollIntervalId) {
        stopPendingRequestsPolling();
        return;
    }

    clearInterval(notificationPollIntervalId);
    notificationPollIntervalId = null;
    lastNotificationsFetch = 0;
    stopPendingRequestsPolling();
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

function formatNumber(value, decimals = 0) {
    if (!Number.isFinite(value)) {
        return null;
    }
    try {
        return new Intl.NumberFormat('es-ES', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(value);
    } catch (error) {
        return value.toFixed(decimals);
    }
}

function normalizeAreaData(areasRaw) {
    return (Array.isArray(areasRaw) ? areasRaw : []).map(area => ({
        id: Number(area.id),
        nombre: area.nombre || 'Área sin nombre',
        porcentaje: Number(area.porcentaje_ocupacion || area.porcentaje || 0),
        disponible: Number(area.capacidad_disponible || 0),
        utilizada: Number(area.capacidad_utilizada || 0),
        volumen: Number(area.volumen || 0),
        productos: Number(area.productos_registrados || 0),
        unidades: Number(area.total_unidades || 0)
    }));
}

function normalizeZoneData(zonasRaw) {
    return (Array.isArray(zonasRaw) ? zonasRaw : []).map(zona => ({
        id: Number(zona.id),
        nombre: zona.nombre || (zona.id ? `Zona ${zona.id}` : 'Zona sin nombre'),
        area_id: zona.area_id ? Number(zona.area_id) : null,
        porcentaje: Number(zona.porcentaje_ocupacion || zona.porcentaje || 0),
        capacidad_utilizada: Number(zona.capacidad_utilizada || 0),
        capacidad_disponible: Number(zona.capacidad_disponible || 0),
        productos: Number(zona.productos_registrados || 0),
        unidades: Number(zona.total_unidades || 0),
        tipo: zona.tipo_almacenamiento || ''
    }));
}

function createAlertListItem({ iconClass, title, detail, value, extraClasses = [] }) {
    const li = document.createElement('li');
    const classes = ['stock-alert-item'];
    extraClasses.filter(Boolean).forEach(cls => classes.push(cls));
    li.className = classes.join(' ');

    const infoDiv = document.createElement('div');
    infoDiv.className = 'stock-alert-info';

    const iconDiv = document.createElement('div');
    iconDiv.className = 'stock-alert-icon';
    if (iconClass) {
        const icon = document.createElement('i');
        icon.className = iconClass;
        iconDiv.appendChild(icon);
    }

    const textWrapper = document.createElement('div');

    const nameDiv = document.createElement('div');
    nameDiv.className = 'stock-alert-name';
    nameDiv.textContent = (title || 'Alerta').trim();

    const detailDiv = document.createElement('div');
    detailDiv.className = 'stock-alert-detail';
    detailDiv.textContent = detail || 'Sin información adicional';

    textWrapper.appendChild(nameDiv);
    textWrapper.appendChild(detailDiv);

    infoDiv.appendChild(iconDiv);
    infoDiv.appendChild(textWrapper);

    li.appendChild(infoDiv);

    if (value !== undefined && value !== null && value !== '') {
        const valueDiv = document.createElement('div');
        valueDiv.className = 'stock-alert-stock';
        valueDiv.textContent = String(value);
        li.appendChild(valueDiv);
    }

    return li;
}

function buildStockAlertEntries(productos, threshold) {
    const criticalProducts = (Array.isArray(productos) ? productos : [])
        .filter(prod => {
            const stockValue = Number(prod && prod.stock);
            if (!Number.isFinite(stockValue)) {
                return threshold >= 0;
            }
            return stockValue <= threshold;
        })
        .sort((a, b) => (Number(a && a.stock) || 0) - (Number(b && b.stock) || 0));

    const alerts = criticalProducts.map(prod => {
        const stockValue = Number(prod && prod.stock);
        const unidades = Number.isFinite(stockValue) ? stockValue : 0;
        const unidadesTexto = `${unidades} ${unidades === 1 ? 'unidad' : 'unidades'}`;

        const detailSources = [
            prod && typeof prod.descripcion === 'string' ? prod.descripcion.trim() : '',
            prod && typeof prod.categoria_nombre === 'string' ? prod.categoria_nombre.trim() : '',
            prod && typeof prod.subcategoria_nombre === 'string' ? prod.subcategoria_nombre.trim() : ''
        ].filter(Boolean);

        const detailFallback = 'Revisa el detalle del producto en el inventario.';
        const detail = detailSources.length ? detailSources[0] : detailFallback;

        return {
            type: 'stock',
            iconClass: 'fas fa-box-open',
            title: ((prod && prod.nombre) || 'Producto sin nombre').trim(),
            detail,
            value: unidadesTexto,
            severity: Number.isFinite(stockValue) ? Math.max(0, threshold - stockValue) + 1 : 1,
            raw: prod
        };
    });

    return { alerts, criticalProducts };
}

function toFiniteNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function computeOccupancyPercent({ porcentaje, disponible, total }) {
    const capacidadTotal = toFiniteNumber(total, 0);
    let ocupacion = toFiniteNumber(porcentaje, NaN);

    if (!Number.isFinite(ocupacion)) {
        const libre = toFiniteNumber(disponible, NaN);
        if (capacidadTotal > 0 && Number.isFinite(libre)) {
            const utilizada = capacidadTotal - libre;
            ocupacion = (utilizada / capacidadTotal) * 100;
        }
    }

    if (!Number.isFinite(ocupacion)) {
        return null;
    }

    return Math.max(0, Math.min(100, ocupacion));
}

function buildCapacityAlertEntries(areasRaw, zonasRaw) {
    const areas = Array.isArray(areasRaw) ? areasRaw : [];
    const zonas = Array.isArray(zonasRaw) ? zonasRaw : [];

    const alerts = [];
    const notifications = [];

    const areaMap = new Map(areas.map(area => [area.id, area]));

    zonas.forEach(zona => {
        if (!zona) return;

        const area = zona.area_id && areaMap.has(zona.area_id)
            ? areaMap.get(zona.area_id)
            : null;

        const porcentajeReportado = zona.porcentaje ?? zona.porcentaje_ocupacion;
        const ocupacion = toFiniteNumber(porcentajeReportado, 0);
        const disponible = toFiniteNumber(zona.capacidad_disponible ?? 0, 0);
        const utilizada = toFiniteNumber(zona.capacidad_utilizada ?? 0, 0);
        const total = disponible + utilizada;

        const porcentajeOcupacion = computeOccupancyPercent({
            porcentaje: porcentajeReportado,
            disponible,
            total
        });

        const isCritical = Number.isFinite(porcentajeOcupacion) && porcentajeOcupacion >= CAPACITY_ZONE_THRESHOLD;

        if (!isCritical) {
            return;
        }

        const zonaNombre = ((zona.nombre || (zona.id ? `Zona ${zona.id}` : 'Zona sin nombre'))).trim();
        const areaNombre = area ? (area.nombre || '').trim() : '';
        const detallePartes = [];
        if (areaNombre) {
            detallePartes.push(areaNombre);
        }
        const ocupacionVisible = Number.isFinite(porcentajeOcupacion) ? porcentajeOcupacion : ocupacion;
        if (Number.isFinite(ocupacionVisible)) {
            detallePartes.push(`${ocupacionVisible.toFixed(1)}% ocupado`);
        }

        const detalle = detallePartes.join(' · ') || 'Sin detalles de ocupación';
        const libresTexto = Number.isFinite(disponible) ? `${disponible.toFixed(2)} m³ libres` : 'Sin espacio disponible';
        const ocupacionParaSeveridad = Number.isFinite(ocupacionVisible) ? ocupacionVisible : 0;
        const severidad = Math.max(1, Math.round(Math.max(0, ocupacionParaSeveridad - CAPACITY_ZONE_THRESHOLD)) + (Number.isFinite(disponible) && disponible <= 0 ? 1 : 0));

        alerts.push({
            type: 'capacity',
            subtype: 'zone',
            iconClass: 'fas fa-warehouse',
            title: `Zona crítica: ${zonaNombre}`,
            detail: detalle,
            value: libresTexto,
            severity: severidad,
            raw: { scope: 'zone', zona, area }
        });

        notifications.push({
            scope: 'zone',
            id: zona.id ?? zona.zona_id ?? null,
            areaId: zona.area_id ?? (area && area.id) ?? null,
            name: zonaNombre,
            areaName: areaNombre || null,
            occupancy: ocupacionVisible,
            freeVolume: disponible,
            totalVolume: total,
            severity: severidad
        });
    });

    areas.forEach(area => {
        if (!area) return;

        const porcentajeReportado = area.porcentaje ?? area.porcentaje_ocupacion;
        const ocupacion = toFiniteNumber(porcentajeReportado, 0);
        const disponible = toFiniteNumber(area.disponible ?? area.capacidad_disponible, 0);
        const utilizada = toFiniteNumber(area.utilizada ?? area.capacidad_utilizada, 0);
        const total = disponible + utilizada;

        const totalReferencia = total > 0 ? total : toFiniteNumber(area.volumen, 0);
        const porcentajeOcupacion = computeOccupancyPercent({
            porcentaje: porcentajeReportado,
            disponible,
            total: totalReferencia
        });

        const isCritical = Number.isFinite(porcentajeOcupacion) && porcentajeOcupacion >= CAPACITY_AREA_THRESHOLD;

        if (!isCritical) {
            return;
        }

        const areaNombre = ((area.nombre || (area.id ? `Área ${area.id}` : 'Área sin nombre'))).trim();
        const libresTexto = Number.isFinite(disponible) ? `${disponible.toFixed(2)} m³ libres` : 'Sin espacio disponible';
        const detallePartes = [];
        const ocupacionVisible = Number.isFinite(porcentajeOcupacion) ? porcentajeOcupacion : ocupacion;
        if (Number.isFinite(ocupacionVisible)) {
            detallePartes.push(`${ocupacionVisible.toFixed(1)}% ocupado`);
        }
        if (Number.isFinite(area.productos)) {
            const productos = Math.max(0, Math.round(area.productos));
            detallePartes.push(`${productos} ${productos === 1 ? 'tipo' : 'tipos'}`);
        }
        const detalle = detallePartes.join(' · ') || 'Sin detalles de ocupación';
        const ocupacionParaSeveridad = Number.isFinite(ocupacionVisible) ? ocupacionVisible : 0;
        const severidad = Math.max(1, Math.round(Math.max(0, ocupacionParaSeveridad - CAPACITY_AREA_THRESHOLD)) + (Number.isFinite(disponible) && disponible <= 0 ? 1 : 0));

        alerts.push({
            type: 'capacity',
            subtype: 'area',
            iconClass: 'fas fa-dolly',
            title: `Área saturada: ${areaNombre}`,
            detail: detalle,
            value: libresTexto,
            severity: severidad,
            raw: { scope: 'area', area }
        });

        notifications.push({
            scope: 'area',
            id: area.id ?? null,
            name: areaNombre,
            areaName: areaNombre,
            occupancy: ocupacionVisible,
            freeVolume: disponible,
            totalVolume: totalReferencia,
            severity: severidad
        });
    });

    return { alerts, notifications };
}

function getCapacityAlertKey(entry) {
    if (!entry) return '';

    const scope = entry.scope ? String(entry.scope).toLowerCase() : 'zone';
    const id = entry.id ? String(entry.id) : '';
    if (id) {
        return `${scope}-${id}`;
    }

    const baseName = (entry.name || '').toString().toLowerCase().trim();
    if (!baseName) {
        return '';
    }

    const sanitized = baseName
        .normalize('NFD')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

    const areaSuffix = entry.areaId ? `-${entry.areaId}` : '';
    return `${scope}-${sanitized}${areaSuffix}`;
}

function buildCapacityAlertNotification(entry, markAsNew, preservedTimestamp) {
    const scope = entry && entry.scope ? String(entry.scope).toLowerCase() : 'zone';
    const nombre = (entry && entry.name) ? entry.name : (scope === 'area' ? 'Área sin nombre' : 'Zona sin nombre');
    const areaNombre = entry && entry.areaName ? entry.areaName : '';
    const ocupacion = Number.isFinite(entry?.occupancy) ? entry.occupancy : null;
    const libre = Number.isFinite(entry?.freeVolume) ? entry.freeVolume : null;
    const timestamp = preservedTimestamp || new Date().toISOString().slice(0, 19).replace('T', ' ');
    const prioridad = entry && Number(entry.severity) >= 4 ? 'Alta' : 'Media';

    const partesMensaje = [];
    if (scope === 'area') {
        partesMensaje.push(`El área ${nombre} presenta un nivel crítico de ocupación${ocupacion !== null ? ` (${ocupacion.toFixed(1)}% ocupado)` : ''}.`);
    } else {
        const ubicacion = areaNombre ? ` del área ${areaNombre}` : '';
        partesMensaje.push(`La zona ${nombre}${ubicacion} presenta un nivel crítico de ocupación${ocupacion !== null ? ` (${ocupacion.toFixed(1)}% ocupado)` : ''}.`);
    }
    if (libre !== null) {
        partesMensaje.push(libre <= 0 ? 'Sin espacio libre disponible.' : `Espacio libre: ${libre.toFixed(2)} m³.`);
    }

    const tituloBase = scope === 'area' ? 'Área con espacio crítico' : 'Zona con espacio crítico';

    return {
        id: `capacity-alert-${getCapacityAlertKey(entry)}`,
        titulo: `${tituloBase}: ${nombre}`,
        mensaje: partesMensaje.join(' ').trim(),
        prioridad,
        fecha_disponible_desde: timestamp,
        ruta_destino: 'area_almac_v2/gestion_areas_zonas.html',
        estado: 'Enviada',
        es_nueva: !!markAsNew,
        tipo_destinatario: 'Usuario',
        es_local: true
    };
}

function updateCapacityAlertNotifications(entries) {
    const normalizedEntries = Array.isArray(entries) ? entries : [];
    const previousState = new Map(capacityAlertState);
    const nextState = new Map();
    const newlyTriggered = [];

    normalizedEntries.forEach(entry => {
        const key = getCapacityAlertKey(entry);
        if (!key) {
            return;
        }

        const previousEntry = previousState.get(key);
        const alreadyAlerted = previousEntry && previousEntry.alerted === true;
        const preservedTimestamp = previousEntry && previousEntry.notification
            ? previousEntry.notification.fecha_disponible_desde
            : null;

        const notification = buildCapacityAlertNotification(entry, !alreadyAlerted, preservedTimestamp);

        nextState.set(key, {
            alerted: true,
            notification
        });

        if (!alreadyAlerted) {
            newlyTriggered.push(notification);
        }
    });

    if (!normalizedEntries.length) {
        capacityAlertNotifications = [];
        capacityAlertState.clear();
    } else {
        capacityAlertState = nextState;
        capacityAlertNotifications = Array.from(nextState.values()).map(entry => entry.notification);
    }

    if (newlyTriggered.length) {
        if (JSON.parse(localStorage.getItem('alertFallosInventario') || 'true')) {
            newlyTriggered.forEach(notification => {
                const titulo = notification.titulo || 'Espacio crítico en el almacén';
                const mensaje = notification.mensaje || 'Se detectó una zona con espacio crítico en el almacén.';
                showCriticalStockAlert(titulo, mensaje);
            });
        }

        persistNotifications(newlyTriggered);
    }

    refreshNotificationUI();
}

function formatRequestActionLabel(rawAction) {
    if (!rawAction) {
        return '';
    }

    const sanitized = rawAction.toString().trim().replace(/_/g, ' ');
    if (!sanitized) {
        return '';
    }

    return sanitized.charAt(0).toUpperCase() + sanitized.slice(1);
}

function getPendingRequestFingerprint(request) {
    if (!request || typeof request !== 'object') {
        return '';
    }

    const parts = [
        request.resumen,
        request.descripcion,
        request.tipo_accion,
        request.estado,
        request.modulo,
        request.actualizado_en,
        request.fecha_actualizacion,
        request.fecha_actualizado
    ];

    return parts
        .map(part => (part == null ? '' : String(part).trim().toLowerCase()))
        .join('|');
}

function buildPendingRequestNotification(request, markAsNew, preservedTimestamp) {
    if (!request || request.id == null) {
        return null;
    }

    const requestId = String(request.id);
    const resumen = typeof request.resumen === 'string' ? request.resumen.trim() : '';
    const modulo = typeof request.modulo === 'string' ? request.modulo.trim() : '';
    const descripcion = typeof request.descripcion === 'string' ? request.descripcion.trim() : '';
    const solicitanteNombre = [request.solicitante_nombre, request.solicitante_apellido]
        .filter(part => typeof part === 'string' && part.trim())
        .map(part => part.trim())
        .join(' ');
    const accion = formatRequestActionLabel(request.tipo_accion);

    const mensajePartes = [];
    if (accion) {
        mensajePartes.push(`Acción solicitada: ${accion}`);
    }
    if (modulo) {
        mensajePartes.push(`Módulo: ${modulo}`);
    }
    if (solicitanteNombre) {
        mensajePartes.push(`Solicitante: ${solicitanteNombre}`);
    }
    if (descripcion) {
        mensajePartes.push(descripcion);
    }

    const mensaje = mensajePartes.join('\n') || 'Hay una solicitud pendiente de revisión.';
    const timestamp = preservedTimestamp
        || normalizeNotificationDateTime(request.fecha_creacion)
        || new Date().toISOString().slice(0, 19).replace('T', ' ');

    const tituloBase = resumen || (accion ? accion : 'Solicitud pendiente por revisar');

    return {
        id: `pending-request-${requestId}`,
        titulo: `Solicitud pendiente: ${tituloBase}`,
        mensaje,
        prioridad: 'Alta',
        fecha_disponible_desde: timestamp,
        ruta_destino: 'control_log/log.html',
        estado: 'Pendiente',
        es_nueva: !!markAsNew,
        tipo_destinatario: 'Usuario',
        es_local: true
    };
}

function updatePendingRequestNotifications(requests) {
    const normalizedRequests = Array.isArray(requests) ? requests : [];
    const previousState = new Map(pendingRequestState);
    const nextState = new Map();
    const notifications = [];

    normalizedRequests.forEach(request => {
        if (!request || request.id == null) {
            return;
        }

        const key = String(request.id);
        const previousEntry = previousState.get(key);
        const preservedTimestamp = previousEntry && previousEntry.notification
            ? previousEntry.notification.fecha_disponible_desde
            : null;
        const fingerprint = getPendingRequestFingerprint(request);
        const wasDismissedWithoutChange = Boolean(
            previousEntry
            && previousEntry.dismissed
            && previousEntry.fingerprint === fingerprint
        );

        const notification = buildPendingRequestNotification(
            request,
            !previousEntry || previousEntry.dismissed,
            preservedTimestamp
        );

        if (!notification) {
            return;
        }

        if (wasDismissedWithoutChange) {
            nextState.set(key, {
                notification,
                raw: request,
                fingerprint,
                dismissed: true
            });
            return;
        }

        nextState.set(key, {
            notification,
            raw: request,
            fingerprint,
            dismissed: false
        });

        notifications.push(notification);
    });

    pendingRequestState = nextState;
    pendingRequestNotifications = notifications;

    refreshNotificationUI();
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

    if (newlyTriggered.length) {
        if (JSON.parse(localStorage.getItem('alertMovCriticos') || 'true')) {
            newlyTriggered.forEach(notification => {
                const mensaje = notification.mensaje || 'Se detectó stock crítico en inventario.';
                showCriticalStockAlert(notification.titulo || 'Stock crítico', mensaje);
            });
        }

        persistNotifications(newlyTriggered);
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

function renderZoneCapacity(zonas, areaMap) {
    if (!zoneCapacityList) return;

    if (!Array.isArray(zonas) || !zonas.length) {
        setListState(zoneCapacityList, 'Todas las zonas se mantienen dentro de los rangos permitidos.', 'fas fa-check-circle', 'card-empty-state');
        return;
    }

    zoneCapacityList.innerHTML = '';
    zonas.slice(0, 5).forEach(zona => {
        const porcentaje = Number(zona.porcentaje ?? zona.porcentaje_ocupacion ?? 0);
        const disponible = Number(zona.capacidad_disponible ?? 0);
        const utilizada = Number(zona.capacidad_utilizada ?? 0);
        const areaNombre = zona.area_id && areaMap.has(zona.area_id)
            ? areaMap.get(zona.area_id).nombre
            : 'Sin área';

        const li = document.createElement('li');
        li.className = 'activity-item';

        const iconWrapper = document.createElement('div');
        iconWrapper.className = 'activity-icon';
        const icon = document.createElement('i');
        icon.className = 'fas fa-map-marker-alt';
        iconWrapper.appendChild(icon);

        const details = document.createElement('div');
        details.className = 'activity-details';

        const description = document.createElement('div');
        description.className = 'activity-description';
        description.textContent = `${zona.nombre || `Zona ${zona.id}`} · ${areaNombre}`;

        const meta = document.createElement('div');
        meta.className = 'activity-time';
        meta.textContent = `${porcentaje.toFixed(1)}% ocupación · ${disponible.toFixed(2)} m³ libres`;

        const tooltip = [
            `Capacidad utilizada: ${utilizada.toFixed(2)} m³`,
            `Productos: ${(zona.productos ?? zona.productos_registrados ?? 0)} tipos`,
            `Unidades totales: ${(zona.unidades ?? zona.total_unidades ?? 0)}`
        ];
        li.title = tooltip.join('\n');

        details.appendChild(description);
        details.appendChild(meta);

        li.appendChild(iconWrapper);
        li.appendChild(details);

        zoneCapacityList.appendChild(li);
    });
}

function renderSpaceOptimization(sugerencias) {
    if (!spaceOptimizationList) return;

    if (!Array.isArray(sugerencias) || !sugerencias.length) {
        setListState(spaceOptimizationList, 'Sin recomendaciones por ahora. La ocupación está equilibrada.', 'fas fa-check-circle', 'card-empty-state');
        return;
    }

    spaceOptimizationList.innerHTML = '';
    sugerencias.slice(0, 3).forEach(sugerencia => {
        const li = document.createElement('li');
        li.className = 'activity-item';

        const iconWrapper = document.createElement('div');
        iconWrapper.className = 'activity-icon';
        const icon = document.createElement('i');
        icon.className = sugerencia.tipo === 'redistribuir' ? 'fas fa-exchange-alt' : 'fas fa-lightbulb';
        iconWrapper.appendChild(icon);

        const details = document.createElement('div');
        details.className = 'activity-details';

        const description = document.createElement('div');
        description.className = 'activity-description';

        const meta = document.createElement('div');
        meta.className = 'activity-time';

        if (sugerencia.tipo === 'redistribuir') {
            const origenZona = sugerencia.zonaOrigen
                ? `${sugerencia.zonaOrigen.nombre} (${sugerencia.origen.nombre})`
                : sugerencia.origen.nombre;
            const destinoZona = sugerencia.zonaDestino
                ? `${sugerencia.zonaDestino.nombre} (${sugerencia.destino.nombre})`
                : sugerencia.destino.nombre;

            description.textContent = `Reubicar carga de ${origenZona} hacia ${destinoZona}`;

            const volumenLiberar = Number.isFinite(sugerencia.volumenPotencial) && sugerencia.volumenPotencial > 0
                ? `${sugerencia.volumenPotencial.toFixed(2)} m³ a liberar`
                : `${sugerencia.destino.disponible.toFixed(2)} m³ disponibles`;
            meta.textContent = `${sugerencia.origen.porcentaje.toFixed(1)}% ocupado · ${volumenLiberar}`;

            const tooltip = [];
            if (sugerencia.zonaOrigen) {
                tooltip.push(`Zona crítica: ${sugerencia.zonaOrigen.nombre} (${sugerencia.zonaOrigen.porcentaje.toFixed(1)}%)`);
            }
            tooltip.push(`Área origen: ${sugerencia.origen.productos} tipos / ${sugerencia.origen.unidades} uds`);
            tooltip.push(`Área destino libre: ${sugerencia.destino.disponible.toFixed(2)} m³`);
            if (sugerencia.zonaDestino) {
                tooltip.push(`Zona receptora: ${sugerencia.zonaDestino.nombre} (${sugerencia.zonaDestino.porcentaje.toFixed(1)}%)`);
            }
            li.title = tooltip.join('\n');
        } else {
            description.textContent = `Aprovecha ${sugerencia.destino.nombre} para nuevos ingresos`;
            meta.textContent = `${sugerencia.destino.disponible.toFixed(2)} m³ libres · ${sugerencia.destino.productos} tipos`;
            li.title = `Área con baja ocupación (${sugerencia.destino.porcentaje.toFixed(1)}% )`;
        }

        details.appendChild(description);
        details.appendChild(meta);

        li.appendChild(iconWrapper);
        li.appendChild(details);

        spaceOptimizationList.appendChild(li);
    });
}

function buildSpaceOptimizationSuggestions(areas, zonasPorArea) {
    const sugerencias = [];
    const usados = new Set();

    const altas = areas
        .filter(area => area && area.porcentaje >= 85 && area.disponible < Math.max(area.volumen * 0.25, 5))
        .sort((a, b) => b.porcentaje - a.porcentaje);

    const disponibles = areas
        .filter(area => area && area.disponible > 0 && area.porcentaje <= 70)
        .sort((a, b) => b.disponible - a.disponible);

    altas.forEach(origen => {
        const destino = disponibles.find(area => area.id !== origen.id && !usados.has(area.id));
        if (!destino) {
            return;
        }

        usados.add(destino.id);

        const zonasOrigen = zonasPorArea.get(origen.id) || [];
        const zonaCritica = zonasOrigen.slice().sort((a, b) => b.porcentaje - a.porcentaje)[0] || null;

        const zonasDestino = zonasPorArea.get(destino.id) || [];
        const zonaRecepcion = zonasDestino.slice().sort((a, b) => a.porcentaje - b.porcentaje)[0] || null;

        const potencial = zonaCritica
            ? Math.min(zonaCritica.capacidad_utilizada, destino.disponible)
            : Math.min(origen.utilizada, destino.disponible);

        sugerencias.push({
            tipo: 'redistribuir',
            origen,
            destino,
            zonaOrigen: zonaCritica,
            zonaDestino: zonaRecepcion,
            volumenPotencial: potencial
        });
    });

    if (!sugerencias.length) {
        disponibles.slice(0, 3).forEach(destino => {
            sugerencias.push({ tipo: 'aprovechar', destino });
        });
    }

    return sugerencias;
}

async function loadInfrastructureMetrics() {
    if (!zoneCapacityList && !spaceOptimizationList) {
        return;
    }

    const empresaId = localStorage.getItem('id_empresa');
    if (!empresaId) {
        if (zoneCapacityList) {
            setListState(zoneCapacityList, 'Registra tu empresa para ver las zonas con capacidad reducida.', 'fas fa-info-circle', 'card-empty-state');
        }
        if (spaceOptimizationList) {
            setListState(spaceOptimizationList, 'Registra tu empresa para recibir sugerencias de optimización.', 'fas fa-info-circle', 'card-empty-state');
        }
        updateDashboardStat('criticalZones', 0);
        return;
    }

    if (zoneCapacityList) {
        setListState(zoneCapacityList, 'Analizando capacidad...', 'fas fa-circle-notch', 'card-loading-state');
    }
    if (spaceOptimizationList) {
        setListState(spaceOptimizationList, 'Buscando oportunidades de mejora...', 'fas fa-circle-notch', 'card-loading-state');
    }

    try {
        const [zonasResponse, areasResponse] = await Promise.all([
            fetch(`/scripts/php/guardar_zonas.php?empresa_id=${encodeURIComponent(empresaId)}`),
            fetch(`/scripts/php/guardar_areas.php?empresa_id=${encodeURIComponent(empresaId)}`)
        ]);

        if (!zonasResponse.ok) {
            throw new Error(`HTTP ${zonasResponse.status} zonas`);
        }
        if (!areasResponse.ok) {
            throw new Error(`HTTP ${areasResponse.status} áreas`);
        }

        const zonasRaw = await zonasResponse.json();
        const areasRaw = await areasResponse.json();

        const normalizedAreas = normalizeAreaData(areasRaw);
        const areaMap = new Map(normalizedAreas.map(area => [area.id, area]));
        const normalizedZonas = normalizeZoneData(zonasRaw);

        const zonasPorArea = normalizedZonas.reduce((acc, zona) => {
            if (!zona.area_id) {
                return acc;
            }
            if (!acc.has(zona.area_id)) {
                acc.set(zona.area_id, []);
            }
            acc.get(zona.area_id).push(zona);
            return acc;
        }, new Map());

        const zonasCriticas = normalizedZonas
            .filter(zona => zona.porcentaje >= 75)
            .sort((a, b) => b.porcentaje - a.porcentaje);

        updateDashboardStat('criticalZones', zonasCriticas.length);

        renderZoneCapacity(zonasCriticas, areaMap);

        const sugerencias = buildSpaceOptimizationSuggestions(normalizedAreas, zonasPorArea);
        renderSpaceOptimization(sugerencias);
    } catch (error) {
        console.error('Error loading infrastructure metrics:', error);
        if (zoneCapacityList) {
            setListState(zoneCapacityList, 'No se pudo obtener la capacidad de las zonas.', 'fas fa-triangle-exclamation', 'card-empty-state');
        }
        if (spaceOptimizationList) {
            setListState(spaceOptimizationList, 'No se pudieron generar recomendaciones.', 'fas fa-triangle-exclamation', 'card-empty-state');
        }
    }
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
        updateDashboardStat('alerts', 0);
        return;
    }

    setButtonLoading(stockAlertsRefreshBtn, true);
    setListState(stockAlertList, 'Cargando alertas...', 'fas fa-circle-notch', 'card-loading-state');

    try {
        const [productosResult, zonasResult, areasResult] = await Promise.allSettled([
            fetch(`/scripts/php/guardar_productos.php?empresa_id=${encodeURIComponent(empresaId)}`),
            fetch(`/scripts/php/guardar_zonas.php?empresa_id=${encodeURIComponent(empresaId)}`),
            fetch(`/scripts/php/guardar_areas.php?empresa_id=${encodeURIComponent(empresaId)}`)
        ]);

        if (productosResult.status !== 'fulfilled' || !productosResult.value.ok) {
            const statusText = productosResult.status === 'fulfilled' ? productosResult.value.status : 'sin respuesta';
            throw new Error(`Inventario HTTP ${statusText}`);
        }

        const productosResponse = productosResult.value;
        const payload = await productosResponse.json();
        const productos = Array.isArray(payload) ? payload : [];

        let zonasRaw = [];
        if (zonasResult.status === 'fulfilled' && zonasResult.value) {
            if (zonasResult.value.ok) {
                try {
                    const zonasPayload = await zonasResult.value.json();
                    if (Array.isArray(zonasPayload)) {
                        zonasRaw = zonasPayload;
                    }
                } catch (error) {
                    console.warn('No se pudo interpretar la respuesta de zonas.', error);
                }
            } else {
                console.warn(`No se pudieron cargar las zonas (HTTP ${zonasResult.value.status}).`);
            }
        } else if (zonasResult.status === 'rejected') {
            console.warn('Error de red al obtener zonas.', zonasResult.reason);
        }

        let areasRaw = [];
        if (areasResult.status === 'fulfilled' && areasResult.value) {
            if (areasResult.value.ok) {
                try {
                    const areasPayload = await areasResult.value.json();
                    if (Array.isArray(areasPayload)) {
                        areasRaw = areasPayload;
                    }
                } catch (error) {
                    console.warn('No se pudo interpretar la respuesta de áreas.', error);
                }
            } else {
                console.warn(`No se pudieron cargar las áreas (HTTP ${areasResult.value.status}).`);
            }
        } else if (areasResult.status === 'rejected') {
            console.warn('Error de red al obtener áreas.', areasResult.reason);
        }

        const { alerts: stockAlerts, criticalProducts } = buildStockAlertEntries(productos, threshold);
        updateCriticalStockNotifications(criticalProducts, threshold);

        const normalizedAreas = normalizeAreaData(areasRaw);
        const normalizedZonas = normalizeZoneData(zonasRaw);
        const { notifications: capacityAlertNotifications = [] } = buildCapacityAlertEntries(normalizedAreas, normalizedZonas);
        updateCapacityAlertNotifications(capacityAlertNotifications);

        const stockDisplay = stockAlerts
            .slice()
            .sort((a, b) => (Number(b.severity) || 0) - (Number(a.severity) || 0))
            .slice(0, 8);

        updateDashboardStat('alerts', stockAlerts.length);

        if (!stockDisplay.length) {
            setListState(stockAlertList, 'No hay alertas activas en este momento.', 'fas fa-check-circle', 'card-empty-state');
            return;
        }

        stockAlertList.innerHTML = '';
        stockDisplay.forEach(alert => {
            const li = createAlertListItem(alert);
            if (alert.type && alert.type !== 'stock') {
                li.dataset.alertType = alert.type;
            }
            stockAlertList.appendChild(li);
        });
    } catch (error) {
        console.error('Error loading stock alerts:', error);
        setListState(stockAlertList, 'No se pudo cargar la información de alertas. Intenta nuevamente.', 'fas fa-triangle-exclamation', 'card-empty-state');
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
        updateDashboardStat('movements', 0);
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
            updateDashboardStat('movements', 0);
            setListState(recentActivityList, payload.message || 'No hay movimientos recientes.', 'fas fa-info-circle', 'card-empty-state');
            return;
        }

        const movimientos = Array.isArray(payload?.movimientos) ? payload.movimientos : (Array.isArray(payload) ? payload : []);

        const serverToday = Number(payload?.stats?.today);
        const serverYesterday = Number(payload?.stats?.yesterday);
        let movimientosHoy = Number.isFinite(serverToday) ? serverToday : null;
        let movimientosAyer = Number.isFinite(serverYesterday) ? serverYesterday : null;

        if (!Number.isFinite(movimientosHoy)) {
            movimientosHoy = countMovementsForDate(movimientos, new Date());
        }
        if (!Number.isFinite(movimientosAyer)) {
            const ayer = new Date();
            ayer.setDate(ayer.getDate() - 1);
            movimientosAyer = countMovementsForDate(movimientos, ayer);
        }

        const sanitizedHoy = Number.isFinite(movimientosHoy) ? movimientosHoy : 0;
        const sanitizedAyer = Number.isFinite(movimientosAyer) ? movimientosAyer : null;
        updateDashboardStat('movements', sanitizedHoy, { previousDayValue: sanitizedAyer });

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
    loadInfrastructureMetrics();
    loadStockAlerts();
    loadRecentMovements();
}

function saveHomeData() {
    const data = {
        empresaTitulo: document.getElementById('empresaTitulo')?.textContent || '',
        highRotation: document.getElementById('highRotationList')?.innerHTML || '',
        zoneCapacity: document.getElementById('zoneCapacityList')?.innerHTML || '',
        spaceOptimization: document.getElementById('spaceOptimizationList')?.innerHTML || '',
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
        const spaceOptimization = document.getElementById('spaceOptimizationList');
        if (spaceOptimization && data.spaceOptimization) spaceOptimization.innerHTML = data.spaceOptimization;
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

function refreshHomeDashboard(options = {}) {
    const { restore = true } = options;

    if (restore) {
        restoreHomeData();
    }

    loadMetrics();
    loadAccessLogs();
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
        autoArchiveSeenNotifications();
    };

    notificationBell.addEventListener('click', event => {
        event.stopPropagation();
        const isOpen = notificationWrapper.classList.toggle('open');
        notificationBell.setAttribute('aria-expanded', String(isOpen));

        if (isOpen) {
            fetchNotifications();
            fetchPendingRequestNotifications({ force: true });
            notificationTray.focus();
        } else {
            autoArchiveSeenNotifications();
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
        const targetRoute = 'control_log/log.html';

        if (typeof window.loadPageIntoMainFromNotifications === 'function') {
            window.loadPageIntoMainFromNotifications(targetRoute, {
                title: 'Registro de actividades'
            });
        } else {
            window.location.href = targetRoute;
        }

        if (notificationWrapper) {
            notificationWrapper.classList.remove('open');
        }
        if (notificationBell) {
            notificationBell.setAttribute('aria-expanded', 'false');
        }
        autoArchiveSeenNotifications();
    });
}

if (notificationClearButton) {
    notificationClearButton.addEventListener('click', () => {
        clearNotificationTray();
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

const manualEntradaBtn = document.getElementById('manualEntradaBtn');
const manualSalidaBtn = document.getElementById('manualSalidaBtn');
const manualMovimientoModalElement = document.getElementById('manualMovimientoModal');
const manualMovimientoModal = manualMovimientoModalElement && typeof bootstrap !== 'undefined'
    ? new bootstrap.Modal(manualMovimientoModalElement)
    : null;
const manualMovimientoForm = document.getElementById('manualMovimientoForm');
const manualMovimientoTitulo = document.getElementById('manualMovimientoTitulo');
const manualMovimientoProducto = document.getElementById('manualMovimientoProducto');
const manualMovimientoCantidad = document.getElementById('manualMovimientoCantidad');
const manualMovimientoGuardar = document.getElementById('manualMovimientoGuardar');
const manualMovimientoError = document.getElementById('manualMovimientoError');
const manualCantidadHelp = document.getElementById('manualCantidadHelp');

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

let manualMovimientoTipo = 'ingreso';
let manualProductosCache = [];
let manualProductosEmpresaId = null;
let manualCargandoProductos = false;

function manualResetFeedback() {
    if (manualMovimientoError) {
        manualMovimientoError.textContent = '';
        manualMovimientoError.classList.add('d-none');
    }
    if (manualCantidadHelp) {
        manualCantidadHelp.textContent = '';
    }
}

function manualMostrarError(message) {
    if (!manualMovimientoError) {
        return;
    }
    if (message) {
        manualMovimientoError.textContent = String(message);
        manualMovimientoError.classList.remove('d-none');
    } else {
        manualMovimientoError.textContent = '';
        manualMovimientoError.classList.add('d-none');
    }
}

function manualToggleGuardar(disabled) {
    if (manualMovimientoGuardar) {
        manualMovimientoGuardar.disabled = Boolean(disabled);
    }
}

function manualPoblarSelect(productos = manualProductosCache) {
    if (!manualMovimientoProducto) {
        return;
    }

    manualMovimientoProducto.innerHTML = '';
    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = 'Selecciona un producto';
    manualMovimientoProducto.appendChild(placeholderOption);

    if (!Array.isArray(productos) || productos.length === 0) {
        manualMovimientoProducto.disabled = true;
        manualToggleGuardar(true);
        manualMostrarError('No hay productos registrados. Agrega productos desde el módulo de inventario.');
        return;
    }

    const productosOrdenados = [...productos].sort((a, b) => {
        const nombreA = (a?.nombre || '').toString();
        const nombreB = (b?.nombre || '').toString();
        return nombreA.localeCompare(nombreB, 'es', { sensitivity: 'base' });
    });

    productosOrdenados.forEach(producto => {
        if (!producto) return;
        const option = document.createElement('option');
        option.value = String(producto.id);
        const codigo = producto.codigo || producto.codigo_barras || producto.sku || producto.codigo_interno;
        const nombre = producto.nombre || `Producto #${producto.id}`;
        option.textContent = codigo ? `${nombre} (${codigo})` : nombre;
        const stock = parseInt(producto.stock, 10);
        option.dataset.stock = Number.isFinite(stock) ? String(stock) : '0';
        manualMovimientoProducto.appendChild(option);
    });

    manualMovimientoProducto.disabled = false;
    manualToggleGuardar(false);
    manualMostrarError('');
}

function manualObtenerProductoSeleccionado() {
    if (!manualMovimientoProducto) {
        return null;
    }
    const productoId = parseInt(manualMovimientoProducto.value, 10);
    if (!Number.isFinite(productoId)) {
        return null;
    }
    return manualProductosCache.find(item => parseInt(item?.id, 10) === productoId) || null;
}

function manualActualizarAyudaCantidad() {
    if (!manualCantidadHelp) {
        return;
    }

    const producto = manualObtenerProductoSeleccionado();
    const stockActual = producto ? parseInt(producto.stock, 10) || 0 : 0;

    if (!producto) {
        manualCantidadHelp.textContent = manualMovimientoTipo === 'egreso'
            ? 'Selecciona un producto para conocer el stock disponible.'
            : 'Selecciona un producto para registrar la entrada.';
        return;
    }

    if (manualMovimientoTipo === 'egreso') {
        if (stockActual > 0) {
            manualCantidadHelp.textContent = `Disponibles ${stockActual} unidad${stockActual === 1 ? '' : 'es'} para egreso.`;
        } else {
            manualCantidadHelp.textContent = 'No hay unidades disponibles para egresar.';
        }
    } else {
        manualCantidadHelp.textContent = `El movimiento sumará unidades al stock actual (${stockActual}).`;
    }
}

async function manualCargarProductos(force = false) {
    if (!FLASH_EMPRESA_ID) {
        manualPoblarSelect([]);
        return [];
    }

    if (!force && manualProductosEmpresaId === FLASH_EMPRESA_ID && manualProductosCache.length) {
        manualPoblarSelect(manualProductosCache);
        manualActualizarAyudaCantidad();
        return manualProductosCache;
    }

    manualCargandoProductos = true;
    manualToggleGuardar(true);
    manualMostrarError('');

    try {
        const url = `${FLASH_API.productos}?empresa_id=${encodeURIComponent(FLASH_EMPRESA_ID)}`;
        const data = await flashFetchJSON(url);
        const productos = Array.isArray(data)
            ? data
            : Array.isArray(data?.productos)
                ? data.productos
                : [];
        manualProductosCache = productos;
        manualProductosEmpresaId = FLASH_EMPRESA_ID;
        manualPoblarSelect(productos);
        manualActualizarAyudaCantidad();
        return manualProductosCache;
    } catch (error) {
        console.error('manualCargarProductos', error);
        manualPoblarSelect([]);
        manualMostrarError('No se pudieron cargar los productos. Intenta nuevamente.');
        throw error;
    } finally {
        manualCargandoProductos = false;
    }
}

function manualAbrirModal(tipo) {
    if (!manualMovimientoModal) {
        return;
    }

    if (!FLASH_EMPRESA_ID) {
        flashShowToast('Registra tu empresa para poder registrar movimientos.', 'error');
        return;
    }

    manualMovimientoTipo = tipo === 'egreso' ? 'egreso' : 'ingreso';
    manualResetFeedback();

    if (manualMovimientoTitulo) {
        manualMovimientoTitulo.textContent = manualMovimientoTipo === 'egreso'
            ? 'Registrar Salida'
            : 'Registrar Entrada';
    }

    if (manualMovimientoProducto) {
        manualMovimientoProducto.value = '';
        manualMovimientoProducto.disabled = true;
    }
    if (manualMovimientoCantidad) {
        manualMovimientoCantidad.value = '';
    }

    manualToggleGuardar(true);
    manualActualizarAyudaCantidad();
    manualMovimientoModal.show();

    manualCargarProductos().catch(() => {
        // El error ya fue mostrado al usuario en manualCargarProductos
    });
}

async function manualRegistrarMovimiento(event) {
    if (event) {
        event.preventDefault();
    }

    if (!manualMovimientoForm) {
        return;
    }

    manualMostrarError('');

    if (!FLASH_EMPRESA_ID) {
        flashShowToast('Registra tu empresa para poder registrar movimientos.', 'error');
        return;
    }

    const producto = manualObtenerProductoSeleccionado();
    const productoId = producto ? parseInt(producto.id, 10) : NaN;
    if (!producto || !Number.isFinite(productoId)) {
        manualMostrarError('Selecciona un producto para continuar.');
        manualMovimientoProducto?.focus();
        return;
    }

    const cantidad = manualMovimientoCantidad ? Number(manualMovimientoCantidad.value) : NaN;
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
        manualMostrarError('Ingresa una cantidad válida mayor a cero.');
        manualMovimientoCantidad?.focus();
        return;
    }

    const stockActual = parseInt(producto.stock, 10) || 0;
    if (manualMovimientoTipo === 'egreso') {
        if (stockActual <= 0) {
            manualMostrarError('No hay stock disponible para egresar este producto.');
            return;
        }
        if (cantidad > stockActual) {
            manualMostrarError(`La cantidad no puede exceder el stock disponible (${stockActual}).`);
            return;
        }
    }

    manualToggleGuardar(true);

    try {
        const payload = {
            empresa_id: FLASH_EMPRESA_ID,
            producto_id: productoId,
            tipo: manualMovimientoTipo,
            cantidad
        };

        const resultado = await flashFetchJSON(FLASH_API.movimiento, 'POST', payload);
        if (!resultado || resultado.success !== true) {
            throw new Error(resultado?.error || 'No se pudo registrar el movimiento.');
        }

        const nuevoStock = (() => {
            const remoto = parseInt(resultado.stock_actual, 10);
            if (Number.isFinite(remoto)) {
                return remoto;
            }
            return manualMovimientoTipo === 'egreso'
                ? stockActual - cantidad
                : stockActual + cantidad;
        })();

        producto.stock = nuevoStock;

        flashShowToast(
            manualMovimientoTipo === 'egreso'
                ? 'Movimiento de salida registrado correctamente.'
                : 'Movimiento de entrada registrado correctamente.',
            'success'
        );

        manualMovimientoModal?.hide();
        manualMovimientoForm.reset();
        manualActualizarAyudaCantidad();

        if (typeof loadRecentMovements === 'function') {
            try {
                loadRecentMovements();
            } catch (refreshError) {
                console.warn('No se pudo refrescar los movimientos recientes', refreshError);
            }
        }

        if (typeof loadStockAlerts === 'function') {
            try {
                loadStockAlerts();
            } catch (alertError) {
                console.warn('No se pudo refrescar las alertas de stock', alertError);
            }
        }
    } catch (error) {
        console.error('manualRegistrarMovimiento', error);
        manualMostrarError(error?.message || 'No se pudo registrar el movimiento.');
    } finally {
        manualToggleGuardar(false);
        manualActualizarAyudaCantidad();
    }
}

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

manualEntradaBtn?.addEventListener('click', () => {
    manualAbrirModal('ingreso');
});

manualSalidaBtn?.addEventListener('click', () => {
    manualAbrirModal('egreso');
});

manualMovimientoForm?.addEventListener('submit', manualRegistrarMovimiento);

manualMovimientoProducto?.addEventListener('change', () => {
    manualMostrarError('');
    manualActualizarAyudaCantidad();
});

manualMovimientoCantidad?.addEventListener('input', () => {
    if (manualMovimientoError && !manualMovimientoError.classList.contains('d-none')) {
        manualMostrarError('');
    }
});

manualMovimientoModalElement?.addEventListener('shown.bs.modal', () => {
    manualMovimientoProducto?.focus();
    manualActualizarAyudaCantidad();
});

manualMovimientoModalElement?.addEventListener('hidden.bs.modal', () => {
    manualResetFeedback();
    if (manualMovimientoProducto && !manualCargandoProductos) {
        manualMovimientoProducto.disabled = false;
        manualMovimientoProducto.value = '';
    }
    if (manualMovimientoCantidad) {
        manualMovimientoCantidad.value = '';
    }
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
        alert(msg);

    }
}

document.addEventListener('movimientoNoAutorizado', e => {
    notifyUnauthorizedMovement(e.detail || 'Movimiento no autorizado detectado');
});

document.addEventListener("DOMContentLoaded", function () {
    const mainContent = document.getElementById('mainContent');
    if (!mainContent) {
        return;
    }

    const homeViewContainer = document.createElement('div');
    homeViewContainer.id = 'mainMenuHomeView';
    homeViewContainer.classList.add('main-menu-home-view');
    while (mainContent.firstChild) {
        homeViewContainer.appendChild(mainContent.firstChild);
    }
    mainContent.appendChild(homeViewContainer);

    const spaContainer = document.createElement('div');
    spaContainer.id = 'mainMenuSpaContainer';
    spaContainer.classList.add('main-menu-spa-container');
    spaContainer.hidden = true;
    mainContent.appendChild(spaContainer);

    let estaEnInicio = true;

    function removeSearchBodyClass() {
        document.body.classList.remove('search-page-body');
        mainContent.classList.remove('search-page-host');
        if (spaContainer) {
            const existingSearchRoot = spaContainer.querySelector('.search-page-root');
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

    function showHomeView(options = {}) {
        const { restore = true } = options;

        homeViewContainer.hidden = false;
        spaContainer.hidden = true;
        spaContainer.innerHTML = '';

        refreshHomeDashboard({ restore });

        estaEnInicio = true;
        removeSearchBodyClass();
    }

    function renderSpaContent(html) {
        homeViewContainer.hidden = true;
        spaContainer.hidden = false;
        spaContainer.innerHTML = html;
        executeEmbeddedScripts(spaContainer);
    }

    function loadPageIntoMain(pageUrl, options = {}) {
        const { title = '', pageId = '' } = options;
        const normalizedUrl = normalizePageUrl(pageUrl);

        if (!normalizedUrl) return;

        if (/^https?:\/\//i.test(normalizedUrl)) {
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
                renderSpaContent(html);
            })
            .catch(err => {
                renderSpaContent(`<p>Error cargando la página: ${err}</p>`);
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

        if (estaEnInicio) {
            saveHomeData();
            estaEnInicio = false;
        }

        document.querySelectorAll('.sidebar-menu a').forEach(link => link.classList.remove('active'));

        showSearchLoader(spaContainer);
        homeViewContainer.hidden = true;
        spaContainer.hidden = false;

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
                    spaContainer.innerHTML = '';
                    if (incomingMain.classList.contains('content')) {
                        incomingMain.classList.remove('content');
                    }
                    incomingMain.classList.add('search-page-root');
                    spaContainer.appendChild(incomingMain);
                } else if (doc.body) {
                    spaContainer.innerHTML = doc.body.innerHTML;
                    const fallbackRoot = spaContainer.querySelector('.search-page');
                    if (fallbackRoot) {
                        fallbackRoot.classList.remove('content');
                        fallbackRoot.classList.add('search-page-root');
                    }
                } else {
                    spaContainer.innerHTML = html;
                }

                mainContent.classList.add('search-page-host');

                if (topbarTitle) {
                    topbarTitle.textContent = 'Buscador global';
                }

                ensureGlobalSearchModule(sanitizedQuery);
            })
            .catch(err => {
                removeSearchBodyClass();
                spaContainer.innerHTML = `<div class="search-error-state">No se pudo cargar el buscador global. ${err}</div>`;
                spaContainer.hidden = false;
                homeViewContainer.hidden = true;
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

    refreshHomeDashboard();
    window.addEventListener('beforeunload', saveHomeData);
    window.addEventListener('pageshow', event => {
        if (event.persisted && !spaContainer.hidden) {
            return;
        }
        if (event.persisted && homeViewContainer.hidden === false) {
            refreshHomeDashboard({ restore: true });
        }
    });
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
            fetchPendingRequestNotifications({ force: true });
            startNotificationPolling();
            startStockAlertAutoRefresh();
            localStorage.setItem('id_empresa', data.empresa_id); // 🟢 GUARDAMOS EL ID
            loadStockAlerts();
            const tituloEmpresa = document.getElementById('empresaTitulo');
            if (tituloEmpresa) {
                tituloEmpresa.textContent = `Bienvenido a ${data.empresa_nombre}`;
            }
            document.querySelectorAll('.empresa-elements').forEach(el => el.style.display = 'block');

            refreshHomeDashboard({ restore: false });

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
                showHomeView();
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
            renderSpaContent(html);
            estaEnInicio = false;
            removeSearchBodyClass();
        })
        .catch(err => {
            renderSpaContent(`<p>Error cargando la vista: ${err}</p>`);
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
            renderSpaContent(html);
            estaEnInicio = false;
            removeSearchBodyClass();

            // Actualizar topbar (opcional)
            const titulo = vistaPendiente.split('/').pop().replace('.html', '').replace(/_/g, ' ');
            const topbarTitle = document.querySelector('.topbar-title');
            if (topbarTitle) {
                topbarTitle.textContent = titulo.charAt(0).toUpperCase() + titulo.slice(1);
            }
        })
        .catch(err => {
            renderSpaContent(`<p>Error cargando la vista: ${err}</p>`);
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
