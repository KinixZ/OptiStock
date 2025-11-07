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

    const notify = (type, message) => {
        const fn = type === 'success'
            ? window.toastOk
            : type === 'error'
                ? window.toastError
                : window.toastInfo;
        if (typeof fn === 'function') {
            fn(message);
        } else {
            alert(message);
        }
    };

    fetch('/scripts/php/registro_usuario_empresa.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(response => {
        if (response.success) {
            localStorage.setItem('usuariosEmpresa:recargar', Date.now().toString());
            notify('success', 'Usuario registrado correctamente');
            localStorage.setItem('cargarVista', 'admin_usuar/administracion_usuarios.html');
            setTimeout(() => {
                window.location.href = "../main_menu/main_menu.html";
            }, 600);
        } else {
            notify('error', "Error: " + response.message);
        }
    })
    .catch(err => {
        console.error(err);
        notify('error', 'Ocurrió un error en el registro.');
    });
});
