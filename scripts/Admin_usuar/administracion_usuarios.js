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
              <button class="btn-editar" onclick="editarUsuario('${u.correo}')">✏️</button>
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


// Ejecutarla directamente si ya cargó el DOM
if (document.readyState !== 'loading') {
    cargarUsuariosEmpresa();
} else {
    document.addEventListener("DOMContentLoaded", cargarUsuariosEmpresa);
}
