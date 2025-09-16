
(() => {
  const previousCleanup = window.__adminUsuariosCleanup;
  if (typeof previousCleanup === 'function') {
    previousCleanup();
  }

  const state = {
    usuarios: []
  };

  const listeners = [];
  let domReadyHandler = null;

  function addListener(element, event, handler) {
    if (!element) return;
    element.addEventListener(event, handler);
    listeners.push({ element, event, handler });
  }

  function obtenerConteoPorRol(usuarios) {
    return (usuarios || []).reduce((conteo, usuario) => {
      if (!usuario || !usuario.rol) return conteo;
      conteo[usuario.rol] = (conteo[usuario.rol] || 0) + 1;
      return conteo;
    }, {});
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
      totalUsuariosEl.textContent = state.usuarios.length;
    }

    if (totalRolesEl) {
      totalRolesEl.textContent = Object.keys(conteoPorRol || {}).length;
    }

    if (ultimaActualizacionEl) {
      const ahora = new Date();
      ultimaActualizacionEl.textContent = state.usuarios.length
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
=======
let usuariosEmpresa = [];

function cargarUsuariosEmpresa() {
  const id_empresa = localStorage.getItem('id_empresa');
  if (!id_empresa) {
    usuariosEmpresa = [];
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
        renderTabla([]);
        actualizarResumen({});
        renderMetricas({});
        return;
      }

      usuariosEmpresa = Array.isArray(data.usuarios) ? data.usuarios : [];
      const conteoPorRol = obtenerConteoPorRol(usuariosEmpresa);

      poblarFiltroRoles(Object.keys(conteoPorRol));
      actualizarResumen(conteoPorRol);
      renderMetricas(conteoPorRol);
      aplicarFiltros();
    })
    .catch(err => {
      console.error('Error al cargar usuarios:', err);
      usuariosEmpresa = [];
      renderTabla([]);
      actualizarResumen({});
      renderMetricas({});
    });
}

function obtenerConteoPorRol(usuarios) {
  return usuarios.reduce((conteo, usuario) => {
    if (!usuario || !usuario.rol) return conteo;
    conteo[usuario.rol] = (conteo[usuario.rol] || 0) + 1;
    return conteo;
  }, {});
}

function poblarFiltroRoles(roles) {
  const filtroRol = document.getElementById('filtroRol');
  if (!filtroRol) return;

  const rolesOrdenados = roles.slice().sort((a, b) => a.localeCompare(b));
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
    totalUsuariosEl.textContent = usuariosEmpresa.length;
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

function aplicarFiltros() {
  const filtroRol = document.getElementById('filtroRol');
  const buscador = document.getElementById('buscarUsuario');

  const rolSeleccionado = filtroRol ? filtroRol.value : '';
  const termino = buscador ? buscador.value.trim().toLowerCase() : '';

  const filtrados = usuariosEmpresa.filter(usuario => {
    const coincideRol = !rolSeleccionado || usuario.rol === rolSeleccionado;
    const textoUsuario = `${usuario.nombre || ''} ${usuario.apellido || ''} ${usuario.correo || ''} ${usuario.rol || ''}`.toLowerCase();
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
    tbody.innerHTML = '<tr class="empty-row"><td colspan="5">No se encontraron usuarios con los filtros aplicados.</td></tr>';
    if (contador) {
      contador.textContent = 'Sin usuarios disponibles';
    }
    return;
  }

  usuarios.forEach(usuario => {
    const tr = document.createElement('tr');
    const foto = usuario.foto_perfil ? `/${usuario.foto_perfil}` : '/images/profile.jpg';

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
      <td>
        <div class="action-buttons">
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

    if (botonEditar) {
      botonEditar.addEventListener('click', () => editarUsuario(usuario));
    }

    if (botonEliminar) {
      botonEliminar.addEventListener('click', () => confirmarEliminacion(usuario.correo));
    }

    tbody.appendChild(tr);
  });

  if (contador) {
    contador.textContent = usuarios.length === 1 ? '1 usuario encontrado' : `${usuarios.length} usuarios encontrados`;
  }
}

function editarUsuario(usuario) {
  document.getElementById('editar_id_usuario').value = usuario.id_usuario;
  document.getElementById('editar_nombre').value = usuario.nombre;
  document.getElementById('editar_apellido').value = usuario.apellido;
  document.getElementById('editar_telefono').value = usuario.telefono || '';
  document.getElementById('editar_nacimiento').value = usuario.fecha_nacimiento || '';
  document.getElementById('editar_correo').value = usuario.correo;
  document.getElementById('editar_rol').value = usuario.rol;

  const modal = new bootstrap.Modal(document.getElementById('modalEditarUsuario'));
  modal.show();
}

function confirmarEliminacion(correo) {
  if (confirm(`¿Estás seguro de que quieres eliminar al usuario ${correo}?`)) {
    if (confirm('Esta acción no se puede deshacer. ¿Deseas continuar?')) {
      eliminarUsuario(correo);

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


  function renderTabla(usuarios) {
    const tbody = document.querySelector('#tablaUsuariosEmpresa tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    const contador = document.getElementById('usuariosCount');
    if (!usuarios.length) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="5">No se encontraron usuarios con los filtros aplicados.</td></tr>';
      if (contador) {
        contador.textContent = 'Sin usuarios disponibles';
      }
      return;
    }

    usuarios.forEach(usuario => {
      const tr = document.createElement('tr');
      const foto = usuario.foto_perfil ? `/${usuario.foto_perfil}` : '/images/profile.jpg';

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
        <td>
          <div class="action-buttons">
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

      if (botonEditar) {
        botonEditar.addEventListener('click', () => editarUsuario(usuario));
      }

      if (botonEliminar) {
        botonEliminar.addEventListener('click', () => confirmarEliminacion(usuario.correo));
      }

      tbody.appendChild(tr);
    });

    if (contador) {
      contador.textContent = usuarios.length === 1 ? '1 usuario encontrado' : `${usuarios.length} usuarios encontrados`;
    }
  }

  function aplicarFiltros() {
    const filtroRol = document.getElementById('filtroRol');
    const buscador = document.getElementById('buscarUsuario');

    const rolSeleccionado = filtroRol ? filtroRol.value : '';
    const termino = buscador ? buscador.value.trim().toLowerCase() : '';

    const filtrados = state.usuarios.filter(usuario => {
      const coincideRol = !rolSeleccionado || usuario.rol === rolSeleccionado;
      const textoUsuario = `${usuario.nombre || ''} ${usuario.apellido || ''} ${usuario.correo || ''} ${usuario.rol || ''}`.toLowerCase();
      const coincideBusqueda = !termino || textoUsuario.includes(termino);
      return coincideRol && coincideBusqueda;
    });

    renderTabla(filtrados);
  }

  function cargarUsuariosEmpresa() {
    const id_empresa = localStorage.getItem('id_empresa');
    if (!id_empresa) {
      state.usuarios = [];
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
          state.usuarios = [];
          poblarFiltroRoles([]);
          renderTabla([]);
          actualizarResumen({});
          renderMetricas({});
          return;
        }

        state.usuarios = Array.isArray(data.usuarios) ? data.usuarios : [];
        const conteoPorRol = obtenerConteoPorRol(state.usuarios);

        poblarFiltroRoles(Object.keys(conteoPorRol));
        actualizarResumen(conteoPorRol);
        renderMetricas(conteoPorRol);
        aplicarFiltros();
      })
      .catch(err => {
        console.error('Error al cargar usuarios:', err);
        state.usuarios = [];
        poblarFiltroRoles([]);
        renderTabla([]);
        actualizarResumen({});
        renderMetricas({});
      });
  }

  function editarUsuario(usuario) {
    const idInput = document.getElementById('editar_id_usuario');
    const nombreInput = document.getElementById('editar_nombre');
    const apellidoInput = document.getElementById('editar_apellido');
    const telefonoInput = document.getElementById('editar_telefono');
    const nacimientoInput = document.getElementById('editar_nacimiento');
    const correoInput = document.getElementById('editar_correo');
    const rolSelect = document.getElementById('editar_rol');

    if (!idInput || !nombreInput || !apellidoInput || !telefonoInput || !nacimientoInput || !correoInput || !rolSelect) {
      return;
    }

    idInput.value = usuario.id_usuario;
    nombreInput.value = usuario.nombre || '';
    apellidoInput.value = usuario.apellido || '';
    telefonoInput.value = usuario.telefono || '';
    nacimientoInput.value = usuario.fecha_nacimiento || '';
    correoInput.value = usuario.correo || '';
    rolSelect.value = usuario.rol || '';

    const modalEl = document.getElementById('modalEditarUsuario');
    if (!modalEl) return;
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }

  function confirmarEliminacion(correo) {
    if (confirm(`¿Estás seguro de que quieres eliminar al usuario ${correo}?`)) {
      if (confirm('Esta acción no se puede deshacer. ¿Deseas continuar?')) {
        eliminarUsuario(correo);

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

document.getElementById('formEditarUsuario').addEventListener('submit', function (e) {
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

    const id = document.getElementById('editar_id_usuario');
    const nombre = document.getElementById('editar_nombre');
    const apellido = document.getElementById('editar_apellido');
    const telefono = document.getElementById('editar_telefono');
    const nacimiento = document.getElementById('editar_nacimiento');
    const rol = document.getElementById('editar_rol');

    if (!id || !nombre || !apellido || !telefono || !nacimiento || !rol) {
      alert('❌ No se pudo encontrar el formulario de edición.');
      return;
    }

    const datos = {
      id_usuario: parseInt(id.value, 10),
      nombre: nombre.value,
      apellido: apellido.value,
      telefono: telefono.value,
      fecha_nacimiento: nacimiento.value,
      rol: rol.value
    };

    fetch('/scripts/php/editar_usuario_empresa.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    })

      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const modalEl = document.getElementById('modalEditarUsuario');
          const modal = modalEl ? bootstrap.Modal.getInstance(modalEl) : null;
          if (modal) {
            modal.hide();
          }
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

  window.__adminUsuariosCleanup = () => {
    listeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    listeners.length = 0;

    if (domReadyHandler) {
      document.removeEventListener('DOMContentLoaded', domReadyHandler);
      domReadyHandler = null;
    }
  };
})();

    .catch(err => {
      console.error('❌', err);
      alert('❌ Error al guardar');
    });
});

function exportarExcel() {
  const tabla = document.getElementById('tablaUsuariosEmpresa');
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

const filtroRol = document.getElementById('filtroRol');
const buscador = document.getElementById('buscarUsuario');

if (filtroRol) {
  filtroRol.addEventListener('change', aplicarFiltros);
}

if (buscador) {
  buscador.addEventListener('input', aplicarFiltros);
}

if (document.readyState !== 'loading') {
  cargarUsuariosEmpresa();
} else {
  document.addEventListener('DOMContentLoaded', cargarUsuariosEmpresa);
}

