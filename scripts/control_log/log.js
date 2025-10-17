// Script para manejar el log de control
(function inicializarLogControl() {
    const filtroModulo = document.getElementById('filtroModulo');
    const filtroUsuario = document.getElementById('filtroUsuario');
    const filtroRol = document.getElementById('filtroRol');
    const tablaBody = document.getElementById('logTableBody');
    const pendingRequestsContainer = document.getElementById('pendingRequests');
    const historyRequestsContainer = document.getElementById('historyRequests');
    const pendingRequestsCount = document.getElementById('pendingRequestsCount');
    const historyRequestsCount = document.getElementById('historyRequestsCount');
    const historyRequestsControls = document.getElementById('historyRequestsControls');
    const historyRequestsPrevBtn = document.getElementById('historyRequestsPrev');
    const historyRequestsNextBtn = document.getElementById('historyRequestsNext');
    const historyRequestsRange = document.getElementById('historyRequestsRange');
    const refreshRequestsBtn = document.getElementById('refreshRequests');
    const historyExportPdfBtn = document.getElementById('historyExportPdf');
    const historyExportExcelBtn = document.getElementById('historyExportExcel');
    const requestsBoard = document.getElementById('requestsBoard');
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
    const notificationHistoryCard = document.getElementById('notificationHistoryCard');
    const notificationHistoryList = document.getElementById('notificationHistoryList');
    const notificationHistoryStatusEl = document.getElementById('notificationHistoryStatus');
    const notificationHistoryRefreshBtn = document.getElementById('notificationHistoryRefresh');
    const notificationHistoryExportBtn = document.getElementById('notificationHistoryExport');

    const REPORT_SOURCE = 'Control de registros';
    const NOTIFICATION_HISTORY_LIMIT = 50;

    function descargarArchivo(blob, fileName) {
        if (!(blob instanceof Blob)) {
            return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    async function guardarReporteHistorial(blob, fileName, notes) {
        if (!(blob instanceof Blob)) {
            return;
        }
        if (!window.ReportHistory || typeof window.ReportHistory.saveGeneratedFile !== 'function') {
            return;
        }
        try {
            await window.ReportHistory.saveGeneratedFile({
                blob,
                fileName,
                source: REPORT_SOURCE,
                notes
            });
        } catch (error) {
            console.warn('No se pudo registrar el reporte en el historial de descargas:', error);
        }
    }

    let trendRange = 'all';

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
            actualizarCharts(ultimoConjuntoFiltrado);
        });
    });

    if (!filtroModulo || !filtroUsuario || !filtroRol || !tablaBody) {
        console.warn('La vista del log de control no está disponible. Se omite la inicialización.');
        return;
    }

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
    let ultimoConjuntoFiltrado = [];
    let trendLabelsISO = [];
    let trendSeries = [];
    let notificationHistoryData = [];
    let notificationHistoryLoading = false;
    const TREND_RANGE_DAYS = {
        week: 7,
        month: 30
    };

    const tieneTableroSolicitudes = pendingRequestsContainer && historyRequestsContainer;
    const MENSAJE_PENDIENTES_VACIO = 'No hay solicitudes pendientes por revisar.';
    const MENSAJE_HISTORIAL_VACIO = 'Aún no hay solicitudes concluidas.';
    const HISTORY_ITEMS_PER_PAGE = 3;

    let historySolicitudes = [];
    let historyPage = 0;

    async function fetchSolicitudes(estado = 'en_proceso') {
        const params = new URLSearchParams({ estado });
        if (ID_EMPRESA) {
            params.append('id_empresa', ID_EMPRESA);
        }

        const response = await fetch(`/scripts/php/solicitudes_admin.php?${params.toString()}`);
        if (!response.ok) {
            throw new Error('No se pudo obtener la información de solicitudes.');
        }

        const data = await response.json();
        if (!data?.success) {
            throw new Error(data?.message || 'Error inesperado al consultar solicitudes.');
        }

        return Array.isArray(data.items) ? data.items : [];
    }

    function formatearFecha(fechaIso) {
        if (!fechaIso) {
            return '—';
        }
        const fecha = new Date(fechaIso);
        if (Number.isNaN(fecha.getTime())) {
            return '—';
        }
        return fecha.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
    }

    function crearEtiqueta(texto) {
        const span = document.createElement('span');
        span.className = 'request-tag';
        span.textContent = texto;
        return span;
    }

    function crearEstadoSolicitud(estado) {
        const span = document.createElement('span');
        const clase = estado === 'aceptada' ? 'approved' : estado === 'denegada' ? 'rejected' : 'pending';
        span.className = `request-status request-status--${clase}`;
        span.textContent = estado === 'aceptada' ? 'Aceptada' : estado === 'denegada' ? 'Denegada' : 'Pendiente';
        return span;
    }

    function capitalizar(texto) {
        if (!texto) {
            return '';
        }
        return texto.charAt(0).toUpperCase() + texto.slice(1);
    }

    function obtenerValorRuta(obj, ruta) {
        if (!obj || !ruta) {
            return undefined;
        }
        return ruta.split('.').reduce((acumulado, segmento) => {
            if (acumulado && Object.prototype.hasOwnProperty.call(acumulado, segmento)) {
                return acumulado[segmento];
            }
            return undefined;
        }, obj);
    }

    function obtenerTextoDesdeRutas(obj, rutas = []) {
        for (const ruta of rutas) {
            const valor = obtenerValorRuta(obj, ruta);
            if (typeof valor === 'string') {
                const limpio = valor.trim();
                if (limpio) {
                    return limpio;
                }
            }
        }
        return '';
    }

    function obtenerNumeroDesdeRutas(obj, rutas = []) {
        for (const ruta of rutas) {
            const valor = obtenerValorRuta(obj, ruta);
            const numero = typeof valor === 'number' ? valor : Number(valor);
            if (Number.isFinite(numero) && numero > 0) {
                return Math.floor(numero);
            }
        }
        return null;
    }

    function construirDetalleEntidad(nombre, id, extras = []) {
        const partes = [];
        if (nombre) {
            partes.push(`"${nombre}"`);
        }
        if (!Array.isArray(extras)) {
            extras = extras ? [extras] : [];
        }
        extras.filter(Boolean).forEach(extra => partes.push(extra));
        return partes.length ? ` ${partes.join(' · ')}` : '';
    }

    function construirFraseAccion(base, nombre, id, extras = []) {
        const detalle = construirDetalleEntidad(nombre, id, extras);
        return detalle ? `${base}${detalle}` : base;
    }

    function obtenerNombreUsuarioDesdePayload(item) {
        const payload = item && typeof item.payload === 'object' ? item.payload : {};
        const nombreCompleto = obtenerTextoDesdeRutas(payload, ['nombre_usuario', 'nombre_completo', 'nombreCompleto']);
        if (nombreCompleto) {
            return nombreCompleto;
        }
        const nombre = obtenerTextoDesdeRutas(payload, ['nombre', 'usuario_nombre']);
        const apellido = obtenerTextoDesdeRutas(payload, ['apellido', 'usuario_apellido']);
        return [nombre, apellido].filter(Boolean).join(' ').trim();
    }

    function obtenerNombreDesdePayload(item, claves) {
        const payload = item && typeof item.payload === 'object' ? item.payload : {};
        return obtenerTextoDesdeRutas(payload, claves);
    }

    function formatearAccionGenerica(tipoAccion) {
        const partes = String(tipoAccion || '')
            .split('_')
            .filter(Boolean);
        if (!partes.length) {
            return '';
        }
        if (partes.length === 1) {
            return capitalizar(partes[0]);
        }
        const verbo = capitalizar(partes.pop());
        const resto = partes.map(capitalizar).join(' ');
        return `${verbo}${resto ? ` ${resto}` : ''}`;
    }

    const ACCION_FORMATTERS = {
        usuario_actualizar: item => {
            const nombre = obtenerNombreUsuarioDesdePayload(item);
            const id = obtenerNumeroDesdeRutas(item.payload, ['id_usuario']);
            return construirFraseAccion('Actualizar usuario', nombre, id);
        },
        usuario_editar_datos: item => {
            const nombre = obtenerNombreUsuarioDesdePayload(item);
            const id = obtenerNumeroDesdeRutas(item.payload, ['id_usuario']);
            return construirFraseAccion('Actualizar datos internos del usuario', nombre, id);
        },
        usuario_cambiar_estado: item => {
            const payload = item && typeof item.payload === 'object' ? item.payload : {};
            const activo = obtenerValorRuta(payload, 'activo');
            const verbo = Number(activo) === 1 ? 'Activar' : 'Desactivar';
            const nombre = obtenerNombreUsuarioDesdePayload(item);
            const id = obtenerNumeroDesdeRutas(payload, ['id_usuario']);
            return construirFraseAccion(`${verbo} usuario`, nombre, id);
        },
        usuario_asignar_area: item => {
            const payload = item && typeof item.payload === 'object' ? item.payload : {};
            const usuarioNombre = obtenerNombreUsuarioDesdePayload(item);
            const usuarioId = obtenerNumeroDesdeRutas(payload, ['id_usuario']);
            const areaNombre = obtenerNombreDesdePayload(item, ['nombre_area']);
            const areaId = obtenerNumeroDesdeRutas(payload, ['id_area']);
            const areaDetalle = construirDetalleEntidad(areaNombre, areaId);
            const usuarioDetalle = construirDetalleEntidad(usuarioNombre, usuarioId);
            return `Asignar área${areaDetalle} al usuario${usuarioDetalle}`;
        },
        usuario_eliminar_acceso: item => {
            const payload = item && typeof item.payload === 'object' ? item.payload : {};
            const usuarioNombre = obtenerNombreUsuarioDesdePayload(item);
            const usuarioId = obtenerNumeroDesdeRutas(payload, ['id_usuario']);
            const areaNombre = obtenerNombreDesdePayload(item, ['nombre_area']);
            const areaId = obtenerNumeroDesdeRutas(payload, ['id_area']);
            const zonaNombre = obtenerNombreDesdePayload(item, ['nombre_zona']);
            const zonaId = obtenerNumeroDesdeRutas(payload, ['id_zona']);
            const usuarioDetalle = construirDetalleEntidad(usuarioNombre, usuarioId);
            if (zonaId || zonaNombre) {
                const zonaDetalle = construirDetalleEntidad(zonaNombre, zonaId);
                return `Revocar acceso del usuario${usuarioDetalle} a la zona${zonaDetalle}`;
            }
            const areaDetalle = construirDetalleEntidad(areaNombre, areaId);
            return `Revocar acceso del usuario${usuarioDetalle} al área${areaDetalle}`;
        },
        usuario_eliminar: item => {
            const payload = item && typeof item.payload === 'object' ? item.payload : {};
            const nombre = obtenerNombreUsuarioDesdePayload(item);
            const id = obtenerNumeroDesdeRutas(payload, ['id_usuario']);
            const correo = obtenerTextoDesdeRutas(payload, ['correo']);
            const extras = correo ? [`correo ${correo}`] : [];
            return construirFraseAccion('Eliminar usuario', nombre, id, extras);
        },
        empresa_actualizar: item => {
            const payload = item && typeof item.payload === 'object' ? item.payload : {};
            const nombre = obtenerTextoDesdeRutas(payload, ['nombre_empresa']);
            const id = obtenerNumeroDesdeRutas(payload, ['id_empresa']);
            return construirFraseAccion('Actualizar empresa', nombre, id);
        },
        producto_crear: item => {
            const nombre = obtenerNombreDesdePayload(item, ['nombre', 'nombre_producto']);
            return construirFraseAccion('Registrar producto', nombre, null);
        },
        producto_actualizar: item => {
            const payload = item && typeof item.payload === 'object' ? item.payload : {};
            const nombre = obtenerNombreDesdePayload(item, ['nombre', 'nombre_producto']);
            const id = obtenerNumeroDesdeRutas(payload, ['id_producto']);
            return construirFraseAccion('Actualizar producto', nombre, id);
        },
        producto_eliminar: item => {
            const payload = item && typeof item.payload === 'object' ? item.payload : {};
            const nombre = obtenerNombreDesdePayload(item, ['nombre_producto', 'nombre']);
            const id = obtenerNumeroDesdeRutas(payload, ['id_producto']);
            return construirFraseAccion('Eliminar producto', nombre, id);
        },
        area_crear: item => {
            const nombre = obtenerNombreDesdePayload(item, ['nombre', 'nombre_area']);
            return construirFraseAccion('Registrar área', nombre, null);
        },
        area_actualizar: item => {
            const payload = item && typeof item.payload === 'object' ? item.payload : {};
            const nombre = obtenerNombreDesdePayload(item, ['nombre', 'nombre_area']);
            const id = obtenerNumeroDesdeRutas(payload, ['area_id']);
            return construirFraseAccion('Actualizar área', nombre, id);
        },
        area_eliminar: item => {
            const payload = item && typeof item.payload === 'object' ? item.payload : {};
            const nombre = obtenerNombreDesdePayload(item, ['nombre_area', 'nombre']);
            const id = obtenerNumeroDesdeRutas(payload, ['area_id']);
            return construirFraseAccion('Eliminar área', nombre, id);
        },
        zona_crear: item => {
            const nombre = obtenerNombreDesdePayload(item, ['nombre', 'nombre_zona']);
            return construirFraseAccion('Registrar zona', nombre, null);
        },
        zona_actualizar: item => {
            const payload = item && typeof item.payload === 'object' ? item.payload : {};
            const nombre = obtenerNombreDesdePayload(item, ['nombre', 'nombre_zona']);
            const id = obtenerNumeroDesdeRutas(payload, ['zona_id']);
            return construirFraseAccion('Actualizar zona', nombre, id);
        },
        zona_eliminar: item => {
            const payload = item && typeof item.payload === 'object' ? item.payload : {};
            const nombre = obtenerNombreDesdePayload(item, ['nombre_zona', 'nombre']);
            const id = obtenerNumeroDesdeRutas(payload, ['zona_id']);
            return construirFraseAccion('Eliminar zona', nombre, id);
        }
    };

    function formatearAccionSolicitud(item) {
        if (!item) {
            return '';
        }

        const tipoAccion = String(item.tipo_accion ?? '').trim();
        if (!tipoAccion) {
            return '';
        }

        const formatter = ACCION_FORMATTERS[tipoAccion];
        if (typeof formatter === 'function') {
            const resultado = formatter(item);
            if (resultado) {
                return resultado;
            }
        }

        return formatearAccionGenerica(tipoAccion);
    }

    function obtenerNombreSolicitante(item) {
        if (!item) {
            return 'Usuario desconocido';
        }
        const nombre = [item.solicitante_nombre, item.solicitante_apellido]
            .map(parte => (parte || '').trim())
            .filter(Boolean)
            .join(' ');
        return nombre || 'Usuario desconocido';
    }

    function formatearEstadoSolicitudLabel(estado) {
        if (!estado) {
            return '—';
        }

        const texto = String(estado)
            .replace(/_/g, ' ')
            .toLowerCase()
            .trim();

        if (!texto) {
            return '—';
        }

        return texto.charAt(0).toUpperCase() + texto.slice(1);
    }

    function construirDatasetHistorialSolicitudes() {
        if (!Array.isArray(historySolicitudes) || !historySolicitudes.length) {
            return null;
        }

        const header = [
            'Resumen',
            'Solicitante',
            'Módulo',
            'Acción',
            'Estado',
            'Fecha solicitada',
            'Fecha resuelta',
            'Comentario'
        ];

        const rows = historySolicitudes.map(item => {
            const resumen = limpiarIdentificadores(item?.resumen || 'Solicitud de cambio');
            const solicitante = obtenerNombreSolicitante(item);
            const modulo = item?.modulo ? item.modulo : '—';
            const accion = formatearAccionSolicitud(item) || '—';
            const estado = formatearEstadoSolicitudLabel(item?.estado);
            const fechaSolicitada = formatearFecha(item?.fecha_creacion);
            const fechaResuelta = formatearFecha(item?.fecha_resolucion || item?.fecha_creacion);
            const comentario = item?.comentario ? limpiarIdentificadores(item.comentario) : '';

            return [
                resumen,
                solicitante,
                modulo || '—',
                accion,
                estado,
                fechaSolicitada,
                fechaResuelta,
                comentario
            ];
        });

        return {
            header,
            rows,
            rowCount: rows.length,
            columnCount: header.length
        };
    }

    function construirSolicitudCard(item, esHistorial = false) {
        const card = document.createElement('div');
        card.className = 'request-item';

        const encabezado = document.createElement('div');
        encabezado.className = 'request-item__header';

        const titulo = document.createElement('h4');
        titulo.className = 'request-item__title';
        titulo.textContent = item.resumen || 'Solicitud de cambio';
        encabezado.appendChild(titulo);

        const meta = document.createElement('div');
        meta.className = 'request-item__meta';
        const solicitante = [item.solicitante_nombre, item.solicitante_apellido].filter(Boolean).join(' ') || 'Usuario desconocido';
        meta.appendChild(crearEtiqueta(`Solicitante: ${solicitante}`));
        if (item.modulo) {
            meta.appendChild(crearEtiqueta(`Módulo: ${item.modulo}`));
        }
        const textoAccion = formatearAccionSolicitud(item);
        if (textoAccion) {
            meta.appendChild(crearEtiqueta(`Acción: ${textoAccion}`));
        }
        encabezado.appendChild(meta);
        card.appendChild(encabezado);

        const descripcion = document.createElement('p');
        descripcion.className = 'request-item__description';
        descripcion.textContent = item.descripcion || 'Sin descripción adicional.';
        card.appendChild(descripcion);

        const fecha = document.createElement('p');
        fecha.className = 'request-item__meta';
        const etiquetaFecha = esHistorial ? 'Resuelta' : 'Solicitada';
        const valorFecha = esHistorial ? (item.fecha_resolucion || item.fecha_creacion) : item.fecha_creacion;
        fecha.textContent = `${etiquetaFecha}: ${formatearFecha(valorFecha)}`;
        card.appendChild(fecha);

        if (esHistorial) {
            const estado = crearEstadoSolicitud(item.estado);
            card.appendChild(estado);
            if (item.comentario) {
                const comentario = document.createElement('p');
                comentario.className = 'request-item__meta';
                comentario.textContent = `Comentario: ${item.comentario}`;
                card.appendChild(comentario);
            }
        } else {
            const acciones = document.createElement('div');
            acciones.className = 'request-item__actions request-actions';

            const aprobar = document.createElement('button');
            aprobar.type = 'button';
            aprobar.className = 'btn btn-success btn-sm';
            aprobar.textContent = 'Aprobar';
            aprobar.addEventListener('click', () => resolverSolicitud(item.id, 'aceptada'));

            const rechazar = document.createElement('button');
            rechazar.type = 'button';
            rechazar.className = 'btn btn-outline-danger btn-sm';
            rechazar.textContent = 'Rechazar';
            rechazar.addEventListener('click', () => resolverSolicitud(item.id, 'denegada'));

            acciones.appendChild(aprobar);
            acciones.appendChild(rechazar);
            card.appendChild(acciones);
        }

        return card;
    }

    function renderizarSolicitudes(items, contenedor, contadorEl, mensajeVacio, esHistorial = false, opciones = {}) {
        if (!contenedor) {
            return;
        }

        const totalItems = typeof opciones.totalItems === 'number'
            ? opciones.totalItems
            : (Array.isArray(items) ? items.length : 0);

        contenedor.innerHTML = '';
        if (Array.isArray(items) && items.length) {
            items.forEach(item => {
                const card = construirSolicitudCard(item, esHistorial);
                contenedor.appendChild(card);
            });
        } else {
            const vacio = document.createElement('div');
            vacio.className = 'request-empty';
            vacio.textContent = mensajeVacio;
            contenedor.appendChild(vacio);
        }

        if (contadorEl) {
            contadorEl.textContent = totalItems;
        }
    }

    function actualizarHistorialSolicitudes(mensajeVacio = MENSAJE_HISTORIAL_VACIO) {
        if (!historyRequestsContainer) {
            return;
        }

        const total = historySolicitudes.length;
        if (!total) {
            renderizarSolicitudes(
                [],
                historyRequestsContainer,
                historyRequestsCount,
                mensajeVacio,
                true,
                { totalItems: 0 }
            );

            if (historyRequestsControls) {
                historyRequestsControls.hidden = true;
            }
            if (historyRequestsPrevBtn) {
                historyRequestsPrevBtn.disabled = true;
            }
            if (historyRequestsNextBtn) {
                historyRequestsNextBtn.disabled = true;
            }
            if (historyRequestsRange) {
                historyRequestsRange.textContent = 'Sin registros';
            }
            return;
        }

        const totalPaginas = Math.max(1, Math.ceil(total / HISTORY_ITEMS_PER_PAGE));
        historyPage = Math.min(Math.max(historyPage, 0), totalPaginas - 1);
        const inicio = historyPage * HISTORY_ITEMS_PER_PAGE;
        const fin = Math.min(inicio + HISTORY_ITEMS_PER_PAGE, total);
        const segmento = historySolicitudes.slice(inicio, fin);

        renderizarSolicitudes(
            segmento,
            historyRequestsContainer,
            historyRequestsCount,
            mensajeVacio,
            true,
            { totalItems: total }
        );

        if (historyRequestsControls) {
            historyRequestsControls.hidden = total <= HISTORY_ITEMS_PER_PAGE;
        }
        if (historyRequestsPrevBtn) {
            historyRequestsPrevBtn.disabled = historyPage === 0;
        }
        if (historyRequestsNextBtn) {
            historyRequestsNextBtn.disabled = historyPage >= totalPaginas - 1;
        }
        if (historyRequestsRange) {
            historyRequestsRange.textContent = `${inicio + 1}-${fin} de ${total}`;
        }
    }

    async function cargarTableroSolicitudes() {
        if (!tieneTableroSolicitudes) {
            return;
        }

        try {
            const [pendientes, historico] = await Promise.all([
                fetchSolicitudes('en_proceso'),
                fetchSolicitudes('concluidas')
            ]);

            renderizarSolicitudes(
                pendientes,
                pendingRequestsContainer,
                pendingRequestsCount,
                MENSAJE_PENDIENTES_VACIO,
                false
            );

            historySolicitudes = Array.isArray(historico) ? historico : [];
            historyPage = 0;
            actualizarHistorialSolicitudes(MENSAJE_HISTORIAL_VACIO);
        } catch (error) {
            console.warn('No se pudo cargar el tablero de solicitudes:', error);
            if (pendingRequestsContainer) {
                pendingRequestsContainer.innerHTML = '<div class="request-empty">No se pudo cargar el tablero de solicitudes.</div>';
            }
            historySolicitudes = [];
            historyPage = 0;
            if (historyRequestsContainer) {
                historyRequestsContainer.innerHTML = '<div class="request-empty">No se pudo cargar el tablero de solicitudes.</div>';
            }
            if (historyRequestsControls) {
                historyRequestsControls.hidden = true;
            }
            if (historyRequestsCount) {
                historyRequestsCount.textContent = '0';
            }
            if (historyRequestsRange) {
                historyRequestsRange.textContent = 'Sin registros';
            }
        }
    }

    async function resolverSolicitud(id, estado) {
        if (!id) {
            return;
        }

        if (estado === 'denegada' && !confirm('¿Deseas rechazar la solicitud seleccionada?')) {
            return;
        }
        if (estado === 'aceptada' && !confirm('¿Deseas aprobar la solicitud seleccionada?')) {
            return;
        }

        let comentario = '';
        if (estado === 'denegada') {
            comentario = prompt('Agrega un comentario para el solicitante (opcional):', '') || '';
        }

        try {
            const respuesta = await fetch('/scripts/php/solicitudes_admin.php', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, estado, comentario })
            });
            const data = await respuesta.json();
            if (!data?.success) {
                alert(data?.message || 'No se pudo actualizar la solicitud.');
                return;
            }

            alert(`La solicitud fue marcada como ${estado}.`);
            cargarTableroSolicitudes();
            cargarUsuariosEmpresa?.();
        } catch (error) {
            console.error('Error al resolver la solicitud:', error);
            alert('No se pudo actualizar la solicitud.');
        }
    }

    function escapeHtml(valor) {
        return String(valor ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function obtenerTextoSeleccionado(selectElement) {
        if (!(selectElement instanceof HTMLSelectElement)) {
            return '';
        }

        const option = selectElement.options?.[selectElement.selectedIndex];
        if (!option) {
            return '';
        }

        const label = option.textContent || option.innerText || option.value || '';
        return label.trim();
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

    function formatNotificationDateTime(dateTimeString) {
        if (!dateTimeString) {
            return { display: '', iso: '' };
        }

        const raw = String(dateTimeString).trim();
        if (!raw) {
            return { display: '', iso: '' };
        }

        const normalized = raw.replace(' ', 'T');
        let date = new Date(normalized);
        if (Number.isNaN(date.getTime())) {
            date = new Date(raw);
        }

        if (Number.isNaN(date.getTime())) {
            return { display: raw, iso: raw };
        }

        let display = '';
        try {
            const options = { dateStyle: 'medium', timeStyle: 'short' };
            if (navegadorTimeZone) {
                options.timeZone = navegadorTimeZone;
            }
            display = new Intl.DateTimeFormat('es', options).format(date);
        } catch (error) {
            display = date.toLocaleString();
        }

        if (display && timeZoneLabel) {
            display += ` (${timeZoneLabel})`;
        }

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        const iso = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

        return { display, iso };
    }

    function setNotificationHistoryStatus(message) {
        if (notificationHistoryStatusEl) {
            notificationHistoryStatusEl.textContent = message;
        }
    }

    function renderNotificationHistory(notifications = []) {
        if (!notificationHistoryList) {
            return;
        }

        notificationHistoryList.innerHTML = '';

        if (!Array.isArray(notifications) || !notifications.length) {
            setNotificationHistoryStatus('No hay alertas registradas todavía.');
            return;
        }

        const fragment = document.createDocumentFragment();

        notifications.forEach(notification => {
            if (!notification) {
                return;
            }

            const item = document.createElement('li');
            item.className = 'notification-history-item';

            const header = document.createElement('div');
            header.className = 'notification-history-item__header';

            const title = document.createElement('h3');
            title.className = 'notification-history-item__title';
            title.textContent = notification.titulo || 'Notificación';
            header.appendChild(title);

            const prioridad = (notification.prioridad || 'Media').toLowerCase();
            const prioridadClass = ['alta', 'media', 'baja'].includes(prioridad)
                ? prioridad
                : 'media';
            const badge = document.createElement('span');
            badge.className = `notification-history-badge notification-history-badge--${prioridadClass}`;
            badge.textContent = (notification.prioridad || 'Media').toUpperCase();
            header.appendChild(badge);

            item.appendChild(header);

            if (notification.mensaje) {
                const message = document.createElement('p');
                message.className = 'notification-history-item__message';
                message.textContent = notification.mensaje;
                item.appendChild(message);
            }

            const meta = document.createElement('div');
            meta.className = 'notification-history-meta';

            const dateInfo = formatNotificationDateTime(
                notification.fecha_disponible_desde
                || notification.creado_en
                || notification.actualizado_en
                || ''
            );
            if (dateInfo.display) {
                const dateSpan = document.createElement('span');
                dateSpan.className = 'notification-history-meta__item';
                dateSpan.textContent = dateInfo.display;
                if (dateInfo.iso && dateInfo.iso !== dateInfo.display) {
                    dateSpan.title = dateInfo.iso;
                }
                meta.appendChild(dateSpan);
            }

            if (notification.estado) {
                const estadoSpan = document.createElement('span');
                estadoSpan.className = 'notification-history-meta__item';
                estadoSpan.textContent = `Estado: ${notification.estado}`;
                meta.appendChild(estadoSpan);
            }

            const targetParts = [];
            if (notification.tipo_destinatario) {
                targetParts.push(notification.tipo_destinatario);
            }
            if (notification.rol_destinatario) {
                targetParts.push(notification.rol_destinatario);
            }
            if (notification.id_usuario_destinatario) {
                targetParts.push(`#${notification.id_usuario_destinatario}`);
            }
            if (targetParts.length) {
                const targetSpan = document.createElement('span');
                targetSpan.className = 'notification-history-meta__item';
                targetSpan.textContent = `Destinatario: ${targetParts.join(' · ')}`;
                meta.appendChild(targetSpan);
            }

            if (notification.ruta_destino) {
                const routeSpan = document.createElement('span');
                routeSpan.className = 'notification-history-meta__item';
                routeSpan.textContent = `Ruta: ${notification.ruta_destino}`;
                meta.appendChild(routeSpan);
            }

            if (meta.children.length) {
                item.appendChild(meta);
            }

            fragment.appendChild(item);
        });

        notificationHistoryList.appendChild(fragment);

        const total = notifications.length;
        const label = total === 1 ? '1 alerta registrada' : `${total} alertas registradas`;
        setNotificationHistoryStatus(`Mostrando ${label}.`);
    }

    async function loadNotificationHistory() {
        if (!notificationHistoryList || !notificationHistoryStatusEl) {
            return;
        }

        if (!ID_EMPRESA) {
            notificationHistoryData = [];
            notificationHistoryList.innerHTML = '';
            setNotificationHistoryStatus('Conecta tu empresa para ver las alertas registradas.');
            return;
        }

        if (notificationHistoryLoading) {
            return;
        }

        notificationHistoryLoading = true;
        setNotificationHistoryStatus('Cargando historial de alertas...');

        try {
            const params = new URLSearchParams({
                id_empresa: ID_EMPRESA,
                limite: String(NOTIFICATION_HISTORY_LIMIT)
            });

            const response = await fetch(`/scripts/php/get_notification_history.php?${params.toString()}`, {
                cache: 'no-store'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const payload = await response.json();
            if (!payload || payload.success !== true) {
                throw new Error(payload && payload.message ? payload.message : 'Respuesta inválida del servidor.');
            }

            notificationHistoryData = Array.isArray(payload.notifications)
                ? payload.notifications
                : [];

            renderNotificationHistory(notificationHistoryData);
        } catch (error) {
            console.error('No se pudo cargar el historial de notificaciones:', error);
            notificationHistoryData = [];
            notificationHistoryList.innerHTML = '';
            setNotificationHistoryStatus('No se pudo cargar el historial de notificaciones.');
        } finally {
            notificationHistoryLoading = false;
        }
    }

    async function exportNotificationHistory() {
        if (!notificationHistoryData.length) {
            setNotificationHistoryStatus('No hay alertas para guardar en este momento.');
            return;
        }

        if (!(window.XLSX && XLSX.utils && typeof XLSX.write === 'function')) {
            const blob = new Blob([
                JSON.stringify(notificationHistoryData, null, 2)
            ], { type: 'application/json' });
            const fileName = 'historial_notificaciones.json';
            descargarArchivo(blob, fileName);
            await guardarReporteHistorial(blob, fileName, 'Historial de notificaciones exportado en formato JSON');
            setNotificationHistoryStatus('Historial de alertas guardado en formato JSON.');
            return;
        }

        const rows = notificationHistoryData.map((notification, index) => {
            const fecha = formatNotificationDateTime(
                notification.fecha_disponible_desde
                || notification.creado_en
                || notification.actualizado_en
                || ''
            );

            return {
                '#': index + 1,
                Titulo: notification.titulo || '',
                Mensaje: notification.mensaje || '',
                Prioridad: notification.prioridad || '',
                Estado: notification.estado || '',
                'Fecha disponible': fecha.iso || '',
                'Ruta destino': notification.ruta_destino || '',
                'Tipo destinatario': notification.tipo_destinatario || '',
                'Rol destinatario': notification.rol_destinatario || '',
                'Usuario destinatario': notification.id_usuario_destinatario || ''
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Notificaciones');

        let arrayBuffer;
        try {
            arrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        } catch (error) {
            console.error('No se pudo generar el archivo de Excel del historial de alertas:', error);
            return;
        }

        const blob = new Blob([arrayBuffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        const fileName = 'historial_notificaciones.xlsx';
        descargarArchivo(blob, fileName);
        await guardarReporteHistorial(blob, fileName, 'Historial de alertas exportado desde el registro de actividades');
        setNotificationHistoryStatus('Historial de alertas guardado correctamente.');
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

    function normalizarFechaISO(valor) {
        if (!valor) {
            return '';
        }

        const texto = String(valor).trim();
        if (!texto) {
            return '';
        }

        const isoMatch = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (isoMatch) {
            return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
        }

        const partes = texto.split('/');
        if (partes.length === 3) {
            const [dia, mes, anio] = partes;
            if (dia && mes && anio) {
                return `${anio.padStart(4, '0')}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
            }
        }

        return '';
    }

    function filtrarDatosPorRangoTemporal(datos = []) {
        if (!Array.isArray(datos)) {
            return [];
        }

        if (trendRange === 'all' || !TREND_RANGE_DAYS[trendRange]) {
            return datos.slice();
        }

        const serieFiltrada = obtenerSerieFiltradaPorRango();
        if (!Array.isArray(serieFiltrada) || serieFiltrada.length === 0) {
            return [];
        }

        const inicio = serieFiltrada[0]?.iso;
        const fin = serieFiltrada[serieFiltrada.length - 1]?.iso;

        if (!inicio || !fin) {
            return [];
        }

        return datos.filter(registro => {
            const fechaISO = normalizarFechaISO(registro?.fecha);
            if (!fechaISO) {
                return false;
            }
            return fechaISO >= inicio && fechaISO <= fin;
        });
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

    // CORREGIDA: Función para actualizar los charts
    function actualizarCharts(datos = []) {
        if (!window.Chart || (!activityTrendCanvas && !moduleActivityCanvas && !topUsersCanvas)) {
            return;
        }

        const Chart = window.Chart;
        const fuente = Array.isArray(datos) ? datos : [];

        if (activityTrendCanvas) {
            trendSeries = construirSerieDiaria(fuente);
            renderTrendChart();
        }

        const datosFiltradosPorRango = filtrarDatosPorRangoTemporal(fuente);

        if (moduleActivityCanvas) {
            const modulesMap = new Map();

            datosFiltradosPorRango.forEach(reg => {
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

        // Gráfico de usuarios
        if (topUsersCanvas) {
            const usersMap = new Map();

            datosFiltradosPorRango.forEach(reg => {
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
            ultimoConjuntoFiltrado = [];
            actualizarCharts([]);
            return;
        }

        const totalFiltrados = filtrados.length;
        const totalPaginas = Math.max(1, Math.ceil(totalFiltrados / PAGE_SIZE));
        paginaActual = Math.min(Math.max(paginaActual, 1), totalPaginas);
        const inicio = (paginaActual - 1) * PAGE_SIZE;
        const paginaDatos = filtrados.slice(inicio, inicio + PAGE_SIZE);

        ultimoConjuntoFiltrado = filtrados.slice();

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

    if (historyRequestsPrevBtn) {
        historyRequestsPrevBtn.addEventListener('click', () => {
            if (historyPage <= 0) {
                return;
            }
            historyPage -= 1;
            actualizarHistorialSolicitudes();
        });
    }

    if (historyRequestsNextBtn) {
        historyRequestsNextBtn.addEventListener('click', () => {
            const totalPaginas = Math.ceil(historySolicitudes.length / HISTORY_ITEMS_PER_PAGE);
            if (historyPage >= totalPaginas - 1) {
                return;
            }
            historyPage += 1;
            actualizarHistorialSolicitudes();
        });
    }

    cargarFiltrosGuardados();
    mostrarLogsGuardados();
    cargarRegistros();
    loadNotificationHistory();

    if (tieneTableroSolicitudes) {
        cargarTableroSolicitudes();
        if (refreshRequestsBtn) {
            refreshRequestsBtn.addEventListener('click', () => {
                cargarTableroSolicitudes();
            });
        }
    } else if (requestsBoard) {
        requestsBoard.classList.add('d-none');
    }

    if (historyExportPdfBtn) {
        historyExportPdfBtn.addEventListener('click', async () => {
            const exporter = window.ReportExporter;
            if (!exporter || typeof exporter.exportTableToPdf !== 'function') {
                console.warn('El módulo para exportar reportes no está disponible.');
                return;
            }

            const dataset = construirDatasetHistorialSolicitudes();
            if (!dataset || !dataset.rowCount) {
                console.warn('No hay solicitudes concluidas para exportar.');
                return;
            }

            const subtitleParts = [];
            const empresa = typeof exporter.getEmpresaNombre === 'function' ? exporter.getEmpresaNombre() : '';
            if (empresa) {
                subtitleParts.push(empresa);
            }

            if (typeof exporter.pluralize === 'function') {
                subtitleParts.push(exporter.pluralize(dataset.rowCount, 'solicitud'));
            } else {
                subtitleParts.push(`${dataset.rowCount} solicitudes`);
            }

            if (typeof exporter.formatTimestamp === 'function') {
                subtitleParts.push(`Generado: ${exporter.formatTimestamp(new Date())}`);
            }

            try {
                const result = await exporter.exportTableToPdf({
                    data: dataset,
                    title: 'Historial de solicitudes',
                    subtitle: subtitleParts.join(' • '),
                    fileName: 'historial_solicitudes.pdf',
                    orientation: dataset.columnCount > 5 ? 'landscape' : 'portrait'
                });

                if (result?.blob) {
                    await guardarReporteHistorial(result.blob, result.fileName, 'Exportación del historial de solicitudes a PDF');
                }
            } catch (error) {
                console.error('No se pudo generar el PDF del historial de solicitudes:', error);
                if (error && error.message === 'PDF_LIBRARY_MISSING') {
                    console.warn('La librería para generar PDF no está disponible.');
                }
            }
        });
    }

    if (historyExportExcelBtn) {
        historyExportExcelBtn.addEventListener('click', async () => {
            const exporter = window.ReportExporter;
            if (!exporter || typeof exporter.exportTableToExcel !== 'function') {
                console.warn('El módulo para exportar reportes no está disponible.');
                return;
            }

            const dataset = construirDatasetHistorialSolicitudes();
            if (!dataset || !dataset.rowCount) {
                console.warn('No hay solicitudes concluidas para exportar.');
                return;
            }

            let result;
            try {
                result = exporter.exportTableToExcel({
                    data: dataset,
                    fileName: 'historial_solicitudes.xlsx',
                    sheetName: 'Solicitudes'
                });
            } catch (error) {
                console.error('No se pudo generar el archivo de Excel del historial de solicitudes:', error);
                if (error && error.message === 'EXCEL_LIBRARY_MISSING') {
                    console.warn('La librería para generar Excel no está disponible.');
                }
                return;
            }

            if (result?.blob) {
                await guardarReporteHistorial(result.blob, result.fileName, 'Exportación del historial de solicitudes a Excel');
            }
        });
    }

    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', async () => {
            const exporter = window.ReportExporter;
            if (!exporter || typeof exporter.exportTableToPdf !== 'function') {
                console.warn('El módulo para exportar reportes no está disponible.');
                return;
            }

            const table = document.getElementById('logTable');
            if (!(table instanceof HTMLTableElement)) {
                console.warn('No se encontró la tabla del historial de actividades.');
                return;
            }

            const dataset = exporter.extractTableData(table);
            if (!dataset || !dataset.rowCount) {
                console.warn('No hay registros disponibles para exportar.');
                return;
            }

            const subtitleParts = [];
            const empresa = exporter.getEmpresaNombre();
            if (empresa) {
                subtitleParts.push(empresa);
            }

            subtitleParts.push(exporter.pluralize(dataset.rowCount, 'registro'));

            const moduloLabel = obtenerTextoSeleccionado(filtroModulo);
            const rolLabel = obtenerTextoSeleccionado(filtroRol);
            const usuarioLabel = obtenerTextoSeleccionado(filtroUsuario);

            const filtrosAplicados = [
                moduloLabel && moduloLabel.toLowerCase() !== 'todos' ? `Módulo: ${moduloLabel}` : '',
                rolLabel && rolLabel.toLowerCase() !== 'todos' ? `Rol: ${rolLabel}` : '',
                usuarioLabel && usuarioLabel.toLowerCase() !== 'todos' ? `Usuario: ${usuarioLabel}` : ''
            ].filter(Boolean);

            if (terminoBusqueda) {
                filtrosAplicados.push(`Búsqueda: "${terminoBusqueda.trim()}"`);
            }

            if (filtrosAplicados.length) {
                subtitleParts.push(filtrosAplicados.join(' • '));
            }

            try {
                const result = await exporter.exportTableToPdf({
                    table,
                    data: dataset,
                    title: 'Historial de actividades',
                    subtitle: subtitleParts.join(' • '),
                    fileName: 'logs.pdf'
                });

                if (result?.blob) {
                    await guardarReporteHistorial(result.blob, result.fileName, 'Exportación del registro a PDF');
                }
            } catch (error) {
                console.error('No se pudo generar el PDF del historial de actividades:', error);
                if (error && error.message === 'PDF_LIBRARY_MISSING') {
                    console.warn('La librería para generar PDF no está disponible.');
                    return;
                }
            }
        });
    }

    if (exportExcelBtn && window.XLSX && XLSX.utils && typeof XLSX.write === 'function') {
        exportExcelBtn.addEventListener('click', async () => {
            const table = document.getElementById('logTable');
            if (!table) {
                return;
            }
            const wb = XLSX.utils.table_to_book(table);
            let wbArrayBuffer;
            try {
                wbArrayBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            } catch (error) {
                console.error('No se pudo generar el archivo de Excel del registro:', error);
                return;
            }
            const fileName = 'logs.xlsx';
            const blob = new Blob([wbArrayBuffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            descargarArchivo(blob, fileName);
            await guardarReporteHistorial(blob, fileName, 'Exportación del registro a Excel');
        });
    }

    if (notificationHistoryRefreshBtn) {
        notificationHistoryRefreshBtn.addEventListener('click', () => {
            loadNotificationHistory();
        });
    }

    if (notificationHistoryExportBtn) {
        notificationHistoryExportBtn.addEventListener('click', () => {
            exportNotificationHistory();
        });
    }
})();