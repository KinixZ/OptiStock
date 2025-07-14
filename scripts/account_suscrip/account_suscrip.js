document.addEventListener('DOMContentLoaded', () => {
  const userForm = document.getElementById('userForm');
  const userMessage = document.getElementById('userMessage');
  const fotoInput = document.getElementById('fotoPerfil');
  const fotoPerfilPreview = document.getElementById('fotoPerfilPreview');

  // 1. Mostrar SIEMPRE la foto de perfil desde localStorage
  const fotoPerfilLS = localStorage.getItem('foto_perfil');
  console.log('foto_perfil en localStorage:', fotoPerfilLS);
  if (fotoPerfilPreview && fotoPerfilLS) {
    fotoPerfilPreview.src = fotoPerfilLS;
  }

  // 2. Autollenar datos del usuario (excepto foto)
  fetch('/scripts/php/get_user_info.php')
    .then(res => res.json())
    .then(data => {
      console.log('Respuesta get_user_info.php:', data);
      if (!data.success) throw new Error(data.message);
      const user = data.data;
      document.getElementById('nombreCompleto').textContent = user.nombre + ' ' + user.apellido;
      document.getElementById('correoUsuario').textContent = user.correo;
      document.getElementById('nombre').value = user.nombre;
      document.getElementById('apellido').value = user.apellido;
      document.getElementById('correo').value = user.correo;
      document.getElementById('telefono').value = user.telefono;
    })
    .catch(e => {
      userMessage.textContent = 'Error cargando datos: ' + e.message;
      console.error(e);
    });

  // 3. Vista previa de la foto seleccionada
  if (fotoInput && fotoPerfilPreview) {
    fotoInput.addEventListener('change', function (e) {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (evt) {
          fotoPerfilPreview.src = evt.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // 4. Guardar cambios (datos y foto)
  userForm.addEventListener('submit', e => {
    e.preventDefault();
    console.log('Submit detectado');
    if (fotoInput && fotoInput.files[0]) {
      const formData = new FormData(userForm);
      fetch('/scripts/php/upload_foto_perfil.php', {
        method: 'POST',
        body: formData
      })
      .then(res => res.json())
      .then(data => {
        console.log('Respuesta upload_foto_perfil.php:', data);
        if (data.success) {
          userMessage.textContent = data.message || 'Datos actualizados correctamente';
          if (data.foto_perfil) {
            fotoPerfilPreview.src = data.foto_perfil;
            localStorage.setItem('foto_perfil', data.foto_perfil);
          }
          userForm.contrasena.value = '';
        } else {
          userMessage.textContent = 'Error: ' + data.message;
        }
        setTimeout(() => userMessage.textContent = '', 3000);
      })
      .catch(err => {
        userMessage.textContent = 'Error al guardar: ' + err.message;
        console.error(err);
      });
    } else {
      // Si no hay foto, solo actualiza datos
      const payload = {
        nombre: userForm.nombre.value.trim(),
        apellido: userForm.apellido.value.trim(),
        telefono: userForm.telefono.value.trim(),
        contrasena: userForm.contrasena ? userForm.contrasena.value : ''
      };
      fetch('/scripts/php/update_user_info.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
      })
      .then(res => res.json())
      .then(data => {
        console.log('Respuesta update_user_info.php:', data);
        if(data.success) {
          userMessage.textContent = data.message;
          userForm.contrasena.value = '';
        } else {
          userMessage.textContent = 'Error: ' + data.message;
        }
        setTimeout(() => userMessage.textContent = '', 3000);
      })
      .catch(err => {
        userMessage.textContent = 'Error al guardar: ' + err.message;
        console.error(err);
      });
    }
  });
});