// Toggle sidebar collapse/expand
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.querySelector('.sidebar');

// Toggle sidebar on button click
menuToggle.addEventListener('click', function() {
    // On mobile, just show/hide the sidebar
    if (window.innerWidth <= 992) {
        sidebar.classList.toggle('active');
    } 
    // On desktop, toggle collapsed state
    else {
        sidebar.classList.toggle('collapsed');
    }
});

// Close sidebar when clicking outside on mobile
document.addEventListener('click', function(e) {
    if (window.innerWidth <= 992 && 
        !sidebar.contains(e.target) && 
        !menuToggle.contains(e.target)) {
        sidebar.classList.remove('active');
    }
});

// Handle window resize
window.addEventListener('resize', function() {
    if (window.innerWidth > 992) {
        sidebar.classList.remove('active');
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
        title: "Funciones Rápidas Flash",
        content: "Los botones 'Ingreso Flash' y 'Egreso Flash' te permiten registrar movimientos de productos ya existentes de manera rápida mediante escaneo de códigos QR o barras.",
        element: document.querySelector('.quick-actions')
    },
    {
        title: "Áreas y Zonas de Almacén",
        content: "Desde este módulo podrás gestionar todas las áreas y zonas de tu almacén, asignar ubicaciones y configurar la distribución física de tus productos.",
        element: document.querySelector('.sidebar-menu a[href="pages/almacen/areas_zonas.html"]')
    },
    {
        title: "Gestión de Inventario",
        content: "El corazón del sistema. Aquí podrás registrar nuevos productos, actualizar existencias, realizar transferencias y gestionar todo tu inventario de manera eficiente.",
        element: document.querySelector('.sidebar-menu a[href="pages/inventario/gestion_inventario.html"]')
    },
    {
        title: "Administración de Usuarios",
        content: "Gestiona los accesos, permisos y roles de todos los usuarios del sistema. Asigna responsabilidades y controla quién puede realizar cada operación.",
        element: document.querySelector('.sidebar-menu a[href="pages/usuarios/administracion_usuarios.html"]')
    },
    {
        title: "Dashboard Principal",
        content: "Aquí encontrarás un resumen visual de las métricas más importantes: productos con stock bajo, movimientos recientes y accesos de empleados.",
        element: document.querySelector('.dashboard-grid')
    },
    {
        title: "Generación de Reportes",
        content: "Crea reportes detallados de inventario, movimientos y cualquier otra información relevante para la toma de decisiones.",
        element: document.querySelector('.sidebar-menu a[href="pages/reportes/reportes.html"]')
    },
    {
        title: "Personalización",
        content: "Como administrador, puedes personalizar el sistema cambiando colores, reorganizando accesos rápidos y adaptando la interfaz a las necesidades de tu empresa.",
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

// Show tutorial on first visit
function checkFirstVisit() {
    if (!localStorage.getItem('optistock_visited')) {
        startTutorial();
        localStorage.setItem('optistock_visited', 'true');
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
        const cardWidth = 500;
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
        
        // Scroll element into view if needed
        setTimeout(() => {
            stepData.element.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }, 300);
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
}

// Event Listeners
nextTutorial.addEventListener('click', () => {
    showTutorialStep(currentStep + 1);
});

skipTutorial.addEventListener('click', endTutorial);
closeTutorial.addEventListener('click', endTutorial);

// Check for first visit when page loads
window.addEventListener('DOMContentLoaded', checkFirstVisit);

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

document.addEventListener("DOMContentLoaded", function () {
    const mainContent = document.getElementById('mainContent');
    let contenidoInicial = mainContent.innerHTML;

    // Mostrar nombre y rol del usuario
    const nombre = localStorage.getItem('usuario_nombre');
    const rol = localStorage.getItem('usuario_rol');
    const userNameEl = document.querySelector('.user-name');
    const userRoleEl = document.querySelector('.user-role');

    if (nombre && userNameEl) userNameEl.textContent = nombre;
    if (rol && userRoleEl) userRoleEl.textContent = rol;

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

document.querySelector('.sidebar-footer button').addEventListener('click', () => {
    document.getElementById('modalConfigVisual').style.display = 'flex';
});

// Selección de colores
document.querySelectorAll('#sidebarColors button').forEach(btn => {
    btn.addEventListener('click', () => {
        colorSidebarSeleccionado = btn.dataset.color;
        document.querySelectorAll('#sidebarColors button').forEach(b => b.style.border = '2px solid #ccc');
        btn.style.border = '3px solid black';
    });
});

document.querySelectorAll('#topbarColors button').forEach(btn => {
    btn.addEventListener('click', () => {
        colorTopbarSeleccionado = btn.dataset.color;
        document.querySelectorAll('#topbarColors button').forEach(b => b.style.border = '2px solid #ccc');
        btn.style.border = '3px solid black';
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

    document.getElementById('modalConfigVisual').style.display = 'none';
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

            // Si es "inicio", restaurar dashboard original
            if (pageUrl === 'inicio') {
                mainContent.innerHTML = contenidoInicial;
                return;
            }

            // Cargar HTML externo en content
            fetch(`../${pageUrl}`)
                .then(res => res.text())
                .then(html => {
                    mainContent.innerHTML = html;

                    // Ejecutar scripts internos si los hay
                    const scripts = mainContent.querySelectorAll('script');
                    scripts.forEach(script => {
                        const newScript = document.createElement('script');
                        if (script.src) {
                            newScript.src = script.src;
                        } else {
                            newScript.textContent = script.textContent;
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

            // Ejecutar scripts embebidos si los hay
            const scripts = mainContent.querySelectorAll("script");
            scripts.forEach(script => {
                const newScript = document.createElement("script");
                if (script.src) newScript.src = script.src;
                else newScript.textContent = script.textContent;
                document.body.appendChild(newScript);
            });
        })
        .catch(err => {
            document.getElementById("mainContent").innerHTML = `<p>Error cargando la vista: ${err}</p>`;
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
                document.querySelector('.sidebar').style.backgroundColor = config.color_sidebar;
            }
            if (config.color_topbar) {
                document.querySelector('.topbar').style.backgroundColor = config.color_topbar;
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
