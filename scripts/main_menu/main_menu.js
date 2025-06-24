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

// Mostrar el nombre y rol del usuario desde localStorage
document.addEventListener("DOMContentLoaded", function () {
    // Verificar si los datos del usuario están en localStorage
    if (localStorage.getItem('usuario_id') && localStorage.getItem('usuario_nombre')) {
        const userName = localStorage.getItem('usuario_nombre');
        const userRole = localStorage.getItem('usuario_rol'); // Si lo tienes almacenado

        // Asignar el nombre y rol a los elementos correspondientes
        document.querySelector('.user-name').textContent = userName;
        document.querySelector('.user-role').textContent = userRole || 'Administrador';
    }

    // Funcionalidad para el submenú desplegable
    const dropdownButton = document.getElementById("dropdownMenuButton");
    const userMenu = document.getElementById("userMenu");

    // Mostrar u ocultar el submenú
    dropdownButton.addEventListener("click", function () {
        userMenu.style.display = userMenu.style.display === "block" ? "none" : "block";
    });

    // Submenu de deslogueo
    document.addEventListener("DOMContentLoaded", function () {
    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
            fetch("/scripts/php/logout.php", {
                method: "POST",
                credentials: "include"
            })
            .then(response => response.json())
            .then(data => {
                console.log(data.message);

                localStorage.removeItem('usuario_id');
                localStorage.removeItem('usuario_nombre');
                localStorage.removeItem('usuario_email');
                localStorage.removeItem('usuario_rol');

                window.location.href = "../regis_login/login/login.html";
            })
            .catch(error => {
                console.error("Error al cerrar sesión:", error);
                alert("Error al cerrar sesión.");
            });
        });
    } else {
        console.warn("⚠️ No se encontró el botón #logoutBtn al cargar el DOM.");
    }
});



    // Cerrar el submenú si el usuario hace clic fuera de él
    document.addEventListener("click", function (event) {
        if (!userMenu.contains(event.target) && !dropdownButton.contains(event.target)) {
            userMenu.style.display = "none";
        }
    });
});


document.addEventListener("DOMContentLoaded", function () {
    // Verificar si el usuario tiene una empresa registrada
    fetch('/scripts/php/check_empresa.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            usuario_id: localStorage.getItem('usuario_id') // Obtener el ID del usuario desde localStorage
        })
    })
    .then(response => response.json())
    .then(data => {
        // Manejar la respuesta del servidor
        console.log("Respuesta de check_empresa.php:", data);
        if (data.success) {
            // Si la empresa está registrada, desbloqueamos los elementos
            console.log('Empresa registrada:', data.empresa_nombre);
            document.querySelector('.empresa-info').textContent = `Empresa: ${data.empresa_nombre}`;
            
            // Mostrar los elementos desbloqueados
            document.querySelectorAll('.empresa-elements').forEach(element => {
                element.style.display = 'block'; // Mostrar las secciones relacionadas con la empresa
            });

            // Ocultar mensaje de registro de empresa
            document.getElementById('message').style.display = 'none';
            
            // Mostrar el tutorial una vez que los elementos están desbloqueados
            startTutorial();
        } else {
            // Si no hay empresa registrada, mostramos el mensaje y bloqueamos los elementos
            alert('No tienes una empresa registrada. Por favor, regístrala para continuar.');
            window.location.href = 'regist_empresa.html'; // Redirigimos a la página para registrar empresa

            // Ocultar los elementos relacionados con la empresa
            document.querySelectorAll('.empresa-elements').forEach(element => {
                element.style.display = 'none'; // Ocultar secciones que requieren empresa
            });
            
            // Mostrar el mensaje de registro de empresa
            document.getElementById('message').style.display = 'block';
        }
    })
    .catch(error => {
        console.error('Error al verificar la empresa:', error);
    });
});
