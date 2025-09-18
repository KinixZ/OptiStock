const body = document.body;
const sidebar = document.querySelector('.sidebar');
const menuToggle = document.getElementById('menuToggle');
const searchInput = document.getElementById('globalSearchInput');
const searchResultsContainer = document.getElementById('searchResults');
const resultsCount = document.getElementById('resultsCount');
const quickLinks = document.getElementById('quickLinks');

if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', () => {
        if (window.innerWidth <= 992) {
            const isActive = sidebar.classList.toggle('active');
            body.classList.toggle('sidebar-open', isActive);
        }
    });

    document.addEventListener('click', event => {
        if (window.innerWidth > 992) return;
        if (!sidebar.contains(event.target) && !menuToggle.contains(event.target)) {
            sidebar.classList.remove('active');
            body.classList.remove('sidebar-open');
        }
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 992) {
            sidebar.classList.remove('active');
            body.classList.remove('sidebar-open');
        }
    });
}

const userNameEl = document.querySelector('.user-name');
const userRoleEl = document.querySelector('.user-role');
const userImgEl = document.querySelector('.user-profile img');

if (userNameEl) {
    const nombre = localStorage.getItem('usuario_nombre');
    if (nombre) userNameEl.textContent = nombre;
}

if (userRoleEl) {
    const rol = localStorage.getItem('usuario_rol');
    if (rol) userRoleEl.textContent = rol;
}

if (userImgEl) {
    let fotoPerfil = localStorage.getItem('foto_perfil') || '/images/profile.jpg';
    if (fotoPerfil && !fotoPerfil.startsWith('/')) {
        fotoPerfil = '/' + fotoPerfil;
    }
    userImgEl.onerror = () => {
        userImgEl.src = '/images/profile.jpg';
    };
    userImgEl.src = fotoPerfil;
}

const searchDataset = [
    {
        categoria: 'Productos',
        titulo: 'Baterías AA',
        descripcion: 'Stock actual: 120 unidades · Zona A1 · Rotación alta',
        accion: 'Ver ficha',
        url: '../gest_inve/inventario_basico.html'
    },
    {
        categoria: 'Productos',
        titulo: 'Monitor 24"',
        descripcion: 'Stock bajo · Zona D4 · 1 unidad disponible',
        accion: 'Ir al inventario',
        url: '../gest_inve/inventario_basico.html'
    },
    {
        categoria: 'Órdenes',
        titulo: 'Orden de ingreso #00891',
        descripcion: 'Pendiente de verificación · 24 artículos · Registrada hoy 09:30h',
        accion: 'Revisar orden',
        url: '../area_almac_v2/gestion_areas_zonas.html'
    },
    {
        categoria: 'Órdenes',
        titulo: 'Orden de salida #00652',
        descripcion: 'Ruta programada · Requiere confirmación de despacho',
        accion: 'Confirmar despacho',
        url: '../area_almac_v2/gestion_areas_zonas.html'
    },
    {
        categoria: 'Alertas',
        titulo: 'Stock crítico - Cables HDMI',
        descripcion: 'Última reposición hace 15 días · Zona B2 · Prioridad alta',
        accion: 'Ver alertas',
        url: 'main_menu.html#stockAlertsCard'
    },
    {
        categoria: 'Alertas',
        titulo: 'Incidencia de lectura QR',
        descripcion: '3 fallos consecutivos en lector del muelle 4 · Revisar hardware',
        accion: 'Registrar mantenimiento',
        url: '../control_log/log.html'
    },
    {
        categoria: 'Usuarios',
        titulo: 'María Ramírez',
        descripcion: 'Supervisora de zona · Último acceso hace 2 horas · 18 movimientos hoy',
        accion: 'Ver perfil',
        url: '../admin_usuar/administracion_usuarios.html'
    },
    {
        categoria: 'Usuarios',
        titulo: 'Pablo Torres',
        descripcion: 'Auxiliar de inventario · 12 tareas pendientes de cierre',
        accion: 'Asignar tareas',
        url: '../admin_usuar/administracion_usuarios.html'
    },
    {
        categoria: 'Reportes',
        titulo: 'Reporte de rotación semanal',
        descripcion: 'Comparativa con la semana anterior · Variación +8%',
        accion: 'Abrir reporte',
        url: '../reports/reportes.html'
    },
    {
        categoria: 'Reportes',
        titulo: 'Resumen de auditoría',
        descripcion: 'Cobertura 95% del inventario · Pendientes por revisar: 4 ítems',
        accion: 'Revisar resumen',
        url: '../reports/reportes.html'
    }
];

function normalizarTexto(texto) {
    return texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function filtrarResultados(termino) {
    const terminoNormalizado = normalizarTexto(termino.trim());

    if (!terminoNormalizado) {
        return searchDataset;
    }

    return searchDataset.filter(item => {
        const titulo = normalizarTexto(item.titulo);
        const descripcion = normalizarTexto(item.descripcion);
        return titulo.includes(terminoNormalizado) || descripcion.includes(terminoNormalizado);
    });
}

function crearGrupoHTML(categoria, elementos) {
    const group = document.createElement('article');
    group.className = 'search-group';

    const header = document.createElement('header');
    header.className = 'search-group-header';
    header.innerHTML = `
        <div class="group-info">
            <span class="group-icon"><i class="fas fa-folder-open"></i></span>
            <h2>${categoria}</h2>
        </div>
        <span class="group-count">${elementos.length}</span>
    `;

    const list = document.createElement('ul');
    list.className = 'search-list';

    elementos.forEach(item => {
        const li = document.createElement('li');
        li.className = 'search-item';
        li.innerHTML = `
            <div class="item-content">
                <h3>${item.titulo}</h3>
                <p>${item.descripcion}</p>
            </div>
            <a class="item-action" href="${item.url}">${item.accion}</a>
        `;
        list.appendChild(li);
    });

    group.appendChild(header);
    group.appendChild(list);
    return group;
}

function renderResultados(termino) {
    const resultados = filtrarResultados(termino);
    resultsCount.textContent = resultados.length;
    searchResultsContainer.innerHTML = '';

    if (resultados.length === 0) {
        searchResultsContainer.innerHTML = `
            <div class="search-placeholder">
                <i class="fas fa-search"></i>
                <h2>Sin coincidencias</h2>
                <p>Prueba con otro término o revisa las categorías disponibles.</p>
            </div>
        `;
        return;
    }

    const agrupados = resultados.reduce((acc, item) => {
        if (!acc[item.categoria]) {
            acc[item.categoria] = [];
        }
        acc[item.categoria].push(item);
        return acc;
    }, {});

    Object.keys(agrupados)
        .sort()
        .forEach(categoria => {
            const grupo = crearGrupoHTML(categoria, agrupados[categoria]);
            searchResultsContainer.appendChild(grupo);
        });
}

if (quickLinks) {
    quickLinks.addEventListener('click', event => {
        const button = event.target.closest('button[data-query]');
        if (!button) return;
        const query = button.getAttribute('data-query');
        searchInput.value = query;
        renderResultados(query);
    });
}

if (searchInput) {
    const params = new URLSearchParams(window.location.search);
    const initialQuery = params.get('q') || '';
    if (initialQuery) {
        searchInput.value = initialQuery;
        renderResultados(initialQuery);
    }

    searchInput.addEventListener('input', event => {
        renderResultados(event.target.value);
    });

    searchInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            renderResultados(event.target.value);
        }
    });
}
