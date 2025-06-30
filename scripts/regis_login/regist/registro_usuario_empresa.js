document.getElementById('registerForm').addEventListener('submit', function(event) {
    event.preventDefault();

const id_empresa = localStorage.getItem('id_empresa');

    const data = {
        nombre: document.getElementById('nombre').value,
        apellido: document.getElementById('apellido').value,
        fecha_nacimiento: document.getElementById('nacimiento').value,
        telefono: document.getElementById('tel').value,
        correo: document.getElementById('email').value,
        contrasena: document.getElementById('password').value,
        rol: document.getElementById('rol').value,
        id_empresa: id_empresa
    };

    fetch('/scripts/php/registro_usuario_empresa.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(response => {
        if (response.success) {
            alert("Usuario registrado correctamente");
            localStorage.setItem('cargarVista', 'pages/admin_usuar/administracion_usuarios.html');
            window.location.href = "../main_menu/main_menu.html";
        } else {
            alert("Error: " + response.message);
        }
    })
    .catch(err => {
        console.error(err);
        alert("Ocurrió un error en el registro.");
    });
});
