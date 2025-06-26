document.addEventListener("DOMContentLoaded", () => {
    const tablaBody = document.querySelector("#tablaUsuarios tbody");
    const form = document.getElementById("crearUsuarioForm");
    const idEmpresa = localStorage.getItem('id_empresa');
    const idAdmin = localStorage.getItem('usuario_id');

    if (!idEmpresa || !idAdmin) {
        alert("Falta información de sesión. Vuelve a iniciar sesión.");
        return;
    }

    // 🔄 1. Cargar usuarios existentes
    function cargarUsuarios() {
        fetch('/scripts/php/listar_usuarios_empresa.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_empresa: idEmpresa })
        })
        .then(res => res.json())
        .then(data => {
            tablaBody.innerHTML = "";
            data.usuarios.forEach(usuario => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${usuario.nombre} ${usuario.apellido}</td>
                    <td>${usuario.correo}</td>
                    <td>${usuario.telefono}</td>
                    <td>${usuario.rol}</td>
                    <td>
                        <button class="btn btn-sm btn-warning" onclick="editarUsuario(${usuario.id_usuario})">Editar</button>
                        <button class="btn btn-sm btn-danger" onclick="eliminarUsuario(${usuario.id_usuario})">Eliminar</button>
                    </td>
                `;
                tablaBody.appendChild(row);
            });
        })
        .catch(err => {
            console.error("Error al cargar usuarios:", err);
            tablaBody.innerHTML = `<tr><td colspan="5">Error al cargar usuarios.</td></tr>`;
        });
    }

    cargarUsuarios(); // Llamamos al inicio

    // ➕ 2. Crear nuevo usuario
    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const datos = Object.fromEntries(new FormData(form));
        datos.id_empresa = idEmpresa;

        fetch('/scripts/php/registro_usuario_empresa.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert("✅ Usuario creado correctamente.");
                form.reset();
                cargarUsuarios();
            } else {
                alert("❌ Error: " + (data.message || "No se pudo crear el usuario."));
            }
        })
        .catch(err => {
            console.error("Error creando usuario:", err);
            alert("❌ Error al enviar los datos.");
        });
    });
});

// 🔧 3. Funciones para editar y eliminar (más adelante puedes completarlas)
function editarUsuario(id_usuario) {
    alert("Función de edición aún no implementada para usuario ID: " + id_usuario);
}

function eliminarUsuario(id_usuario) {
    if (!confirm("¿Seguro que deseas eliminar este usuario?")) return;

    fetch('/scripts/php/eliminar_usuario.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_usuario })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert("🗑️ Usuario eliminado correctamente.");
            location.reload();
        } else {
            alert("❌ Error al eliminar: " + data.message);
        }
    })
    .catch(err => {
        console.error("Error al eliminar usuario:", err);
        alert("❌ No se pudo eliminar.");
    });
}
