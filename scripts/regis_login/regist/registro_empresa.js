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
const logoFile = document.getElementById('logo_empresa').files[0];
if (logoFile) formData.append('logo_empresa', logoFile);
formData.append('sector_empresa', document.getElementById('sector_empresa').value);
formData.append('usuario_creador', localStorage.getItem('usuario_id'));

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
            window.location.href = '../../main_menu/main_menu.html'; // Redirigir al menú principal
        } else {
            alert('Hubo un error al registrar la empresa: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error); // Si ocurre un error con la solicitud
        alert('Error en la solicitud');
    });
});
