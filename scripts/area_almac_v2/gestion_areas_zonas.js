// gestion_areas_zonas.js
(function() {

let editAreaId = null;
let editZoneId = null;

  // —————— Referencias al DOM ——————
  const areaBtn      = document.getElementById('nuevaArea');
  const zonaBtn      = document.getElementById('nuevaZona');
  const formArea     = document.getElementById('formArea');
  const formZona     = document.getElementById('formZona');
  const areaNombre   = document.getElementById('areaNombre');
  const areaDesc     = document.getElementById('areaDescripcion');
  const areaLargo    = document.getElementById('areaLargo');
  const areaAncho    = document.getElementById('areaAncho');
  const areaAlto     = document.getElementById('areaAlto');
  const volumenArea  = document.getElementById('areaVolumen');
  const zonaNombre   = document.getElementById('zonaNombre');
  const zonaDesc     = document.getElementById('zonaDescripcion');
  const zonaLargo    = document.getElementById('zonaLargo');
  const zonaAncho    = document.getElementById('zonaAncho');
  const zonaAlto     = document.getElementById('zonaAlto');
  const volumenZona  = document.getElementById('zonaVolumen');
  const zonaAreaSel  = document.getElementById('zonaArea');
  const zonaTipoSel  = document.getElementById('zonaTipo');
  const tablaAreasElement     = document.getElementById('tablaAreas');
  const tablaZonasElement     = document.getElementById('tablaZonas');
  const tablaZonasSinAreaElement = document.getElementById('tablaZonasSinArea');
  const tablaAreasBody        = tablaAreasElement ? tablaAreasElement.querySelector('tbody') : null;
  const tablaZonasBody        = tablaZonasElement ? tablaZonasElement.querySelector('tbody') : null;
  const tablaZonasSinAreaBody = tablaZonasSinAreaElement ? tablaZonasSinAreaElement.querySelector('tbody') : null;
  const totalAreasEl          = document.getElementById('totalAreas');
  const totalZonasEl          = document.getElementById('totalZonas');
  const zonasSinAreaEl        = document.getElementById('zonasSinArea');
  const totalIncidenciasEl    = document.getElementById('totalIncidencias');
  const filtroNombre          = document.getElementById('filtroNombre');
  const filtroArea            = document.getElementById('filtroArea');
  const filtroOcupacion       = document.getElementById('filtroOcupacion');
  const filtroOcupacionValor  = document.getElementById('filtroOcupacionValor');
  const filtroProductos       = document.getElementById('filtroProductos');
  const exportExcelBtn        = document.getElementById('exportExcel');
  const exportPdfBtn          = document.getElementById('exportPdf');
  const alertasBanner         = document.getElementById('alertasSaturacion');
  const incidentForm          = document.getElementById('incidentForm');
  const incidentAreaSelect    = document.getElementById('incidentAreaSelect');
  const incidentZoneSelect    = document.getElementById('incidentZoneSelect');
  const incidentAreaGroup     = document.getElementById('incidentAreaGroup');
  const incidentZoneGroup     = document.getElementById('incidentZoneGroup');
  const incidentDescription   = document.getElementById('incidentDescription');
  const incidentList          = document.getElementById('incidentList');
  const incidentScopeRadios   = document.querySelectorAll('input[name="incidentScope"]');
  const incidentReportBtn     = document.getElementById('incidentReportBtn');

  const permissionUtils =
    typeof window !== 'undefined' && window.PermissionUtils ? window.PermissionUtils : null;
  const permisosHelper =
    typeof window !== 'undefined' && window.OptiStockPermissions ? window.OptiStockPermissions : null;

  const MODULO_PERMISOS = [
    'warehouse.areas.read',
    'warehouse.areas.create',
    'warehouse.areas.update',
    'warehouse.areas.delete',
    'warehouse.zones.read',
    'warehouse.zones.create',
    'warehouse.zones.update',
    'warehouse.zones.delete',
    'warehouse.incidents.record'
  ];

  function tienePermiso(clave) {
    if (!clave) {
      return true;
    }

    if (permissionUtils && typeof permissionUtils.hasPermission === 'function') {
      return permissionUtils.hasPermission(clave);
    }

    if (permisosHelper && typeof permisosHelper.isPermissionEnabled === 'function') {
      try {
        const rol = typeof localStorage !== 'undefined' ? localStorage.getItem('usuario_rol') : null;
        return permisosHelper.isPermissionEnabled(rol, clave);
      } catch (error) {
        return true;
      }
    }

    return true;
  }

  function marcarDisponibilidad(elemento, permitido, mensaje) {
    if (!elemento) {
      return;
    }

    if (permissionUtils && typeof permissionUtils.markAvailability === 'function') {
      permissionUtils.markAvailability(elemento, permitido, mensaje);
      return;
    }

    if (permitido) {
      elemento.classList.remove('permission-disabled');
      elemento.removeAttribute('aria-disabled');
      if (elemento.dataset) {
        delete elemento.dataset.permissionDenied;
        delete elemento.dataset.permissionMessage;
      }
      if (typeof elemento.disabled === 'boolean') {
        elemento.disabled = false;
      }
      return;
    }

    elemento.classList.add('permission-disabled');
    elemento.setAttribute('aria-disabled', 'true');
    if (typeof elemento.disabled === 'boolean') {
      elemento.disabled = true;
    }
    if (elemento.dataset) {
      elemento.dataset.permissionDenied = 'true';
      if (mensaje) {
        elemento.dataset.permissionMessage = mensaje;
      }
    }
  }

  function mostrarDenegado(mensaje) {
    const texto = mensaje || 'No tienes permiso para realizar esta acción.';
    if (permissionUtils && typeof permissionUtils.showDenied === 'function') {
      permissionUtils.showDenied(texto);
      return;
    }
    if (typeof window !== 'undefined' && typeof window.toastError === 'function') {
      window.toastError(texto);
      return;
    }
    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert(texto);
    }
  }

  function obtenerHandlerDenegado(mensaje) {
    if (permissionUtils && typeof permissionUtils.createDeniedHandler === 'function') {
      return permissionUtils.createDeniedHandler(mensaje);
    }
    return function manejar(evento) {
      if (evento && typeof evento.preventDefault === 'function') {
        evento.preventDefault();
      }
      if (evento && typeof evento.stopPropagation === 'function') {
        evento.stopPropagation();
      }
      mostrarDenegado(mensaje);
    };
  }

  function asegurarAccesoModulo() {
    if (permissionUtils && typeof permissionUtils.ensureModuleAccess === 'function') {
      return permissionUtils.ensureModuleAccess({
        permissions: MODULO_PERMISOS,
        container: document.querySelector('.warehouse-page'),
        message:
          'Solicita al administrador que habilite los permisos de áreas o zonas para gestionar la infraestructura del almacén.'
      });
    }
    return true;
  }

  if (!asegurarAccesoModulo()) {
    return;
  }

  const puedeVerAreas = tienePermiso('warehouse.areas.read');
  const puedeCrearAreas = tienePermiso('warehouse.areas.create');
  const puedeActualizarAreas = tienePermiso('warehouse.areas.update');
  const puedeEliminarAreas = tienePermiso('warehouse.areas.delete');
  const puedeVerZonas = tienePermiso('warehouse.zones.read');
  const puedeCrearZonas = tienePermiso('warehouse.zones.create');
  const puedeActualizarZonas = tienePermiso('warehouse.zones.update');
  const puedeEliminarZonas = tienePermiso('warehouse.zones.delete');
  const puedeRecibirAlertas = tienePermiso('warehouse.alerts.receive');
  const puedeRegistrarIncidencias = tienePermiso('warehouse.incidents.record');
  const puedeRecibirIncidencias = tienePermiso('warehouse.incidents.alerts');

  if (areaBtn && !puedeCrearAreas && !puedeActualizarAreas) {
    marcarDisponibilidad(areaBtn, false, 'No tienes permiso para registrar o editar áreas.');
    areaBtn.addEventListener('click', obtenerHandlerDenegado('No tienes permiso para administrar áreas.'));
  }

  if (zonaBtn && !puedeCrearZonas && !puedeActualizarZonas) {
    marcarDisponibilidad(zonaBtn, false, 'No tienes permiso para registrar o editar zonas.');
    zonaBtn.addEventListener('click', obtenerHandlerDenegado('No tienes permiso para administrar zonas.'));
  }

  if (exportExcelBtn && !puedeVerZonas) {
    marcarDisponibilidad(exportExcelBtn, false, 'No tienes permiso para exportar las zonas registradas.');
    exportExcelBtn.addEventListener('click', obtenerHandlerDenegado('No tienes permiso para ver las zonas.'));
  }

  if (exportPdfBtn && !puedeVerZonas) {
    marcarDisponibilidad(exportPdfBtn, false, 'No tienes permiso para exportar las zonas registradas.');
    exportPdfBtn.addEventListener('click', obtenerHandlerDenegado('No tienes permiso para ver las zonas.'));
  }

  if (incidentReportBtn && !(puedeRegistrarIncidencias || puedeRecibirIncidencias)) {
    marcarDisponibilidad(incidentReportBtn, false, 'No tienes permiso para consultar las incidencias registradas.');
    incidentReportBtn.addEventListener('click', obtenerHandlerDenegado('No tienes permiso para consultar incidencias.'));
  }

  if (incidentForm && !puedeRegistrarIncidencias) {
    const controls = incidentForm.querySelectorAll('input, textarea, select, button');
    controls.forEach((control) => {
      if (!control) {
        return;
      }
      if (control.type === 'radio' || control.type === 'checkbox') {
        control.disabled = true;
      } else {
        control.setAttribute('readonly', 'readonly');
        control.disabled = true;
      }
    });
    incidentForm.addEventListener('submit', obtenerHandlerDenegado('No tienes permiso para registrar incidencias.'));
  }

  const areaSubmit = formArea ? formArea.querySelector('button[type="submit"]') : null;
  if (areaSubmit && !puedeCrearAreas && !puedeActualizarAreas) {
    marcarDisponibilidad(areaSubmit, false, 'No tienes permiso para guardar cambios en las áreas.');
  }

  const zonaSubmit = formZona ? formZona.querySelector('button[type="submit"]') : null;
  if (zonaSubmit && !puedeCrearZonas && !puedeActualizarZonas) {
    marcarDisponibilidad(zonaSubmit, false, 'No tienes permiso para guardar cambios en las zonas.');
  }

  if (!puedeVerZonas) {
    [filtroNombre, filtroArea, filtroOcupacion, filtroProductos].forEach((control) => {
      if (!control) {
        return;
      }
      control.disabled = true;
      control.value = '';
    });
  }

  let areasData = [];
  let zonasData = [];
  let incidenciasData = [];

  if (window.SimpleTableSorter) {
    if (tablaAreasElement) {
      window.SimpleTableSorter.enhance(tablaAreasElement);
    }
    if (tablaZonasElement) {
      window.SimpleTableSorter.enhance(tablaZonasElement);
    }
    if (tablaZonasSinAreaElement) {
      window.SimpleTableSorter.enhance(tablaZonasSinAreaElement);
    }
  }

  function formatDecimal(value, decimals = 2) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return (0).toFixed(decimals);
    }
    return number.toFixed(decimals);
  }

  function obtenerNombreAreaPorId(areaId) {
    if (areaId === null || areaId === undefined) {
      return 'Sin área';
    }
    const match = areasData.find(area => `${area.id}` === `${areaId}`);
    if (match && match.nombre) {
      return match.nombre;
    }
    return `Área ${areaId}`;
  }

  function obtenerNombreZonaPorId(zonaId) {
    if (zonaId === null || zonaId === undefined) {
      return 'Sin zona';
    }
    const match = zonasData.find(zona => `${zona.id}` === `${zonaId}`);
    if (match && match.nombre) {
      return match.nombre;
    }
    return `Zona ${zonaId}`;
  }

  function escapeHtml(value) {
    if (value === null || value === undefined) {
      return '';
    }
    return String(value).replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[char] || char));
  }

  function formatearFechaIncidencia(fecha) {
    if (!fecha) {
      return '';
    }
    const normalizada = typeof fecha === 'string' ? fecha.replace(' ', 'T') : fecha;
    const date = new Date(normalizada);
    if (Number.isNaN(date.getTime())) {
      return typeof fecha === 'string' ? fecha : '';
    }
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function describirFiltrosActivos() {
    const descripciones = [];
    const nombreValor = (filtroNombre?.value || '').trim();
    if (nombreValor) {
      descripciones.push(`Nombre contiene "${nombreValor}"`);
    }

    if (filtroArea) {
      const valorArea = filtroArea.value;
      if (valorArea === 'sin-area') {
        descripciones.push('Solo zonas sin área');
      } else if (valorArea && valorArea !== 'todos') {
        descripciones.push(`Área: ${obtenerNombreAreaPorId(valorArea)}`);
      }
    }

    if (filtroOcupacion) {
      const ocupacionMin = parseInt(filtroOcupacion.value, 10);
      if (Number.isFinite(ocupacionMin) && ocupacionMin > 0) {
        descripciones.push(`Ocupación ≥ ${ocupacionMin}%`);
      }
    }

    if (filtroProductos) {
      const productosMin = parseInt(filtroProductos.value, 10);
      if (Number.isFinite(productosMin) && productosMin > 0) {
        descripciones.push(`Productos ≥ ${productosMin}`);
      }
    }

    return descripciones;
  }

  function construirDatasetZonas() {
    const datos = filtrarZonas().todas;
    if (!Array.isArray(datos) || !datos.length) {
      return null;
    }

    const header = [
      'Zona',
      'Área',
      'Dimensiones (m)',
      'Capacidad utilizada (m³)',
      'Disponible (m³)',
      'Ocupación (%)',
      'Productos (tipos / uds.)'
    ];

    const rows = datos.map(zona => {
      const ancho = formatDecimal(zona.ancho ?? zona.width ?? 0, 2);
      const largo = formatDecimal(zona.largo ?? zona.length ?? 0, 2);
      const alto = formatDecimal(zona.alto ?? zona.height ?? 0, 2);
      const capacidadUtilizada = formatDecimal(zona.capacidad_utilizada ?? zona.capacidad ?? 0, 2);
      const volumen = Number(zona.volumen ?? 0);
      const disponibleCalculado = zona.capacidad_disponible !== undefined
        ? Number(zona.capacidad_disponible)
        : volumen - Number(zona.capacidad_utilizada ?? 0);
      const disponible = formatDecimal(Math.max(disponibleCalculado, 0), 2);
      const porcentaje = formatDecimal(zona.porcentaje_ocupacion ?? zona.ocupacion ?? 0, 1);
      const productos = Number(zona.productos_registrados ?? zona.productos ?? 0) || 0;
      const totalUnidades = Number(zona.total_unidades ?? 0) || 0;
      const productosLabel = totalUnidades
        ? `${productos} tipo${productos === 1 ? '' : 's'} / ${totalUnidades} uds`
        : `${productos} tipo${productos === 1 ? '' : 's'}`;
      const tipoAlmacenamiento = zona.tipo_almacenamiento
        ? ` (${zona.tipo_almacenamiento})`
        : ' (Sin tipo)';

      return [
        `${zona.nombre || 'Sin nombre'}${tipoAlmacenamiento}`,
        obtenerNombreAreaPorId(zona.area_id),
        `${ancho} × ${largo} × ${alto}`,
        capacidadUtilizada,
        disponible,
        `${porcentaje}%`,
        productosLabel
      ];
    });

    return {
      header,
      rows,
      rowCount: rows.length,
      columnCount: header.length
    };
  }

  function construirDatasetIncidenciasReporte(pendientes = [], revisadas = []) {
    const normalizarLista = (lista, ordenEstado) => {
      if (!Array.isArray(lista) || !lista.length) {
        return [];
      }
      return lista.map(item => ({ item, ordenEstado }));
    };

    const registros = [
      ...normalizarLista(pendientes, 0),
      ...normalizarLista(revisadas, 1)
    ];

    if (!registros.length) {
      return null;
    }

    const parseFecha = (valor) => {
      if (!valor) {
        return 0;
      }
      const normalizada = typeof valor === 'string' ? valor.replace(' ', 'T') : valor;
      const timestamp = Date.parse(normalizada);
      return Number.isNaN(timestamp) ? 0 : timestamp;
    };

    registros.sort((a, b) => {
      if (a.ordenEstado !== b.ordenEstado) {
        return a.ordenEstado - b.ordenEstado;
      }
      const fechaA = parseFecha(a.item?.creado_en);
      const fechaB = parseFecha(b.item?.creado_en);
      return fechaB - fechaA;
    });

    const header = [
      'Estado',
      'Tipo',
      'Ubicación',
      'Descripción',
      'Reportado por',
      'Registrado',
      'Revisado'
    ];

    const rows = registros.map(({ item }) => {
      const estado = (item?.estado || 'Pendiente').trim() || 'Pendiente';
      const esZona = Boolean(item?.zona_id);
      const areaNombre = (item?.area_nombre || '').trim() || 'Sin área';
      const zonaNombre = (item?.zona_nombre || '').trim() || 'Sin zona';
      const ubicacion = esZona ? `${zonaNombre} (${areaNombre})` : areaNombre;
      const descripcion = (item?.descripcion || '').trim() || 'Sin descripción';
      const reportadoPor = (item?.reportado_por || '').trim() || 'Usuario sin nombre';
      const registrado = formatearFechaIncidencia(item?.creado_en) || '-';
      const revisado = estado.toLowerCase() === 'revisado'
        ? (formatearFechaIncidencia(item?.revisado_en) || '-')
        : '-';

      return [
        estado,
        esZona ? 'Zona' : 'Área',
        ubicacion,
        descripcion,
        reportadoPor,
        registrado,
        revisado
      ];
    });

    return {
      header,
      rows,
      rowCount: rows.length,
      columnCount: header.length
    };
  }

  function construirSubtituloZonas(rowCount) {
    const exporter = window.ReportExporter || null;
    const partes = [];
    const empresaNombre = exporter?.getEmpresaNombre
      ? exporter.getEmpresaNombre()
      : 'OptiStock';
    const contador = exporter?.pluralize
      ? exporter.pluralize(rowCount, 'zona')
      : (rowCount === 1 ? '1 zona' : `${rowCount} zonas`);
    const filtros = describirFiltrosActivos();
    const timestamp = exporter?.formatTimestamp
      ? exporter.formatTimestamp()
      : new Date().toLocaleString();

    partes.push(`Empresa: ${empresaNombre}`);
    partes.push(`Zonas filtradas: ${contador} filtrada${rowCount === 1 ? '' : 's'}`);
    if (filtros.length) {
      partes.push(filtros.join(' • '));
    }
    partes.push(`Generado: ${timestamp}`);

    return partes.filter(Boolean).join(' • ');
  }

  async function guardarReporteHistorico(blob, fileName, notes) {
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
        source: 'Gestión de áreas y zonas',
        notes
      });
    } catch (error) {
      console.warn('No se pudo guardar el reporte en el historial:', error);
    }
  }

  async function guardarReporteZonas(blob, fileName, notes) {
    await guardarReporteHistorico(blob, fileName, notes);
  }

  async function guardarReporteIncidencias(blob, fileName, notes) {
    await guardarReporteHistorico(blob, fileName, notes);
  }

  const API_BASE           = '../../scripts/php';
  const INCIDENTS_ENDPOINT = `${API_BASE}/gestionar_incidencias.php`;
  const EMP_ID             = parseInt(localStorage.getItem('id_empresa'), 10) || 0;

  const tiposZona = [
    'Rack', 'Mostrador', 'Caja', 'Estantería',
    'Refrigeración', 'Congelador', 'Piso', 'Contenedor',
    'Palet', 'Carro', 'Cajón', 'Jaula', 'Estiba',
    'Bodega', 'Silo', 'Tanque', 'Gabinete', 'Vitrina',
    'Armario', 'Otro'
  ];

  function esRespuestaSolicitud(data) {
    return Boolean(
      data &&
      typeof data === 'object' &&
      data.success === true &&
      data.solicitud &&
      typeof data.solicitud === 'object'
    );
  }

  function manejarRespuestaSolicitud(data, mensajeSolicitud, mensajeInmediato = '') {
    if (esRespuestaSolicitud(data)) {
      showToast(mensajeSolicitud, 'success');
      return true;
    }
    if (mensajeInmediato) {
      showToast(mensajeInmediato, 'success');
    }
    return false;
  }

  function llenarTipos() {
    zonaTipoSel.innerHTML = '<option value="">Seleccione tipo</option>';
    // al menos las primeras 20
    tiposZona.slice(0, 20).forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.toLowerCase();
      opt.textContent = t;
      zonaTipoSel.appendChild(opt);
    });
  }

  function normalizarArea(area = {}) {
    const volumen = parseFloat(area.volumen ?? 0) || 0;
    const capacidad = parseFloat(area.capacidad_utilizada ?? 0) || 0;
    const disponible = area.capacidad_disponible !== undefined
      ? parseFloat(area.capacidad_disponible) || 0
      : Math.max(volumen - capacidad, 0);

    return {
      ...area,
      id: area.id !== undefined ? parseInt(area.id, 10) : null,
      ancho: area.ancho !== undefined ? parseFloat(area.ancho) : 0,
      alto: area.alto !== undefined ? parseFloat(area.alto) : 0,
      largo: area.largo !== undefined ? parseFloat(area.largo) : 0,
      volumen,
      capacidad_utilizada: capacidad,
      capacidad_disponible: disponible,
      porcentaje_ocupacion: parseFloat(area.porcentaje_ocupacion ?? 0) || 0,
      productos_registrados: parseInt(area.productos_registrados ?? 0, 10) || 0,
      total_unidades: parseInt(area.total_unidades ?? 0, 10) || 0,
    };
  }

  function normalizarZona(zona = {}) {
    const volumen = parseFloat(zona.volumen ?? 0) || 0;
    const capacidad = parseFloat(zona.capacidad_utilizada ?? 0) || 0;
    const disponible = zona.capacidad_disponible !== undefined
      ? parseFloat(zona.capacidad_disponible) || 0
      : Math.max(volumen - capacidad, 0);

    let areaId = null;
    if (zona.area_id !== null && zona.area_id !== undefined) {
      const parsed = parseInt(zona.area_id, 10);
      areaId = Number.isNaN(parsed) ? null : parsed;
    }

    return {
      ...zona,
      id: zona.id !== undefined ? parseInt(zona.id, 10) : null,
      area_id: areaId,
      volumen,
      capacidad_utilizada: capacidad,
      capacidad_disponible: disponible,
      porcentaje_ocupacion: parseFloat(zona.porcentaje_ocupacion ?? 0) || 0,
      productos_registrados: parseInt(zona.productos_registrados ?? 0, 10) || 0,
      total_unidades: parseInt(zona.total_unidades ?? 0, 10) || 0,
    };
  }

  function normalizarIncidencia(incidencia = {}) {
    const zonaId = incidencia.zona_id !== undefined && incidencia.zona_id !== null
      ? Number(incidencia.zona_id)
      : null;
    const areaIdBase = incidencia.area_id !== undefined && incidencia.area_id !== null
      ? Number(incidencia.area_id)
      : (zonaId ? zonasData.find(z => Number(z.id) === zonaId)?.area_id ?? null : null);

    return {
      id: Number(incidencia.id) || 0,
      descripcion: incidencia.descripcion || '',
      estado: incidencia.estado || 'Pendiente',
      creado_en: incidencia.creado_en || incidencia.creadoEn || incidencia.created_at || '',
      revisado_en: incidencia.revisado_en || incidencia.revisadoEn || null,
      area_id: areaIdBase,
      area_nombre: incidencia.area_nombre || incidencia.area || obtenerNombreAreaPorId(areaIdBase),
      zona_id: zonaId,
      zona_nombre: zonaId ? (incidencia.zona_nombre || incidencia.zona || obtenerNombreZonaPorId(zonaId)) : null,
      reportado_por: incidencia.reportado_por || incidencia.reportadoPor || 'Usuario sin nombre'
    };
  }

  function renderBarraOcupacion(valor) {
    const porcentaje = Math.min(Math.max(Number(valor) || 0, 0), 100);
    const estado = porcentaje >= 90 ? ' capacity-bar--critical' : porcentaje >= 70 ? ' capacity-bar--warning' : '';
    return `
      <div class="capacity-bar${estado}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${porcentaje.toFixed(1)}">
        <div class="capacity-bar__fill" style="width:${porcentaje}%"></div>
        <span class="capacity-bar__label">${porcentaje.toFixed(1)}%</span>
      </div>
    `;
  }

  function filtrarZonas() {
    const nombreFiltro = (filtroNombre?.value || '').trim().toLowerCase();
    const areaSeleccionada = filtroArea?.value || 'todos';
    const ocupacionMin = filtroOcupacion ? parseInt(filtroOcupacion.value, 10) || 0 : 0;
    const productosMin = filtroProductos ? parseInt(filtroProductos.value, 10) || 0 : 0;

    const filtradas = zonasData.filter(zona => {
      if (nombreFiltro && !zona.nombre?.toLowerCase().includes(nombreFiltro)) {
        return false;
      }

      const areaId = zona.area_id ?? null;
      if (areaSeleccionada === 'sin-area' && areaId) {
        return false;
      }
      if (areaSeleccionada !== 'todos' && areaSeleccionada !== 'sin-area') {
        if ((areaId || 0) !== parseInt(areaSeleccionada, 10)) {
          return false;
        }
      }

      const porcentaje = Number(zona.porcentaje_ocupacion || 0);
      if (porcentaje < ocupacionMin) {
        return false;
      }

      const productos = Number(zona.productos_registrados || 0);
      if (productos < productosMin) {
        return false;
      }

      return true;
    });

    return {
      todas: filtradas,
      asignadas: filtradas.filter(z => z.area_id),
      sinArea: filtradas.filter(z => !z.area_id),
    };
  }

  function actualizarOpcionesArea() {
    const selectedZona = zonaAreaSel?.value || '';
    const selectedFiltro = filtroArea?.value || 'todos';
    const selectedIncidentArea = incidentAreaSelect?.value || '';
    const selectedIncidentZona = incidentZoneSelect?.value || '';

    if (zonaAreaSel) {
      zonaAreaSel.innerHTML = '<option value="">Seleccione un área</option>';
    }
    if (filtroArea) {
      filtroArea.innerHTML = '<option value="todos">Todas las zonas</option><option value="sin-area">Zonas sin área</option>';
    }
    if (incidentAreaSelect) {
      incidentAreaSelect.innerHTML = '<option value="">Selecciona un área</option>';
    }

    areasData.forEach(area => {
      if (zonaAreaSel) {
        const opt = document.createElement('option');
        opt.value = area.id;
        opt.textContent = area.nombre;
        zonaAreaSel.appendChild(opt);
      }
      if (filtroArea) {
        const optFiltro = document.createElement('option');
        optFiltro.value = area.id;
        optFiltro.textContent = area.nombre;
        filtroArea.appendChild(optFiltro);
      }
      if (incidentAreaSelect) {
        const optInc = document.createElement('option');
        optInc.value = area.id;
        optInc.textContent = area.nombre;
        incidentAreaSelect.appendChild(optInc);
      }
    });

    if (zonaAreaSel) {
      zonaAreaSel.value = selectedZona;
    }
    if (filtroArea) {
      filtroArea.value = selectedFiltro;
    }
    if (incidentAreaSelect && incidentAreaSelect.querySelector(`option[value="${selectedIncidentArea}"]`)) {
      incidentAreaSelect.value = selectedIncidentArea;
    }
    if (incidentZoneSelect) {
      incidentZoneSelect.innerHTML = '<option value="">Selecciona una zona</option>';
      zonasData.forEach(zona => {
        if (!zona.id) {
          return;
        }
        const optZona = document.createElement('option');
        optZona.value = zona.id;
        const areaTag = zona.area_id ? ` · ${obtenerNombreAreaPorId(zona.area_id)}` : '';
        optZona.textContent = `${zona.nombre || 'Sin nombre'}${areaTag}`;
        incidentZoneSelect.appendChild(optZona);
      });
      if (selectedIncidentZona && incidentZoneSelect.querySelector(`option[value="${selectedIncidentZona}"]`)) {
        incidentZoneSelect.value = selectedIncidentZona;
      }
    }
  }

  function actualizarResumen() {
    if (totalAreasEl) {
      totalAreasEl.textContent = puedeVerAreas
        ? areasData.length
        : 'Permiso requerido';
    }
    if (totalZonasEl) {
      totalZonasEl.textContent = puedeVerZonas
        ? zonasData.length
        : 'Permiso requerido';
    }
    if (zonasSinAreaEl) {
      zonasSinAreaEl.textContent = puedeVerZonas
        ? zonasData.filter(z => !z.area_id).length
        : 'Permiso requerido';
    }
    if (totalIncidenciasEl) {
      if (puedeRegistrarIncidencias || puedeRecibirIncidencias) {
        const pendientes = incidenciasData.filter(inc => (inc.estado || 'Pendiente').toLowerCase() === 'pendiente');
        totalIncidenciasEl.textContent = pendientes.length;
      } else {
        totalIncidenciasEl.textContent = 'Permiso requerido';
      }
    }
  }

  function actualizarAlertas() {
    if (!alertasBanner) {
      return;
    }

    if (!puedeRecibirAlertas) {
      alertasBanner.classList.remove('active');
      alertasBanner.innerHTML = '<span>Activa los permisos de alertas del almacén para recibir notificaciones de capacidad.</span>';
      return;
    }

    const UMBRAL_ALERTA = 70;
    const areasIndex = new Map(areasData.map(area => [area.id, area]));

    const alertasAreas = areasData
      .filter(area => Number(area.porcentaje_ocupacion || 0) >= UMBRAL_ALERTA)
      .map(area => ({
        tipo: 'Área',
        nombre: area.nombre || 'Sin nombre',
        porcentaje: Number(area.porcentaje_ocupacion || 0),
        disponible: area.capacidad_disponible,
      }));

    const alertasZonas = zonasData
      .filter(zona => Number(zona.porcentaje_ocupacion || 0) >= UMBRAL_ALERTA)
      .map(zona => ({
        tipo: 'Zona',
        nombre: zona.nombre || 'Sin nombre',
        porcentaje: Number(zona.porcentaje_ocupacion || 0),
        disponible: zona.capacidad_disponible,
        area: zona.area_id ? areasIndex.get(zona.area_id)?.nombre : null,
      }));

    const alertas = [...alertasAreas, ...alertasZonas]
      .sort((a, b) => b.porcentaje - a.porcentaje);

    if (!alertas.length) {
      alertasBanner.classList.remove('active');
      alertasBanner.innerHTML = '';
      return;
    }

    const items = alertas.map(alerta => {
      const detalles = [];
      if (alerta.tipo === 'Zona' && alerta.area) {
        detalles.push(`Área: ${alerta.area}`);
      }
      if (Number.isFinite(alerta.disponible)) {
        detalles.push(`${alerta.disponible.toFixed(2)} m³ libres`);
      }
      detalles.push(`${alerta.porcentaje.toFixed(1)}% ocupado`);

      return `<li><strong>${alerta.tipo}: ${alerta.nombre}</strong><span>${detalles.join(' · ')}</span></li>`;
    }).join('');

    alertasBanner.classList.add('active');
    alertasBanner.innerHTML = `<span>Capacidad reducida detectada:</span><ul>${items}</ul>`;
  }

  async function exportarZonasExcel() {
    if (!puedeVerZonas) {
      mostrarDenegado('No tienes permiso para exportar la información de las zonas.');
      return;
    }
    const exporter = window.ReportExporter;
    if (!exporter || typeof exporter.exportTableToExcel !== 'function') {
      showToast('No se pudo cargar el módulo de exportación');
      return;
    }

    const dataset = construirDatasetZonas();
    if (!dataset) {
      showToast('No hay datos filtrados para exportar');
      return;
    }

    try {
      const result = exporter.exportTableToExcel({
        data: dataset,
        fileName: 'ocupacion_zonas.xlsx',
        sheetName: 'Zonas'
      });

      if (result?.blob) {
        await guardarReporteZonas(result.blob, result.fileName, 'Exportación de zonas filtradas a Excel');
      }

      showToast('Archivo Excel generado correctamente');
    } catch (error) {
      console.error('Error al generar el Excel de zonas:', error);
      if (error && error.message === 'EXCEL_LIBRARY_MISSING') {
        showToast('La librería para generar Excel no está disponible.');
        return;
      }
      showToast('No se pudo generar el archivo en Excel');
    }
  }

  async function exportarZonasPDF() {
    if (!puedeVerZonas) {
      mostrarDenegado('No tienes permiso para exportar la información de las zonas.');
      return;
    }
    const exporter = window.ReportExporter;
    if (!exporter || typeof exporter.exportTableToPdf !== 'function') {
      showToast('No se pudo cargar el módulo de exportación');
      return;
    }

    const dataset = construirDatasetZonas();
    if (!dataset) {
      showToast('No hay datos filtrados para exportar');
      return;
    }

    const subtitle = construirSubtituloZonas(dataset.rowCount);

    try {
      const pdfOptions = {
        data: dataset,
        title: 'Reporte de ocupación de zonas',
        subtitle,
        fileName: 'ocupacion_zonas.pdf',
        orientation: 'portrait',
        module: 'Gestión de áreas y zonas',
        includeRowCount: false,
        countLabel: (total) => {
          const etiqueta = exporter?.pluralize
            ? exporter.pluralize(total, 'zona')
            : (total === 1 ? '1 zona' : `${total} zonas`);
          return `${etiqueta} filtrada${total === 1 ? '' : 's'}`;
        }
      };

      const result = await exporter.exportTableToPdf(pdfOptions);

      if (result?.blob) {
        await guardarReporteZonas(result.blob, result.fileName, 'Exportación de zonas filtradas a PDF');
      }

      showToast('Reporte PDF generado correctamente');
    } catch (error) {
      console.error('Error al generar el PDF de zonas:', error);
      if (error && error.message === 'PDF_LIBRARY_MISSING') {
        showToast('La librería para generar PDF no está disponible.');
        return;
      }
      showToast('No se pudo generar el reporte en PDF');
    }
  }

  async function generarReporteIncidencias() {
    if (!(puedeRegistrarIncidencias || puedeRecibirIncidencias)) {
      mostrarDenegado('No tienes permiso para exportar las incidencias registradas.');
      return;
    }
    const exporter = window.ReportExporter;
    if (!exporter || typeof exporter.exportTableToPdf !== 'function') {
      showToast('No se pudo cargar el módulo de exportación');
      return;
    }

    const button = incidentReportBtn || null;
    if (button && button.disabled) {
      return;
    }

    const textoOriginal = button ? button.textContent.trim() : '';
    if (button) {
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      button.textContent = 'Generando…';
    }

    const contarIncidencias = (lista) => {
      const total = Array.isArray(lista) ? lista.length : 0;
      if (exporter?.pluralize) {
        return exporter.pluralize(total, 'incidencia');
      }
      return total === 1 ? '1 incidencia' : `${total} incidencias`;
    };

    try {
      const [pendientesRaw, revisadasRaw] = await Promise.all([
        fetchIncidencias('Pendiente'),
        fetchIncidencias('Revisado')
      ]);

      const pendientes = Array.isArray(pendientesRaw)
        ? pendientesRaw.map(normalizarIncidencia)
        : [];
      const revisadas = Array.isArray(revisadasRaw)
        ? revisadasRaw.map(normalizarIncidencia)
        : [];

      const dataset = construirDatasetIncidenciasReporte(pendientes, revisadas);
      if (!dataset) {
        showToast('No hay incidencias para exportar.');
        return;
      }

      const metadata = [
        { label: 'Pendientes', value: contarIncidencias(pendientes) },
        { label: 'Revisadas', value: contarIncidencias(revisadas) },
        { label: 'Total', value: contarIncidencias([...pendientes, ...revisadas]) }
      ];

      const result = await exporter.exportTableToPdf({
        data: dataset,
        title: 'Reporte de incidencias',
        module: 'Gestión de áreas y zonas',
        fileName: 'reporte_incidencias_areas_zonas.pdf',
        metadata,
        countLabel: (total) => {
          if (exporter?.pluralize) {
            return exporter.pluralize(total, 'incidencia');
          }
          return total === 1 ? '1 incidencia' : `${total} incidencias`;
        }
      });

      if (result?.blob) {
        await guardarReporteIncidencias(
          result.blob,
          result.fileName,
          'Reporte de incidencias (pendientes y revisadas)'
        );
      }

      showToast('Reporte de incidencias generado correctamente');
    } catch (error) {
      console.error('Error al generar el reporte de incidencias:', error);
      if (error && error.message === 'PDF_LIBRARY_MISSING') {
        showToast('La librería para generar PDF no está disponible.');
        return;
      }
      showToast('No se pudo generar el reporte de incidencias');
    } finally {
      if (button) {
        button.disabled = false;
        button.removeAttribute('aria-busy');
        const etiqueta = textoOriginal || 'Reporte PDF';
        button.textContent = etiqueta;
      }
    }
  }

  // —————— Helpers ——————
  function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'toast-message';
    t.innerText = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  function calcularVolumenArea() {
    const v = (parseFloat(areaLargo.value)||0) *
              (parseFloat(areaAncho.value)||0) *
              (parseFloat(areaAlto.value)||0);
    volumenArea.textContent = v.toFixed(2);
  }
  function calcularVolumenZona() {
    const v = (parseFloat(zonaLargo.value)||0) *
              (parseFloat(zonaAncho.value)||0) *
              (parseFloat(zonaAlto.value)||0);
    volumenZona.textContent = v.toFixed(2);
  }

  function activarFormulario(tipo) {
    if (tipo === 'area') {
      formArea.classList.remove('d-none');
      formZona.classList.add('d-none');
      areaBtn.setAttribute('aria-pressed', 'true');
      zonaBtn.setAttribute('aria-pressed', 'false');
    } else {
      formZona.classList.remove('d-none');
      formArea.classList.add('d-none');
      zonaBtn.setAttribute('aria-pressed', 'true');
      areaBtn.setAttribute('aria-pressed', 'false');
    }
  }

  // —————— CRUD Áreas ——————
  async function fetchAreas() {
    const res = await fetch(`${API_BASE}/guardar_areas.php?empresa_id=${EMP_ID}`);
    return await res.json();
  }

  function renderAreas() {
    if (!tablaAreasBody) {
      return;
    }

    if (!puedeVerAreas) {
      tablaAreasBody.innerHTML = '<tr class="empty-row"><td colspan="9">No tienes permiso para ver las áreas registradas.</td></tr>';
      if (tablaAreasElement && window.SimpleTableSorter) {
        window.SimpleTableSorter.applyCurrentSort(tablaAreasElement);
      }
      return;
    }

    const tabla = tablaAreasElement;
    tablaAreasBody.innerHTML = '';

    if (!areasData.length) {
      const emptyRow = document.createElement('tr');
      emptyRow.className = 'empty-row';
      emptyRow.innerHTML = '<td colspan="9">No hay áreas registradas.</td>';
      tablaAreasBody.appendChild(emptyRow);
      if (window.SimpleTableSorter && tabla) {
        window.SimpleTableSorter.applyCurrentSort(tabla);
      }
      return;
    }

    const zonasPorArea = zonasData.reduce((acc, zona) => {
      const areaId = zona.area_id || 0;
      acc[areaId] = (acc[areaId] || 0) + 1;
      return acc;
    }, {});

    areasData.forEach(area => {
      const capacidad = Number(area.capacidad_utilizada || 0);
      const volumen = Number(area.volumen || 0);
      const disponible = area.capacidad_disponible !== undefined
        ? Number(area.capacidad_disponible)
        : Math.max(volumen - capacidad, 0);
      const porcentaje = Number(area.porcentaje_ocupacion || 0);
      const productos = Number(area.productos_registrados || 0);
      const totalUnidades = Number(area.total_unidades || 0);
      const volumenSort = Number.isFinite(volumen) ? volumen : 0;
      const capacidadSort = Number.isFinite(capacidad) ? capacidad : 0;
      const disponibleSort = Number.isFinite(disponible) ? disponible : 0;
      const porcentajeSort = Number.isFinite(porcentaje) ? porcentaje : 0;
      const productosSort = productos + (totalUnidades || 0) / 1000;
      const productosDisplay = totalUnidades
        ? `${productos} tipo${productos === 1 ? '' : 's'} / ${totalUnidades} uds`
        : `${productos} tipo${productos === 1 ? '' : 's'}`;

      const tr = document.createElement('tr');
      if (porcentaje >= 90) {
        tr.classList.add('row-alert');
      }
      tr.innerHTML = `
        <td data-label="Área">
          <div class="table-title">${area.nombre}</div>
          <span class="table-subtext">${zonasPorArea[area.id] || 0} zonas vinculadas</span>
        </td>
        <td data-label="Descripción">${area.descripcion || ''}</td>
        <td data-label="Dimensiones">${(area.ancho ?? 0)}×${(area.largo ?? 0)}×${(area.alto ?? 0)}</td>
        <td data-label="Volumen" data-sort-value="${volumenSort}">${volumen.toFixed(2)}</td>
        <td data-label="Capacidad utilizada" data-sort-value="${capacidadSort}">${capacidad.toFixed(2)}</td>
        <td data-label="Disponible" data-sort-value="${disponibleSort}">${disponible.toFixed(2)}</td>
        <td data-label="Ocupación" data-sort-value="${porcentajeSort}">${renderBarraOcupacion(porcentaje)}</td>
        <td data-label="Productos" data-sort-value="${productosSort}">${productosDisplay}</td>
        <td data-label="Acciones">
          <div class="table-actions">
            <button class="table-action table-action--edit" data-action="edit-area" data-id="${area.id}">Editar</button>
            <button class="table-action table-action--delete" data-action="delete-area" data-id="${area.id}">Eliminar</button>
          </div>
        </td>
      `;
      tablaAreasBody.appendChild(tr);
    });

    if (window.SimpleTableSorter && tabla) {
      window.SimpleTableSorter.applyCurrentSort(tabla);
    }
  }



formArea.addEventListener('submit', async e => {
  e.preventDefault();
  const editando = Boolean(editAreaId);
  if (editando && !puedeActualizarAreas) {
    mostrarDenegado('No tienes permiso para modificar la información de las áreas.');
    return;
  }
  if (!editando && !puedeCrearAreas) {
    mostrarDenegado('No tienes permiso para registrar nuevas áreas.');
    return;
  }
  const payload = {
    nombre:      areaNombre.value.trim(),
    descripcion: areaDesc.value.trim(),
    ancho:       parseFloat(areaAncho.value) || 0,
    largo:       parseFloat(areaLargo.value) || 0,
    alto:        parseFloat(areaAlto.value) || 0,
    empresa_id:  EMP_ID
  };

  // Elegir método y URL según si estamos editando o creando
  const method = editAreaId ? 'PUT' : 'POST';
  const url    = editAreaId
    ? `${API_BASE}/guardar_areas.php?id=${editAreaId}&empresa_id=${EMP_ID}`
    : `${API_BASE}/guardar_areas.php`;

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const j = await res.json();
    if (!res.ok) {
      throw new Error(j.error || 'Error en el servidor');
    }
    if (j.success === false && !esRespuestaSolicitud(j)) {
      throw new Error(j.error || j.message || 'No se pudo procesar la solicitud');
    }

    manejarRespuestaSolicitud(
      j,
      editAreaId
        ? 'Solicitud de actualización de área enviada para revisión.'
        : 'Solicitud de creación de área enviada para revisión.',
      editAreaId ? 'Área actualizada' : 'Área registrada'
    );

    formArea.reset();
    calcularVolumenArea();
    editAreaId = null;
    activarFormulario('area');
    await recargarDatos();
  } catch (err) {
    showToast(err.message);
  }
});

  // —————— CRUD Zonas ——————
  async function fetchZonas() {
    const res = await fetch(`${API_BASE}/guardar_zonas.php?empresa_id=${EMP_ID}`);
    return await res.json();
  }

  async function fetchIncidencias(estado = 'Pendiente') {
    if (!EMP_ID) {
      return [];
    }
    const estadoParam = estado ? `&estado=${encodeURIComponent(estado)}` : '';
    const url = `${INCIDENTS_ENDPOINT}?empresa_id=${EMP_ID}${estadoParam}`;
    const res = await fetch(url);
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(payload.message || payload.error || 'No se pudo obtener las incidencias.');
    }
    const data = payload;
    if (Array.isArray(data)) {
      return data;
    }
    if (Array.isArray(data?.data)) {
      return data.data;
    }
    return [];
  }

  async function recargarIncidencias() {
    if (!(puedeRegistrarIncidencias || puedeRecibirIncidencias)) {
      incidenciasData = [];
      renderIncidencias();
      actualizarResumen();
      return;
    }
    try {
      const incidencias = await fetchIncidencias();
      incidenciasData = Array.isArray(incidencias) ? incidencias.map(normalizarIncidencia) : [];
      actualizarResumen();
      renderIncidencias();
    } catch (error) {
      console.error('Error al recargar incidencias', error);
      showToast('No se pudieron actualizar las incidencias');
    }
  }

  function obtenerScopeIncidencia() {
    const activo = incidentScopeRadios && incidentScopeRadios.length
      ? Array.from(incidentScopeRadios).find(radio => radio.checked)
      : null;
    return activo ? activo.value : 'area';
  }

  function actualizarVisibilidadIncidencia() {
    if (!puedeRegistrarIncidencias) {
      if (incidentAreaGroup) {
        incidentAreaGroup.classList.remove('incident-group--hidden');
      }
      if (incidentZoneGroup) {
        incidentZoneGroup.classList.add('incident-group--hidden');
      }
      if (incidentAreaSelect) {
        incidentAreaSelect.required = false;
        incidentAreaSelect.disabled = true;
      }
      if (incidentZoneSelect) {
        incidentZoneSelect.required = false;
        incidentZoneSelect.disabled = true;
      }
      return;
    }
    const scope = obtenerScopeIncidencia();
    const esZona = scope === 'zona';
    if (incidentAreaGroup) {
      incidentAreaGroup.classList.toggle('incident-group--hidden', esZona);
    }
    if (incidentZoneGroup) {
      incidentZoneGroup.classList.toggle('incident-group--hidden', !esZona);
    }
    if (incidentAreaSelect) {
      incidentAreaSelect.required = !esZona;
      if (esZona) {
        incidentAreaSelect.value = '';
      }
    }
    if (incidentZoneSelect) {
      incidentZoneSelect.required = esZona;
      incidentZoneSelect.disabled = !esZona;
      if (!esZona) {
        incidentZoneSelect.value = '';
      }
    }
  }

  function renderIncidencias() {
    if (!incidentList) {
      return;
    }

    if (!(puedeRegistrarIncidencias || puedeRecibirIncidencias)) {
      incidentList.innerHTML = '<p class="incident-empty">No tienes permiso para visualizar las incidencias registradas.</p>';
      return;
    }

    if (!incidenciasData.length) {
      incidentList.innerHTML = '<p class="incident-empty">No hay incidencias pendientes.</p>';
      return;
    }

    const items = incidenciasData.map((inc) => {
      const esZona = Boolean(inc.zona_id);
      const objetivoTitulo = esZona
        ? `Zona: ${escapeHtml(inc.zona_nombre || 'Sin nombre')}`
        : `Área: ${escapeHtml(inc.area_nombre || 'Sin nombre')}`;
      const objetivoDetalle = esZona
        ? `<span>${escapeHtml(inc.area_nombre || 'Sin área asociada')}</span>`
        : '';
      const descripcion = escapeHtml(inc.descripcion || 'Sin descripción');
      const reportadoPor = escapeHtml(inc.reportado_por || 'Usuario sin nombre');
      const fecha = formatearFechaIncidencia(inc.creado_en);

      return `
        <article class="incident-item">
          <div class="incident-item__target">
            <strong>${objetivoTitulo}</strong>
            ${objetivoDetalle}
          </div>
          <p>${descripcion}</p>
          <div class="incident-item__meta">
            <span>Reportado por ${reportadoPor}</span>
            ${fecha ? `<span>${fecha}</span>` : ''}
          </div>
          <div class="incident-item__actions">
            <button type="button" data-incident-resolver="${inc.id}">Marcar revisada</button>
          </div>
        </article>
      `;
    }).join('');

    incidentList.innerHTML = items;
  }

  async function recargarDatos() {
    try {
      const [areas, zonas, incidencias] = await Promise.all([
        fetchAreas(),
        fetchZonas(),
        fetchIncidencias()
      ]);
      areasData = Array.isArray(areas) ? areas.map(normalizarArea) : [];
      zonasData = Array.isArray(zonas) ? zonas.map(normalizarZona) : [];
      incidenciasData = Array.isArray(incidencias) ? incidencias.map(normalizarIncidencia) : [];
      actualizarResumen();
      actualizarOpcionesArea();
      renderAreas();
      renderZonas();
      renderIncidencias();
      actualizarVisibilidadIncidencia();
    } catch (error) {
      console.error('Error al recargar datos', error);
      showToast('No se pudo actualizar la información de áreas y zonas');
    }
  }


  function renderZonas() {
    if (!tablaZonasBody || !tablaZonasSinAreaBody) {
      return;
    }

    if (!puedeVerZonas) {
      tablaZonasBody.innerHTML = '<tr class="empty-row"><td colspan="8">No tienes permiso para ver las zonas registradas.</td></tr>';
      tablaZonasSinAreaBody.innerHTML = '<tr class="empty-row"><td colspan="7">No tienes permiso para ver las zonas sin asignar.</td></tr>';
      if (tablaZonasElement && window.SimpleTableSorter) {
        window.SimpleTableSorter.applyCurrentSort(tablaZonasElement);
      }
      if (tablaZonasSinAreaElement && window.SimpleTableSorter) {
        window.SimpleTableSorter.applyCurrentSort(tablaZonasSinAreaElement);
      }
      return;
    }

    const resultado = filtrarZonas();
    const areasMap = Object.fromEntries(areasData.map(a => [a.id, a.nombre]));

    const tablaAsignadas = tablaZonasElement;
    const tablaSinArea = tablaZonasSinAreaElement;

    tablaZonasBody.innerHTML = '';
    if (!resultado.asignadas.length) {
      const emptyRow = document.createElement('tr');
      emptyRow.className = 'empty-row';
      emptyRow.innerHTML = '<td colspan="8">No hay zonas asignadas que coincidan con los filtros.</td>';
      tablaZonasBody.appendChild(emptyRow);
      if (window.SimpleTableSorter && tablaAsignadas) {
        window.SimpleTableSorter.applyCurrentSort(tablaAsignadas);
      }
    } else {
      resultado.asignadas.forEach(zona => {
        const porcentaje = Number(zona.porcentaje_ocupacion || 0);
        const capacidad = Number(zona.capacidad_utilizada || 0);
        const disponible = zona.capacidad_disponible !== undefined
          ? Number(zona.capacidad_disponible)
          : Math.max(Number(zona.volumen || 0) - capacidad, 0);
        const productos = Number(zona.productos_registrados || 0);
        const totalUnidades = Number(zona.total_unidades || 0);
        const capacidadSort = Number.isFinite(capacidad) ? capacidad : 0;
        const disponibleSort = Number.isFinite(disponible) ? disponible : 0;
        const porcentajeSort = Number.isFinite(porcentaje) ? porcentaje : 0;
        const productosSort = productos + (totalUnidades || 0) / 1000;
        const productosDisplay = totalUnidades
          ? `${productos} tipo${productos === 1 ? '' : 's'} / ${totalUnidades} uds`
          : `${productos} tipo${productos === 1 ? '' : 's'}`;

        const tr = document.createElement('tr');
        if (porcentaje >= 90) {
          tr.classList.add('row-alert');
        }
        tr.innerHTML = `
          <td data-label="Zona">
            <div class="table-title">${zona.nombre}</div>
            <span class="table-subtext">${zona.tipo_almacenamiento || 'Sin tipo'}</span>
          </td>
          <td data-label="Área">${areasMap[zona.area_id] || 'Sin área'}</td>
          <td data-label="Dimensiones">${(zona.ancho ?? 0)}×${(zona.largo ?? 0)}×${(zona.alto ?? 0)}</td>
          <td data-label="Capacidad utilizada" data-sort-value="${capacidadSort}">${capacidad.toFixed(2)}</td>
          <td data-label="Disponible" data-sort-value="${disponibleSort}">${disponible.toFixed(2)}</td>
          <td data-label="Ocupación" data-sort-value="${porcentajeSort}">${renderBarraOcupacion(porcentaje)}</td>
          <td data-label="Productos" data-sort-value="${productosSort}">${productosDisplay}</td>
          <td data-label="Acciones">
            <div class="table-actions">
              <button class="table-action table-action--edit" data-action="edit-zone" data-id="${zona.id}">Editar</button>
              <button class="table-action table-action--delete" data-action="delete-zone" data-id="${zona.id}">Eliminar</button>
            </div>
          </td>
        `;
        tablaZonasBody.appendChild(tr);
      });

      if (window.SimpleTableSorter && tablaAsignadas) {
        window.SimpleTableSorter.applyCurrentSort(tablaAsignadas);
      }
    }

    tablaZonasSinAreaBody.innerHTML = '';
    if (!resultado.sinArea.length) {
      const emptyRow = document.createElement('tr');
      emptyRow.className = 'empty-row';
      emptyRow.innerHTML = '<td colspan="7">No hay zonas sin área que coincidan con los filtros.</td>';
      tablaZonasSinAreaBody.appendChild(emptyRow);
      if (window.SimpleTableSorter && tablaSinArea) {
        window.SimpleTableSorter.applyCurrentSort(tablaSinArea);
      }
    } else {
      resultado.sinArea.forEach(zona => {
        const porcentaje = Number(zona.porcentaje_ocupacion || 0);
        const capacidad = Number(zona.capacidad_utilizada || 0);
        const disponible = zona.capacidad_disponible !== undefined
          ? Number(zona.capacidad_disponible)
          : Math.max(Number(zona.volumen || 0) - capacidad, 0);
        const productos = Number(zona.productos_registrados || 0);
        const totalUnidades = Number(zona.total_unidades || 0);
        const capacidadSort = Number.isFinite(capacidad) ? capacidad : 0;
        const disponibleSort = Number.isFinite(disponible) ? disponible : 0;
        const porcentajeSort = Number.isFinite(porcentaje) ? porcentaje : 0;
        const productosSort = productos + (totalUnidades || 0) / 1000;
        const productosDisplay = totalUnidades
          ? `${productos} tipo${productos === 1 ? '' : 's'} / ${totalUnidades} uds`
          : `${productos} tipo${productos === 1 ? '' : 's'}`;

        const tr = document.createElement('tr');
        if (porcentaje >= 90) {
          tr.classList.add('row-alert');
        }
        tr.innerHTML = `
          <td data-label="Zona">
            <div class="table-title">${zona.nombre}</div>
            <span class="table-subtext">${zona.tipo_almacenamiento || 'Sin tipo'}</span>
          </td>
          <td data-label="Dimensiones">${(zona.ancho ?? 0)}×${(zona.largo ?? 0)}×${(zona.alto ?? 0)}</td>
          <td data-label="Capacidad utilizada" data-sort-value="${capacidadSort}">${capacidad.toFixed(2)}</td>
          <td data-label="Disponible" data-sort-value="${disponibleSort}">${disponible.toFixed(2)}</td>
          <td data-label="Ocupación" data-sort-value="${porcentajeSort}">${renderBarraOcupacion(porcentaje)}</td>
          <td data-label="Productos" data-sort-value="${productosSort}">${productosDisplay}</td>
          <td data-label="Acciones">
            <div class="table-actions">
              <button class="table-action table-action--edit" data-action="edit-zone" data-id="${zona.id}">Editar</button>
              <button class="table-action table-action--delete" data-action="delete-zone" data-id="${zona.id}">Eliminar</button>
            </div>
          </td>
        `;
        tablaZonasSinAreaBody.appendChild(tr);
      });

      if (window.SimpleTableSorter && tablaSinArea) {
        window.SimpleTableSorter.applyCurrentSort(tablaSinArea);
      }
    }

    actualizarAlertas();
  }

async function editArea(id) {
  if (!puedeActualizarAreas) {
    mostrarDenegado('No tienes permiso para editar áreas.');
    return;
  }
  // 1) Traer la área
  const res = await fetch(`${API_BASE}/guardar_areas.php?id=${id}&empresa_id=${EMP_ID}`);
  const a   = await res.json();
  // 2) Mostrar form y rellenar
  activarFormulario('area');
  areaNombre.value = a.nombre;
  areaDesc.value   = a.descripcion;
  areaLargo.value  = a.largo;
  areaAncho.value  = a.ancho;
  areaAlto.value   = a.alto;
  calcularVolumenArea();
  editAreaId = id;
}

async function editZone(id) {
  if (!puedeActualizarZonas) {
    mostrarDenegado('No tienes permiso para editar zonas.');
    return;
  }
  const res = await fetch(`${API_BASE}/guardar_zonas.php?id=${id}&empresa_id=${EMP_ID}`);
  const z   = await res.json();
  activarFormulario('zona');
  zonaNombre.value = z.nombre;
  zonaDesc.value   = z.descripcion;
  zonaLargo.value  = z.largo;
  zonaAncho.value  = z.ancho;
  zonaAlto.value   = z.alto;
  zonaTipoSel.value = z.tipo_almacenamiento;
  zonaAreaSel.value = z.area_id ? String(z.area_id) : '';
  calcularVolumenZona();
  editZoneId = id;
}

formZona.addEventListener('submit', async e => {
  e.preventDefault();
  const editando = Boolean(editZoneId);
  if (editando && !puedeActualizarZonas) {
    mostrarDenegado('No tienes permiso para modificar las zonas registradas.');
    return;
  }
  if (!editando && !puedeCrearZonas) {
    mostrarDenegado('No tienes permiso para registrar nuevas zonas.');
    return;
  }
  const payload = {
    nombre:             zonaNombre.value.trim(),
    descripcion:        zonaDesc.value.trim(),
    ancho:              parseFloat(zonaAncho.value) || 0,
    largo:              parseFloat(zonaLargo.value) || 0,
    alto:               parseFloat(zonaAlto.value) || 0,
    tipo_almacenamiento: zonaTipoSel.value,
    subniveles:         [],  // tu lógica si las tienes
    area_id:            zonaAreaSel.value ? parseInt(zonaAreaSel.value, 10) : null,
    empresa_id:         EMP_ID
  };

  const method = editZoneId ? 'PUT' : 'POST';
  const url    = editZoneId
    ? `${API_BASE}/guardar_zonas.php?id=${editZoneId}&empresa_id=${EMP_ID}`
    : `${API_BASE}/guardar_zonas.php`;

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const j = await res.json();
    if (!res.ok) {
      throw new Error(j.error || 'Error en el servidor');
    }
    if (j.success === false && !esRespuestaSolicitud(j)) {
      throw new Error(j.error || j.message || 'No se pudo procesar la solicitud');
    }

    manejarRespuestaSolicitud(
      j,
      editZoneId
        ? 'Solicitud de actualización de zona enviada para revisión.'
        : 'Solicitud de creación de zona enviada para revisión.',
      editZoneId ? 'Zona actualizada' : 'Zona registrada'
    );

    formZona.reset();
    calcularVolumenZona();
    editZoneId = null;
    activarFormulario('zona');
    await recargarDatos();
  } catch (err) {
    showToast(err.message);
  }
});

if (incidentScopeRadios && incidentScopeRadios.length) {
  incidentScopeRadios.forEach((radio) => {
    radio.addEventListener('change', actualizarVisibilidadIncidencia);
  });
}

if (incidentForm) {
  incidentForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!EMP_ID) {
      showToast('Tu sesión expiró. Vuelve a iniciar sesión para registrar incidencias.');
      return;
    }

    const scope = obtenerScopeIncidencia();
    const descripcion = incidentDescription?.value.trim() || '';
    if (!descripcion) {
      showToast('Describe brevemente la incidencia para poder registrarla.');
      return;
    }

    const payload = {
      descripcion,
      empresa_id: EMP_ID
    };

    if (scope === 'zona') {
      const zonaId = parseInt(incidentZoneSelect?.value || '', 10) || 0;
      if (!zonaId) {
        showToast('Selecciona la zona donde ocurrió la incidencia.');
        return;
      }
      payload.zona_id = zonaId;
    } else {
      const areaId = parseInt(incidentAreaSelect?.value || '', 10) || 0;
      if (!areaId) {
        showToast('Selecciona el área que presenta la incidencia.');
        return;
      }
      payload.area_id = areaId;
    }

    try {
      const res = await fetch(INCIDENTS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.message || data.error || 'No se pudo guardar la incidencia.');
      }
      showToast('Incidencia registrada');
      incidentForm.reset();
      actualizarVisibilidadIncidencia();
      await recargarIncidencias();
    } catch (error) {
      console.error('Error registrando incidencia', error);
      showToast(error.message || 'No se pudo guardar la incidencia.');
    }
  });
}

if (incidentList) {
  incidentList.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-incident-resolver]');
    if (!button) {
      return;
    }
    if (!puedeRegistrarIncidencias) {
      mostrarDenegado('No tienes permiso para actualizar las incidencias.');
      return;
    }
    const id = parseInt(button.getAttribute('data-incident-resolver') || '', 10) || 0;
    if (!id) {
      return;
    }
    if (!confirm('¿Marcar como revisada esta incidencia? Se retirará del listado.')) {
      return;
    }

    button.disabled = true;
    try {
      const res = await fetch(`${INCIDENTS_ENDPOINT}?id=${id}&empresa_id=${EMP_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'Revisado', empresa_id: EMP_ID })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.message || data.error || 'No se pudo actualizar la incidencia.');
      }
      showToast('Incidencia marcada como revisada');
      await recargarIncidencias();
    } catch (error) {
      console.error('Error marcando incidencia como revisada', error);
      showToast(error.message || 'No se pudo actualizar la incidencia.');
    } finally {
      button.disabled = false;
    }
  });
}


async function deleteArea(id) {
  if (!puedeEliminarAreas) {
    mostrarDenegado('No tienes permiso para eliminar áreas.');
    return;
  }
  if (!confirm('¿Seguro que deseas eliminar esta área?')) {
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/guardar_areas.php?id=${id}&empresa_id=${EMP_ID}`, {
      method: 'DELETE'
    });
    const respuesta = await res.json();
    if (!res.ok) {
      throw new Error(respuesta.error || 'No se pudo eliminar el área');
    }
    manejarRespuestaSolicitud(
      respuesta,
      'Solicitud de eliminación de área enviada para revisión.',
      'Área eliminada'
    );
    await recargarDatos();
  } catch (error) {
    showToast(error.message);
  }
}

// —————— Borrar Zona ——————
async function deleteZone(id) {
  if (!puedeEliminarZonas) {
    mostrarDenegado('No tienes permiso para eliminar zonas.');
    return;
  }
  if (!confirm('¿Seguro que deseas eliminar esta zona?')) {
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/guardar_zonas.php?id=${id}&empresa_id=${EMP_ID}`, {
      method: 'DELETE'
    });
    const respuesta = await res.json();
    if (!res.ok) {
      throw new Error(respuesta.error || 'No se pudo eliminar la zona');
    }
    manejarRespuestaSolicitud(
      respuesta,
      'Solicitud de eliminación de zona enviada para revisión.',
      'Zona eliminada'
    );
    await recargarDatos();
  } catch (error) {
    showToast(error.message);
  }
}

  // —————— Botones de alternar vista ——————
  areaBtn.addEventListener('click', () => {
    activarFormulario('area');
    renderAreas();
  });
  zonaBtn.addEventListener('click', () => {
    activarFormulario('zona');
    renderAreas();
    renderZonas();
  });

  if (filtroNombre) {
    filtroNombre.addEventListener('input', renderZonas);
  }
  if (filtroArea) {
    filtroArea.addEventListener('change', renderZonas);
  }
  if (filtroOcupacion) {
    filtroOcupacion.addEventListener('input', () => {
      if (filtroOcupacionValor) {
        filtroOcupacionValor.textContent = `Desde ${filtroOcupacion.value}%`;
      }
      renderZonas();
    });
  }
  if (filtroProductos) {
    filtroProductos.addEventListener('input', renderZonas);
  }
  if (exportExcelBtn) {
    exportExcelBtn.addEventListener('click', () => {
      exportarZonasExcel();
    });
  }
  if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', exportarZonasPDF);
  }
  if (incidentReportBtn) {
    incidentReportBtn.addEventListener('click', generarReporteIncidencias);
  }

// Áreas: editar / borrar
tablaAreasBody.addEventListener('click', e => {
  const button = e.target.closest('.table-action');
  if (!button) return;
  const { id, action } = button.dataset;
  if (!id || !action) return;
  if (action === 'edit-area') {
    if (!puedeActualizarAreas) {
      mostrarDenegado('No tienes permiso para editar áreas.');
      return;
    }
    editArea(id);
  }
  if (action === 'delete-area') {
    if (!puedeEliminarAreas) {
      mostrarDenegado('No tienes permiso para eliminar áreas.');
      return;
    }
    deleteArea(id);
  }
});

// Zonas: editar / borrar
tablaZonasBody.addEventListener('click', e => {
  const button = e.target.closest('.table-action');
  if (!button) return;
  const { id, action } = button.dataset;
  if (!id || !action) return;
  if (action === 'edit-zone') {
    if (!puedeActualizarZonas) {
      mostrarDenegado('No tienes permiso para editar zonas.');
      return;
    }
    editZone(id);
  }
  if (action === 'delete-zone') {
    if (!puedeEliminarZonas) {
      mostrarDenegado('No tienes permiso para eliminar zonas.');
      return;
    }
    deleteZone(id);
  }
});

// Zonas sin asignar: editar / borrar
tablaZonasSinAreaBody.addEventListener('click', e => {
  const button = e.target.closest('.table-action');
  if (!button) return;
  const { id, action } = button.dataset;
  if (!id || !action) return;
  if (action === 'edit-zone') {
    if (!puedeActualizarZonas) {
      mostrarDenegado('No tienes permiso para editar zonas.');
      return;
    }
    editZone(id);
  }
  if (action === 'delete-zone') {
    if (!puedeEliminarZonas) {
      mostrarDenegado('No tienes permiso para eliminar zonas.');
      return;
    }
    deleteZone(id);
  }
});

  // —————— Eventos de volumen en vivo ——————
  formArea.addEventListener('input', calcularVolumenArea);
  formZona.addEventListener('input', calcularVolumenZona);

  // —————— Inicialización ——————
  activarFormulario('area');
  llenarTipos();
  calcularVolumenArea();
  calcularVolumenZona();
  if (filtroOcupacion && filtroOcupacionValor) {
    filtroOcupacionValor.textContent = `Desde ${filtroOcupacion.value}%`;
  }
  actualizarVisibilidadIncidencia();
  recargarDatos();
})();