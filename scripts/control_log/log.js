// Script para manejar el log de control

(function inicializarLogControl() {
    const filtroModulo = document.getElementById('filtroModulo');
    const filtroUsuario = document.getElementById('filtroUsuario');
    const filtroRol = document.getElementById('filtroRol');
    const tablaBody = document.getElementById('logTableBody');
    const exportPdfBtn = document.getElementById('exportPdf');
    const exportExcelBtn = document.getElementById('exportExcel');

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

        if (Array.isArray(guardados) && guardados.length > 0) {
            registros = guardados;
            mostrarRegistros(registros);
        }
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
        tablaBody.innerHTML = '';

        if (!Array.isArray(datos) || datos.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td colspan="6" class="text-center text-muted">Sin registros disponibles.</td>';
            tablaBody.appendChild(tr);
            return;
        }

        datos.forEach(reg => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${reg.fecha}</td>
                <td>${reg.hora}</td>
                <td>${reg.usuario}</td>
                <td>${reg.rol}</td>
                <td>${reg.modulo}</td>
                <td>${reg.accion}</td>
            `;
            tablaBody.appendChild(tr);
        });
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
