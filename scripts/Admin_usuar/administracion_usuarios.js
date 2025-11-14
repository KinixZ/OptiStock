(() => {
  let usuariosEmpresa = [];
  const listeners = [];
  let domReadyHandler = null;
  let cacheAreasZonas = null;
  let solicitudAreas = null;
  let usuarioAccesosSeleccionadoId = null;
  let asignacionEnCurso = false;
  const permisosHelper =
    typeof window !== 'undefined' && window.OptiStockPermissions
      ? window.OptiStockPermissions
      : null;
  const permissionUtils =
    typeof window !== 'undefined' && window.PermissionUtils
      ? window.PermissionUtils
      : null;

  const MODULO_PERMISOS = [
    'users.read',
    'users.create',
    'users.update',
    'users.disable_enable',
    'users.delete',
    'roles.assign',
    'roles.permissions.configure'
  ];

  function tienePermisoAccion(clave) {
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

  function marcarElementoPermiso(elemento, permitido, mensaje) {
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
      return;
    }

    elemento.classList.add('permission-disabled');
    elemento.setAttribute('aria-disabled', 'true');
    if (elemento.dataset) {
      elemento.dataset.permissionDenied = 'true';
      if (mensaje) {
        elemento.dataset.permissionMessage = mensaje;
      }
    }
  }

  function obtenerHandlerDenegado(mensaje) {
    if (permissionUtils && typeof permissionUtils.createDeniedHandler === 'function') {
      return permissionUtils.createDeniedHandler(mensaje);
    }

    return function manejarDenegado(evento) {
      if (evento && typeof evento.preventDefault === 'function') {
        evento.preventDefault();
      }
      if (evento && typeof evento.stopPropagation === 'function') {
        evento.stopPropagation();
      }

      const texto = mensaje || 'No tienes permiso para realizar esta acción.';
      if (typeof window !== 'undefined' && typeof window.toastError === 'function') {
        window.toastError(texto);
        return;
      }
      if (typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert(texto);
      }
    };
  }

  function asegurarAccesoModulo() {
    if (permissionUtils && typeof permissionUtils.ensureModuleAccess === 'function') {
      return permissionUtils.ensureModuleAccess({
        permissions: MODULO_PERMISOS,
        container: document.querySelector('.users-page'),
        message:
          'Solicita al administrador de tu empresa que habilite los permisos de usuarios o roles para acceder a esta sección.'
      });
    }

    return true;
  }

  if (!asegurarAccesoModulo()) {
    return;
  }

  const puedeVerUsuarios = tienePermisoAccion('users.read');
  const puedeCrearUsuarios = tienePermisoAccion('users.create');
  const puedeEditarUsuarios = tienePermisoAccion('users.update');
  const puedeCambiarEstadoUsuarios = tienePermisoAccion('users.disable_enable');
  const puedeEliminarUsuarios = tienePermisoAccion('users.delete');
  const puedeGestionarAccesos = tienePermisoAccion('roles.assign');
  const puedeConfigurarRoles = tienePermisoAccion('roles.permissions.configure');
  const puedeExportarReportesPdf = tienePermisoAccion('reports.export.pdf');
  const puedeExportarReportesExcel = tienePermisoAccion('reports.export.xlsx');

  const catalogoPermisosCategorias = [
    {
      nombre: 'Usuarios y Roles',
      permisos: [
        {
          clave: 'users.read',
          nombre: 'Ver lista de usuarios',
          descripcion: 'Ver y buscar usuarios en el sistema.'
        },
        {
          clave: 'users.create',
          nombre: 'Crear usuarios',
          descripcion: 'Registrar nuevos usuarios y asignarles un rol.'
        },
        {
          clave: 'users.update',
          nombre: 'Actualizar usuarios',
          descripcion: 'Editar datos de usuarios (nombre, correo, rol, área, etc.).'
        },
        {
          clave: 'users.disable_enable',
          nombre: 'Cambiar estado de usuarios',
          descripcion: 'Activar o desactivar usuarios temporalmente.'
        },
        {
          clave: 'users.delete',
          nombre: 'Borrar usuarios',
          descripcion: 'Eliminar usuarios definitivamente del sistema.'
        },
        {
          clave: 'roles.assign',
          nombre: 'Asignar roles a usuarios',
          descripcion: 'Asignar roles a los usuarios.'
        },
        {
          clave: 'roles.permissions.configure',
          nombre: 'Editar permisos de roles',
          descripcion: 'Editar y configurar los permisos que tiene cada rol.'
        }
      ]
    },
    {
      nombre: 'Inventario',
      permisos: [
        {
          clave: 'inventory.products.read',
          nombre: 'Ver productos',
          descripcion: 'Ver todos los productos y sus detalles.'
        },
        {
          clave: 'inventory.products.create',
          nombre: 'Agregar productos',
          descripcion: 'Agregar nuevos productos al inventario.'
        },
        {
          clave: 'inventory.products.update',
          nombre: 'Editar productos',
          descripcion: 'Editar datos de productos existentes (stock, precio, nombre).'
        },
        {
          clave: 'inventory.products.delete',
          nombre: 'Eliminar productos',
          descripcion: 'Eliminar productos del inventario.'
        },
        {
          clave: 'inventory.categories.read',
          nombre: 'Ver categorías',
          descripcion: 'Ver las categorías de productos.'
        },
        {
          clave: 'inventory.categories.create',
          nombre: 'Agregar categorías',
          descripcion: 'Crear nuevas categorías.'
        },
        {
          clave: 'inventory.categories.update',
          nombre: 'Editar categorías',
          descripcion: 'Modificar categorías existentes.'
        },
        {
          clave: 'inventory.categories.delete',
          nombre: 'Eliminar categorías',
          descripcion: 'Eliminar categorías (si no tienen productos activos).'
        },
        {
          clave: 'inventory.subcategories.read',
          nombre: 'Ver subcategorías',
          descripcion: 'Ver subcategorías dentro de una categoría.'
        },
        {
          clave: 'inventory.subcategories.create',
          nombre: 'Agregar subcategorías',
          descripcion: 'Crear nuevas subcategorías.'
        },
        {
          clave: 'inventory.subcategories.update',
          nombre: 'Editar subcategorías',
          descripcion: 'Modificar subcategorías existentes.'
        },
        {
          clave: 'inventory.subcategories.delete',
          nombre: 'Eliminar subcategorías',
          descripcion: 'Eliminar subcategorías.'
        },
        {
          clave: 'inventory.movements.quick_io',
          nombre: 'Registrar movimientos rápidos',
          descripcion: 'Registrar ingresos o egresos rápidos (movimientos de stock).'
        },
        {
          clave: 'inventory.alerts.receive',
          nombre: 'Recibir alertas de inventario',
          descripcion: 'Recibir notificaciones de bajo stock o productos críticos.'
        }
      ]
    },
    {
      nombre: 'Áreas y Zonas',
      permisos: [
        {
          clave: 'warehouse.areas.read',
          nombre: 'Ver áreas',
          descripcion: 'Ver todas las áreas del almacén.'
        },
        {
          clave: 'warehouse.areas.create',
          nombre: 'Crear áreas',
          descripcion: 'Crear nuevas áreas.'
        },
        {
          clave: 'warehouse.areas.update',
          nombre: 'Editar áreas',
          descripcion: 'Editar nombres o descripciones de áreas.'
        },
        {
          clave: 'warehouse.areas.delete',
          nombre: 'Eliminar áreas',
          descripcion: 'Eliminar áreas (si no contienen zonas o productos).'
        },
        {
          clave: 'warehouse.zones.read',
          nombre: 'Ver zonas',
          descripcion: 'Ver zonas dentro de cada área.'
        },
        {
          clave: 'warehouse.zones.create',
          nombre: 'Crear zonas',
          descripcion: 'Crear nuevas zonas.'
        },
        {
          clave: 'warehouse.zones.update',
          nombre: 'Editar zonas',
          descripcion: 'Modificar nombre, capacidad o configuración de una zona.'
        },
        {
          clave: 'warehouse.zones.delete',
          nombre: 'Eliminar zonas',
          descripcion: 'Eliminar zonas del sistema.'
        },
        {
          clave: 'warehouse.assign.products_to_zone',
          nombre: 'Asignar productos a zonas',
          descripcion: 'Asignar productos a zonas específicas.'
        },
        {
          clave: 'warehouse.alerts.receive',
          nombre: 'Recibir alertas de almacén',
          descripcion: 'Recibir alertas de zonas llenas o sobrecapacidad.'
        },
        {
          clave: 'warehouse.incidents.record',
          nombre: 'Registrar incidentes',
          descripcion: 'Registrar incidentes en áreas y zonas.'
        },
        {
          clave: 'warehouse.incidents.alerts',
          nombre: 'Recibir alertas de incidentes',
          descripcion: 'Recibir y visualizar alertas de incidentes en áreas y zonas.'
        }
      ]
    },
    {
      nombre: 'Reportes',
      permisos: [
        {
          clave: 'reports.generate',
          nombre: 'Historial de reportes',
          descripcion: 'Visualizar el historial de reportes generados manualmente desde la interfaz.'
        },
        {
          clave: 'reports.export.pdf',
          nombre: 'Exportar a PDF',
          descripcion: 'Exportar reportes a formato PDF.'
        },
        {
          clave: 'reports.export.xlsx',
          nombre: 'Exportar a Excel',
          descripcion: 'Exportar reportes a formato Excel.'
        },
        {
          clave: 'reports.schedule',
          nombre: 'Programar reportes',
          descripcion: 'Programar reportes automáticos (diarios, semanales, etc.).'
        },
        {
          clave: 'reports.notify',
          nombre: 'Notificar reportes',
          descripcion: 'Recibir notificaciones de reportes generados o programados.'
        }
      ]
    },
    {
      nombre: 'LOG de Control',
      permisos: [
        {
          clave: 'log.read',
          nombre: 'Ver registro de actividades',
          descripcion: 'Ver el historial de acciones realizadas por todos los usuarios.'
        },
        {
          clave: 'log.export',
          nombre: 'Exportar registro',
          descripcion: 'Exportar registros del LOG a PDF o Excel.'
        },
        {
          clave: 'log.analytics.view',
          nombre: 'Ver estadísticas del registro',
          descripcion: 'Ver estadísticas y gráficas del LOG (por módulo, usuario, fecha).'
        },
        {
          clave: 'log.flag_records',
          nombre: 'Marcar registros para revisión',
          descripcion: 'Marcar registros para revisión o auditoría.'
        }
      ]
    },
    {
      nombre: 'Panel Principal y Notificaciones',
      permisos: [
        {
          clave: 'dashboard.view.metrics',
          nombre: 'Ver métricas del panel',
          descripcion: 'Ver métricas generales (productos, stock, movimientos, accesos).'
        },
        {
          clave: 'notifications.receive.critical',
          nombre: 'Recibir alertas críticas',
          descripcion: 'Recibir notificaciones importantes del sistema (errores, alertas críticas).'
        }
      ]
    },
    {
      nombre: 'Cuenta, Suscripción y Personalización',
      permisos: [
        {
          clave: 'account.profile.read',
          nombre: 'Ver perfil y empresa',
          descripcion: 'Ver los datos de perfil y empresa.'
        },
        {
          clave: 'account.profile.update',
          nombre: 'Editar perfil',
          descripcion: 'Modificar datos personales propios del usuario.'
        },
        {
          clave: 'account.theme.configure',
          nombre: 'Personalizar empresa',
          descripcion: 'Personalizar los colores y la informacion de la empresa.'
        }
      ]
    }
  ];

  const clavesPermisosCatalogo = catalogoPermisosCategorias.reduce((lista, categoria) => {
    if (!categoria || !Array.isArray(categoria.permisos)) {
      return lista;
    }
    categoria.permisos.forEach(permiso => {
      if (permiso && typeof permiso.clave === 'string' && permiso.clave.length > 0) {
        lista.push(permiso.clave);
      }
    });
    return lista;
  }, []);

  const totalPermisosCatalogo = clavesPermisosCatalogo.length;

  const configuracionInicialPermisosPorRol = {
    Administrador: { modo: 'all' },
    Supervisor: {
      modo: 'all',
      deshabilitar: ['roles.permissions.configure', 'subscription.manage']
    },
    Almacenista: {
      modo: 'all',
      deshabilitar: [
        'users.',
        'roles.',
        'log.',
        'subscription.',
        'account.theme.configure',
        'reports.schedule'
      ]
    },
    Mantenimiento: {
      modo: 'all',
      deshabilitar: ['users.', 'roles.', 'inventory.', 'subscription.', 'reports.schedule']
    },
    Etiquetador: {
      modo: 'all',
      deshabilitar: ['users.', 'roles.', 'warehouse.', 'log.', 'subscription.', 'reports.']
    }
  };

  const STORAGE_KEY_CONFIG_ROLES =
    (permisosHelper && permisosHelper.STORAGE_KEY) ||
    'optistock::configuracion_permisos_roles';
  const estadoPermisosPorRol = new Map();
  const permisosGuardadosLocales = cargarPermisosGuardadosLocal();
  let permisosPredeterminadosPorRol = {};
  let permisosGuardadosPorRol = permisosGuardadosLocales && typeof permisosGuardadosLocales === 'object'
    ? { ...permisosGuardadosLocales }
    : {};
  let permisosServidorCargado = false;
  let permisosServidorPromesa = null;
  let ultimoRolSeleccionado = null;

  function addListener(element, event, handler) {
    if (!element) return;
    element.addEventListener(event, handler);
    listeners.push({ element, event, handler });
  }

  const crearUsuarioEnlace = document.getElementById('crearUsuarioBtn');
  const modalAsignar = document.getElementById('modalAsignarAccesos');
  const tituloModalAccesos = document.getElementById('tituloModalAccesos');
  const descripcionModalAccesos = document.getElementById('descripcionModalAccesos');
  const nombreUsuarioAccesos = document.getElementById('nombreUsuarioAccesos');
  const resumenAccesosUsuario = document.getElementById('resumenAccesosUsuario');
  const listaAccesos = document.getElementById('listaAccesosUsuario');
  const listaAccesosVacia = document.getElementById('listaAccesosVacia');
  const selectArea = document.getElementById('asignarArea');
  const selectZona = document.getElementById('asignarZona');
  const selectZonaWrapper = selectZona ? selectZona.closest('.form-group, .mb-3, .col-12, .col') : null;
  const formAsignarAcceso = document.getElementById('formAsignarAcceso');
  const botonAgregarAcceso = document.getElementById('btnAgregarAcceso');
  const tablaUsuariosElement = document.getElementById('tablaUsuariosEmpresa');
  const tablaUsuariosBody = tablaUsuariosElement ? tablaUsuariosElement.querySelector('tbody') : null;
  let modalAsignarInstancia = null;

  if (tablaUsuariosElement && window.SimpleTableSorter) {
    window.SimpleTableSorter.enhance(tablaUsuariosElement);
  }

  if (crearUsuarioEnlace && !puedeCrearUsuarios) {
    marcarElementoPermiso(crearUsuarioEnlace, false, 'No tienes permiso para registrar nuevos usuarios.');
    addListener(crearUsuarioEnlace, 'click', obtenerHandlerDenegado('No tienes permiso para registrar nuevos usuarios.'));
  }

  if (botonAgregarAcceso && !puedeGestionarAccesos) {
    marcarElementoPermiso(botonAgregarAcceso, false, 'No tienes permiso para asignar accesos.');
  }

  if (selectArea && !puedeGestionarAccesos) {
    selectArea.disabled = true;
  }

  if (selectZona && !puedeGestionarAccesos) {
    selectZona.disabled = true;
  }

  function sincronizarUsuariosEmpresaUI() {
    if (!puedeVerUsuarios) {
      poblarFiltroRoles([]);
      actualizarResumen({});
      renderMetricas({});

      if (tablaUsuariosBody) {
        tablaUsuariosBody.innerHTML =
          '<tr class="empty-row"><td colspan="8">No tienes permiso para visualizar la lista de usuarios.</td></tr>';
      }
      const contador = document.getElementById('usuariosCount');
      if (contador) {
        contador.textContent = 'Permiso requerido para visualizar usuarios';
      }
      return;
    }

    const conteoPorRol = obtenerConteoPorRol(usuariosEmpresa);
    poblarFiltroRoles(Object.keys(conteoPorRol));
    actualizarResumen(conteoPorRol);
    renderMetricas(conteoPorRol);
    aplicarFiltros();
  }

  function obtenerIdSolicitante() {
    const raw = localStorage.getItem('usuario_id');
    if (!raw) return null;
    const parsed = Number.parseInt(raw, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  if (selectZona) {
    selectZona.innerHTML = '<option value="">Asignación por zona deshabilitada</option>';
    selectZona.disabled = true;
    if (selectZonaWrapper) {
      selectZonaWrapper.classList.add('d-none');
    } else {
      selectZona.setAttribute('hidden', 'hidden');
    }
  }

  function obtenerConteoPorRol(usuarios) {
    return (usuarios || []).reduce((conteo, usuario) => {
      if (!usuario || !usuario.rol || Number(usuario.activo) !== 1) {
        return conteo;
      }
      conteo[usuario.rol] = (conteo[usuario.rol] || 0) + 1;
      return conteo;
    }, {});
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function slugify(value) {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function capitalizarPalabra(value) {
    if (!value) {
      return '';
    }

    const texto = String(value).trim();
    if (!texto) {
      return '';
    }

    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  function formatearClavePermiso(clave) {
    if (!clave) {
      return '';
    }

    return String(clave)
      .replace(/[._]/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map(parte => capitalizarPalabra(parte))
      .join(' ');
  }

  function obtenerNombrePermisoAmigable(permiso) {
    if (!permiso) {
      return '';
    }

    const nombre = typeof permiso.nombre === 'string' ? permiso.nombre.trim() : '';
    if (nombre) {
      return nombre;
    }

    const clave = typeof permiso.clave === 'string' ? permiso.clave.trim() : '';
    if (clave) {
      return formatearClavePermiso(clave);
    }

    return '';
  }

  function puedeUsarLocalStorage() {
    try {
      return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    } catch (error) {
      return false;
    }
  }

  function normalizarPermisosGuardados(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return {};
    }

    return Object.entries(raw).reduce((acumulado, [rol, registro]) => {
      if (!registro) {
        return acumulado;
      }

      const listaActivos = Array.isArray(registro?.activos)
        ? registro.activos
        : Array.isArray(registro)
        ? registro
        : [];

      const filtrados = listaActivos.filter(clave => clavesPermisosCatalogo.includes(clave));
      const conocidos = Array.isArray(registro?.conocidos)
        ? registro.conocidos.filter(clave => typeof clave === 'string' && clave.length > 0)
        : null;

      const origenRegistro =
        typeof registro?.origen === 'string'
          ? registro.origen
          : listaActivos.length > 0
          ? 'empresa'
          : null;

      acumulado[rol] = {
        activos: filtrados,
        conocidos,
        actualizado:
          typeof registro?.actualizado === 'number' && Number.isFinite(registro.actualizado)
            ? registro.actualizado
            : null,
        origen: origenRegistro
      };

      return acumulado;
    }, {});
  }

  function filtrarConfiguracionEmpresa(config) {
    if (!config || typeof config !== 'object') {
      return {};
    }

    return Object.entries(config).reduce((acumulado, [rol, registro]) => {
      if (registro && registro.origen === 'empresa') {
        acumulado[rol] = registro;
      }
      return acumulado;
    }, {});
  }

  function construirConfiguracionCompleta() {
    const base =
      permisosPredeterminadosPorRol && typeof permisosPredeterminadosPorRol === 'object'
        ? { ...permisosPredeterminadosPorRol }
        : {};

    Object.entries(permisosGuardadosPorRol || {}).forEach(([rol, registro]) => {
      base[rol] = registro;
    });

    return base;
  }

  function cargarPermisosGuardadosLocal() {
    if (permisosHelper && typeof permisosHelper.loadConfig === 'function') {
      return filtrarConfiguracionEmpresa(normalizarPermisosGuardados(permisosHelper.loadConfig()));
    }

    if (!puedeUsarLocalStorage()) {
      return {};
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY_CONFIG_ROLES);
      if (!raw) {
        return {};
      }

      const parsed = JSON.parse(raw);
      return filtrarConfiguracionEmpresa(normalizarPermisosGuardados(parsed));
    } catch (error) {
      console.warn('No se pudieron cargar los permisos guardados de roles.', error);
      return {};
    }
  }

  function persistirPermisosLocales() {
    const configuracionCompleta = construirConfiguracionCompleta();
    if (permisosHelper && typeof permisosHelper.saveConfig === 'function') {
      permisosHelper.saveConfig(configuracionCompleta, { catalog: clavesPermisosCatalogo });
      return;
    }

    if (!puedeUsarLocalStorage()) {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY_CONFIG_ROLES, JSON.stringify(configuracionCompleta));
    } catch (error) {
      console.warn('No se pudieron guardar los permisos de roles.', error);
    }
  }

  function asignarPermisosGuardados(config, defaults) {
    if (defaults && typeof defaults === 'object') {
      permisosPredeterminadosPorRol = normalizarPermisosGuardados(defaults);
    }

    permisosGuardadosPorRol = normalizarPermisosGuardados(config);
    persistirPermisosLocales();
    estadoPermisosPorRol.clear();
  }

  async function asegurarPermisosCargados() {
    if (permisosServidorCargado) {
      return permisosGuardadosPorRol;
    }

    if (permisosServidorPromesa) {
      return permisosServidorPromesa;
    }

    const idEmpresaLocal = (() => {
      try {
        return window.localStorage.getItem('id_empresa');
      } catch (error) {
        return null;
      }
    })();

    const idEmpresaNumero = Number.parseInt(idEmpresaLocal, 10);
    const opcionesSync = Number.isFinite(idEmpresaNumero) && idEmpresaNumero > 0
      ? { idEmpresa: idEmpresaNumero }
      : {};

    if (permisosHelper && typeof permisosHelper.synchronizeFromServer === 'function') {
      permisosServidorPromesa = permisosHelper
        .synchronizeFromServer(opcionesSync)
        .then(resultado => {
          const defaults = resultado?.defaults || {};
          const overrides = resultado?.overrides || {};
          asignarPermisosGuardados(overrides, defaults);
          return permisosGuardadosPorRol;
        })
        .catch(error => {
          console.warn('No se pudieron sincronizar los permisos de roles desde el servidor.', error);
          return permisosGuardadosPorRol;
        })
        .finally(() => {
          permisosServidorCargado = true;
          permisosServidorPromesa = null;
        });

      return permisosServidorPromesa;
    }

    if (typeof window.fetch !== 'function') {
      permisosServidorCargado = true;
      return permisosGuardadosPorRol;
    }

    const payload = Object.keys(opcionesSync).length > 0 ? { id_empresa: opcionesSync.idEmpresa } : {};

    permisosServidorPromesa = window
      .fetch('/scripts/php/get_role_permissions.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(respuesta => respuesta.json())
      .then(data => {
        if (data?.success) {
          asignarPermisosGuardados(data.config || {}, data.defaults || {});
        }
        return permisosGuardadosPorRol;
      })
      .catch(error => {
        console.warn('No se pudieron sincronizar los permisos de roles desde el servidor.', error);
        return permisosGuardadosPorRol;
      })
      .finally(() => {
        permisosServidorCargado = true;
        permisosServidorPromesa = null;
      });

    return permisosServidorPromesa;
  }

  async function guardarPermisosRolServidor(rol, permisosActivos) {
    const idEmpresa = localStorage.getItem('id_empresa');
    if (!idEmpresa) {
      throw new Error('Identificador de empresa no disponible.');
    }

    const respuesta = await fetch('/scripts/php/guardar_permisos_rol.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rol,
        id_empresa: Number(idEmpresa),
        permisos_activos: Array.isArray(permisosActivos) ? permisosActivos : []
      })
    });

    const data = await respuesta.json();
    if (!respuesta.ok || !data?.success) {
      throw new Error(data?.message || 'No fue posible guardar los permisos del rol.');
    }

    const marcaTiempo = typeof data.actualizado === 'number' ? data.actualizado : Date.now();
    permisosGuardadosPorRol[rol] = {
      activos: Array.isArray(permisosActivos) ? permisosActivos.slice() : [],
      conocidos: clavesPermisosCatalogo.slice(),
      actualizado: marcaTiempo,
      origen: 'empresa'
    };
    persistirPermisosLocales();
    return marcaTiempo;
  }

  async function restablecerPermisosRolServidor(rol) {
    const idEmpresa = localStorage.getItem('id_empresa');
    if (!idEmpresa) {
      throw new Error('Identificador de empresa no disponible.');
    }

    const respuesta = await fetch('/scripts/php/restablecer_permisos_rol.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rol, id_empresa: Number(idEmpresa) })
    });

    const data = await respuesta.json();
    if (!respuesta.ok || !data?.success) {
      throw new Error(data?.message || 'No fue posible restablecer los permisos del rol.');
    }

    if (permisosGuardadosPorRol && Object.prototype.hasOwnProperty.call(permisosGuardadosPorRol, rol)) {
      delete permisosGuardadosPorRol[rol];
      persistirPermisosLocales();
    }

    return data;
  }

  function coincideReglaPermiso(permiso, regla) {
    if (!permiso || !regla) {
      return false;
    }

    if (regla === '*') {
      return true;
    }

    if (regla.endsWith('.*')) {
      return permiso.startsWith(regla.slice(0, -2));
    }

    if (regla.endsWith('.')) {
      return permiso.startsWith(regla);
    }

    return permiso === regla;
  }

  function generarEstadoInicialPermisos(rol) {
    const config = configuracionInicialPermisosPorRol[rol] || { modo: 'all' };
    const porDefecto = new Set();

    const registroPredeterminado = permisosPredeterminadosPorRol?.[rol];
    let tienePredeterminado = false;
    if (registroPredeterminado && Array.isArray(registroPredeterminado.activos)) {
      tienePredeterminado = true;
      registroPredeterminado.activos.forEach(clave => {
        if (clavesPermisosCatalogo.includes(clave)) {
          porDefecto.add(clave);
        }
      });
    }

    if (!tienePredeterminado) {
      clavesPermisosCatalogo.forEach(clave => {
        let habilitado = config?.modo === 'none' ? false : true;

        if (Array.isArray(config?.deshabilitar) && config.deshabilitar.some(regla => coincideReglaPermiso(clave, regla))) {
          habilitado = false;
        }

        if (Array.isArray(config?.habilitar) && config.habilitar.some(regla => coincideReglaPermiso(clave, regla))) {
          habilitado = true;
        }

        if (habilitado) {
          porDefecto.add(clave);
        }
      });
    }

    const registroGuardado = permisosGuardadosPorRol[rol];
    const guardadoActivos = Array.isArray(registroGuardado?.activos)
      ? registroGuardado.activos
      : Array.isArray(registroGuardado)
      ? registroGuardado
      : null;
    const guardadoSet = guardadoActivos
      ? new Set(guardadoActivos.filter(clave => clavesPermisosCatalogo.includes(clave)))
      : null;
    const conocidosSet = Array.isArray(registroGuardado?.conocidos)
      ? new Set(
          registroGuardado.conocidos.filter(clave => typeof clave === 'string' && clave.length > 0)
        )
      : null;

    const activos = new Set();
    clavesPermisosCatalogo.forEach(clave => {
      let habilitado = porDefecto.has(clave);

      if (guardadoSet) {
        const existiaEnGuardado = conocidosSet ? conocidosSet.has(clave) : true;
        if (existiaEnGuardado) {
          habilitado = guardadoSet.has(clave);
        }
      }

      if (habilitado) {
        activos.add(clave);
      }
    });

    const referenciaGuardada = new Set(activos);
    const ultimaGuardado =
      registroGuardado && typeof registroGuardado.actualizado === 'number' && Number.isFinite(registroGuardado.actualizado)
        ? new Date(registroGuardado.actualizado)
        : null;

    return {
      activos,
      referenciaGuardada,
      cambiosPendientes: false,
      ultimaGuardado
    };
  }

  function obtenerEstadoPermisosRol(rol) {
    if (!rol) {
      return {
        activos: new Set(),
        referenciaGuardada: new Set(),
        cambiosPendientes: false,
        ultimaGuardado: null
      };
    }

    if (!estadoPermisosPorRol.has(rol)) {
      estadoPermisosPorRol.set(rol, generarEstadoInicialPermisos(rol));
    }

    return estadoPermisosPorRol.get(rol);
  }

  function sonSetsIguales(setA, setB) {
    if (setA === setB) {
      return true;
    }

    if (!setA || !setB || setA.size !== setB.size) {
      return false;
    }

    for (const valor of setA) {
      if (!setB.has(valor)) {
        return false;
      }
    }

    return true;
  }

  function formatearMarcaTemporal(fecha) {
    if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) {
      return '';
    }

    try {
      return fecha.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
    } catch (error) {
      return fecha.toISOString();
    }
  }

  function obtenerTextoEstadoPermisos(estado) {
    if (!estado) {
      return '';
    }

    if (estado.cambiosPendientes) {
      return 'Cambios sin guardar';
    }

    if (estado.ultimaGuardado) {
      return `Guardado ${formatearMarcaTemporal(estado.ultimaGuardado)}`;
    }

    return 'Configuración predeterminada';
  }

  function actualizarResumenPermisosUI(contenedor, rol) {
    if (!contenedor || !rol) {
      return;
    }

    const estado = obtenerEstadoPermisosRol(rol);
    const conteoElemento = contenedor.querySelector('[data-role-permissions-count]');
    if (conteoElemento) {
      conteoElemento.textContent = `${estado.activos.size} de ${totalPermisosCatalogo} permisos activos`;
    }

    const estadoElemento = contenedor.querySelector('[data-role-permissions-status]');
    if (estadoElemento) {
      const textoEstado = obtenerTextoEstadoPermisos(estado);
      estadoElemento.textContent = textoEstado;
      estadoElemento.classList.toggle('roles-permissions-status--pending', Boolean(estado.cambiosPendientes));
    }

    const botonGuardar = contenedor.querySelector('[data-role-save]');
    if (botonGuardar) {
      botonGuardar.disabled = !estado.cambiosPendientes;
    }

    const botonReset = contenedor.querySelector('[data-role-reset]');
    if (botonReset) {
      const registro = permisosGuardadosPorRol?.[rol];
      botonReset.disabled = !registro || registro.origen !== 'empresa';
    }
  }

  function configurarInteraccionesPermisos(panel, rol) {
    if (!panel || !rol) {
      return;
    }

    const tarjeta = panel.querySelector('.roles-permissions-card');
    if (!tarjeta) {
      return;
    }

    const estado = obtenerEstadoPermisosRol(rol);
    const checkboxes = tarjeta.querySelectorAll("input[type='checkbox'][data-permission-key]");

    checkboxes.forEach(checkbox => {
      const clave = checkbox.dataset.permissionKey;
      if (!clave) {
        return;
      }

      checkbox.checked = estado.activos.has(clave);

      addListener(checkbox, 'change', () => {
        if (checkbox.checked) {
          estado.activos.add(clave);
        } else {
          estado.activos.delete(clave);
        }

        estado.cambiosPendientes = !sonSetsIguales(estado.activos, estado.referenciaGuardada);
        actualizarResumenPermisosUI(tarjeta, rol);
      });
    });

    const botonGuardar = tarjeta.querySelector('[data-role-save]');
    if (botonGuardar) {
      addListener(botonGuardar, 'click', async () => {
        if (botonGuardar.dataset.saving === 'true') {
          return;
        }

        const permisosActivos = Array.from(estado.activos).sort();
        const permisosInactivos = clavesPermisosCatalogo.filter(clave => !estado.activos.has(clave)).sort();

        botonGuardar.dataset.saving = 'true';
        botonGuardar.disabled = true;

        try {
          const marcaTiempo = await guardarPermisosRolServidor(rol, permisosActivos);

          estado.referenciaGuardada = new Set(estado.activos);
          estado.cambiosPendientes = false;
          estado.ultimaGuardado = new Date(marcaTiempo);

          if (typeof console !== 'undefined') {
            if (typeof console.groupCollapsed === 'function') {
              console.groupCollapsed(`Configuración de permisos guardada para ${rol}`);
              console.log('Permisos activos (%d):', permisosActivos.length, permisosActivos);
              console.log('Permisos inactivos (%d):', permisosInactivos.length, permisosInactivos);
              console.groupEnd();
            } else {
              console.log(`Configuración de permisos guardada para ${rol}`);
              console.log('Permisos activos (%d):', permisosActivos.length, permisosActivos);
              console.log('Permisos inactivos (%d):', permisosInactivos.length, permisosInactivos);
            }
          }

          notificar('success', `Configuración de permisos guardada para ${rol}.`);
        } catch (error) {
          console.error(`No se pudo guardar la configuración de permisos para ${rol}:`, error);
          estado.cambiosPendientes = !sonSetsIguales(estado.activos, estado.referenciaGuardada);
          notificar('error', 'No se pudieron guardar los permisos. Intenta nuevamente.');
        } finally {
          delete botonGuardar.dataset.saving;
          actualizarResumenPermisosUI(tarjeta, rol);
        }
      });
    }

    const botonRestablecer = tarjeta.querySelector('[data-role-reset]');
    if (botonRestablecer) {
      const actualizarEstadoBotonReset = () => {
        const registro = permisosGuardadosPorRol?.[rol];
        botonRestablecer.disabled = !registro || registro.origen !== 'empresa';
      };

      actualizarEstadoBotonReset();

      addListener(botonRestablecer, 'click', async () => {
        if (botonRestablecer.dataset.resetting === 'true') {
          return;
        }

        const confirmar =
          typeof window !== 'undefined' && typeof window.confirm === 'function'
            ? window.confirm(`¿Deseas restablecer los permisos de ${rol} a los valores predeterminados?`)
            : true;
        if (!confirmar) {
          return;
        }

        botonRestablecer.dataset.resetting = 'true';
        botonRestablecer.disabled = true;

        try {
          await restablecerPermisosRolServidor(rol);
          const nuevoEstado = generarEstadoInicialPermisos(rol);
          estado.activos = nuevoEstado.activos;
          estado.referenciaGuardada = nuevoEstado.referenciaGuardada;
          estado.cambiosPendientes = false;
          estado.ultimaGuardado = nuevoEstado.ultimaGuardado;

          checkboxes.forEach(checkbox => {
            const clave = checkbox.dataset.permissionKey;
            if (!clave) {
              return;
            }
            checkbox.checked = estado.activos.has(clave);
          });

          notificar('success', `Permisos restablecidos para ${rol}.`);
        } catch (error) {
          console.error(`No se pudieron restablecer los permisos para ${rol}:`, error);
          notificar('error', 'No se pudieron restablecer los permisos. Intenta nuevamente.');
        } finally {
          delete botonRestablecer.dataset.resetting;
          actualizarEstadoBotonReset();
          actualizarResumenPermisosUI(tarjeta, rol);
        }
      });
    }

    actualizarResumenPermisosUI(tarjeta, rol);
  }

  function crearMarkupPermisosRol(rol) {
    if (!rol) {
      return '';
    }

    const estadoPermisos = obtenerEstadoPermisosRol(rol);
    const rolSlug = slugify(rol);
    const totalPermisos = totalPermisosCatalogo;
    const totalActivos = estadoPermisos?.activos?.size || 0;
    const textoEstado = obtenerTextoEstadoPermisos(estadoPermisos);
    const registroGuardado = permisosGuardadosPorRol?.[rol];
    const restablecerDeshabilitado = !registroGuardado || registroGuardado.origen !== 'empresa';

    const categoriasMarkup = catalogoPermisosCategorias
      .map((categoria, categoriaIndex) => {
        if (!categoria || !Array.isArray(categoria.permisos) || !categoria.permisos.length) {
          return '';
        }

        const categoriaTitulo = categoria.nombre || `Categoría ${categoriaIndex + 1}`;
        const categoriaSlug = slugify(`${categoriaTitulo}-${categoriaIndex}`);
        const contentId = `role-${rolSlug}-categoria-${categoriaSlug}`;
        const totalCategoria = categoria.permisos.length;
        const etiquetaPermisos = totalCategoria === 1 ? 'permiso' : 'permisos';

        const permisosMarkup = categoria.permisos
          .map((permiso, permisoIndex) => {
            if (!permiso) {
              return '';
            }

            const permisoClave = permiso.clave || `permiso-${categoriaIndex + 1}-${permisoIndex + 1}`;
            const permisoDescripcion = permiso.descripcion || '';
            const permisoNombre = obtenerNombrePermisoAmigable(permiso);
            const permisoId = `permiso-${rolSlug}-${categoriaSlug}-${permisoIndex}`;
            const permisoActivo = Boolean(estadoPermisos?.activos?.has(permisoClave));
            const permisoDetalle = [
              permisoNombre
                ? `<span class="roles-permission-name">${escapeHtml(permisoNombre)}</span>`
                : '',
              permisoClave
                ? `<span class="roles-permission-code">${escapeHtml(permisoClave)}</span>`
                : '',
              permisoDescripcion
                ? `<span class="roles-permission-description">${escapeHtml(permisoDescripcion)}</span>`
                : ''
            ]
              .filter(Boolean)
              .join('');

            return `
              <label class="roles-permission-item" for="${escapeHtml(permisoId)}">
                <input id="${escapeHtml(permisoId)}" type="checkbox" data-permission-key="${escapeHtml(permisoClave)}" ${
              permisoActivo ? 'checked' : ''
            } />
                <span class="roles-permission-text">
                  ${permisoDetalle}
                </span>
              </label>
            `;
          })
          .join('');

        return `
          <section class="role-permissions-category role-permissions-category--expanded" data-role-category>
            <button type="button" class="role-permissions-category__header" data-role-category-toggle aria-expanded="true" aria-controls="${escapeHtml(contentId)}">
              <span class="role-permissions-category__title">${escapeHtml(categoriaTitulo)}</span>
              <span class="role-permissions-category__meta">${totalCategoria} ${etiquetaPermisos}</span>
              <span class="role-permissions-category__chevron" aria-hidden="true">▾</span>
            </button>
            <div id="${escapeHtml(contentId)}" class="role-permissions-category__content">
              <div class="roles-permissions-list">
                ${permisosMarkup}
              </div>
            </div>
          </section>
        `;
      })
      .join('');

    return `
      <article class="roles-permissions-card">
        <header class="roles-permissions-header">
          <h3 class="roles-permissions-title">${escapeHtml(rol)}</h3>
          <p class="roles-permissions-subtitle">
            Activa o desactiva los permisos disponibles para este rol. (${totalPermisos} permiso${
              totalPermisos === 1 ? '' : 's'
            } configurables)
          </p>
        </header>
        <div class="role-permissions-categories">
          ${categoriasMarkup}
        </div>
        <footer class="roles-permissions-footer">
          <div class="roles-permissions-summary">
            <span class="roles-permissions-count" data-role-permissions-count>${escapeHtml(
              `${totalActivos} de ${totalPermisos} permisos activos`
            )}</span>
            <span class="roles-permissions-status${
              estadoPermisos?.cambiosPendientes ? ' roles-permissions-status--pending' : ''
            }" data-role-permissions-status>${escapeHtml(textoEstado)}</span>
          </div>
          <div class="roles-permissions-actions">
            <button type="button" class="roles-permissions-reset" data-role-reset ${
              restablecerDeshabilitado ? 'disabled' : ''
            }>Restablecer predeterminado</button>
            <button type="button" class="roles-permissions-save" data-role-save ${
              estadoPermisos?.cambiosPendientes ? '' : 'disabled'
            }>Guardar configuración</button>
          </div>
        </footer>
      </article>
    `;
  }

  function activarCategoriasInteractivas(panel) {
    if (!panel) {
      return;
    }

    const toggles = panel.querySelectorAll('[data-role-category-toggle]');
    toggles.forEach(toggle => {
      const categoria = toggle?.closest('[data-role-category]');
      const contenido = categoria ? categoria.querySelector('.role-permissions-category__content') : null;
      if (!categoria || !contenido) {
        return;
      }

      contenido.removeAttribute('hidden');
      categoria.classList.add('role-permissions-category--expanded');
      categoria.classList.remove('role-permissions-category--collapsed');

      addListener(toggle, 'click', () => {
        const estaExpandido = toggle.getAttribute('aria-expanded') === 'true';
        const nuevoEstado = !estaExpandido;

        toggle.setAttribute('aria-expanded', nuevoEstado ? 'true' : 'false');
        categoria.classList.toggle('role-permissions-category--expanded', nuevoEstado);
        categoria.classList.toggle('role-permissions-category--collapsed', !nuevoEstado);

        if (nuevoEstado) {
          contenido.removeAttribute('hidden');
        } else {
          contenido.setAttribute('hidden', 'hidden');
        }
      });
    });
  }

  async function inicializarConfiguracionRoles() {
    if (!puedeConfigurarRoles) {
      const seccion = document.getElementById('configuracionRoles');
      if (seccion) {
        seccion.innerHTML =
          '<section class="permission-block"><div class="permission-block__card"><h2>Permiso requerido</h2><p>No tienes permiso para configurar los roles de la empresa.</p></div></section>';
      }
      return;
    }

    const panel = document.getElementById('rolePermissionsPanel');
    const botones = Array.from(document.querySelectorAll('[data-role-config]'));
    if (!panel || !botones.length) {
      return;
    }

    panel.innerHTML =
      '<div class="roles-permissions-placeholder">Cargando permisos configurados para la empresa…</div>';

    try {
      await asegurarPermisosCargados();
    } catch (error) {
      console.warn('No fue posible sincronizar los permisos antes de renderizar el panel.', error);
    }

    panel.innerHTML =
      '<div class="roles-permissions-placeholder">Selecciona un rol para consultar los permisos disponibles agrupados por categoría.</div>';

    let rolActivo = null;

    function seleccionarRol(rol) {
      if (!rol || rol === rolActivo) {
        return;
      }

      rolActivo = rol;
      ultimoRolSeleccionado = rol;
      botones.forEach(boton => {
        const esActivo = boton.dataset.roleConfig === rol;
        boton.classList.toggle('role-chip--active', esActivo);
        boton.setAttribute('aria-pressed', esActivo ? 'true' : 'false');
      });

      const markup = crearMarkupPermisosRol(rol);
      if (!markup) {
        panel.innerHTML = `
          <div class="roles-permissions-placeholder">
            No hay permisos configurados para <strong>${escapeHtml(rol)}</strong>.
          </div>
        `;
        return;
      }

      panel.innerHTML = markup;
      activarCategoriasInteractivas(panel);
      configurarInteraccionesPermisos(panel, rol);
    }

    botones.forEach(boton => {
      const rol = boton.dataset.roleConfig;
      if (!rol) return;
      boton.setAttribute('aria-pressed', 'false');
      addListener(boton, 'click', () => seleccionarRol(rol));
    });

    let rolInicial = null;
    if (ultimoRolSeleccionado) {
      const existe = botones.some(boton => boton.dataset.roleConfig === ultimoRolSeleccionado);
      if (existe) {
        rolInicial = ultimoRolSeleccionado;
      }
    }
    if (!rolInicial && botones[0]) {
      rolInicial = botones[0].dataset.roleConfig;
    }
    if (rolInicial) {
      seleccionarRol(rolInicial);
    }
  }

  function notificar(tipo, mensaje) {
    const mapa = {
      success: typeof window !== 'undefined' ? window.toastOk : null,
      error: typeof window !== 'undefined' ? window.toastError : null,
      info: typeof window !== 'undefined' ? window.toastInfo : null
    };

    const handler = mapa[tipo] || mapa.info || mapa.success;
    if (typeof handler === 'function') {
      handler(mensaje);
    } else if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert(mensaje);
    }
  }

  function poblarFiltroRoles(roles) {
    const filtroRol = document.getElementById('filtroRol');
    if (!filtroRol) return;

    const rolesOrdenados = (roles || []).slice().sort((a, b) => a.localeCompare(b));
    const valorSeleccionado = filtroRol.value;

    filtroRol.innerHTML = '<option value="">Todos los roles</option>';
    rolesOrdenados.forEach(rol => {
      const option = document.createElement('option');
      option.value = rol;
      option.textContent = rol;
      filtroRol.appendChild(option);
    });

    if (rolesOrdenados.includes(valorSeleccionado)) {
      filtroRol.value = valorSeleccionado;
    }
  }

  function actualizarResumen(conteoPorRol) {
    const totalUsuariosEl = document.getElementById('totalUsuarios');
    const totalRolesEl = document.getElementById('totalRoles');
    const ultimaActualizacionEl = document.getElementById('ultimaActualizacion');

    if (totalUsuariosEl) {
      const activos = usuariosEmpresa.filter(usuario => Number(usuario.activo) === 1).length;
      totalUsuariosEl.textContent = activos;
    }

    if (totalRolesEl) {
      totalRolesEl.textContent = Object.keys(conteoPorRol || {}).length;
    }

    if (ultimaActualizacionEl) {
      const ahora = new Date();
      ultimaActualizacionEl.textContent = usuariosEmpresa.length
        ? ahora.toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })
        : '—';
    }
  }

  function renderMetricas(conteoPorRol) {
    const metricas = document.getElementById('metricasUsuarios');
    if (!metricas) return;

    metricas.innerHTML = '';
    const roles = Object.keys(conteoPorRol || {});

    if (!roles.length) {
      metricas.innerHTML = '<div class="metric-card metric-card--empty"><span class="metric-empty-text">Registra usuarios para ver estadísticas por rol.</span></div>';
      return;
    }

    roles.forEach(rol => {
      const card = document.createElement('div');
      card.className = 'metric-card';
      card.innerHTML = `
        <span class="metric-label">${rol}</span>
        <strong class="metric-value">${conteoPorRol[rol]}</strong>
      `;
      metricas.appendChild(card);
    });
  }

  function cerrarMenusAcciones(exceptMenu = null) {
    document.querySelectorAll('.actions-menu--open').forEach(menu => {
      if (!exceptMenu || menu !== exceptMenu) {
        menu.classList.remove('actions-menu--open');
        const fila = menu.closest('tr');
        if (fila) {
          fila.classList.remove('actions-row--menu-open');
        }
      }
    });
  }

  function manejarClickFueraMenus(event) {
    if (!event.target.closest('.actions-menu')) {
      cerrarMenusAcciones();
    }
  }

  function obtenerInstanciaModalAsignar() {
    if (!modalAsignar) return null;
    if (modalAsignarInstancia) return modalAsignarInstancia;
    if (typeof bootstrap === 'undefined' || !bootstrap.Modal) return null;
    modalAsignarInstancia = bootstrap.Modal.getOrCreateInstance(modalAsignar);
    return modalAsignarInstancia;
  }

  function obtenerAreasEmpresa() {
    if (cacheAreasZonas) {
      return Promise.resolve(cacheAreasZonas);
    }

    if (solicitudAreas) {
      return solicitudAreas;
    }

    const idEmpresa = localStorage.getItem('id_empresa');
    if (!idEmpresa) {
      cacheAreasZonas = [];
      return Promise.resolve(cacheAreasZonas);
    }

    solicitudAreas = fetch('/scripts/php/obtener_areas_zonas.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_empresa: idEmpresa })
    })
      .then(res => res.json())
      .then(data => {
        cacheAreasZonas = Array.isArray(data?.data) ? data.data : [];
        return cacheAreasZonas;
      })
      .catch(err => {
        console.error('Error al obtener áreas y zonas:', err);
        cacheAreasZonas = [];
        return cacheAreasZonas;
      })
      .finally(() => {
        solicitudAreas = null;
      });

    return solicitudAreas;
  }

  function poblarSelectArea(areas) {
    if (!selectArea) return;
    selectArea.innerHTML = '<option value="">Selecciona un área</option>';
    areas.forEach(item => {
      if (!item?.area) return;
      const option = document.createElement('option');
      option.value = item.area.id;
      option.textContent = item.area.nombre;
      selectArea.appendChild(option);
    });
  }

  function poblarSelectZona() {
    if (!selectZona) return;
    selectZona.innerHTML = '<option value="">Asignación por zona deshabilitada</option>';
    selectZona.disabled = true;
  }

  function manejarCambioArea() {
    poblarSelectZona();
  }

  function actualizarResumenAccesosModal(accesos) {
    if (!resumenAccesosUsuario) return;
    if (!Array.isArray(accesos) || !accesos.length) {
      resumenAccesosUsuario.textContent = 'Acceso completo';
      return;
    }

    const totalAreas = new Set(accesos.map(a => a.id_area)).size;
    const soloAreas = accesos.every(acceso => acceso?.id_zona === null || typeof acceso?.id_zona === 'undefined');

    if (soloAreas) {
      resumenAccesosUsuario.textContent = `${totalAreas} área(s) asignada(s)`;
      return;
    }

    const totalZonas = accesos.filter(a => a.id_zona).length;
    resumenAccesosUsuario.textContent = `${totalAreas} área(s) con ${totalZonas} zona(s) personalizada(s)`;
  }

  function renderListaAccesos(accesos) {
    if (!listaAccesos || !listaAccesosVacia) return;

    listaAccesos.innerHTML = '';

    if (!Array.isArray(accesos) || !accesos.length) {
      listaAccesos.classList.add('d-none');
      listaAccesosVacia.classList.remove('d-none');
      actualizarResumenAccesosModal([]);
      return;
    }

    listaAccesos.classList.remove('d-none');
    listaAccesosVacia.classList.add('d-none');

    accesos.forEach(acceso => {
      const item = document.createElement('li');
      item.className = 'list-group-item d-flex justify-content-between align-items-start access-item';
      if (acceso?.composite_id) {
        item.dataset.accessKey = acceso.composite_id;
      }

      const areaTexto = escapeHtml(acceso?.area || `Área #${acceso?.id_area}`);
      const zonaTexto = acceso?.id_zona
        ? escapeHtml(acceso?.zona || `Zona #${acceso?.id_zona}`)
        : 'Acceso completo al área';

      item.innerHTML = `
        <div class="me-3">
          <span class="access-item__area">${areaTexto}</span>
          <small class="access-item__zone">${zonaTexto}</small>
        </div>
        <button type="button" class="btn btn-sm btn-outline-danger">Eliminar</button>
      `;

      const botonEliminar = item.querySelector('button');
      if (botonEliminar) {
        if (puedeGestionarAccesos) {
          botonEliminar.addEventListener('click', () => eliminarAcceso(acceso));
        } else {
          marcarElementoPermiso(botonEliminar, false, 'No tienes permiso para eliminar accesos.');
          botonEliminar.addEventListener('click', obtenerHandlerDenegado('No tienes permiso para eliminar accesos.'));
        }
      }

      listaAccesos.appendChild(item);
    });

    actualizarResumenAccesosModal(accesos);
  }

  function generarResumenAccesos(accesos) {
    if (!Array.isArray(accesos) || !accesos.length) {
      return '<span class="access-tag access-tag--full">Todas las áreas</span>';
    }

    const maxEtiquetas = 3;
    const etiquetas = accesos.slice(0, maxEtiquetas).map(acceso => {
      const areaTexto = escapeHtml(acceso?.area || `Área #${acceso?.id_area}`);
      const zonaTexto = acceso?.id_zona
        ? escapeHtml(acceso?.zona || `Zona #${acceso?.id_zona}`)
        : 'Acceso completo al área';
      return `
        <span class="access-tag">
          <span class="access-tag__area">${areaTexto}</span>
          <span class="access-tag__zone">${zonaTexto}</span>
        </span>
      `;
    });

    if (accesos.length > maxEtiquetas) {
      etiquetas.push(`<span class="access-tag access-tag--more">+${accesos.length - maxEtiquetas}</span>`);
    }

    return etiquetas.join('');
  }

  function actualizarAccesosUsuario(idUsuario, renderModal = false) {
    if (!idUsuario) return Promise.resolve([]);

    return fetch('/scripts/php/obtener_accesos_usuario.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_usuario: idUsuario })
    })
      .then(res => res.json())
      .then(data => {
        const accesos = Array.isArray(data?.accesos) ? data.accesos : [];
        usuariosEmpresa = usuariosEmpresa.map(usuario => {
          if (Number(usuario.id_usuario) === Number(idUsuario)) {
            return { ...usuario, accesos };
          }
          return usuario;
        });

        if (renderModal && Number(usuarioAccesosSeleccionadoId) === Number(idUsuario)) {
          renderListaAccesos(accesos);
        }

        aplicarFiltros();
        return accesos;
      })
      .catch(err => {
        console.error('Error al actualizar accesos del usuario:', err);
        return [];
      });
  }

  function abrirModalAccesos(usuario) {
    if (!puedeGestionarAccesos) {
      obtenerHandlerDenegado('No tienes permiso para asignar accesos.')();
      return;
    }

    if (!usuario) return;

    const modal = obtenerInstanciaModalAsignar();
    if (!modal) return;

    usuarioAccesosSeleccionadoId = usuario.id_usuario;

    if (tituloModalAccesos) {
      tituloModalAccesos.textContent = 'Gestionar accesos por área';
    }

    if (descripcionModalAccesos) {
      descripcionModalAccesos.textContent = 'Define a qué áreas puede acceder el colaborador seleccionado.';
    }

    if (nombreUsuarioAccesos) {
      const nombreCompleto = `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim();
      nombreUsuarioAccesos.textContent = nombreCompleto || usuario.correo || `ID ${usuario.id_usuario}`;
    }

    if (formAsignarAcceso) {
      formAsignarAcceso.reset();
    }

    poblarSelectZona();

    obtenerAreasEmpresa().then(areas => {
      poblarSelectArea(areas);
      if (selectArea) {
        selectArea.value = '';
      }
    });

    renderListaAccesos(Array.isArray(usuario.accesos) ? usuario.accesos : []);
    modal.show();
    actualizarAccesosUsuario(usuario.id_usuario, true);
  }

  function manejarAsignacionAcceso(event) {
    event.preventDefault();

    if (!puedeGestionarAccesos) {
      obtenerHandlerDenegado('No tienes permiso para asignar accesos.')(event);
      return;
    }

    if (asignacionEnCurso || !usuarioAccesosSeleccionadoId) {
      return;
    }

    const areaSeleccionada = selectArea && selectArea.value !== '' ? Number(selectArea.value) : 0;
    if (!Number.isInteger(areaSeleccionada) || areaSeleccionada <= 0) {
      notificar('info', 'Debes seleccionar un área para continuar.');
      return;
    }

    asignacionEnCurso = true;
    if (botonAgregarAcceso) {
      botonAgregarAcceso.disabled = true;
      botonAgregarAcceso.textContent = 'Guardando...';
    }

    const solicitanteId = obtenerIdSolicitante();
    const body = {
      id_usuario: usuarioAccesosSeleccionadoId,
      id_area: areaSeleccionada
    };

    if (solicitanteId) {
      body.id_solicitante = solicitanteId;
    }

    fetch('/scripts/php/guardar_acceso_usuario.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
      .then(res => res.json())
      .then(data => {
        if (data?.solicitud) {
          alert(`Solicitud registrada para asignar el acceso. Folio ${data.solicitud.id}. Espera la aprobación del revisor.`);
          return;
        }
        if (!data?.success) {
          notificar('error', data?.message || 'No se pudo guardar la asignación.');
          return;
        }

        notificar('success', data?.message || 'Acceso asignado correctamente.');
        actualizarAccesosUsuario(usuarioAccesosSeleccionadoId, true);
      })
      .catch(err => {
        console.error('Error al guardar la asignación:', err);
        notificar('error', 'Ocurrió un error al guardar la asignación.');
      })
      .finally(() => {
        asignacionEnCurso = false;
        if (botonAgregarAcceso) {
          botonAgregarAcceso.disabled = false;
          botonAgregarAcceso.textContent = 'Agregar acceso';
        }
        if (formAsignarAcceso) {
          formAsignarAcceso.reset();
        }
        poblarSelectZona();
      });
  }

  function eliminarAcceso(acceso) {
    if (!puedeGestionarAccesos) {
      obtenerHandlerDenegado('No tienes permiso para eliminar accesos.')();
      return;
    }

    if (!acceso || !acceso.id_usuario || !acceso.id_area) return;

    if (!confirm('¿Deseas eliminar este acceso asignado?')) {
      return;
    }

    const payload = {
      id_usuario: acceso.id_usuario,
      id_area: acceso.id_area,
      id_zona: acceso.id_zona === null || typeof acceso.id_zona === 'undefined' ? null : acceso.id_zona
    };

    const solicitanteId = obtenerIdSolicitante();
    if (solicitanteId) {
      payload.id_solicitante = solicitanteId;
    }

    fetch('/scripts/php/eliminar_acceso_usuario.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        if (data?.solicitud) {
          alert(`Solicitud registrada para revocar el acceso. Folio ${data.solicitud.id}.`);
          return;
        }
        if (!data?.success) {
          notificar('error', data?.message || 'No se pudo eliminar la asignación.');
          return;
        }

        notificar('success', data?.message || 'Acceso eliminado.');
        actualizarAccesosUsuario(acceso.id_usuario, true);
      })
      .catch(err => {
        console.error('Error al eliminar la asignación:', err);
        notificar('error', 'Ocurrió un error al eliminar la asignación.');
      });
  }

  function aplicarFiltros() {
    if (!puedeVerUsuarios) {
      return;
    }

    const filtroRol = document.getElementById('filtroRol');
    const buscador = document.getElementById('buscarUsuario');

    const rolSeleccionado = filtroRol ? filtroRol.value : '';
    const termino = buscador ? buscador.value.trim().toLowerCase() : '';

    const filtrados = usuariosEmpresa.filter(usuario => {
      const coincideRol = !rolSeleccionado || usuario.rol === rolSeleccionado;
      const estadoTexto = Number(usuario.activo) === 1 ? 'activo' : 'inactivo';
      const textoUsuario = `${usuario.nombre || ''} ${usuario.apellido || ''} ${usuario.correo || ''} ${usuario.telefono || ''} ${usuario.rol || ''} ${estadoTexto}`.toLowerCase();
      const coincideBusqueda = !termino || textoUsuario.includes(termino);
      return coincideRol && coincideBusqueda;
    });

    renderTabla(filtrados);
  }

  function renderTabla(usuarios) {
    const tabla = tablaUsuariosElement;
    const tbody = tablaUsuariosBody;
    if (!tbody) return;

    tbody.innerHTML = '';

    const contador = document.getElementById('usuariosCount');
    if (!usuarios.length) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="8">No se encontraron usuarios con los filtros aplicados.</td></tr>';
      if (contador) {
        contador.textContent = 'Sin usuarios disponibles';
      }
      if (window.SimpleTableSorter && tabla) {
        window.SimpleTableSorter.applyCurrentSort(tabla);
      }
      return;
    }

    usuarios.forEach(usuario => {
      const tr = document.createElement('tr');
      const foto = usuario.foto_perfil ? `/${usuario.foto_perfil}` : '/images/profile.jpg';
      const activo = Number(usuario.activo) === 1;
      const estadoClase = activo ? 'status-chip status-chip--active' : 'status-chip status-chip--inactive';
      const estadoTexto = activo ? 'Activo' : 'Inactivo';
      const estadoBotonClase = activo
        ? 'btn-action btn-action--status btn-status--deactivate'
        : 'btn-action btn-action--status btn-status--activate';
      const estadoBotonTexto = activo ? 'Desactivar' : 'Activar';
      const resumenAccesos = generarResumenAccesos(usuario.accesos);
      const telefono = usuario.telefono && String(usuario.telefono).trim() ? usuario.telefono : '—';

      tr.innerHTML = `
        <td>
          <div class="user-cell">
            <img src="${foto}" class="user-photo" alt="Foto de ${usuario.nombre || ''}" />
            <span>${usuario.nombre || ''}</span>
          </div>
        </td>
        <td>${usuario.apellido || ''}</td>
        <td><span class="cell-email">${usuario.correo || ''}</span></td>
        <td><span class="cell-phone">${telefono}</span></td>
        <td><span class="role-chip">${usuario.rol || ''}</span></td>
        <td><span class="${estadoClase}">${estadoTexto}</span></td>
        <td class="access-cell">${resumenAccesos}</td>
        <td class="actions-cell">
          <div class="actions-menu">
            <button type="button" class="actions-menu__toggle" title="Opciones">
              <span class="actions-menu__dots" aria-hidden="true">
                <span class="actions-menu__dot"></span>
                <span class="actions-menu__dot"></span>
                <span class="actions-menu__dot"></span>
              </span>
              <span class="visually-hidden">Mostrar acciones</span>
            </button>
            <div class="actions-menu__list">
              <button type="button" class="${estadoBotonClase}" title="${estadoBotonTexto}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="4" x2="12" y2="12"></line>
                  <path d="M8 5a7 7 0 1 0 8 0"></path>
                </svg>
                <span>${estadoBotonTexto}</span>
              </button>
              <button type="button" class="btn-action btn-action--access" title="Gestionar accesos">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="13" r="2"></circle>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0L2 7a2 2 0 0 1 1.73-3H20.27A2 2 0 0 1 22 7Z"></path>
                </svg>
                <span>Accesos</span>
              </button>
              <button type="button" class="btn-action btn-action--edit" title="Editar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
                </svg>
                <span>Editar</span>
              </button>
              <button type="button" class="btn-action btn-action--delete" title="Eliminar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                  <path d="M10 11v6"></path>
                  <path d="M14 11v6"></path>
                </svg>
                <span>Eliminar</span>
              </button>
            </div>
          </div>
        </td>
      `;

      const botonEditar = tr.querySelector('.btn-action--edit');
      const botonEliminar = tr.querySelector('.btn-action--delete');
      const botonEstado = tr.querySelector('.btn-action--status');
      const botonAccesos = tr.querySelector('.btn-action--access');
      const menu = tr.querySelector('.actions-menu');
      const toggleMenu = tr.querySelector('.actions-menu__toggle');

      if (toggleMenu && menu) {
        toggleMenu.addEventListener('click', event => {
          event.stopPropagation();
          const isOpen = menu.classList.contains('actions-menu--open');
          cerrarMenusAcciones(menu);
          if (!isOpen) {
            menu.classList.add('actions-menu--open');
            const fila = menu.closest('tr');
            if (fila) {
              fila.classList.add('actions-row--menu-open');
            }
          } else {
            menu.classList.remove('actions-menu--open');
            const fila = menu.closest('tr');
            if (fila) {
              fila.classList.remove('actions-row--menu-open');
            }
          }
        });
      }

      if (botonEditar) {
        if (puedeEditarUsuarios) {
          botonEditar.addEventListener('click', event => {
            event.stopPropagation();
            cerrarMenusAcciones();
            editarUsuario(usuario);
          });
        } else {
          marcarElementoPermiso(botonEditar, false, 'No tienes permiso para editar usuarios.');
          botonEditar.addEventListener('click', event => {
            event.stopPropagation();
            obtenerHandlerDenegado('No tienes permiso para editar usuarios.')(event);
          });
        }
      }

      if (botonEliminar) {
        if (puedeEliminarUsuarios) {
          botonEliminar.addEventListener('click', event => {
            event.stopPropagation();
            cerrarMenusAcciones();
            confirmarEliminacion(usuario.correo);
          });
        } else {
          marcarElementoPermiso(botonEliminar, false, 'No tienes permiso para eliminar usuarios.');
          botonEliminar.addEventListener('click', event => {
            event.stopPropagation();
            obtenerHandlerDenegado('No tienes permiso para eliminar usuarios.')(event);
          });
        }
      }

      if (botonEstado) {
        if (puedeCambiarEstadoUsuarios) {
          botonEstado.addEventListener('click', event => {
            event.stopPropagation();
            cerrarMenusAcciones();
            cambiarEstadoUsuario(usuario);
          });
        } else {
          marcarElementoPermiso(botonEstado, false, 'No tienes permiso para activar o desactivar usuarios.');
          botonEstado.addEventListener('click', event => {
            event.stopPropagation();
            obtenerHandlerDenegado('No tienes permiso para activar o desactivar usuarios.')(event);
          });
        }
      }

      if (botonAccesos) {
        if (puedeGestionarAccesos) {
          botonAccesos.addEventListener('click', event => {
            event.stopPropagation();
            cerrarMenusAcciones();
            abrirModalAccesos(usuario);
          });
        } else {
          marcarElementoPermiso(botonAccesos, false, 'No tienes permiso para asignar accesos.');
          botonAccesos.addEventListener('click', event => {
            event.stopPropagation();
            obtenerHandlerDenegado('No tienes permiso para asignar accesos.')(event);
          });
        }
      }

      tbody.appendChild(tr);
    });

    if (contador) {
      contador.textContent = usuarios.length === 1 ? '1 usuario encontrado' : `${usuarios.length} usuarios encontrados`;
    }

    if (window.SimpleTableSorter && tabla) {
      window.SimpleTableSorter.applyCurrentSort(tabla);
    }
  }

  function cambiarEstadoUsuario(usuario) {
    if (!puedeCambiarEstadoUsuarios) {
      obtenerHandlerDenegado('No tienes permiso para activar o desactivar usuarios.')();
      return;
    }

    if (!usuario || !usuario.id_usuario) return;

    const estadoActual = Number(usuario.activo) === 1;
    const nuevoEstado = estadoActual ? 0 : 1;
    const accion = nuevoEstado === 1 ? 'activar' : 'desactivar';
    const correo = usuario.correo || 'este usuario';

    if (!confirm(`¿Deseas ${accion} la cuenta de ${correo}?`)) {
      return;
    }

    const id_empresa = localStorage.getItem('id_empresa');

    const solicitanteId = obtenerIdSolicitante();
    const body = {
      id_usuario: usuario.id_usuario,
      activo: nuevoEstado,
      id_empresa
    };

    if (solicitanteId) {
      body.id_solicitante = solicitanteId;
    }

    fetch('/scripts/php/actualizar_estado_usuario.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
      .then(res => res.json())
      .then(data => {
        if (data?.solicitud) {
          alert(`Solicitud registrada para ${accion} la cuenta. Folio ${data.solicitud.id}.`);
          return;
        }
        if (!data?.success) {
          notificar('error', '❌ No se pudo actualizar el estado: ' + (data.message || 'Error desconocido.'));
          return;
        }

        usuariosEmpresa = usuariosEmpresa.map(item => {
          if (Number(item.id_usuario) === Number(usuario.id_usuario)) {
            return { ...item, activo: nuevoEstado };
          }
          return item;
        });
        sincronizarUsuariosEmpresaUI();
        notificar('success', data?.message || `Usuario ${accion === 'activar' ? 'activado' : 'desactivado'}.`);
      })
      .catch(err => {
        console.error('Error al cambiar estado:', err);
        notificar('error', '❌ Error al actualizar el estado del usuario.');
      });
  }

  function editarUsuario(usuario) {
    if (!puedeEditarUsuarios) {
      obtenerHandlerDenegado('No tienes permiso para editar usuarios.')();
      return;
    }

    document.getElementById('editar_id_usuario').value = usuario.id_usuario;
    document.getElementById('editar_nombre').value = usuario.nombre || '';
    document.getElementById('editar_apellido').value = usuario.apellido || '';
    document.getElementById('editar_telefono').value = usuario.telefono || '';
    document.getElementById('editar_nacimiento').value = usuario.fecha_nacimiento || '';
    document.getElementById('editar_correo').value = usuario.correo || '';
    document.getElementById('editar_rol').value = usuario.rol || '';

    const modal = new bootstrap.Modal(document.getElementById('modalEditarUsuario'));
    modal.show();
  }

  function confirmarEliminacion(correo) {
    if (!puedeEliminarUsuarios) {
      obtenerHandlerDenegado('No tienes permiso para eliminar usuarios.')();
      return;
    }

    if (confirm(`¿Estás seguro de que quieres eliminar al usuario ${correo}?`)) {
      if (confirm('Esta acción no se puede deshacer. ¿Deseas continuar?')) {
        eliminarUsuario(correo);
      }
    }
  }

  function eliminarUsuario(correo) {
    if (!puedeEliminarUsuarios) {
      obtenerHandlerDenegado('No tienes permiso para eliminar usuarios.')();
      return;
    }

    const solicitanteId = obtenerIdSolicitante();
    const idEmpresa = localStorage.getItem('id_empresa');
    const body = { correo };

    if (idEmpresa) {
      body.id_empresa = idEmpresa;
    }

    if (solicitanteId) {
      body.id_solicitante = solicitanteId;
    }

    fetch('/scripts/php/eliminar_usuario_empresa.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
      .then(res => res.json())
      .then(data => {
        if (data?.solicitud) {
          alert(`Solicitud registrada para eliminar al usuario ${correo}. Folio ${data.solicitud.id}.`);
          return;
        }
        if (!data?.success) {
          notificar('error', '❌ No se pudo eliminar: ' + (data.message || 'Error desconocido.'));
          return;
        }

        usuariosEmpresa = usuariosEmpresa.filter(usuario => (usuario.correo || '').toLowerCase() !== correo.toLowerCase());
        sincronizarUsuariosEmpresaUI();
        notificar('success', data?.message || `Usuario ${correo} eliminado.`);
      })
      .catch(err => {
        console.error('Error eliminando usuario:', err);
        notificar('error', '❌ Error al eliminar usuario.');
      });
  }

  function manejarSubmitEdicion(e) {
    e.preventDefault();

    if (!puedeEditarUsuarios) {
      obtenerHandlerDenegado('No tienes permiso para editar usuarios.')(e);
      return;
    }

    const datos = {
      id_usuario: parseInt(document.getElementById('editar_id_usuario').value, 10),
      nombre: document.getElementById('editar_nombre').value,
      apellido: document.getElementById('editar_apellido').value,
      telefono: document.getElementById('editar_telefono').value,
      fecha_nacimiento: document.getElementById('editar_nacimiento').value,
      rol: document.getElementById('editar_rol').value
    };

    const solicitanteId = obtenerIdSolicitante();
    if (solicitanteId) {
      datos.id_solicitante = solicitanteId;
    }

    fetch('/scripts/php/editar_usuario_empresa.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    })
      .then(res => res.json())
      .then(data => {
        if (data?.solicitud) {
          const modal = bootstrap.Modal.getInstance(document.getElementById('modalEditarUsuario'));
          if (modal) {
            modal.hide();
          }
          alert(`Solicitud registrada para actualizar al usuario. Folio ${data.solicitud.id}.`);
          return;
        }
        if (!data?.success) {
          notificar('error', '❌ Error: ' + (data.message || 'No se pudo registrar la solicitud.'));
          return;
        }

        const modal = bootstrap.Modal.getInstance(document.getElementById('modalEditarUsuario'));
        if (modal) {
          modal.hide();
        }

        usuariosEmpresa = usuariosEmpresa.map(usuario => {
          if (Number(usuario.id_usuario) === Number(datos.id_usuario)) {
            return {
              ...usuario,
              nombre: datos.nombre,
              apellido: datos.apellido,
              telefono: datos.telefono,
              fecha_nacimiento: datos.fecha_nacimiento,
              rol: datos.rol
            };
          }
          return usuario;
        });
        sincronizarUsuariosEmpresaUI();
        notificar('success', data?.message || 'Usuario actualizado.');
      })
      .catch(err => {
        console.error('❌', err);
        notificar('error', '❌ Error al guardar');
      });
  }

  function cargarUsuariosEmpresa() {
    if (!puedeVerUsuarios) {
      usuariosEmpresa = [];
      sincronizarUsuariosEmpresaUI();
      return;
    }

    const id_empresa = localStorage.getItem('id_empresa');
    if (!id_empresa) {
      usuariosEmpresa = [];
      sincronizarUsuariosEmpresaUI();
      return;
    }

    fetch('/scripts/php/obtener_usuarios_empresa.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_empresa })
    })
      .then(res => res.json())
      .then(data => {
        if (!data.success) {
          usuariosEmpresa = [];
          sincronizarUsuariosEmpresaUI();
          return;
        }

        usuariosEmpresa = Array.isArray(data.usuarios)
          ? data.usuarios.map(usuario => ({
              ...usuario,
              activo: Number(usuario.activo),
              accesos: Array.isArray(usuario.accesos) ? usuario.accesos : []
            }))
          : [];
        sincronizarUsuariosEmpresaUI();
      })
      .catch(err => {
        console.error('Error al cargar usuarios:', err);
        usuariosEmpresa = [];
        poblarFiltroRoles([]);
        renderTabla([]);
        actualizarResumen({});
        renderMetricas({});
      });
  }

  function descargarBlob(blob, fileName) {
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

  async function guardarReporteUsuarios(blob, fileName, notes) {
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
        source: 'Administración de usuarios',
        notes
      });
    } catch (error) {
      console.warn('No se pudo guardar el reporte en el historial:', error);
    }
  }

  async function exportarExcel() {
    if (!puedeExportarReportesExcel) {
      obtenerHandlerDenegado('No tienes permiso para exportar reportes en Excel.')();
      return;
    }
    const tabla = document.getElementById('tablaUsuariosEmpresa');
    if (!tabla) {
      notificar('error', '❌ No se encontró la tabla de usuarios.');
      return;
    }
    const wb = XLSX.utils.table_to_book(tabla, { sheet: 'Usuarios' });
    let wbArrayBuffer;
    try {
      wbArrayBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    } catch (error) {
      console.error('No se pudo generar el archivo de Excel:', error);
      notificar('error', '❌ No se pudo generar el archivo de Excel.');
      return;
    }

    const fileName = 'usuarios_empresa.xlsx';
    const blob = new Blob([wbArrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    descargarBlob(blob, fileName);
    await guardarReporteUsuarios(blob, fileName, 'Exportación de usuarios a Excel');
  }

  async function exportarPDF() {
    if (!puedeExportarReportesPdf) {
      obtenerHandlerDenegado('No tienes permiso para exportar reportes en PDF.')();
      return;
    }
    const tabla = document.getElementById('tablaUsuariosEmpresa');
    if (!(tabla instanceof HTMLTableElement)) {
      notificar('error', '❌ No se encontró la tabla de usuarios.');
      return;
    }

    const exporter = window.ReportExporter;
    if (!exporter || typeof exporter.exportTableToPdf !== 'function') {
      notificar('error', '❌ No se pudo cargar el módulo para exportar reportes. Recarga la página e inténtalo nuevamente.');
      return;
    }

    const dataset = exporter.extractTableData(tabla);
    if (!dataset || !dataset.rowCount) {
      notificar('info', '❌ No hay usuarios disponibles para generar el reporte.');
      return;
    }

    const empresa = exporter.getEmpresaNombre();
    const subtitleParts = [];
    if (empresa) {
      subtitleParts.push(`Empresa: ${empresa}`);
    }
    subtitleParts.push(`Usuarios exportados: ${exporter.pluralize(dataset.rowCount, 'usuario')}`);

    if (typeof exporter.formatTimestamp === 'function') {
      subtitleParts.push(`Generado: ${exporter.formatTimestamp(new Date())}`);
    } else {
      subtitleParts.push(`Generado: ${new Date().toLocaleString()}`);
    }

    try {
      const result = await exporter.exportTableToPdf({
        table: tabla,
        data: dataset,
        title: 'Usuarios de la Empresa',
        subtitle: subtitleParts.join(' • '),
        fileName: 'usuarios_empresa.pdf',
        module: 'Administración de usuarios',
        includeRowCount: false,
        countLabel: (total) => {
          if (typeof exporter.pluralize === 'function') {
            return exporter.pluralize(total, 'usuario');
          }
          return total === 1 ? '1 usuario' : `${total} usuarios`;
        }
      });

      if (result?.blob) {
        await guardarReporteUsuarios(result.blob, result.fileName, 'Exportación de usuarios a PDF');
      }
    } catch (error) {
      console.error('No se pudo generar el PDF de usuarios:', error);
      if (error && error.message === 'PDF_LIBRARY_MISSING') {
        notificar('error', '❌ La librería para generar PDF no está disponible. Actualiza la página e inténtalo nuevamente.');
        return;
      }
      notificar('error', '❌ Ocurrió un problema al generar el PDF de usuarios.');
    }
  }

  window.exportarExcel = exportarExcel;
  window.exportarPDF = exportarPDF;

  const exportUsuariosPdfBtn = document.getElementById('exportUsuariosPdf');
  if (exportUsuariosPdfBtn) {
    if (!puedeExportarReportesPdf) {
      exportUsuariosPdfBtn.disabled = true;
      marcarElementoPermiso(
        exportUsuariosPdfBtn,
        false,
        'No tienes permiso para exportar reportes en PDF.'
      );
      exportUsuariosPdfBtn.addEventListener(
        'click',
        obtenerHandlerDenegado('No tienes permiso para exportar reportes en PDF.')
      );
    } else {
      exportUsuariosPdfBtn.disabled = false;
      marcarElementoPermiso(exportUsuariosPdfBtn, true);
    }
  }

  const exportUsuariosExcelBtn = document.getElementById('exportUsuariosExcel');
  if (exportUsuariosExcelBtn) {
    if (!puedeExportarReportesExcel) {
      exportUsuariosExcelBtn.disabled = true;
      marcarElementoPermiso(
        exportUsuariosExcelBtn,
        false,
        'No tienes permiso para exportar reportes en Excel.'
      );
      exportUsuariosExcelBtn.addEventListener(
        'click',
        obtenerHandlerDenegado('No tienes permiso para exportar reportes en Excel.')
      );
    } else {
      exportUsuariosExcelBtn.disabled = false;
      marcarElementoPermiso(exportUsuariosExcelBtn, true);
    }
  }

  const formEditarUsuario = document.getElementById('formEditarUsuario');
  const filtroRolElemento = document.getElementById('filtroRol');
  const buscadorElemento = document.getElementById('buscarUsuario');

  addListener(formEditarUsuario, 'submit', manejarSubmitEdicion);

  if (puedeVerUsuarios) {
    addListener(filtroRolElemento, 'change', aplicarFiltros);
    addListener(buscadorElemento, 'input', aplicarFiltros);
  } else {
    if (filtroRolElemento) {
      filtroRolElemento.disabled = true;
      marcarElementoPermiso(filtroRolElemento, false, 'No tienes permiso para visualizar usuarios.');
    }
    if (buscadorElemento) {
      buscadorElemento.disabled = true;
      buscadorElemento.placeholder = 'Permiso requerido para buscar usuarios';
      marcarElementoPermiso(buscadorElemento, false, 'No tienes permiso para visualizar usuarios.');
    }
  }
  addListener(formAsignarAcceso, 'submit', manejarAsignacionAcceso);
  addListener(selectArea, 'change', manejarCambioArea);
  addListener(document, 'click', manejarClickFueraMenus);
  addListener(modalAsignar, 'hidden.bs.modal', () => {
    usuarioAccesosSeleccionadoId = null;
    asignacionEnCurso = false;
    if (formAsignarAcceso) {
      formAsignarAcceso.reset();
    }
    poblarSelectZona();
    if (listaAccesos) {
      listaAccesos.innerHTML = '';
      listaAccesos.classList.add('d-none');
    }
    if (listaAccesosVacia) {
      listaAccesosVacia.classList.remove('d-none');
    }
    if (resumenAccesosUsuario) {
      resumenAccesosUsuario.textContent = 'Acceso completo';
    }
  });

  if (document.readyState !== 'loading') {
    cargarUsuariosEmpresa();
    inicializarConfiguracionRoles();
  } else {
    domReadyHandler = () => {
      cargarUsuariosEmpresa();
      inicializarConfiguracionRoles();
      document.removeEventListener('DOMContentLoaded', domReadyHandler);
      domReadyHandler = null;
    };
    document.addEventListener('DOMContentLoaded', domReadyHandler);
  }

  // Limpieza al recargar el módulo/script
  window.__adminUsuariosCleanup = () => {
    listeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    listeners.length = 0;

    if (domReadyHandler) {
      document.removeEventListener('DOMContentLoaded', domReadyHandler);
      domReadyHandler = null;
    }

    cacheAreasZonas = null;
    solicitudAreas = null;
    usuarioAccesosSeleccionadoId = null;
    modalAsignarInstancia = null;
  };
})();