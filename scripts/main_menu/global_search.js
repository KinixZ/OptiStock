(() => {
    let body;
    let sidebar;
    let menuToggle;
    let searchInput;
    let searchResultsContainer;
    let resultsCount;
    let quickLinks;
    let summaryDescription;

    let empresaIdCache = null;
    let layoutListenersBound = false;

    const menuToggleListener = () => {
        if (!menuToggle || !sidebar || !body) return;
        if (window.innerWidth <= 992) {
            const isActive = sidebar.classList.toggle('active');
            body.classList.toggle('sidebar-open', isActive);
        }
    };

    const documentClickListener = event => {
        if (!sidebar || !menuToggle || !body) return;
        if (window.innerWidth > 992) return;
        if (!sidebar.contains(event.target) && !menuToggle.contains(event.target)) {
            sidebar.classList.remove('active');
            body.classList.remove('sidebar-open');
        }
    };

    const windowResizeListener = () => {
        if (!sidebar || !body) return;
        if (window.innerWidth > 992) {
            sidebar.classList.remove('active');
            body.classList.remove('sidebar-open');
        }
    };

    const quickLinksClickListener = event => {
        const button = event.target.closest('button[data-query]');
        if (!button) return;
        const query = button.getAttribute('data-query') || '';
        if (searchInput) {
            searchInput.value = query;
        }
        renderResultados(query);
        registrarBusqueda(query);
    };

    const searchInputListener = event => {
        renderResultados(event.target.value);
    };

    const searchInputKeyListener = event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            renderResultados(event.target.value);
            registrarBusqueda(event.target.value);
        }
    };

    const searchResultsNavigationListener = event => {
        if (event.button === 1 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
            return;
        }

        const link = event.target.closest('a.item-action');
        if (!link) return;

        const href = link.getAttribute('href');
        if (!href) return;

        if (typeof window.navigateFromGlobalSearch !== 'function') {
            return;
        }

        event.preventDefault();

        window.navigateFromGlobalSearch(href, {
            page: (link.dataset.page || '').trim(),
            title: (link.dataset.title || '').trim(),
            actionLabel: (link.dataset.actionLabel || link.textContent || '').trim()
        });
    };

    function cacheDomElements() {
        body = document.body;
        sidebar = document.querySelector('.sidebar');
        menuToggle = document.getElementById('menuToggle');
        searchInput = document.getElementById('globalSearchInput');
        searchResultsContainer = document.getElementById('searchResults');
        resultsCount = document.getElementById('resultsCount');
        quickLinks = document.getElementById('quickLinks');
        summaryDescription = document.querySelector('.summary-description');
    }

    function resolveInitialQuery(override) {
        const overrideQuery = (override || '').trim();
        if (overrideQuery) {
            try {
                localStorage.removeItem('pendingGlobalSearchQuery');
            } catch (error) {
                console.warn('No se pudo limpiar la consulta pendiente:', error);
            }
            return overrideQuery;
        }

        const params = new URLSearchParams(window.location.search);
        const urlQuery = (params.get('q') || '').trim();
        if (urlQuery) {
            try {
                localStorage.removeItem('pendingGlobalSearchQuery');
            } catch (error) {
                console.warn('No se pudo limpiar la consulta pendiente:', error);
            }
            return urlQuery;
        }

        try {
            const storedQuery = (localStorage.getItem('pendingGlobalSearchQuery') || '').trim();
            if (storedQuery) {
                localStorage.removeItem('pendingGlobalSearchQuery');
                return storedQuery;
            }
        } catch (error) {
            console.warn('No se pudo leer la consulta pendiente:', error);
        }

        return '';
    }

    function attachLayoutListeners() {
        if (layoutListenersBound) return;

        if (menuToggle && sidebar) {
            menuToggle.addEventListener('click', menuToggleListener);
        }

        document.addEventListener('click', documentClickListener);
        window.addEventListener('resize', windowResizeListener);

        layoutListenersBound = true;
    }

    function attachSearchListeners() {
        if (quickLinks && !quickLinks.dataset.globalSearchBound) {
            quickLinks.addEventListener('click', quickLinksClickListener);
            quickLinks.dataset.globalSearchBound = 'true';
        }

        if (searchInput) {
            searchInput.removeEventListener('input', searchInputListener);
            searchInput.removeEventListener('keydown', searchInputKeyListener);
            searchInput.addEventListener('input', searchInputListener);
            searchInput.addEventListener('keydown', searchInputKeyListener);
        }

        if (searchResultsContainer && !searchResultsContainer.dataset.navigationBound) {
            searchResultsContainer.addEventListener('click', searchResultsNavigationListener);
            searchResultsContainer.dataset.navigationBound = 'true';
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

    let searchDataset = [];
    let datasetReady = false;
    let datasetError = null;
    let pendingQuery = '';
    let searchDataPromise = null;

    const pendingSearchTerms = [];
    let processingPendingSearches = false;

    function mostrarPlaceholder(titulo, descripcion = '', iconClass = 'fa-search') {
        if (!searchResultsContainer) return;
        searchResultsContainer.innerHTML = `
            <div class="search-placeholder">
                <i class="fas ${iconClass}"></i>
                <h2>${titulo}</h2>
                ${descripcion ? `<p>${descripcion}</p>` : ''}
            </div>
        `;
    }

    function renderHistorialBusquedas(historial) {
        if (!quickLinks) return;

        quickLinks.innerHTML = '';

        if (!Array.isArray(historial) || historial.length === 0) {
            const emptyItem = document.createElement('li');
            emptyItem.className = 'empty-message';
            emptyItem.textContent = 'Aún no hay búsquedas recientes.';
            quickLinks.appendChild(emptyItem);
            return;
        }

        historial.forEach(entry => {
            const termino = (entry && entry.termino ? entry.termino : '').toString().trim();
            if (!termino) {
                return;
            }

            const listItem = document.createElement('li');
            const button = document.createElement('button');
            button.type = 'button';
            button.dataset.query = termino;
            button.textContent = termino;
            listItem.appendChild(button);
            quickLinks.appendChild(listItem);
        });

        if (!quickLinks.children.length) {
            const emptyItem = document.createElement('li');
            emptyItem.className = 'empty-message';
            emptyItem.textContent = 'Aún no hay búsquedas recientes.';
            quickLinks.appendChild(emptyItem);
        }
    }

    async function cargarHistorialBusquedas(idEmpresa) {
        if (!quickLinks) {
            return;
        }

        const empresaId = Number(idEmpresa);
        if (!empresaId) {
            renderHistorialBusquedas([]);
            return;
        }

        try {
            const response = await fetch(`/scripts/php/get_search_history.php?id_empresa=${encodeURIComponent(empresaId)}`, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Respuesta no válida al obtener el historial.');
            }

            const data = await response.json();

            if (data.success && Array.isArray(data.historial)) {
                renderHistorialBusquedas(data.historial);
            } else {
                renderHistorialBusquedas([]);
            }
        } catch (error) {
            console.warn('No se pudo cargar el historial de búsquedas:', error);
            renderHistorialBusquedas([]);
        }
    }

    async function guardarBusquedaRemota(termino, empresaId) {
        const terminoNormalizado = (termino || '').trim();
        const empresaIdNumero = Number(empresaId);

        if (!terminoNormalizado || !empresaIdNumero) {
            return false;
        }

        try {
            const response = await fetch('/scripts/php/save_search_query.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    termino: terminoNormalizado,
                    id_empresa: empresaIdNumero
                })
            });

            if (!response.ok) {
                throw new Error('No se pudo guardar la búsqueda.');
            }

            const data = await response.json();

            if (data.success && Array.isArray(data.historial)) {
                renderHistorialBusquedas(data.historial);
            } else if (data.success) {
                cargarHistorialBusquedas(empresaIdNumero);
            }

            return !!data.success;
        } catch (error) {
            console.warn('No se pudo registrar la búsqueda:', error);
            return false;
        }
    }

    function procesarBusquedasPendientes() {
        if (processingPendingSearches) {
            return;
        }

        const empresaIdNumero = Number(empresaIdCache);
        if (!empresaIdNumero || !pendingSearchTerms.length) {
            return;
        }

        processingPendingSearches = true;
        let procesamientoCompleto = true;

        (async () => {
            while (pendingSearchTerms.length && Number(empresaIdCache) === empresaIdNumero) {
                const terminoPendiente = pendingSearchTerms[0];
                const exito = await guardarBusquedaRemota(terminoPendiente, empresaIdNumero);
                if (!exito) {
                    procesamientoCompleto = false;
                    break;
                }
                pendingSearchTerms.shift();
            }
        })()
        .catch(error => {
            procesamientoCompleto = false;
            console.warn('No se pudo procesar las búsquedas pendientes:', error);
        })
        .finally(() => {
            processingPendingSearches = false;

            if (!Number(empresaIdCache) || !pendingSearchTerms.length) {
                return;
            }

            const delay = procesamientoCompleto ? 0 : 5000;
            window.setTimeout(procesarBusquedasPendientes, delay);
        });
    }

    async function registrarBusqueda(consulta) {
        const termino = (consulta || '').trim();
        if (!termino) {
            return;
        }

        pendingSearchTerms.push(termino);
        procesarBusquedasPendientes();
    }

    function normalizarTexto(texto) {
        return texto
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    }

    function filtrarResultados(termino) {
        const terminoNormalizado = normalizarTexto((termino || '').trim());

        if (!terminoNormalizado) {
            return searchDataset;
        }

        return searchDataset.filter(item => {
            const titulo = normalizarTexto(item.titulo || '');
            const descripcion = normalizarTexto(item.descripcion || '');
            const categoria = normalizarTexto(item.categoria || '');
            return (
                titulo.includes(terminoNormalizado) ||
                descripcion.includes(terminoNormalizado) ||
                categoria.includes(terminoNormalizado)
            );
        });
    }

    function deriveRelativePage(url) {
        if (!url || typeof url !== 'string') return '';
        let processed = url.trim();
        if (!processed) return '';
        if (/^https?:\/\//i.test(processed)) return '';

        processed = processed.replace(/^(\.\.\/)+/, '');

        if (processed.startsWith('./')) {
            processed = processed.slice(2);
        }

        if (processed.startsWith('/')) {
            processed = processed.slice(1);
        }

        const [path] = processed.split(/[?#]/);
        return path || '';
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

            const actionLink = li.querySelector('.item-action');
            if (actionLink) {
                const relativePage = deriveRelativePage(item.url);
                if (relativePage) {
                    actionLink.dataset.page = relativePage;
                }
                if (item.titulo) {
                    actionLink.dataset.title = item.titulo;
                }
                if (item.accion) {
                    actionLink.dataset.actionLabel = item.accion;
                }
            }

            list.appendChild(li);
        });

        group.appendChild(header);
        group.appendChild(list);
        return group;
    }

    function renderResultados(termino) {
        if (!searchResultsContainer || !resultsCount) return;

        const consulta = (termino || '').toString();
        pendingQuery = consulta;

        if (!datasetReady) {
            mostrarPlaceholder('Cargando datos de tu empresa...', 'Estamos preparando tus registros más recientes.', 'fa-spinner fa-spin');
            resultsCount.textContent = '0';
            return;
        }

        if (datasetError) {
            mostrarPlaceholder('No pudimos cargar la búsqueda', datasetError, 'fa-triangle-exclamation');
            resultsCount.textContent = '0';
            return;
        }

        const consultaRecortada = consulta.trim();
        const totalDisponible = searchDataset.length;
        const resultados = filtrarResultados(consultaRecortada);

        if (consultaRecortada) {
            resultsCount.textContent = resultados.length.toString();
        } else {
            resultsCount.textContent = totalDisponible.toString();
        }

        if (!consultaRecortada) {
            mostrarPlaceholder('Comienza a escribir para ver resultados', 'Puedes buscar productos, movimientos, áreas o usuarios de tu equipo.');
            return;
        }

        if (resultados.length === 0) {
            mostrarPlaceholder('Sin coincidencias', 'Prueba con otro término o revisa las categorías disponibles.');
            return;
        }

        const agrupados = resultados.reduce((acc, item) => {
            if (!acc[item.categoria]) {
                acc[item.categoria] = [];
            }
            acc[item.categoria].push(item);
            return acc;
        }, {});

        searchResultsContainer.innerHTML = '';

        Object.keys(agrupados)
            .sort((a, b) => a.localeCompare(b, 'es'))
            .forEach(categoria => {
                const grupo = crearGrupoHTML(categoria, agrupados[categoria]);
                searchResultsContainer.appendChild(grupo);
            });
    }

    async function cargarConfiguracionVisual(idEmpresa) {
        try {
            const response = await fetch('/scripts/php/get_configuracion_empresa.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_empresa: Number(idEmpresa) })
            });

            if (!response.ok) {
                throw new Error('Error al obtener la configuración visual');
            }

            const { success, config } = await response.json();
            if (!success || !config) return;

            if (config.color_sidebar) {
                applySidebarColor(config.color_sidebar);
            }

            if (config.color_topbar) {
                applyTopbarColor(config.color_topbar);
            }
        } catch (error) {
            console.error('No se pudo cargar la configuración visual:', error);
        }
    }

    async function cargarDatosBusqueda(idEmpresa) {
        if (summaryDescription) {
            summaryDescription.textContent = 'Sincronizando información con la base de datos...';
        }

        mostrarPlaceholder('Cargando datos de tu empresa...', 'Estamos preparando tus registros más recientes.', 'fa-spinner fa-spin');

        try {
            const response = await fetch(`/scripts/php/get_global_search.php?id_empresa=${encodeURIComponent(idEmpresa)}`, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Error al solicitar resultados de búsqueda.');
            }

            const data = await response.json();

            if (!data.success) {
                datasetReady = true;
                datasetError = data.message || 'No se pudo obtener información de la base de datos.';
                renderResultados(pendingQuery);
                return;
            }

            searchDataset = Array.isArray(data.results) ? data.results : [];
            datasetReady = true;
            datasetError = null;

            if (summaryDescription) {
                if (searchDataset.length > 0) {
                    summaryDescription.textContent = `Listo. Tienes ${searchDataset.length} elementos indexados para buscar.`;
                } else {
                    summaryDescription.textContent = 'Tu empresa aún no tiene registros para mostrar. Agrega productos, movimientos o usuarios.';
                }
            }

            renderResultados(pendingQuery);
        } catch (error) {
            console.error('Error cargando los datos de búsqueda:', error);
            datasetReady = true;
            datasetError = 'Ocurrió un problema al conectarnos con la base de datos. Intenta nuevamente más tarde.';
            if (summaryDescription) {
                summaryDescription.textContent = 'No fue posible conectar con la base de datos. Intenta nuevamente en unos minutos.';
            }
            renderResultados(pendingQuery);
        }
    }

    async function initializeSearchPage() {
        if (datasetReady || datasetError) {
            renderResultados(pendingQuery);
            return;
        }

        if (!searchDataPromise) {
            searchDataPromise = (async () => {
                const userId = localStorage.getItem('usuario_id');
                if (!userId) {
                    datasetReady = true;
                    datasetError = 'Tu sesión expiró. Por favor inicia sesión nuevamente.';
                    renderResultados('');
                    setTimeout(() => {
                        window.location.href = '../../pages/regis_login/login/login.html';
                    }, 2000);
                    return;
                }

                let empresaId = localStorage.getItem('id_empresa');
                if (empresaId) {
                    empresaId = Number(empresaId);
                }

                try {
                    const response = await fetch('/scripts/php/check_empresa.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ usuario_id: userId })
                    });

                    const data = await response.json();
                    if (data.success && data.empresa_id) {
                        empresaId = Number(data.empresa_id);
                        localStorage.setItem('id_empresa', data.empresa_id);
                    }
                } catch (error) {
                    console.warn('No se pudo verificar la empresa del usuario:', error);
                }

                if (!empresaId) {
                    datasetReady = true;
                    datasetError = 'No encontramos una empresa asociada a tu usuario. Solicita acceso al administrador.';
                    renderResultados('');
                    return;
                }

                empresaIdCache = Number(empresaId);
                const empresaIdNumero = Number(empresaIdCache);
                await Promise.all([
                    cargarConfiguracionVisual(empresaIdNumero),
                    cargarDatosBusqueda(empresaIdNumero),
                    cargarHistorialBusquedas(empresaIdNumero)
                ]);

                procesarBusquedasPendientes();
            })()
            .catch(error => {
                console.error('No se pudo inicializar el buscador global:', error);
            })
            .finally(() => {
                searchDataPromise = null;
            });
        }

        await searchDataPromise;
    }

    function initializeGlobalSearchPage(initialQueryOverride = null) {
        cacheDomElements();
        empresaIdCache = null;

        if (body) {
            body.classList.add('search-page-body');
        }

        renderHistorialBusquedas([]);
        attachLayoutListeners();
        attachSearchListeners();

        const initialQuery = resolveInitialQuery(initialQueryOverride);
        pendingQuery = initialQuery;

        if (searchInput) {
            searchInput.value = initialQuery;
            searchInput.focus();
            searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
        }

        if (!datasetReady) {
            mostrarPlaceholder('Cargando datos de tu empresa...', 'Estamos preparando tus registros más recientes.', 'fa-spinner fa-spin');
        }

        renderResultados(initialQuery);
        initializeSearchPage();
    }

    window.initializeGlobalSearchPage = initializeGlobalSearchPage;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => initializeGlobalSearchPage());
    } else {
        initializeGlobalSearchPage();
    }
})();
