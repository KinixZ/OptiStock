(() => {
  let usuariosEmpresa = [];
  const listeners = [];
  let domReadyHandler = null;
  let cacheAreasZonas = null;
  let solicitudAreas = null;
  let usuarioAccesosSeleccionadoId = null;
  let asignacionEnCurso = false;

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
  const formAsignarAcceso = document.getElementById('formAsignarAcceso');
  const botonAgregarAcceso = document.getElementById('btnAgregarAcceso');
  let modalAsignarInstancia = null;

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

  function poblarSelectZona(areaId) {
    if (!selectZona) return;

    selectZona.innerHTML = '';
    if (!areaId) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'Selecciona un área primero';
      selectZona.appendChild(option);
      selectZona.disabled = true;
      return;
    }

    const areaSeleccionada = (cacheAreasZonas || []).find(item => String(item?.area?.id) === String(areaId));
    selectZona.disabled = false;

    const opcionTodas = document.createElement('option');
    opcionTodas.value = '';
    opcionTodas.textContent = 'Todas las zonas';
    selectZona.appendChild(opcionTodas);

    (areaSeleccionada?.zonas || []).forEach(zona => {
      const option = document.createElement('option');
      option.value = zona.id;
      option.textContent = zona.nombre;
      selectZona.appendChild(option);
    });
  }

  function manejarCambioArea(event) {
    const areaId = event?.target?.value || '';
    poblarSelectZona(areaId);
  }

  function actualizarResumenAccesosModal(accesos) {
    if (!resumenAccesosUsuario) return;
    if (!Array.isArray(accesos) || !accesos.length) {
      resumenAccesosUsuario.textContent = 'Acceso completo';
      return;
    }

    const totalAreas = new Set(accesos.map(a => a.id_area)).size;
    const totalZonas = accesos.filter(a => a.id_zona).length;
    const zonasLibres = accesos.filter(a => !a.id_zona).length;

    if (zonasLibres) {
      resumenAccesosUsuario.textContent = `${totalAreas} área(s) con acceso total`;
    } else if (totalZonas) {
      resumenAccesosUsuario.textContent = `${totalZonas} zona(s) asignada(s) en ${totalAreas} área(s)`;
    } else {
      resumenAccesosUsuario.textContent = 'Acceso personalizado';
    }
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

      const zonaTexto = acceso?.zona ? escapeHtml(acceso.zona) : 'Todas las zonas';
      const areaTexto = escapeHtml(acceso?.area || `Área #${acceso?.id_area}`);

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
      const zonaTexto = acceso?.zona ? escapeHtml(acceso.zona) : 'Todas las zonas';
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
      tituloModalAccesos.textContent = 'Gestionar accesos por área y zona';
    }

    if (descripcionModalAccesos) {
      descripcionModalAccesos.textContent = 'Define a qué áreas y zonas puede acceder el colaborador seleccionado.';
    }

    if (nombreUsuarioAccesos) {
      const nombreCompleto = `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim();
      nombreUsuarioAccesos.textContent = nombreCompleto || usuario.correo || `ID ${usuario.id_usuario}`;
    }

    if (formAsignarAcceso) {
      formAsignarAcceso.reset();
    }

    if (selectZona) {
      selectZona.innerHTML = '<option value="">Selecciona un área primero</option>';
      selectZona.disabled = true;
    }

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

    const areaSeleccionada = selectArea ? parseInt(selectArea.value, 10) : 0;
    const zonaSeleccionada = selectZona && selectZona.value ? parseInt(selectZona.value, 10) : null;

    if (!areaSeleccionada) {
      alert('Debes seleccionar un área para continuar.');
      return;
    }

    asignacionEnCurso = true;
    if (botonAgregarAcceso) {
      botonAgregarAcceso.disabled = true;
      botonAgregarAcceso.textContent = 'Guardando...';
    }

    fetch('/scripts/php/guardar_acceso_usuario.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_usuario: usuarioAccesosSeleccionadoId,
        id_area: areaSeleccionada,
        id_zona: zonaSeleccionada
      })
    })
      .then(res => res.json())
      .then(data => {
        if (!data?.success) {
          alert(data?.message || 'No se pudo guardar la asignación.');
          return;
        }
        actualizarAccesosUsuario(usuarioAccesosSeleccionadoId, true);
      })
      .catch(err => {
        console.error('Error al guardar la asignación:', err);
        alert('Ocurrió un error al guardar la asignación.');
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
        if (selectZona) {
          selectZona.innerHTML = '<option value="">Selecciona un área primero</option>';
          selectZona.disabled = true;
        }
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

    fetch('/scripts/php/eliminar_acceso_usuario.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        if (!data?.success) {
          alert(data?.message || 'No se pudo eliminar la asignación.');
          return;
        }
        actualizarAccesosUsuario(usuarioAccesosSeleccionadoId, true);
      })
      .catch(err => {
        console.error('Error al eliminar la asignación:', err);
        alert('Ocurrió un error al eliminar la asignación.');
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
      const textoUsuario = `${usuario.nombre || ''} ${usuario.apellido || ''} ${usuario.correo || ''} ${usuario.rol || ''} ${estadoTexto}`.toLowerCase();
      const coincideBusqueda = !termino || textoUsuario.includes(termino);
      return coincideRol && coincideBusqueda;
    });

    renderTabla(filtrados);
  }

  function renderTabla(usuarios) {
    const tbody = document.querySelector('#tablaUsuariosEmpresa tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    const contador = document.getElementById('usuariosCount');
    if (!usuarios.length) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No se encontraron usuarios con los filtros aplicados.</td></tr>';
      if (contador) {
        contador.textContent = 'Sin usuarios disponibles';
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

      tr.innerHTML = `
        <td>
          <div class="user-cell">
            <img src="${foto}" class="user-photo" alt="Foto de ${usuario.nombre || ''}" />
            <span>${usuario.nombre || ''}</span>
          </div>
        </td>
        <td>${usuario.apellido || ''}</td>
        <td><span class="cell-email">${usuario.correo || ''}</span></td>
        <td><span class="role-chip">${usuario.rol || ''}</span></td>
        <td><span class="${estadoClase}">${estadoTexto}</span></td>
        <td class="access-cell">${resumenAccesos}</td>
        <td>
          <div class="action-buttons">
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
        </td>
      `;

      const botonEditar = tr.querySelector('.btn-action--edit');
      const botonEliminar = tr.querySelector('.btn-action--delete');
      const botonEstado = tr.querySelector('.btn-action--status');
      const botonAccesos = tr.querySelector('.btn-action--access');

      if (botonEditar) {
        botonEditar.addEventListener('click', () => editarUsuario(usuario));
      }

      if (botonEliminar) {
        botonEliminar.addEventListener('click', () => confirmarEliminacion(usuario.correo));
      }

      if (botonEstado) {
        botonEstado.addEventListener('click', () => cambiarEstadoUsuario(usuario));
      }

      if (botonAccesos) {
        botonAccesos.addEventListener('click', () => abrirModalAccesos(usuario));
      }

      tbody.appendChild(tr);
    });

    if (contador) {
      contador.textContent = usuarios.length === 1 ? '1 usuario encontrado' : `${usuarios.length} usuarios encontrados`;
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

    fetch('/scripts/php/actualizar_estado_usuario.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_usuario: usuario.id_usuario,
        activo: nuevoEstado,
        id_empresa
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          cargarUsuariosEmpresa();
        } else {
          alert('❌ No se pudo actualizar el estado: ' + (data.message || 'Error desconocido.'));
        }
      })
      .catch(err => {
        console.error('Error al cambiar estado:', err);
        alert('❌ Error al actualizar el estado del usuario.');
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
    fetch('/scripts/php/eliminar_usuario_empresa.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          cargarUsuariosEmpresa();
        } else {
          alert('❌ No se pudo eliminar: ' + data.message);
        }
      })
      .catch(err => {
        console.error('Error eliminando usuario:', err);
        alert('❌ Error al eliminar usuario.');
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

    fetch('/scripts/php/editar_usuario_empresa.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const modal = bootstrap.Modal.getInstance(document.getElementById('modalEditarUsuario'));
          modal.hide();
          cargarUsuariosEmpresa();
        } else {
          alert('❌ Error: ' + data.message);
        }
      })
      .catch(err => {
        console.error('❌', err);
        alert('❌ Error al guardar');
      });
  }

  function cargarUsuariosEmpresa() {
    const id_empresa = localStorage.getItem('id_empresa');
    if (!id_empresa) {
      usuariosEmpresa = [];
      poblarFiltroRoles([]);
      renderTabla([]);
      actualizarResumen({});
      renderMetricas({});
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
          poblarFiltroRoles([]);
          renderTabla([]);
          actualizarResumen({});
          renderMetricas({});
          return;
        }

        usuariosEmpresa = Array.isArray(data.usuarios)
          ? data.usuarios.map(usuario => ({
              ...usuario,
              activo: Number(usuario.activo),
              accesos: Array.isArray(usuario.accesos) ? usuario.accesos : []
            }))
          : [];
        const conteoPorRol = obtenerConteoPorRol(usuariosEmpresa);

        poblarFiltroRoles(Object.keys(conteoPorRol));
        actualizarResumen(conteoPorRol);
        renderMetricas(conteoPorRol);
        aplicarFiltros();
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

  function exportarExcel() {
    const tabla = document.getElementById('tablaUsuariosEmpresa');
    if (!tabla) {
      alert('❌ No se encontró la tabla de usuarios.');
      return;
    }
    const wb = XLSX.utils.table_to_book(tabla, { sheet: 'Usuarios' });
    XLSX.writeFile(wb, 'usuarios_empresa.xlsx');
  }

  async function exportarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    if (typeof doc.autoTable !== 'function') {
      console.error('❌ AutoTable no está disponible en jsPDF.');
      alert('❌ Error: jsPDF-AutoTable no está disponible.');
      return;
    }

    const tabla = document.getElementById('tablaUsuariosEmpresa');
    if (!tabla) {
      alert('❌ No se encontró la tabla de usuarios.');
      return;
    }

    const rows = [...tabla.rows].map(row => [...row.cells].map(cell => cell.innerText));
    const [header, ...body] = rows;

    doc.text('Usuarios de la Empresa', 14, 16);
    doc.autoTable({
      head: [header],
      body,
      startY: 22,
      styles: { fontSize: 10 }
    });

    doc.save('usuarios_empresa.pdf');
  }

  window.exportarExcel = exportarExcel;
  window.exportarPDF = exportarPDF;

  addListener(document.getElementById('formEditarUsuario'), 'submit', manejarSubmitEdicion);
  addListener(document.getElementById('filtroRol'), 'change', aplicarFiltros);
  addListener(document.getElementById('buscarUsuario'), 'input', aplicarFiltros);
  addListener(formAsignarAcceso, 'submit', manejarAsignacionAcceso);
  addListener(selectArea, 'change', manejarCambioArea);
  addListener(modalAsignar, 'hidden.bs.modal', () => {
    usuarioAccesosSeleccionadoId = null;
    asignacionEnCurso = false;
    if (formAsignarAcceso) {
      formAsignarAcceso.reset();
    }
    if (selectZona) {
      selectZona.innerHTML = '<option value="">Selecciona un área primero</option>';
      selectZona.disabled = true;
    }
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