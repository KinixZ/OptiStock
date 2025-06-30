function cargarUsuariosEmpresa() {
  const id_empresa = localStorage.getItem('id_empresa');
  if (!id_empresa) return;

  fetch('/scripts/php/obtener_usuarios_empresa.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_empresa: id_empresa })
  })
    .then(res => res.json())
    .then(data => {
      if (!data.success) return;

      const tbody = document.querySelector('#tablaUsuariosEmpresa tbody');
      tbody.innerHTML = ''; // limpiar tabla
      const conteoPorRol = {};

      data.usuarios.forEach(u => {
        conteoPorRol[u.rol] = (conteoPorRol[u.rol] || 0) + 1;

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

      // Mostrar métricas
      const metricas = document.getElementById('metricasUsuarios');
      if (metricas) {
        metricas.innerHTML = '';
        for (const rol in conteoPorRol) {
          metricas.innerHTML += `
            <div class="col-md-3">
              <div class="card text-center shadow-sm border-0">
                <div class="card-body">
                  <h5 class="card-title">${rol}</h5>
                  <p class="card-text fs-4 fw-bold">${conteoPorRol[rol]}</p>
                </div>
              </div>
            </div>
          `;
        }
      }
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

  const modal = new bootstrap.Modal(document.getElementById('modalEditarUsuario'));
  modal.show();
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

function exportarExcel() {
  const tabla = document.getElementById('tablaUsuariosEmpresa');
  const wb = XLSX.utils.table_to_book(tabla, { sheet: "Usuarios" });
  XLSX.writeFile(wb, "usuarios_empresa.xlsx");
}

async function exportarPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.text("Usuarios de la Empresa", 14, 16);

  const tabla = document.getElementById("tablaUsuariosEmpresa");
  const rows = [...tabla.rows].map(row => [...row.cells].map(cell => cell.innerText));
  const [header, ...body] = rows;

  doc.autoTable({
    head: [header],
    body: body,
    startY: 22,
    styles: { fontSize: 10 }
  });

  doc.save("usuarios_empresa.pdf");
}

// Cargar usuarios al iniciar
if (document.readyState !== 'loading') {
  cargarUsuariosEmpresa();
} else {
  document.addEventListener("DOMContentLoaded", cargarUsuariosEmpresa);
}
