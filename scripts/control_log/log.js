// Script para manejar el log de control
(function inicializarLogControl() {
    const filtroModulo = document.getElementById('filtroModulo');
    const filtroUsuario = document.getElementById('filtroUsuario');
    const filtroRol = document.getElementById('filtroRol');
    const tablaBody = document.getElementById('logTableBody');
    const exportPdfBtn = document.getElementById('exportPdf');
    const exportExcelBtn = document.getElementById('exportExcel');
    const buscadorInput = document.getElementById('logSearch');
    const totalRegistrosEl = document.getElementById('totalRegistros');
    const logCountEl = document.getElementById('logCount');
    const lastUpdatedEl = document.getElementById('lastUpdated');
    const timeHeaderEl = document.getElementById('timeHeader');
    const paginationInfoEl = document.getElementById('paginationInfo');
    const paginationControlsEl = document.getElementById('paginationControls');
    const paginationPagesEl = document.getElementById('paginationPages');
    const prevPageBtn = paginationControlsEl?.querySelector('[data-action="prev"]');
    const nextPageBtn = paginationControlsEl?.querySelector('[data-action="next"]');
    const activityTrendCanvas = document.getElementById('activityTrendChart');
    const moduleActivityCanvas = document.getElementById('moduleActivityChart');
    const topUsersCanvas = document.getElementById('topUsersChart');
    const trendRangeButtons = Array.from(document.querySelectorAll('[data-trend-range]'));

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
        console.warn('No se pudo determinar la etiqueta de zona horaria configurada.', error);
    }

    if (timeHeaderEl) {
        timeHeaderEl.textContent = `Hora (${timeZoneLabel})`;
    }

    trendRangeButtons.forEach(button => {
        if (button.classList.contains('is-active')) {
            trendRange = button.dataset.trendRange || trendRange;
        }

        button.addEventListener('click', () => {
            const nuevoRango = button.dataset.trendRange || 'all';
            if (nuevoRango === trendRange) {
                return;
            }

            trendRange = nuevoRango;
            trendRangeButtons.forEach(btn => {
                btn.classList.toggle('is-active', btn === button);
            });
            renderTrendChart();
        });
    });

    if (!filtroModulo || !filtroUsuario || !filtroRol || !tablaBody) {
        console.warn('La vista del log de control no está disponible. Se omite la inicialización.');
        return;
    }

    const { jsPDF } = (window.jspdf || {});

    const ID_EMPRESA = localStorage.getItem('id_empresa') || '';
    const LOGS_STORAGE_KEY = ID_EMPRESA ? `logsEmpresa_${ID_EMPRESA}` : 'logsEmpresa';
    const FILTERS_STORAGE_KEY = ID_EMPRESA ? `logsFiltros_${ID_EMPRESA}` : 'logsFiltros';
    const PAGE_SIZE = 10;

    let registros = [];
    let filtrosGuardados = {};
    let savedUserFilter = '';
    let actualizandoOpcionesUsuario = false;
    let terminoBusqueda = '';
    let paginaActual = 1;
    let trendChart = null;
    let moduleActivityChart = null;
    let topUsersChart = null;
    let trendLabelsISO = [];
    let trendSeries = [];
    let trendRange = 'all';
    const TREND_RANGE_DAYS = {
        week: 7,
        month: 30
    };

    function escapeHtml(valor) {
        return String(valor ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function limpiarIdentificadores(texto = '') {
        if (!texto) {
            return '';
        }

        let limpio = String(texto);

        const patrones = [
            /\b(producto)(?:\s+(?:con\s+)?(?:id|n[úu]mero)\s*[:#-]?)?\s+\d+\b/gi,
            /\b(empresa)(?:\s+(?:con\s+)?(?:id|n[úu]mero)\s*[:#-]?)?\s+\d+\b/gi,
            /\b(usuario)(?:\s+(?:con\s+)?(?:id|n[úu]mero)\s*[:#-]?)?\s+\d+\b/gi,
            /\b(area)(?:\s+(?:con\s+)?(?:id|n[úu]mero)\s*[:#-]?)?\s+\d+\b/gi,
            /\b(área)(?:\s+(?:con\s+)?(?:id|n[úu]mero)\s*[:#-]?)?\s+\d+\b/gi,
            /\b(zona)(?:\s+(?:con\s+)?(?:id|n[úu]mero)\s*[:#-]?)?\s+\d+\b/gi,
            /\b(categoría)(?:\s+(?:con\s+)?(?:id|n[úu]mero)\s*[:#-]?)?\s+\d+\b/gi,
            /\b(categoria)(?:\s+(?:con\s+)?(?:id|n[úu]mero)\s*[:#-]?)?\s+\d+\b/gi,
            /\b(subcategoría)(?:\s+(?:con\s+)?(?:id|n[úu]mero)\s*[:#-]?)?\s+\d+\b/gi,
            /\b(subcategoria)(?:\s+(?:con\s+)?(?:id|n[úu]mero)\s*[:#-]?)?\s+\d+\b/gi,
            /\b(proveedor)(?:\s+(?:con\s+)?(?:id|n[úu]mero)\s*[:#-]?)?\s+\d+\b/gi,
            /\b(cliente)(?:\s+(?:con\s+)?(?:id|n[úu]mero)\s*[:#-]?)?\s+\d+\b/gi
        ];

        patrones.forEach(regex => {
            limpio = limpio.replace(regex, (_, entidad) => entidad);
        });

        limpio = limpio.replace(/\bID\s*[:#-]?\s*\d+\b/gi, 'ID');

        return limpio.replace(/\s{2,}/g, ' ').trim();
    }

    function convertirFechaHoraZona(fecha, hora) {
        if (!fecha) {
            return { fechaLocal: '', horaLocal: '' };
        }

        try {
            const horaNormalizada = (hora || '00:00:00').substring(0, 8);
            const fechaISO = `${fecha}T${horaNormalizada}Z`;
            const date = new Date(fechaISO);

            if (Number.isNaN(date.getTime())) {
                return { fechaLocal: '', horaLocal: '' };
            }

            const fechaOptions = {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            };
            if (navegadorTimeZone) {
                fechaOptions.timeZone = navegadorTimeZone;
            }

            const horaOptions = {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            };
            if (navegadorTimeZone) {
                horaOptions.timeZone = navegadorTimeZone;
            }

            const fechaLocal = new Intl.DateTimeFormat('es', fechaOptions).format(date);
            const horaLocal = new Intl.DateTimeFormat('es', horaOptions).format(date);

            return { fechaLocal, horaLocal };
        } catch (error) {
            console.warn('No se pudo convertir la fecha y hora al huso horario configurado.', error);
            return { fechaLocal: '', horaLocal: '' };
        }
    }

    function formatearDiaMesDesdeISO(fechaISO, respaldo = '') {
        if (!fechaISO) {
            return respaldo;
        }

        const partes = String(fechaISO).split('-');
        if (partes.length >= 3) {
            const [anio, mes, dia] = partes;
            if (dia && mes) {
                return `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}`;
            }
        }

        return respaldo || fechaISO;
    }

    function formatearFechaCompletaDesdeISO(fechaISO) {
        if (!fechaISO) {
            return '';
        }

        try {
            const date = new Date(`${fechaISO}T00:00:00Z`);
            if (Number.isNaN(date.getTime())) {
                return fechaISO;
            }

            const opciones = {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            };
            if (navegadorTimeZone) {
                opciones.timeZone = navegadorTimeZone;
            }

            return new Intl.DateTimeFormat('es', opciones).format(date);
        } catch (error) {
            console.warn('No se pudo formatear la fecha en formato completo.', error);
            return fechaISO;
        }
    }

    function extraerFechaISO(valor) {
        if (!valor && valor !== 0) {
            return '';
        }

        const texto = String(valor).trim();
        if (!texto) {
            return '';
        }

        const isoMatch = texto.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (isoMatch) {
            return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
        }

        const dmyMatch = texto.match(/(\d{2})[\/-](\d{2})[\/-](\d{4})/);
        if (dmyMatch) {
            return `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
        }

        return '';
    }

    function construirSerieDiaria(datos = []) {
        const totalesPorDia = new Map();
        let fechaMinima = null;
        let fechaMaxima = null;

        datos.forEach(registro => {
            const fechaISO = extraerFechaISO(registro?.fecha);
            if (!fechaISO) {
                return;
            }

            totalesPorDia.set(fechaISO, (totalesPorDia.get(fechaISO) || 0) + 1);
            if (!fechaMinima || fechaISO < fechaMinima) {
                fechaMinima = fechaISO;
            }
            if (!fechaMaxima || fechaISO > fechaMaxima) {
                fechaMaxima = fechaISO;
            }
        });

        if (!fechaMinima || !fechaMaxima) {
            return [];
        }

        const serie = [];
        let cursor = new Date(`${fechaMinima}T00:00:00Z`);
        const limite = new Date(`${fechaMaxima}T00:00:00Z`);

        while (!Number.isNaN(cursor.getTime()) && cursor <= limite) {
            const iso = cursor.toISOString().slice(0, 10);
            serie.push({
                iso,
                etiqueta: formatearDiaMesDesdeISO(iso),
                total: totalesPorDia.get(iso) || 0
            });
            cursor.setUTCDate(cursor.getUTCDate() + 1);
        }

        return serie;
    }

    function obtenerSerieFiltradaPorRango() {
        if (!Array.isArray(trendSeries) || trendSeries.length === 0) {
            return [];
        }

        if (trendRange === 'all' || !TREND_RANGE_DAYS[trendRange]) {
            return trendSeries.slice();
        }

        const dias = TREND_RANGE_DAYS[trendRange];
        const total = trendSeries.length;

        if (total >= dias) {
            return trendSeries.slice(total - dias);
        }

        const resultado = trendSeries.slice();
        const primerElemento = resultado[0];

        if (!primerElemento) {
            return resultado;
        }

        let cursor = new Date(`${primerElemento.iso}T00:00:00Z`);

        while (!Number.isNaN(cursor.getTime()) && resultado.length < dias) {
            cursor.setUTCDate(cursor.getUTCDate() - 1);
            const iso = cursor.toISOString().slice(0, 10);
            resultado.unshift({
                iso,
                etiqueta: formatearDiaMesDesdeISO(iso),
                total: 0
            });
        }

        return resultado;
    }

    function renderTrendChart() {
        if (!activityTrendCanvas || !window.Chart) {
            return;
        }

        const Chart = window.Chart;
        const serie = obtenerSerieFiltradaPorRango();
        const labels = serie.map(item => item.etiqueta);
        const dataValues = serie.map(item => item.total);

        trendLabelsISO = serie.map(item => item.iso);

        if (!trendChart) {
            trendChart = new Chart(activityTrendCanvas, {
                type: 'line',
                data: {
                    labels,
                    datasets: [{
                        label: 'Actividades',
                        data: dataValues,
                        borderColor: '#6c5dd3',
                        backgroundColor: 'rgba(108, 93, 211, 0.18)',
                        tension: 0.35,
                        fill: true,
                        pointBackgroundColor: '#6c5dd3',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            ticks: {
                                color: '#525a6b'
                            },
                            grid: {
                                display: false
                            }
                        },
                        y: {
                            beginAtZero: true,
                            ticks: {
                                color: '#525a6b',
                                precision: 0,
                                stepSize: 1
                            },
                            grid: {
                                color: 'rgba(82, 90, 107, 0.12)'
                            }
                        }
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                title: context => {
                                    if (!context?.length) {
                                        return '';
                                    }
                                    const index = context[0].dataIndex;
                                    const iso = trendLabelsISO[index];
                                    const titulo = formatearFechaCompletaDesdeISO(iso);
                                    return titulo || context[0].label;
                                }
                            }
                        }
                    }
                }
            });
            return;
        }

        trendChart.data.labels = labels;
        trendChart.data.datasets[0].data = dataValues;
        trendChart.update();
    }

    function filtrarPorBusqueda(datos = []) {
        const consulta = terminoBusqueda.trim().toLowerCase();
        if (!consulta) {
            return datos;
        }

        return datos.filter(registro => {
            if (!registro || typeof registro !== 'object') {
                return false;
            }

            return ['fecha', 'hora', 'usuario', 'rol', 'modulo', 'accion'].some(campo => {
                const valorCampo = registro[campo];
                if (valorCampo === null || valorCampo === undefined) {
                    return false;
                }
                return String(valorCampo).toLowerCase().includes(consulta);
            });
        });
    }

    function actualizarResumen(datosMostrados = []) {
        if (totalRegistrosEl) {
            totalRegistrosEl.textContent = registros.length;
        }

        if (!logCountEl) {
            return;
        }

        if (!registros.length) {
            logCountEl.textContent = 'Sin registros disponibles';
            return;
        }

        if (!datosMostrados.length) {
            logCountEl.textContent = terminoBusqueda
                ? 'Sin coincidencias con la búsqueda aplicada'
                : 'Sin resultados para los filtros seleccionados';
            return;
        }

        if (datosMostrados.length === registros.length && !terminoBusqueda) {
            logCountEl.textContent = datosMostrados.length === 1
                ? '1 actividad registrada'
                : `${datosMostrados.length} actividades registradas`;
            return;
        }

        logCountEl.textContent = `${datosMostrados.length} de ${registros.length} actividades filtradas`;
    }

    function actualizarUltimaActualizacion() {
        if (!lastUpdatedEl) {
            return;
        }

        const ahora = new Date();

        try {
            const fechaOptions = {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            };
            if (navegadorTimeZone) {
                fechaOptions.timeZone = navegadorTimeZone;
            }

            let fecha = new Intl.DateTimeFormat('es', fechaOptions).format(ahora);
            fecha = fecha.replace('.', '');

            const horaOptions = {
                hour: '2-digit',
                minute: '2-digit'
            };
            if (navegadorTimeZone) {
                horaOptions.timeZone = navegadorTimeZone;
            }

            const hora = new Intl.DateTimeFormat('es', horaOptions).format(ahora);

            lastUpdatedEl.textContent = `${fecha} · ${hora} (${timeZoneLabel})`;
        } catch (error) {
            const fecha = ahora.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            }).replace('.', '');
            const hora = ahora.toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
            });

            lastUpdatedEl.textContent = `${fecha} · ${hora}`;
        }
    }

    function cargarFiltrosGuardados() {
        try {
            filtrosGuardados = JSON.parse(localStorage.getItem(FILTERS_STORAGE_KEY)) || {};
        } catch (error) {
            filtrosGuardados = {};
        }

        if (filtrosGuardados.modulo) {
            filtroModulo.value = filtrosGuardados.modulo;
        }
        if (filtrosGuardados.rol) {
            filtroRol.value = filtrosGuardados.rol;
        }
        savedUserFilter = filtrosGuardados.usuario || '';
    }

    function mostrarLogsGuardados() {
        let guardados = [];
        try {
            guardados = JSON.parse(localStorage.getItem(LOGS_STORAGE_KEY)) || [];
        } catch (error) {
            guardados = [];
        }

        if (!Array.isArray(guardados)) {
            guardados = [];
        }

        registros = guardados;
        paginaActual = 1;
        mostrarRegistros(registros);
    }

    function guardarRegistrosEnCache(datos) {
        try {
            localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(datos));
        } catch (error) {
            console.warn('No se pudieron guardar los logs en caché', error);
        }
    }

    function guardarFiltros() {
        filtrosGuardados = {
            modulo: filtroModulo.value || '',
            usuario: filtroUsuario.value || '',
            rol: filtroRol.value || ''
        };
        savedUserFilter = filtrosGuardados.usuario;

        try {
            localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filtrosGuardados));
        } catch (error) {
            console.warn('No se pudieron guardar los filtros', error);
        }
    }

    function actualizarCharts(datos = []) {
        if (!window.Chart || (!activityTrendCanvas && !moduleActivityCanvas && !topUsersCanvas)) {
            return;
        }

        const Chart = window.Chart;

        if (activityTrendCanvas) {
            trendSeries = construirSerieDiaria(datos);
            renderTrendChart();
        }

        if (moduleActivityCanvas) {
            const modulesMap = new Map();

            datos.forEach(reg => {
                const modulo = reg?.modulo ? String(reg.modulo) : 'Sin módulo';
                modulesMap.set(modulo, (modulesMap.get(modulo) || 0) + 1);
                const baseFecha = reg?.fecha ? String(reg.fecha) : '';
                const conversion = convertirFechaHoraZona(reg?.fecha, reg?.hora);
                const etiqueta = formatearDiaMesDesdeISO(baseFecha, conversion.fechaLocal) || 'Sin fecha';
                const claveOrden = baseFecha || etiqueta;
                const anterior = trendMap.get(claveOrden) || { etiqueta, total: 0, fechaISO: baseFecha };
                anterior.total += 1;
                anterior.etiqueta = etiqueta;
                anterior.fechaISO = baseFecha;
                trendMap.set(claveOrden, anterior);
            });

            const moduleEntries = Array.from(modulesMap.entries()).sort((a, b) => b[1] - a[1]);

            const labels = moduleEntries.map(([nombre]) => nombre);
            const dataValues = moduleEntries.map(([, total]) => total);

            if (!moduleActivityChart) {
                moduleActivityChart = new Chart(moduleActivityCanvas, {
                    type: 'bar',

            trendLabelsISO = trendEntries.map(([clave]) => clave);
            const labels = trendEntries.map(([, value]) => value.etiqueta);
            const dataValues = trendEntries.map(([, value]) => value.total);

            if (!trendChart) {
                trendChart = new Chart(activityTrendCanvas, {
                    type: 'line',
                    data: {
                        labels,
                        datasets: [{
                            label: 'Actividades registradas',
                            data: dataValues,
                            backgroundColor: '#54d2d2',
                            borderRadius: 8,
                            maxBarThickness: 48
                            borderColor: '#6c5dd3',
                            backgroundColor: 'rgba(108, 93, 211, 0.18)',
                            tension: 0.35,
                            fill: true,
                            pointBackgroundColor: '#6c5dd3',
                            pointBorderColor: '#fff',
                            pointBorderWidth: 2,
                            pointRadius: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            x: {
                                ticks: { color: '#525a6b' },
                                grid: { display: false }
                            },
                            y: {
                                beginAtZero: true,
                                ticks: { color: '#525a6b', precision: 0, stepSize: 1 },
                                grid: { color: 'rgba(82, 90, 107, 0.1)' }

                                ticks: {
                                    color: '#525a6b'
                                },
                                grid: {
                                    display: false
                                }
                            },
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    color: '#525a6b',
                                    precision: 0,
                                    stepSize: 1
                                },
                                grid: {
                                    color: 'rgba(82, 90, 107, 0.12)'
                                }
                            }
                        },
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                callbacks: {
                                    title: context => {
                                        if (!context?.length) {
                                            return '';
                                        }
                                        const index = context[0].dataIndex;
                                        const iso = trendLabelsISO[index];
                                        const titulo = formatearFechaCompletaDesdeISO(iso);
                                        return titulo || context[0].label;
                                    }
                                }
                            }
                        }
                    }
                });
            } else {
                moduleActivityChart.data.labels = labels;
                moduleActivityChart.data.datasets[0].data = dataValues;
                moduleActivityChart.update();
            }
        }

        if (moduleActivityCanvas) {
            const modulesMap = new Map();

            datos.forEach(reg => {
                const modulo = reg?.modulo ? String(reg.modulo) : 'Sin módulo';
                modulesMap.set(modulo, (modulesMap.get(modulo) || 0) + 1);
            });

            const moduleEntries = Array.from(modulesMap.entries()).sort((a, b) => b[1] - a[1]);

            const labels = moduleEntries.map(([nombre]) => nombre);
            const dataValues = moduleEntries.map(([, total]) => total);

            if (!moduleActivityChart) {
                moduleActivityChart = new Chart(moduleActivityCanvas, {
                    type: 'bar',
                    data: {
                        labels,
                        datasets: [{
                            label: 'Actividades registradas',
                            data: dataValues,
                            backgroundColor: '#54d2d2',
                            borderRadius: 8,
                            maxBarThickness: 48
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            x: {
                                ticks: { color: '#525a6b' },
                                grid: { display: false }
                            },
                            y: {
                                beginAtZero: true,
                                ticks: { color: '#525a6b', precision: 0, stepSize: 1 },
                                grid: { color: 'rgba(82, 90, 107, 0.1)' }
                            }
                        },
                        plugins: {
                            legend: { display: false }
                        }
                    }
                });
            } else {
                moduleActivityChart.data.labels = labels;
                moduleActivityChart.data.datasets[0].data = dataValues;
                moduleActivityChart.update();
            }
        }

        if (topUsersCanvas) {
            const usersMap = new Map();

            datos.forEach(reg => {
                const nombre = reg?.usuario ? String(reg.usuario) : 'Sin usuario';
                usersMap.set(nombre, (usersMap.get(nombre) || 0) + 1);
            });

            const userEntries = Array.from(usersMap.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);

            const labels = userEntries.map(([nombre]) => nombre);
            const dataValues = userEntries.map(([, total]) => total);

            if (!topUsersChart) {
                topUsersChart = new Chart(topUsersCanvas, {
                    type: 'doughnut',
                    data: {
                        labels,
                        datasets: [{
                            label: 'Actividades registradas',
                            data: dataValues,
                            backgroundColor: ['#6c5dd3', '#ff6f91', '#ffc75f', '#54d2d2', '#845ec2']
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: { color: '#525a6b' }
                            }
                        }
                    }
                });
            } else {
                topUsersChart.data.labels = labels;
                topUsersChart.data.datasets[0].data = dataValues;
                topUsersChart.update();
            }
        }
    }

    function actualizarControlesPaginacion(totalFiltrados) {
        if (!paginationControlsEl || !paginationInfoEl) {
            return;
        }

        const totalPaginas = Math.max(1, Math.ceil(totalFiltrados / PAGE_SIZE));
        paginaActual = Math.min(Math.max(paginaActual, 1), totalPaginas);

        const inicio = totalFiltrados === 0 ? 0 : (paginaActual - 1) * PAGE_SIZE + 1;
        const fin = totalFiltrados === 0 ? 0 : Math.min(paginaActual * PAGE_SIZE, totalFiltrados);

        paginationInfoEl.textContent = totalFiltrados
            ? `Mostrando ${inicio}-${fin} de ${totalFiltrados} actividades`
            : 'Sin actividades para mostrar';

        if (prevPageBtn) {
            prevPageBtn.disabled = paginaActual <= 1;
        }
        if (nextPageBtn) {
            nextPageBtn.disabled = paginaActual >= totalPaginas || totalFiltrados === 0;
        }

        if (!paginationPagesEl) {
            return;
        }

        paginationPagesEl.innerHTML = '';
        const maxBotones = 5;
        let inicioRango = Math.max(1, paginaActual - Math.floor(maxBotones / 2));
        let finRango = inicioRango + maxBotones - 1;

        if (finRango > totalPaginas) {
            finRango = totalPaginas;
            inicioRango = Math.max(1, finRango - maxBotones + 1);
        }

        for (let i = inicioRango; i <= finRango; i += 1) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `page-number${i === paginaActual ? ' active' : ''}`;
            button.textContent = i;
            button.dataset.page = i;
            button.addEventListener('click', () => {
                const target = Number(button.dataset.page);
                if (!Number.isNaN(target) && target !== paginaActual) {
                    paginaActual = target;
                    mostrarRegistros(registros);
                }
            });
            paginationPagesEl.appendChild(button);
        }
    }

    function mostrarRegistros(datos) {
        const fuente = Array.isArray(datos) ? datos : [];
        const filtrados = filtrarPorBusqueda(fuente);

        tablaBody.innerHTML = '';

        if (filtrados.length === 0) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 6;

            const mensaje = !registros.length
                ? 'Sin actividades registradas'
                : terminoBusqueda
                    ? 'No se encontraron coincidencias con tu búsqueda'
                    : 'Sin resultados para los filtros seleccionados';

            td.innerHTML = `<div class="empty-state"><span>${mensaje}</span></div>`;
            tr.appendChild(td);
            tablaBody.appendChild(tr);

            actualizarResumen(filtrados);
            actualizarControlesPaginacion(0);
            actualizarCharts([]);
            return;
        }

        const totalFiltrados = filtrados.length;
        const totalPaginas = Math.max(1, Math.ceil(totalFiltrados / PAGE_SIZE));
        paginaActual = Math.min(Math.max(paginaActual, 1), totalPaginas);
        const inicio = (paginaActual - 1) * PAGE_SIZE;
        const paginaDatos = filtrados.slice(inicio, inicio + PAGE_SIZE);

        paginaDatos.forEach(reg => {
            let fechaTexto = reg?.fecha || '';
            let horaTexto = reg?.hora || '';

            const conversion = convertirFechaHoraZona(reg?.fecha, reg?.hora);
            if (conversion.fechaLocal) {
                fechaTexto = conversion.fechaLocal;
            }
            if (conversion.horaLocal) {
                horaTexto = conversion.horaLocal;
            }

            const fecha = escapeHtml(fechaTexto);
            const hora = escapeHtml(horaTexto);
            const usuario = escapeHtml(reg?.usuario || '');
            const rol = escapeHtml(reg?.rol || '');
            const modulo = escapeHtml(reg?.modulo || '');
            const accionLimpia = limpiarIdentificadores(reg?.accion || '');
            const accion = escapeHtml(accionLimpia);

            const horaLabel = timeZoneLabel ? `Horario ${timeZoneLabel}` : '';
            const horaTitleAttr = horaLabel ? ` title="${escapeHtml(horaLabel)}"` : '';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${fecha || '—'}</td>
                <td class="cell-time"${horaTitleAttr}>${hora || '—'}</td>
                <td class="cell-user">${usuario || '—'}</td>
                <td class="cell-role">${rol ? `<span class="role-chip">${rol}</span>` : '—'}</td>
                <td>${modulo ? `<span class="module-chip">${modulo}</span>` : '—'}</td>
                <td class="cell-action">${accion ? `<span class="action-text">${accion}</span>` : '—'}</td>
            `;
            tablaBody.appendChild(tr);
        });

        actualizarResumen(filtrados);
        actualizarControlesPaginacion(totalFiltrados);
        actualizarCharts(filtrados);
    }

    function actualizarOpcionesUsuario(usuarios) {
        if (!Array.isArray(usuarios)) {
            return;
        }

        actualizandoOpcionesUsuario = true;
        const targetValue = filtroUsuario.value || savedUserFilter || '';

        filtroUsuario.innerHTML = '<option value="">Todos los usuarios</option>';

        usuarios.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id_usuario;
            const rol = user.rol ? ` (${user.rol})` : '';
            option.textContent = `${user.nombre}${rol}`;
            filtroUsuario.appendChild(option);
        });

        let finalValue = '';
        if (targetValue) {
            filtroUsuario.value = String(targetValue);
            if (filtroUsuario.value === String(targetValue)) {
                finalValue = String(targetValue);
            } else {
                filtroUsuario.value = '';
            }
        } else {
            filtroUsuario.value = '';
        }

        actualizandoOpcionesUsuario = false;
        savedUserFilter = finalValue;
    }

    async function cargarRegistros() {
        if (!ID_EMPRESA) {
            console.warn('No se encontró el identificador de la empresa en el navegador.');
            return;
        }

        try {
            const params = new URLSearchParams();
            params.append('empresa', ID_EMPRESA);

            if (filtroModulo.value) {
                params.append('modulo', filtroModulo.value);
            }

            const usuarioFiltro = filtroUsuario.value || savedUserFilter;
            if (usuarioFiltro) {
                params.append('usuario', usuarioFiltro);
            }

            if (filtroRol.value) {
                params.append('rol', filtroRol.value);
            }

            const res = await fetch(`../../scripts/php/get_logs.php?${params.toString()}`, {
                cache: 'no-store'
            });

            if (!res.ok) {
                throw new Error(`Error HTTP ${res.status}`);
            }

            const data = await res.json();

            if (!data.success) {
                console.warn('La consulta de logs no fue exitosa:', data.message || 'Respuesta sin éxito');
                return;
            }

            if (Array.isArray(data.usuarios)) {
                actualizarOpcionesUsuario(data.usuarios);
            }

            registros = Array.isArray(data.logs) ? data.logs : [];
            paginaActual = 1;
            mostrarRegistros(registros);
            guardarRegistrosEnCache(registros);
            guardarFiltros();
            actualizarUltimaActualizacion();
        } catch (err) {
            console.error('Error cargando logs', err);
        }
    }

    filtroModulo.addEventListener('change', () => {
        guardarFiltros();
        paginaActual = 1;
        cargarRegistros();
    });

    filtroRol.addEventListener('change', () => {
        guardarFiltros();
        paginaActual = 1;
        cargarRegistros();
    });

    filtroUsuario.addEventListener('change', () => {
        if (actualizandoOpcionesUsuario) {
            return;
        }
        guardarFiltros();
        paginaActual = 1;
        cargarRegistros();
    });

    if (buscadorInput) {
        buscadorInput.addEventListener('input', () => {
            terminoBusqueda = buscadorInput.value || '';
            paginaActual = 1;
            mostrarRegistros(registros);
        });
    }

    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            if (prevPageBtn.disabled) {
                return;
            }
            if (paginaActual > 1) {
                paginaActual -= 1;
                mostrarRegistros(registros);
            }
        });
    }

    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
            if (nextPageBtn.disabled) {
                return;
            }
            paginaActual += 1;
            mostrarRegistros(registros);
        });
    }

    cargarFiltrosGuardados();
    mostrarLogsGuardados();
    cargarRegistros();

    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', () => {
            if (!jsPDF || !window.jspdf || typeof window.jspdf.jsPDF !== 'function') {
                console.warn('Librería jsPDF no disponible.');
                return;
            }
            const doc = new jsPDF();
            if (doc.autoTable) {
                doc.autoTable({ html: '#logTable' });
            }
            doc.save('logs.pdf');
        });
    }

    if (exportExcelBtn && window.XLSX && XLSX.utils && XLSX.writeFile) {
        exportExcelBtn.addEventListener('click', () => {
            const table = document.getElementById('logTable');
            if (!table) {
                return;
            }
            const wb = XLSX.utils.table_to_book(table);
            XLSX.writeFile(wb, 'logs.xlsx');
        });
    }
})();
