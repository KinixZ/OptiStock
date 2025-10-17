(() => {
    let body;
    let sidebar;
    let menuToggle;
    let searchInput;
    let searchResultsContainer;
    let resultsCount;
    let quickTagSelect;
    let quickHistoryList;
    let summaryDescription;

    const DUPLICATE_SAVE_INTERVAL_MS = 60000;
    let autoSaveTimeoutId = null;
    let lastSavedSearchComparable = '';
    let lastSavedTimestamp = 0;

    let empresaIdCache = null;
    let layoutListenersBound = false;

    const DEFAULT_QUICK_TAGS = [
        {
            label: 'Ver todo',
            query: 'ver todo',
            description: 'Muestra todos los registros disponibles en el buscador.'
        },
        {
            label: 'Productos',
            query: 'productos',
            description: 'Ir directo al inventario general de artículos.'
        },
        {
            label: 'Movimientos',
            query: 'movimientos',
            description: 'Consultar entradas, salidas y ajustes recientes.'
        },
        {
            label: 'Usuarios',
            query: 'usuarios',
            description: 'Administrar integrantes del equipo y sus roles.'
        },
        {
            label: 'Áreas',
            query: 'areas',
            description: 'Ver la organización por áreas del almacén.'
        },
        {
            label: 'Zonas',
            query: 'zonas',
            description: 'Accede a las zonas y ubicaciones específicas.'
        }
    ];

    const SHOW_ALL_QUERIES = new Set([
        '*',
        'todo',
        'todos',
        'ver todo',
        'mostrar todo',
        'todo el inventario',
        'todos los registros',
        'inventario completo',
        'buscar todo',
        'todo inventario',
        'inventario total',
        'inventario general',
        'ver inventario'
    ]);

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

    const quickHistoryClickListener = event => {
        const button = event.target.closest('button[data-query]');
        if (!button) return;
        const query = button.getAttribute('data-query') || '';
        const fillValue = button.getAttribute('data-fill') || query;
        cancelarAutoGuardado();
        if (searchInput) {
            searchInput.value = fillValue;
            searchInput.focus();
        }
        renderResultados(fillValue);
        registrarBusqueda(fillValue, { force: true });
    };

    const searchInputListener = event => {
        const value = event.target.value;
        renderResultados(value);
        programarAutoGuardado(value);
    };

    const quickTagSelectListener = event => {
        const select = event.currentTarget;
        if (!select) return;
        const selectedOption = select.selectedOptions && select.selectedOptions[0];
        if (!selectedOption || !selectedOption.value) {
            return;
        }

        const fillValue = selectedOption.dataset.fill || selectedOption.value;
        cancelarAutoGuardado();
        if (searchInput) {
            searchInput.value = fillValue;
            searchInput.focus();
        }
        renderResultados(fillValue);
        registrarBusqueda(fillValue, { force: true });

        if (select.options.length > 0) {
            select.value = '';
            if (select.selectedIndex !== 0) {
                select.selectedIndex = 0;
            }
        }
    };

    const searchInputKeyListener = event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            const value = event.target.value;
            cancelarAutoGuardado();
            renderResultados(value);
            registrarBusqueda(value, { force: true });
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
        quickTagSelect = document.getElementById('quickTagSelect');
        quickHistoryList = document.getElementById('quickHistoryList');
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
        if (quickHistoryList && !quickHistoryList.dataset.globalSearchBound) {
            quickHistoryList.addEventListener('click', quickHistoryClickListener);
            quickHistoryList.dataset.globalSearchBound = 'true';
        }

        if (quickTagSelect && !quickTagSelect.dataset.globalSearchBound) {
            quickTagSelect.addEventListener('change', quickTagSelectListener);
            quickTagSelect.dataset.globalSearchBound = 'true';
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

    function cancelarAutoGuardado() {
        if (autoSaveTimeoutId) {
            window.clearTimeout(autoSaveTimeoutId);
            autoSaveTimeoutId = null;
        }
    }

    function programarAutoGuardado(valor) {
        const termino = (valor || '').trim();

        if (termino.length < 2) {
            cancelarAutoGuardado();
            return;
        }

        const terminoNormalizado = normalizarTexto(termino);

        if (
            terminoNormalizado &&
            terminoNormalizado === lastSavedSearchComparable &&
            Date.now() - lastSavedTimestamp < DUPLICATE_SAVE_INTERVAL_MS
        ) {
            cancelarAutoGuardado();
            return;
        }

        cancelarAutoGuardado();
        autoSaveTimeoutId = window.setTimeout(() => {
            autoSaveTimeoutId = null;
            registrarBusqueda(termino).catch(error => {
                console.warn('No se pudo registrar la búsqueda automáticamente:', error);
            });
        }, 800);
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

    function mixWithWhite(rgb, ratio = 0.35) {
        const amount = Math.min(Math.max(Number(ratio) || 0, 0), 1);
        const mix = channel => {
            const value = Number.isFinite(channel) ? channel : 0;
            return Math.round(value + (255 - value) * amount);
        };
        return {
            r: mix(rgb?.r),
            g: mix(rgb?.g),
            b: mix(rgb?.b)
        };
    }

    function rgbToHex(rgb) {
        const toHex = value => {
            const channel = Number.isFinite(value) ? value : 0;
            return Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, '0');
        };
        return `#${toHex(rgb?.r)}${toHex(rgb?.g)}${toHex(rgb?.b)}`;
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
        const accent = mixWithWhite(rgb, 0.35);
        const accentHex = rgbToHex(accent);
        rootStyle.setProperty('--accent-color', accentHex);
        rootStyle.setProperty('--accent-soft', `rgba(${accent.r}, ${accent.g}, ${accent.b}, 0.18)`);
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

    const LOCAL_PENDING_SEARCHES_KEY = 'globalSearchPendingTerms';
    let pendingSearchTerms = [];
    let syncingPendingSearches = false;

    cargarBusquedasPendientesLocales();

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

    function populateQuickTagSelect(selectElement) {
        if (!selectElement) return;

        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Selecciona un acceso rápido';
        placeholder.dataset.placeholder = 'true';
        placeholder.selected = true;

        selectElement.innerHTML = '';
        selectElement.appendChild(placeholder);

        DEFAULT_QUICK_TAGS.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag.query;
            option.dataset.fill = tag.fill || tag.label || tag.query;
            option.textContent = tag.label;
            if (tag.description) {
                option.title = tag.description;
            }
            selectElement.appendChild(option);
        });

        selectElement.selectedIndex = 0;
    }

    function renderHistorialBusquedas(historial) {
        if (!quickHistoryList) return;

        quickHistoryList.innerHTML = '';

        const historialNormalizado = Array.isArray(historial)
            ? historial
                .map(entry => (entry && entry.termino ? entry.termino : '').toString().trim())
                .filter(termino => termino.length > 0)
            : [];

        const historialUnico = Array.from(new Set(historialNormalizado)).slice(0, 6);

        if (historialUnico.length === 0) {
            const emptyItem = document.createElement('li');
            emptyItem.className = 'empty-message';
            emptyItem.textContent = 'Aún no hay búsquedas recientes.';
            quickHistoryList.appendChild(emptyItem);
            return;
        }

        historialUnico.forEach(termino => {
            const listItem = document.createElement('li');
            listItem.className = 'history-tag';
            const button = document.createElement('button');
            button.type = 'button';
            button.dataset.query = termino;
            button.dataset.fill = termino;
            button.textContent = termino;
            listItem.appendChild(button);
            quickHistoryList.appendChild(listItem);
        });
    }

    async function cargarHistorialBusquedas(idEmpresa) {
        if (!quickHistoryList) {
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

    function obtenerEmpresaIdActual() {
        const cachedId = Number(empresaIdCache);
        if (cachedId) {
            return cachedId;
        }

        try {
            const stored = Number(localStorage.getItem('id_empresa'));
            if (stored) {
                empresaIdCache = stored;
                return stored;
            }
        } catch (error) {
            console.warn('No se pudo leer el id de la empresa desde el almacenamiento local:', error);
        }

        return 0;
    }

    function cargarBusquedasPendientesLocales() {
        try {
            const stored = localStorage.getItem(LOCAL_PENDING_SEARCHES_KEY);
            if (!stored) {
                pendingSearchTerms = [];
                return;
            }

            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                pendingSearchTerms = parsed
                    .map(entry => (typeof entry === 'string' ? entry.trim() : ''))
                    .filter(entry => entry.length > 0)
                    .slice(-20);
                return;
            }
        } catch (error) {
            console.warn('No se pudieron recuperar las búsquedas pendientes:', error);
        }

        pendingSearchTerms = [];
    }

    function persistirBusquedasPendientes() {
        try {
            if (!pendingSearchTerms.length) {
                localStorage.removeItem(LOCAL_PENDING_SEARCHES_KEY);
                return;
            }

            localStorage.setItem(LOCAL_PENDING_SEARCHES_KEY, JSON.stringify(pendingSearchTerms.slice(-20)));
        } catch (error) {
            console.warn('No se pudieron guardar las búsquedas pendientes localmente:', error);
        }
    }

    function agregarBusquedaPendiente(termino) {
        pendingSearchTerms.push(termino);
        if (pendingSearchTerms.length > 20) {
            pendingSearchTerms = pendingSearchTerms.slice(-20);
        }
        persistirBusquedasPendientes();
    }

    async function sincronizarBusquedasPendientes(empresaId) {
        if (syncingPendingSearches) {
            return;
        }

        const empresaIdNumero = Number(empresaId);
        if (!empresaIdNumero) {
            return;
        }

        if (!pendingSearchTerms.length) {
            return;
        }

        syncingPendingSearches = true;

        const termsToProcess = [...pendingSearchTerms];
        pendingSearchTerms = [];
        persistirBusquedasPendientes();

        try {
            for (let index = 0; index < termsToProcess.length; index += 1) {
                const terminoPendiente = termsToProcess[index];
                const exito = await guardarBusquedaRemota(terminoPendiente, empresaIdNumero);
                if (!exito) {
                    pendingSearchTerms = termsToProcess.slice(index);
                    persistirBusquedasPendientes();
                    break;
                }
                const terminoComparable = normalizarTexto(terminoPendiente);
                if (terminoComparable) {
                    lastSavedSearchComparable = terminoComparable;
                    lastSavedTimestamp = Date.now();
                }
            }
        } finally {
            syncingPendingSearches = false;
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

    async function registrarBusqueda(consulta, opciones = {}) {
        const termino = (consulta || '').trim();
        if (!termino) {
            return false;
        }

        const terminoComparable = normalizarTexto(termino);
        const forzarRegistro = opciones && opciones.force === true;
        const ahora = Date.now();

        if (
            !forzarRegistro &&
            terminoComparable &&
            terminoComparable === lastSavedSearchComparable &&
            (ahora - lastSavedTimestamp) < DUPLICATE_SAVE_INTERVAL_MS
        ) {
            return false;
        }

        const empresaId = obtenerEmpresaIdActual();

        if (!empresaId) {
            agregarBusquedaPendiente(termino);
            if (forzarRegistro) {
                lastSavedSearchComparable = terminoComparable;
                lastSavedTimestamp = ahora;
            }
            return false;
        }

        await sincronizarBusquedasPendientes(empresaId);

        const exito = await guardarBusquedaRemota(termino, empresaId);

        if (!exito) {
            agregarBusquedaPendiente(termino);
            window.setTimeout(() => sincronizarBusquedasPendientes(empresaId), 5000);
            return false;
        }

        lastSavedSearchComparable = terminoComparable;
        lastSavedTimestamp = ahora;
        return true;
    }

    function normalizarTexto(texto) {
        return texto
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    }

    function esConsultaVerTodo(terminoNormalizado) {
        if (!terminoNormalizado) return false;
        const compacto = terminoNormalizado.replace(/\s+/g, ' ').trim();
        if (!compacto) return false;
        return SHOW_ALL_QUERIES.has(compacto);
    }

    function construirHaystack(item) {
        const partes = [
            item && item.titulo ? item.titulo : '',
            item && item.descripcion ? item.descripcion : '',
            item && item.categoria ? item.categoria : '',
            item && item.accion ? item.accion : '',
            item && item.url ? item.url : '',
            item && item.keywords ? item.keywords : ''
        ];

        return partes
            .map(parte => normalizarTexto((parte || '').toString()))
            .filter(parte => parte.length > 0)
            .join(' ');
    }

    function obtenerHaystack(item) {
        if (!item) return '';
        if (typeof item.__haystack === 'string') {
            return item.__haystack;
        }
        const haystack = construirHaystack(item);
        Object.defineProperty(item, '__haystack', {
            value: haystack,
            writable: false,
            configurable: true,
            enumerable: false
        });
        return haystack;
    }

    function prepararDatasetParaBusqueda() {
        if (!Array.isArray(searchDataset)) {
            searchDataset = [];
            return;
        }

        searchDataset = searchDataset.map(item => {
            if (item && typeof item === 'object' && !item.__haystack) {
                return { ...item, __haystack: construirHaystack(item) };
            }
            return item;
        });
    }

    function filtrarResultados(termino) {
        const terminoNormalizado = normalizarTexto((termino || '').trim());

        if (!terminoNormalizado) {
            return searchDataset;
        }

        if (esConsultaVerTodo(terminoNormalizado)) {
            return searchDataset;
        }

        const tokens = terminoNormalizado
            .split(/\s+/)
            .map(token => token.trim())
            .filter(token => token.length > 0);

        if (!tokens.length) {
            return searchDataset;
        }

        return searchDataset.filter(item => {
            const haystack = obtenerHaystack(item);
            if (!haystack) {
                return false;
            }
            return tokens.every(token => haystack.includes(token));
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
            mostrarPlaceholder('Comienza a escribir para ver resultados', 'Puedes buscar productos, movimientos, áreas o usuarios del equipo, o usa los atajos de etiquetas.');
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
            prepararDatasetParaBusqueda();
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

                await sincronizarBusquedasPendientes(empresaIdNumero);
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

        populateQuickTagSelect(quickTagSelect);

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
