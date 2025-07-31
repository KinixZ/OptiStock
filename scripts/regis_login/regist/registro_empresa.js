document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const uid = params.get('user_id');
    const email = params.get('email');

    if (uid) {
        localStorage.setItem('usuario_id', uid);
    }
    if (email) {
        sessionStorage.setItem('email', email);
    }

    document.getElementById('registerForm').addEventListener('submit', function(e) {
        e.preventDefault();

    // Obtener el ID del usuario desde localStorage
    const usuario_id = localStorage.getItem('usuario_id');
    console.log("ID del usuario:", usuario_id);  // Verifica si el ID se obtiene correctamente

    // Verificar que el ID no sea undefined
    if (!usuario_id) {
        alert('No se ha encontrado el ID del usuario. Por favor, inicie sesión nuevamente.');
        return;
    }

    // Crear un nuevo objeto FormData
    const formData = new FormData();
    formData.append('nombre_empresa', document.getElementById('nombre_empresa').value);
    formData.append('logo_empresa', document.getElementById('logo_empresa').files[0]);
    formData.append('sector_empresa', document.getElementById('sector_empresa').value);
    formData.append('usuario_creador', usuario_id); // Pasa el ID del usuario al backend

    // Enviar los datos del formulario al archivo PHP mediante AJAX
    fetch('../../../scripts/php/registro_empresa.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        console.log(data);  // Ver el contenido de la respuesta JSON en la consola
        if (data.success) {
            alert('Empresa registrada con éxito');
            const mail = sessionStorage.getItem('email');
            window.location.href = 'regist_inter.html?email=' + encodeURIComponent(mail);
        } else {
            alert('Hubo un error al registrar la empresa: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error); // Si ocurre un error con la solicitud
        alert('Error en la solicitud');
    });
});
});
