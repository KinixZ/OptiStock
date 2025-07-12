document.addEventListener('DOMContentLoaded', () => {
  const userForm = document.getElementById('userForm');
  const userMessage = document.getElementById('userMessage');
  const fotoPerfilPreview = document.getElementById('fotoPerfilPreview');
  const fotoInput = document.getElementById('fotoPerfil');

  // Cargar datos reales del usuario
  fetch('/scripts/php/get_user_info.php')
    .then(res => res.json())
    .then(data => {
      if (!data.success) throw new Error(data.message);
      const user = data.data;
      console.log('Foto perfil desde backend:', user.foto_perfil);
      const fotoPerfil = user.foto_perfil ? '/' + user.foto_perfil.replace(/^\/?/, '') : '/images/profile.jpg';
      console.log('Ruta final asignada al src:', fotoPerfil);

      console.log('Asignando src a fotoPerfilPreview:', fotoPerfil);
      if (fotoPerfilPreview) {
        fotoPerfilPreview.src = fotoPerfil;
      }

      document.getElementById('nombreCompleto').textContent = user.nombre + ' ' + user.apellido;
      document.getElementById('correoUsuario').textContent = user.correo;
      if(document.getElementById('telefonoUsuario')) {
        document.getElementById('telefonoUsuario').textContent = user.telefono;
      }

      document.getElementById('nombre').value = user.nombre;
      document.getElementById('apellido').value = user.apellido;
      document.getElementById('correo').value = user.correo;
      document.getElementById('telefono').value = user.telefono;
      // Puedes cargar más campos aquí si los tienes
    })
    .catch(e => {
      userMessage.textContent = 'Error cargando datos: ' + e.message;
    });

  // Vista previa de la foto de perfil seleccionada
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

  // Guardar cambios (datos y foto)
  userForm.addEventListener('submit', e => {
    e.preventDefault();

    // Si hay foto seleccionada, usar FormData para enviar todo
    if (fotoInput && fotoInput.files[0]) {
      const formData = new FormData(userForm);
      fetch('/scripts/php/upload_foto_perfil.php', {
        method: 'POST',
        body: formData
      })
      .then(res => res.json())
      .then(data => {
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
      });
    }
  });
});