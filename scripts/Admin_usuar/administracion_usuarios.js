function cargarUsuariosEmpresa() {
  const id_empresa = localStorage.getItem('id_empresa');
  fetch('/scripts/php/obtener_usuarios_empresa.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_empresa: id_empresa })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        const tbody = document.querySelector('#tablaUsuariosEmpresa tbody');
        tbody.innerHTML = ''; // limpiar tabla
        data.usuarios.forEach(u => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${u.nombre}</td>
            <td>${u.apellido}</td>
            <td>${u.correo}</td>
            <td>${u.rol}</td>
            <td style="text-align:center;">
              <button class="btn-editar" onclick='editarUsuario(${JSON.stringify(u)})'>✏️</button>
              <button class="btn-eliminar" onclick="confirmarEliminacion('${u.correo}')">🗑️</button>
            </td>
          `;
          tbody.appendChild(tr);
        });
      }
    });
}

function editarUsuario(correo) {
  alert(`Editar usuario: ${correo}`);
  // Aquí puedes abrir un modal con el form ya llenado para editar
}

function confirmarEliminacion(correo) {
  if (confirm(`¿Estás seguro de que quieres eliminar al usuario ${correo}?`)) {
    if (confirm("Esta acción no se puede deshacer. ¿Deseas continuar?")) {
      eliminarUsuario(correo);
    }
  }
}

function eliminarUsuario(correo) {
  fetch('/scripts/php/eliminar_usuario_empresa.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo: correo })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        alert("✅ Usuario eliminado correctamente");
        cargarUsuariosEmpresa();
      } else {
        alert("❌ No se pudo eliminar: " + data.message);
      }
    })
    .catch(err => {
      console.error("Error eliminando usuario:", err);
      alert("❌ Error al eliminar usuario.");
    });
}

function editarUsuario(usuario) {
  document.getElementById('editar_id_usuario').value = usuario.id_usuario;
  document.getElementById('editar_nombre').value = usuario.nombre;
  document.getElementById('editar_apellido').value = usuario.apellido;
  document.getElementById('editar_telefono').value = usuario.telefono || '';
  document.getElementById('editar_nacimiento').value = usuario.fecha_nacimiento || '';
  document.getElementById('editar_correo').value = usuario.correo;
  document.getElementById('editar_rol').value = usuario.rol;

  // Mostrar modal (Bootstrap)
  const modal = new bootstrap.Modal(document.getElementById('modalEditarUsuario'));
  modal.show();
}


document.getElementById('formEditarUsuario').addEventListener('submit', function (e) {
  e.preventDefault();

  const datos = {
    id_usuario: parseInt(document.getElementById('editar_id_usuario').value),
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
        alert("✅ Cambios guardados");
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalEditarUsuario'));
        modal.hide();
        cargarUsuariosEmpresa();
      } else {
        alert("❌ Error: " + data.message);
      }
    })
    .catch(err => {
      console.error("❌", err);
      alert("❌ Error al guardar");
    });
});



// Ejecutarla directamente si ya cargó el DOM
if (document.readyState !== 'loading') {
    cargarUsuariosEmpresa();
} else {
    document.addEventListener("DOMContentLoaded", cargarUsuariosEmpresa);
}
