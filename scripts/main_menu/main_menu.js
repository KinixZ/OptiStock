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

function getContrastingColor(hexColor) {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#000000' : '#ffffff';
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
    const data = {
        empresaTitulo: document.getElementById('empresaTitulo')?.textContent || '',
        stockAlerts: document.querySelector('#stockAlertsCard .stock-alert-list')?.innerHTML || '',
        recentActivity: document.querySelector('#recentActivityCard .activity-list')?.innerHTML || '',
        highRotation: document.getElementById('highRotationList')?.innerHTML || '',
        zoneCapacity: document.getElementById('zoneCapacityList')?.innerHTML || '',
        accessLogs: document.getElementById('accessLogsList')?.innerHTML || ''
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
        const stockAlerts = document.querySelector('#stockAlertsCard .stock-alert-list');
        if (stockAlerts && data.stockAlerts) stockAlerts.innerHTML = data.stockAlerts;
        const recentActivity = document.querySelector('#recentActivityCard .activity-list');
        if (recentActivity && data.recentActivity) recentActivity.innerHTML = data.recentActivity;
        const highRotation = document.getElementById('highRotationList');
        if (highRotation && data.highRotation) highRotation.innerHTML = data.highRotation;
        const zoneCapacity = document.getElementById('zoneCapacityList');
        if (zoneCapacity && data.zoneCapacity) zoneCapacity.innerHTML = data.zoneCapacity;
        const accessLogs = document.getElementById('accessLogsList');
        if (accessLogs && data.accessLogs) accessLogs.innerHTML = data.accessLogs;
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
        document.documentElement.style.setProperty('--sidebar-color', colorSidebarSeleccionado);
        const textColor = getContrastingColor(colorSidebarSeleccionado);
        document.documentElement.style.setProperty('--sidebar-text-color', textColor);

        document.documentElement.style.setProperty('--topbar-color', colorTopbarSeleccionado);
        const topbarText = getContrastingColor(colorTopbarSeleccionado);
        document.documentElement.style.setProperty('--topbar-text-color', topbarText);
    });
});

document.querySelectorAll('#topbarColors button').forEach(btn => {
    btn.addEventListener('click', () => {
        colorTopbarSeleccionado = btn.dataset.color;
        document.querySelectorAll('#topbarColors button').forEach(b => b.style.border = '2px solid #ccc');
        btn.style.border = '3px solid black';
        document.documentElement.style.setProperty('--topbar-color', colorTopbarSeleccionado);
        const textColor = getContrastingColor(colorTopbarSeleccionado);
        document.documentElement.style.setProperty('--topbar-text-color', textColor);
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
                document.documentElement.style.setProperty('--sidebar-color', config.color_sidebar);
                const textColor = getContrastingColor(config.color_sidebar);
                document.documentElement.style.setProperty('--sidebar-text-color', textColor);
                colorSidebarSeleccionado = config.color_sidebar;
                document.querySelectorAll('#sidebarColors button').forEach(b => b.style.border = '2px solid #ccc');
                const btn = document.querySelector(`#sidebarColors button[data-color="${config.color_sidebar}"]`);
                if (btn) btn.style.border = '3px solid black';

            }
            if (config.color_topbar) {
                document.documentElement.style.setProperty('--topbar-color', config.color_topbar);
                const textColor = getContrastingColor(config.color_topbar);
                document.documentElement.style.setProperty('--topbar-text-color', textColor);

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
