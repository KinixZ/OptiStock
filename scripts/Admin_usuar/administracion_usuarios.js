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
                tr.innerHTML = `<td>${u.nombre}</td><td>${u.apellido}</td><td>${u.correo}</td><td>${u.rol}</td>`;
                tbody.appendChild(tr);
            });
        }
    });
}

// Ejecutarla directamente si ya cargó el DOM
if (document.readyState !== 'loading') {
    cargarUsuariosEmpresa();
} else {
    document.addEventListener("DOMContentLoaded", cargarUsuariosEmpresa);
}
