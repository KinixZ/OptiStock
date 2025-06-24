// Toggle sidebar collapse/expand
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.querySelector('.sidebar');

menuToggle.addEventListener('click', function () {
    if (window.innerWidth <= 992) {
        sidebar.classList.toggle('active');
    } else {
        sidebar.classList.toggle('collapsed');
    }
});

document.addEventListener('click', function (e) {
    if (window.innerWidth <= 992 && !sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
        sidebar.classList.remove('active');
    }
});

window.addEventListener('resize', function () {
    if (window.innerWidth > 992) {
        sidebar.classList.remove('active');
    }
});

const tutorialSteps = [
    { title: "Bienvenido a OPTISTOCK", content: "Este tutorial te guiará...", element: null },
    { title: "Funciones Rápidas Flash", content: "Los botones...", element: document.querySelector('.quick-actions') },
    { title: "Áreas y Zonas de Almacén", content: "Desde este módulo...", element: document.querySelector('.sidebar-menu a[href="../area_almac/areas_zonas.html"]') },
    { title: "Gestión de Inventario", content: "El corazón del sistema...", element: document.querySelector('.sidebar-menu a[href="../gest_inve/gestion_inventario.html"]') },
    { title: "Administración de Usuarios", content: "Gestiona los accesos...", element: document.querySelector('.sidebar-menu a[href="../admin_usuar/administracion_usuarios.html"]') },
    { title: "Dashboard Principal", content: "Aquí encontrarás un resumen...", element: document.querySelector('.dashboard-grid') },
    { title: "Generación de Reportes", content: "Crea reportes detallados...", element: document.querySelector('.sidebar-menu a[href="../reports/reportes.html"]') },
    { title: "Personalización", content: "Como administrador...", element: document.querySelector('.sidebar-footer .btn') }
];

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

function checkFirstVisit(userId) {
    const clave = `tutorial_mostrado_usuario_${userId}`;
    if (!localStorage.getItem(clave)) {
        startTutorial();
        localStorage.setItem(clave, 'true');
    }
}

function startTutorial() {
    currentStep = 0;
    showTutorialStep(currentStep);
    tutorialOverlayBg.style.display = 'block';
    tutorialCardContainer.style.display = 'flex';
}

function showTutorialStep(step) {
    if (step >= tutorialSteps.length) {
        endTutorial();
        return;
    }
    currentStep = step;
    const stepData = tutorialSteps[step];
    tutorialTitle.textContent = stepData.title;
    tutorialContent.innerHTML = `<p>${stepData.content}</p>`;
    tutorialIndicator.textContent = `Paso ${step + 1} de ${tutorialSteps.length}`;
    nextTutorial.textContent = step === tutorialSteps.length - 1 ? 'Finalizar' : 'Siguiente';
    document.querySelectorAll('.tutorial-spotlight').forEach(el => el.classList.remove('tutorial-spotlight'));
    if (tutorialHole) { tutorialHole.remove(); tutorialHole = null; }
    if (stepData.element) {
        stepData.element.classList.add('tutorial-spotlight');
        const rect = stepData.element.getBoundingClientRect();
        tutorialHole = document.createElement('div');
        tutorialHole.className = 'tutorial-hole';
        tutorialHole.style.width = `${rect.width}px`;
        tutorialHole.style.height = `${rect.height}px`;
        tutorialHole.style.left = `${rect.left}px`;
        tutorialHole.style.top = `${rect.top}px`;
        tutorialOverlayBg.appendChild(tutorialHole);
        const cardWidth = 500;
        const cardLeft = Math.min(window.innerWidth - cardWidth - 20, Math.max(20, rect.left + (rect.width / 2) - (cardWidth / 2)));
        const cardTop = rect.bottom + 20;
        tutorialCard.style.top = cardTop + tutorialCard.offsetHeight > window.innerHeight ? `${rect.top - tutorialCard.offsetHeight - 20}px` : `${cardTop}px`;
        tutorialCard.style.left = `${cardLeft}px`;
        setTimeout(() => {
            stepData.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
    } else {
        tutorialCard.style.top = '50%';
        tutorialCard.style.left = '50%';
        tutorialCard.style.transform = 'translate(-50%, -50%)';
    }
}

function endTutorial() {
    tutorialOverlayBg.style.display = 'none';
    tutorialCardContainer.style.display = 'none';
    document.querySelectorAll('.tutorial-spotlight').forEach(el => el.classList.remove('tutorial-spotlight'));
    if (tutorialHole) { tutorialHole.remove(); tutorialHole = null; }
}

nextTutorial.addEventListener('click', () => showTutorialStep(currentStep + 1));
skipTutorial.addEventListener('click', endTutorial);
closeTutorial.addEventListener('click', endTutorial);

document.addEventListener("DOMContentLoaded", function () {
    const nombre = localStorage.getItem('usuario_nombre');
    const rol = localStorage.getItem('usuario_rol');
    const userNameEl = document.querySelector('.user-name');
    const userRoleEl = document.querySelector('.user-role');
    if (nombre && userNameEl) userNameEl.textContent = nombre;
    if (rol && userRoleEl) userRoleEl.textContent = rol;

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
        const sidebarMenu = document.querySelector('.sidebar-menu');
        const dashboard = document.querySelector('.dashboard-grid');
        const welcomeCard = document.querySelector('.welcome-card');
        const mensajeSinEmpresa = document.createElement('div');
        mensajeSinEmpresa.id = 'mensaje-sin-empresa';
        mensajeSinEmpresa.style.textAlign = 'center';
        mensajeSinEmpresa.style.padding = '60px';
        mensajeSinEmpresa.innerHTML = `
            <h2>¡Aún no has registrado una empresa!</h2>
            <p>Para comenzar a usar OPTISTOCK, primero necesitas registrar tu empresa.</p>
            <button class="btn btn-primary" style="margin-top: 20px;" onclick="location.href='../regis_login/regist/regist_empresa.html'">
                Registrar Empresa
            </button>
        `;

        if (data.success) {
            if (sidebarMenu) sidebarMenu.style.display = 'block';
            if (dashboard) dashboard.style.display = 'grid';
            if (welcomeCard) welcomeCard.style.display = 'block';
            mensajeSinEmpresa.style.display = 'none';
            document.body.appendChild(mensajeSinEmpresa);
            checkFirstVisit(userId);
        } else {
            if (sidebarMenu) sidebarMenu.style.display = 'none';
            if (dashboard) dashboard.style.display = 'none';
            if (welcomeCard) welcomeCard.style.display = 'none';
            mensajeSinEmpresa.style.display = 'block';
            document.body.appendChild(mensajeSinEmpresa);
        }
    })
    .catch(err => {
        console.error("❌ Error consultando empresa:", err);
    });
});
