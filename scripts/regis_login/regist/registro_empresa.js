document.getElementById('registerForm').addEventListener('submit', function(e) {
    e.preventDefault();

    // Crear un nuevo objeto FormData
    const formData = new FormData();
    formData.append('nombre_empresa', document.getElementById('nombre_empresa').value);
    formData.append('logo_empresa', document.getElementById('logo_empresa').files[0]);
    formData.append('sector_empresa', document.getElementById('sector_empresa').value);
    formData.append('usuario_creador', localStorage.getItem('usuario_id')); // Obtener el ID del usuario desde localStorage

    // Enviar los datos del formulario al archivo PHP mediante AJAX
    fetch('../../../scripts/php/register_empresa.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        console.log(data); // Ver el contenido de la respuesta JSON en la consola
        if (data.success) {
            alert('Empresa registrada con éxito');
            window.location.href = '../../main_menu/main_menu.html'; // Redirigir al menú principal
        } else {
            alert('Hubo un error al registrar la empresa: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error en la solicitud');
    });
});
