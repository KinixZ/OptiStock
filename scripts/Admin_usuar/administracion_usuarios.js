(() => {
  let usuariosEmpresa = [];
  const listeners = [];
  let domReadyHandler = null;
  let cacheAreasZonas = null;
  let solicitudAreas = null;
  let usuarioAccesosSeleccionadoId = null;
  let asignacionEnCurso = false;

  const availablePermissions = [
    'Gestionar usuarios',
    'Configurar inventario',
    'Ver reportes analíticos',
    'Aprobar ajustes de stock',
    'Registrar entradas de almacén',
    'Generar órdenes de compra',
    'Monitorear indicadores',
    'Administrar catálogos de productos'
  ];

  const rolesData = [
    {
      id: 'administrador',
      name: 'Administrador',
      description: 'Supervisa todo el sistema y define la configuración estratégica.',
      permissions: [...availablePermissions]
    },
    {
      id: 'supervisor',
      name: 'Supervisor',
      description: 'Coordina al equipo y asegura el cumplimiento de los procesos diarios.',
      permissions: [...availablePermissions]
    },
    {
      id: 'almacenista',
      name: 'Almacenista',
      description: 'Gestiona la recepción, almacenamiento y surtido del inventario.',
      permissions: [
        'Configurar inventario',
        'Registrar entradas de almacén',
        'Generar órdenes de compra',
        'Administrar catálogos de productos'
      ]
    },
    {
      id: 'mantenimiento',
      name: 'Mantenimiento',
      description: 'Mantiene operativos los equipos y supervisa ajustes críticos.',
      permissions: [
        'Aprobar ajustes de stock',
        'Registrar entradas de almacén',
        'Monitorear indicadores'
      ]
    },
    {
      id: 'etiquetador',
      name: 'Etiquetador',
      description: 'Asegura el etiquetado correcto y la actualización del catálogo.',
      permissions: ['Registrar entradas de almacén', 'Administrar catálogos de productos']
    }
  ];

  let rolesFeedbackTimeout = null;
  let rolesConfiguratorInitialized = false;

  function obtenerDatosUsuarioActivo() {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { id: null, nombre: '', rol: '' };
    }

    let id = null;
    let nombre = '';
    let rol = '';

    try {
      const storage = window.localStorage;
      const rawId = storage.getItem('usuario_id');
      if (rawId) {
        const parsedId = Number.parseInt(rawId, 10);
        if (Number.isFinite(parsedId) && parsedId > 0) {
          id = parsedId;
        }
      }

      nombre = storage.getItem('usuario_nombre') || '';
      rol = storage.getItem('usuario_rol') || '';
    } catch (error) {
      console.warn('No se pudieron obtener los datos del usuario activo.', error);
    }

    return { id, nombre, rol };
  }

  function esUsuarioAdministrador(rol) {
    if (!rol) return false;
    return rol.toString().trim().toLowerCase() === 'administrador';
  }

  function puedeAdministrarRoles() {
    const datos = obtenerDatosUsuarioActivo();
    return esUsuarioAdministrador(datos.rol);
  }

  function reportarIntentoNoAutorizado(descripcion, mensajeUsuario) {
    const datos = obtenerDatosUsuarioActivo();
    const mensaje = mensajeUsuario
      || 'No tienes permisos para realizar esta acción. El administrador ha sido notificado.';

    notificar('error', mensaje);

    const actorNombre = datos.nombre || 'Usuario desconocido';
    const actorRol = datos.rol || 'Sin rol asignado';
    const detalle = {
      actorName: actorNombre,
      actorRole: actorRol,
      actorId: datos.id,
      action: descripcion,
      timestamp: new Date().toISOString(),
      message: `${actorNombre} (${actorRol}) intentó ${descripcion} sin permisos.`,
      showImmediateAlert: false
    };

    if (typeof document !== 'undefined' && typeof document.dispatchEvent === 'function') {
      document.dispatchEvent(new CustomEvent('movimientoNoAutorizado', { detail: detalle }));
    }
  }

  function addListener(element, event, handler) {
    if (!element) return;
    element.addEventListener(event, handler);
    listeners.push({ element, event, handler });
  }

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

  let rolesModalElement = null;
  let toggleRolesButton = null;
  let rolesListElement = null;
  let permissionsReferenceElement = null;
  let rolesFeedbackElement = null;
  let rolesCountElement = null;
  let rolesLastUpdatedElement = null;
  let rolesButtonLabel = null;
  let rolesModalInstance = null;
  let rolesDomReadyHandler = null;

  function resolveRolesElements() {
    rolesModalElement = document.getElementById('rolesConfigModal');
    toggleRolesButton = document.getElementById('toggleRolesPanel');
    rolesListElement = document.getElementById('rolesList');
    permissionsReferenceElement = document.getElementById('permissionsReference');
    rolesFeedbackElement = document.getElementById('feedbackMessage');
    rolesCountElement = document.getElementById('rolesCount');
    rolesLastUpdatedElement = document.getElementById('lastUpdated');
    rolesButtonLabel = toggleRolesButton ? toggleRolesButton.querySelector('.cta-button__label') : null;
  }

  function setupRolesModalInteractions() {
    resolveRolesElements();

    if (toggleRolesButton && rolesModalElement) {
      addListener(toggleRolesButton, 'click', event => {
        if (event) {
          event.preventDefault();
          if (typeof event.stopImmediatePropagation === 'function') {
            event.stopImmediatePropagation();
          }
          event.stopPropagation();
        }

        if (!puedeAdministrarRoles()) {
          reportarIntentoNoAutorizado(
            'acceder a la configuración de roles y permisos',
            'Solo un administrador puede gestionar los roles y permisos. Se notificó al responsable.'
          );
          return;
        }

        initializeRolesPanel();
        const modal = obtenerInstanciaModalRoles();
        if (modal) {
          modal.show();
        }
      });
    }

    if (rolesModalElement) {
      addListener(rolesModalElement, 'show.bs.modal', () => {
        if (toggleRolesButton) {
          toggleRolesButton.setAttribute('aria-expanded', 'true');
        }

        if (rolesButtonLabel) {
          rolesButtonLabel.textContent = 'Roles y permisos';
        }
      });

      addListener(rolesModalElement, 'hidden.bs.modal', () => {
        if (toggleRolesButton) {
          toggleRolesButton.setAttribute('aria-expanded', 'false');
          toggleRolesButton.focus();
        }

        if (rolesButtonLabel) {
          rolesButtonLabel.textContent = 'Roles y permisos';
        }

        if (rolesModalInstance && typeof rolesModalInstance.dispose === 'function') {
          rolesModalInstance.dispose();
        }

        rolesModalInstance = null;
      });
    }
  }

  if (tablaUsuariosElement && window.SimpleTableSorter) {
    window.SimpleTableSorter.enhance(tablaUsuariosElement);
  }

  resolveRolesElements();

  if (document.readyState === 'loading') {
    rolesDomReadyHandler = () => {
      setupRolesModalInteractions();
      initializeRolesPanel();
      rolesDomReadyHandler = null;
    };
    document.addEventListener('DOMContentLoaded', rolesDomReadyHandler, { once: true });
  } else {
    setupRolesModalInteractions();
    initializeRolesPanel();
  }

  function sincronizarUsuariosEmpresaUI() {
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

  function initializeRolesPanel() {
    if (rolesConfiguratorInitialized) {
      updateRolesSummary();
      return;
    }

    resolveRolesElements();

    if (!rolesListElement || !permissionsReferenceElement) {
      rolesConfiguratorInitialized = false;
      return;
    }

    rolesConfiguratorInitialized = true;
    renderPermissionReference();
    renderRoles();
    updateRolesSummary();
    updateRolesLastUpdated();
  }

  function obtenerInstanciaModalRoles() {
    if (!rolesModalElement || typeof bootstrap === 'undefined' || !bootstrap?.Modal) {
      return null;
    }

    if (rolesModalInstance) {
      return rolesModalInstance;
    }

    rolesModalInstance = bootstrap.Modal.getOrCreateInstance(rolesModalElement);
    return rolesModalInstance;
  }

  function renderPermissionReference() {
    if (!permissionsReferenceElement) return;

    permissionsReferenceElement.innerHTML = '';
    availablePermissions.forEach(permission => {
      const item = document.createElement('li');
      item.textContent = permission;
      permissionsReferenceElement.appendChild(item);
    });
  }

  function renderRoles() {
    if (!rolesListElement) return;

    rolesListElement.innerHTML = '';

    rolesData.forEach(role => {
      const card = document.createElement('article');
      card.className = 'role-card';

      const header = document.createElement('div');
      header.className = 'role-header';

      const headerMain = document.createElement('div');
      headerMain.className = 'role-header-main';

      const title = document.createElement('h3');
      title.className = 'role-name';
      title.textContent = role.name;

      const description = document.createElement('p');
      description.className = 'role-description';
      description.textContent = role.description;

      const counter = document.createElement('span');
      counter.className = 'role-count';
      counter.textContent = formatPermissionCount(role.permissions.length);

      headerMain.append(title, description, counter);

      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'role-toggle';
      toggle.setAttribute('aria-expanded', 'false');

      const body = document.createElement('div');
      body.className = 'role-body';
      body.hidden = true;
      const bodyId = `role-permissions-${role.id}`;
      body.id = bodyId;
      toggle.setAttribute('aria-controls', bodyId);

      const toggleText = document.createElement('span');
      toggleText.textContent = 'Ver permisos';
      toggle.appendChild(toggleText);

      toggle.addEventListener('click', () => {
        const expanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!expanded));
        toggleText.textContent = expanded ? 'Ver permisos' : 'Ocultar permisos';
        body.hidden = expanded;
      });

      header.append(headerMain, toggle);

      const permissionsGrid = document.createElement('div');
      permissionsGrid.className = 'permissions-grid';

      availablePermissions.forEach((permission, index) => {
        const permissionId = `${role.id}-perm-${index}`;
        const wrapper = document.createElement('label');
        wrapper.className = 'permission-item';
        wrapper.setAttribute('for', permissionId);

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = permissionId;
        checkbox.value = permission;
        checkbox.checked = role.permissions.includes(permission);

        checkbox.addEventListener('change', () => {
          if (!puedeAdministrarRoles()) {
            checkbox.checked = role.permissions.includes(permission);
            reportarIntentoNoAutorizado(
              `modificar el permiso «${permission}» del rol «${role.name}»`,
              'Solo un administrador puede modificar los permisos de los roles. Se notificó al responsable.'
            );
            return;
          }

          if (checkbox.checked) {
            if (!role.permissions.includes(permission)) {
              role.permissions.push(permission);
            }
          } else {
            role.permissions = role.permissions.filter(perm => perm !== permission);
          }

          counter.textContent = formatPermissionCount(role.permissions.length);
          markRoleCardAsPending(card);
        });

        const labelText = document.createElement('span');
        labelText.className = 'permission-label';
        labelText.textContent = permission;

        wrapper.append(checkbox, labelText);
        permissionsGrid.appendChild(wrapper);
      });

      const actions = document.createElement('div');
      actions.className = 'role-actions';

      const saveButton = document.createElement('button');
      saveButton.type = 'button';
      saveButton.className = 'role-save';
      saveButton.textContent = 'Guardar cambios';

      saveButton.addEventListener('click', () => {
        if (!puedeAdministrarRoles()) {
          reportarIntentoNoAutorizado(
            `guardar los cambios del rol «${role.name}»`,
            'Solo un administrador puede guardar cambios en los roles. Se notificó al responsable.'
          );
          return;
        }

        card.classList.remove('role-card--dirty');
        const message = `Los permisos del rol «${role.name}» se actualizaron correctamente.`;
        showRolesFeedback(message);
        updateRolesLastUpdated();
      });

      actions.appendChild(saveButton);

      body.append(permissionsGrid, actions);
      card.append(header, body);
      rolesListElement.appendChild(card);
    });
  }

  function markRoleCardAsPending(card) {
    if (!card) return;
    card.classList.add('role-card--dirty');
  }

  function showRolesFeedback(message) {
    if (rolesFeedbackElement) {
      rolesFeedbackElement.textContent = message;
      rolesFeedbackElement.classList.remove('d-none', 'alert-danger', 'alert-warning', 'alert-info');
      rolesFeedbackElement.classList.add('alert-success');

      window.clearTimeout(rolesFeedbackTimeout);
      rolesFeedbackTimeout = window.setTimeout(() => {
        if (rolesFeedbackElement) {
          rolesFeedbackElement.classList.add('d-none');
        }
      }, 4000);
    }

    notificar('success', message);
  }

  function updateRolesSummary() {
    if (rolesCountElement) {
      rolesCountElement.textContent = rolesData.length.toString();
    }

    const totalRolesEl = document.getElementById('totalRoles');
    if (totalRolesEl) {
      const current = Number.parseInt(totalRolesEl.textContent, 10);
      const safeCurrent = Number.isNaN(current) ? 0 : current;
      const total = Math.max(safeCurrent, rolesData.length);
      totalRolesEl.textContent = total.toString();
    }
  }

  function updateRolesLastUpdated(date = new Date()) {
    if (!rolesLastUpdatedElement) return;

    const formatter = new Intl.DateTimeFormat('es-PE', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    rolesLastUpdatedElement.textContent = formatter.format(date);
  }

  function formatPermissionCount(count) {
    return count === 1 ? '1 permiso' : `${count} permisos`;
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
      const totalActivos = Object.keys(conteoPorRol || {}).length;
      const total = Math.max(totalActivos, rolesData.length);
      totalRolesEl.textContent = total.toString();
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
        botonEliminar.addEventListener('click', () => eliminarAcceso(acceso));
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
        botonEditar.addEventListener('click', event => {
          event.stopPropagation();
          cerrarMenusAcciones();
          editarUsuario(usuario);
        });
      }

      if (botonEliminar) {
        botonEliminar.addEventListener('click', event => {
          event.stopPropagation();
          cerrarMenusAcciones();
          confirmarEliminacion(usuario.correo);
        });
      }

      if (botonEstado) {
        botonEstado.addEventListener('click', event => {
          event.stopPropagation();
          cerrarMenusAcciones();
          cambiarEstadoUsuario(usuario);
        });
      }

      if (botonAccesos) {
        botonAccesos.addEventListener('click', event => {
          event.stopPropagation();
          cerrarMenusAcciones();
          abrirModalAccesos(usuario);
        });
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
    if (confirm(`¿Estás seguro de que quieres eliminar al usuario ${correo}?`)) {
      if (confirm('Esta acción no se puede deshacer. ¿Deseas continuar?')) {
        eliminarUsuario(correo);
      }
    }
  }

  function eliminarUsuario(correo) {
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
          if (data?.error_code === 'usuario_solicitudes_pendientes') {
            const pendientes = Number(data.solicitudes_pendientes) || 0;
            const detallePendientes = pendientes === 1
              ? '1 solicitud pendiente'
              : `${pendientes} solicitudes pendientes`;
            const baseMensaje = data.message || 'El usuario tiene solicitudes pendientes.';
            notificar('warning', `⚠️ ${baseMensaje} (${detallePendientes}).`);
            return;
          }
          notificar('error', '❌ No se pudo eliminar: ' + (data.message || 'Error desconocido.'));
          return;
        }

        usuariosEmpresa = usuariosEmpresa.filter(usuario => (usuario.correo || '').toLowerCase() !== correo.toLowerCase());
        sincronizarUsuariosEmpresaUI();
        const detallesExitos = [];
        const movimientosEliminados = Number(data?.movimientos_eliminados) || Number(data?.dependencias?.movimientos_eliminados) || 0;
        const registrosEliminados = Number(data?.registros_actividades_eliminados) || 0;
        const empresasDesvinculadas = Number(data?.dependencias?.empresas_creadas) || 0;
        const tokensRevocados = Number(data?.dependencias?.tokens_recuperacion) || 0;

        const mensajeBase = data?.message || `Usuario ${correo} eliminado.`;
        const mensajeBaseLower = mensajeBase.toLowerCase();

        if (movimientosEliminados > 0 && !mensajeBaseLower.includes('movimiento')) {
          detallesExitos.push(`${movimientosEliminados === 1 ? '1 movimiento' : `${movimientosEliminados} movimientos`} de inventario eliminados`);
        }
        if (registrosEliminados > 0 && !mensajeBaseLower.includes('registro de actividades')) {
          detallesExitos.push(`${registrosEliminados === 1 ? '1 registro' : `${registrosEliminados} registros`} de actividades eliminados`);
        }
        if (empresasDesvinculadas > 0 && !mensajeBaseLower.includes('desvincularon')) {
          detallesExitos.push(`${empresasDesvinculadas === 1 ? '1 empresa' : `${empresasDesvinculadas} empresas`} desvinculadas`);
        }
        if (tokensRevocados > 0 && !mensajeBaseLower.includes('revocaron')) {
          detallesExitos.push(`${tokensRevocados === 1 ? '1 enlace' : `${tokensRevocados} enlaces`} de recuperación revocados`);
        }

        const mensajeExtra = detallesExitos.length > 0 ? ` (${detallesExitos.join(', ')}).` : '';
        notificar('success', `${mensajeBase}${mensajeExtra}`);
      })
      .catch(err => {
        console.error('Error eliminando usuario:', err);
        notificar('error', '❌ Error al eliminar usuario.');
      });
  }

  function manejarSubmitEdicion(e) {
    e.preventDefault();

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

  addListener(document.getElementById('formEditarUsuario'), 'submit', manejarSubmitEdicion);
  addListener(document.getElementById('filtroRol'), 'change', aplicarFiltros);
  addListener(document.getElementById('buscarUsuario'), 'input', aplicarFiltros);
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
  } else {
    domReadyHandler = () => {
      cargarUsuariosEmpresa();
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

    if (rolesDomReadyHandler) {
      document.removeEventListener('DOMContentLoaded', rolesDomReadyHandler);
      rolesDomReadyHandler = null;
    }

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