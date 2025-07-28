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


// Tutorial configuration
const tutorialSteps = [
    {
        title: 'Bienvenido a OPTISTOCK',
        content: 'Este tutorial te guiar\u00e1 por las principales funciones del sistema. OPTISTOCK es una soluci\u00f3n completa para la gesti\u00f3n de almacenes que te ayudar\u00e1 a optimizar tus operaciones.',
        selector: null
    },
    {
        title: 'Funciones R\u00e1pidas Flash',
        content: 'Los botones \u201cIngreso Flash\u201d y \u201cEgreso Flash\u201d permiten registrar movimientos de productos existentes de forma inmediata mediante escaneo de c\u00f3digos.',
        selector: '.quick-actions'
    },
    {
        title: '\u00c1reas y Zonas de Almac\u00e9n',
        content: 'Desde este m\u00f3dulo puedes administrar las \u00e1reas de tu almac\u00e9n y asignar ubicaciones a tus productos.',
        selector: '.sidebar-menu a[data-page="area_almac/areas_zonas.html"]'
    },
    {
        title: 'Gesti\u00f3n de Inventario',
        content: 'Registra nuevos productos, actualiza existencias y controla tu inventario de forma eficiente.',
        selector: '.sidebar-menu a[data-page="gest_inve/inventario.html"]'
    },
    {
        title: 'Administraci\u00f3n de Usuarios',
        content: 'Gestiona permisos y roles de todos los usuarios del sistema.',
        selector: '.sidebar-menu a[data-page="admin_usuar/administracion_usuarios.html"]'
    },
    {
        title: 'Dashboard Principal',
        content: 'Aqu\u00ed encontrar\u00e1s un resumen r\u00e1pido de tus indicadores clave.',
        selector: '.dashboard-grid'
    },
    {
        title: 'Generaci\u00f3n de Reportes',
        content: 'Crea reportes detallados con la informaci\u00f3n de tu almac\u00e9n.',
        selector: '.sidebar-menu a[data-page="reports/reportes.html"]'
    },
    {
        title: 'Personalizaci\u00f3n',
        content: 'Configura los colores de la interfaz y adapta el sistema a tus preferencias.',
        selector: '.sidebar-footer .btn'
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

    if (!localStorage.getItem(`tutorialCompleted_${userId}`)) {


    if (!localStorage.getItem(`tutorialCompleted_${userId}`)) {

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
    if (stepData.selector) {
        const target = document.querySelector(stepData.selector);
        if (target) {
            // Add spotlight class to element
            target.classList.add('tutorial-spotlight');

            // Create hole in overlay
            const rect = target.getBoundingClientRect();
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
                target.scrollIntoView({
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

        localStorage.setItem(`tutorialCompleted_${userId}`, 'true');


        localStorage.setItem(`tutorialCompleted_${userId}`, 'true');

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

window.addEventListener('scroll', () => {
    if (tutorialOverlayBg.style.display === 'block') {
        showTutorialStep(currentStep);
    }
}, true);


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


document.addEventListener("DOMContentLoaded", function () {

// Manual tutorial trigger for testing (remove in production)

document.addEventListener("DOMContentLoaded", function () {
    checkFirstVisit();


    const mainContent = document.getElementById('mainContent');
    let contenidoInicial = mainContent.innerHTML;

    // Mostrar nombre y rol del usuario
    const nombre = localStorage.getItem('usuario_nombre');
    const rol = localStorage.getItem('usuario_rol');
    const userNameEl = document.querySelector('.user-name');
    const userRoleEl = document.querySelector('.user-role');

    if (nombre && userNameEl) userNameEl.textContent = nombre;
    if (rol && userRoleEl) userRoleEl.textContent = rol;

    const fotoPerfil = localStorage.getItem('foto_perfil') || '/images/profile.jpg';
    const userImgEl = document.querySelector('.user-profile img');
    if (userImgEl) userImgEl.src = fotoPerfil;

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
                    const scripts = mainContent.querySelectorAll("script");
scripts.forEach(oldScript => {
    const newScript = document.createElement("script");

    // Copiar atributos como src, type, etc.
    Array.from(oldScript.attributes).forEach(attr => {
        newScript.setAttribute(attr.name, attr.value);
    });

    // Si es inline
    newScript.textContent = oldScript.textContent;

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

            // Ejecutar los scripts externos/internos del HTML cargado
            const scripts = mainContent.querySelectorAll("script");
            scripts.forEach(oldScript => {
                const newScript = document.createElement("script");
                Array.from(oldScript.attributes).forEach(attr => {
                    newScript.setAttribute(attr.name, attr.value);
                });
                newScript.textContent = oldScript.textContent;
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
