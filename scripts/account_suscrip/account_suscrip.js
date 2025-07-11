document.addEventListener('DOMContentLoaded', () => {
  const userForm = document.getElementById('userForm');
  const userMessage = document.getElementById('userMessage');

  // Cargar datos reales del usuario
  fetch('/scripts/php/get_user_info.php')
    .then(res => res.json())
    .then(data => {
      if (!data.success) throw new Error(data.message);
      const user = data.data;

      document.getElementById('nombre').value = user.nombre;
      document.getElementById('apellido').value = user.apellido;
      document.getElementById('correo').value = user.correo;
      document.getElementById('telefono').value = user.telefono;

      // Aquí podrías también cargar info de suscripción, si tienes otra API o campo
      // Ejemplo: document.getElementById('planNombre').textContent = user.plan;
    })
    .catch(e => {
      userMessage.textContent = 'Error cargando datos: ' + e.message;
    });

  // Guardar cambios
  userForm.addEventListener('submit', e => {
    e.preventDefault();

    const payload = {
      nombre: userForm.nombre.value.trim(),
      apellido: userForm.apellido.value.trim(),
      telefono: userForm.telefono.value.trim(),
      contrasena: userForm.contrasena.value // puede estar vacía
    };

    fetch('/scripts/php/update_user_info.php', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
      if(data.success) {
        userMessage.textContent = data.message;
        userForm.contrasena.value = ''; // limpiar campo
      } else {
        userMessage.textContent = 'Error: ' + data.message;
      }
      setTimeout(() => userMessage.textContent = '', 3000);
    })
    .catch(err => {
      userMessage.textContent = 'Error al guardar: ' + err.message;
    });
  });
});
