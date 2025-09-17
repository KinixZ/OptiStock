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

    if (!filtroModulo || !filtroUsuario || !filtroRol || !tablaBody) {
        console.warn('La vista del log de control no está disponible. Se omite la inicialización.');
        return;
    }

    const { jsPDF } = (window.jspdf || {});

    const ID_EMPRESA = localStorage.getItem('id_empresa') || '';
    const LOGS_STORAGE_KEY = ID_EMPRESA ? `logsEmpresa_${ID_EMPRESA}` : 'logsEmpresa';
    const FILTERS_STORAGE_KEY = ID_EMPRESA ? `logsFiltros_${ID_EMPRESA}` : 'logsFiltros';

    let registros = [];
    let filtrosGuardados = {};
    let savedUserFilter = '';
    let actualizandoOpcionesUsuario = false;
    let terminoBusqueda = '';

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
            return;
        }

        filtrados.forEach(reg => {
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
        cargarRegistros();
    });

    filtroRol.addEventListener('change', () => {
        guardarFiltros();
        cargarRegistros();
    });

    filtroUsuario.addEventListener('change', () => {
        if (actualizandoOpcionesUsuario) {
            return;
        }
        guardarFiltros();
        cargarRegistros();
    });

    if (buscadorInput) {
        buscadorInput.addEventListener('input', () => {
            terminoBusqueda = buscadorInput.value || '';
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
