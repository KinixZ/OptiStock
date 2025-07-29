
console.log('Script cargado');

async function loadAccountData(id) {
  try {
    const resp = await fetch(`/scripts/php/get_account_data.php?usuario_id=${id}`);
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }
    return await resp.json();
  } catch (err) {
    console.error('Error loading account data:', err);
    return null;
  }
}

document.addEventListener('DOMContentLoaded', async () => {

document.addEventListener('DOMContentLoaded', () => {

  // Obtener datos de localStorage
  const el = document.getElementById('nombreCompleto');
  if (el) {
    el.textContent = 'Prueba de carga JS correcta';
  } else {
    console.error('Elemento nombreCompleto NO encontrado');
  }
  
  const usuarioId = localStorage.getItem('usuario_id');
  const usuarioEmail = localStorage.getItem('usuario_email');
  const usuarioNombre = localStorage.getItem('usuario_nombre');
  const usuarioRol = localStorage.getItem('usuario_rol');
  const usuarioSuscripcion = localStorage.getItem('usuario_suscripcion');
  const empresaNombre = localStorage.getItem('empresa_nombre');
  const fotoPerfil = localStorage.getItem('foto_perfil');
  const idEmpresa = localStorage.getItem('id_empresa');

  // Mostrar datos básicos en pantalla
  document.getElementById('nombreCompleto').textContent = usuarioNombre || '';
  document.getElementById('correoUsuario').textContent = usuarioEmail || '';
  document.getElementById('nombreEmpresa').textContent = empresaNombre || '';
  if(fotoPerfil){
    document.getElementById('fotoPerfil').src = fotoPerfil;
  }

  // Cargar datos completos del backend para mostrar detalles y sincronizar UI

  const data = await loadAccountData(usuarioId);
  if (data && data.success) {
    // Actualizar UI con datos recibidos (puedes ajustar campos según respuesta)
    document.getElementById('usuario_nombre').textContent = data.usuario.nombre + ' ' + data.usuario.apellido;
    document.getElementById('usuario_email').textContent = data.usuario.correo;
    if (data.usuario.foto_perfil) {
      document.getElementById('profile_img').src = data.usuario.foto_perfil;
      localStorage.setItem('foto_perfil', data.usuario.foto_perfil);
    }
    document.getElementById('empresa_nombre').textContent = data.empresa.nombre_empresa;
    localStorage.setItem('empresa_nombre', data.empresa.nombre_empresa);
    localStorage.setItem('id_empresa', data.empresa.id_empresa);

  fetch(`/scripts/php/get_account_data.php?usuario_id=${usuarioId}`)
    .then(res => res.json())
    .then(data => {
      if(data.success){
        // Actualizar UI con datos recibidos (puedes ajustar campos según respuesta)
        document.getElementById('usuario_nombre').textContent = data.usuario.nombre + ' ' + data.usuario.apellido;
        document.getElementById('usuario_email').textContent = data.usuario.correo;
        document.getElementById('telefonoUsuario').textContent = data.usuario.telefono || '';
        localStorage.setItem('usuario_telefono', data.usuario.telefono || '');
        if(data.usuario.foto_perfil){
          document.getElementById('profile_img').src = data.usuario.foto_perfil;
          localStorage.setItem('foto_perfil', data.usuario.foto_perfil);
        }
        document.getElementById('empresa_nombre').textContent = data.empresa.nombre_empresa;
        localStorage.setItem('empresa_nombre', data.empresa.nombre_empresa);
        localStorage.setItem('id_empresa', data.empresa.id_empresa);


    // Aquí muestra más detalles: suscripción, colores, etc (según data)
    // Por ejemplo:
    document.getElementById('subscription_plan').textContent = data.suscripcion.plan || 'Sin plan';
    document.getElementById('subscription_renewal').textContent = data.suscripcion.fecha_renovacion || 'N/A';
    document.getElementById('subscription_cost').textContent = data.suscripcion.costo || 'N/A';
    document.getElementById('payment_method').textContent = data.suscripcion.metodo_pago || 'N/A';

    // ...más código para colores y configuraciones visuales si quieres
  } else {
    alert('Error al cargar datos de la cuenta.');
  }

  // Abrir modal con datos para editar info personal
  document.getElementById('btnEditarUsuario').addEventListener('click', async () => {
    const data = await loadAccountData(usuarioId);
    if (data && data.success) {
      const user = data.usuario;
      const empresa = data.empresa;
      // Campos usuario
      document.getElementById('edit_nombre').value = user.nombre;
      document.getElementById('edit_apellidos').value = user.apellido;
      document.getElementById('edit_email').value = user.correo;
      document.getElementById('edit_telefono').value = user.telefono;
      // Nota: contraseña se deja vacía para cambiar solo si quiere
      document.getElementById('edit_password').value = '';

      // Campos empresa
      document.getElementById('edit_empresa_nombre').value = empresa.nombre_empresa;
      document.getElementById('edit_sector').value = empresa.sector_empresa || '';

      // Mostrar modal
      const modal = new bootstrap.Modal(document.getElementById('editModal'));
      modal.show();
    } else {
      alert('No se pudo cargar datos para edición');
    }
  });

  // Enviar formulario de edición
  document.getElementById('editForm').addEventListener('submit', e => {
    e.preventDefault();

    const formDataUser = new FormData();
    formDataUser.append('usuario_id', usuarioId);
    formDataUser.append('nombre', document.getElementById('edit_nombre').value);
    formDataUser.append('apellido', document.getElementById('edit_apellidos').value);
    formDataUser.append('correo', document.getElementById('edit_email').value);
    formDataUser.append('telefono', document.getElementById('edit_telefono').value);
    const password = document.getElementById('edit_password').value;
    if(password) formDataUser.append('contrasena', password);

    // Primero actualizar usuario
    fetch('/scripts/php/update_user_info.php', {
      method: 'POST',
      body: formDataUser
    })
    .then(res => res.json())
    .then(respUser => {
      if(respUser.success){
        // Luego actualizar empresa
        const formDataEmpresa = new FormData();
        formDataEmpresa.append('id_empresa', localStorage.getItem('id_empresa'));
        formDataEmpresa.append('nombre_empresa', document.getElementById('edit_empresa_nombre').value);
        formDataEmpresa.append('sector_empresa', document.getElementById('edit_sector').value);

        fetch('/scripts/php/update_empresa_info.php', {
          method: 'POST',
          body: formDataEmpresa
        })
        .then(res => res.json())
        .then(respEmpresa => {
          if(respEmpresa.success){
            // Actualizar localStorage con nuevos datos
              localStorage.setItem('usuario_nombre', formDataUser.get('nombre') + ' ' + formDataUser.get('apellido'));
              localStorage.setItem('usuario_email', formDataUser.get('correo'));
              localStorage.setItem('usuario_telefono', formDataUser.get('telefono'));
              localStorage.setItem('empresa_nombre', formDataEmpresa.get('nombre_empresa'));
            // Puedes actualizar otros datos si quieres

            // Refrescar página para aplicar cambios
            location.reload();
          } else {
            alert('Error al actualizar información de empresa.');
          }
        });
      } else {
        alert('Error al actualizar información del usuario.');
      }
    })
    .catch(err => {
      console.error('Error al actualizar:', err);
    });
  });

  // Cancelar suscripción con doble confirmación
  const btnCancel = document.getElementById('btnCancelarSuscripcion');
  if (btnCancel) {
    btnCancel.addEventListener('click', () => {
      if (confirm('¿Seguro que deseas cancelar la suscripción?') &&
          confirm('Confirma nuevamente para cancelar')) {
        const idEmpresa = localStorage.getItem('id_empresa');
        const form = new URLSearchParams();
        form.append('id_empresa', idEmpresa);
        fetch('../../scripts/php/cancel_subscription.php', {
          method: 'POST',
          body: form
        })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              alert('Suscripción cancelada');
              location.reload();
            } else {
              alert(data.message || 'Error al cancelar');
            }
          });
      }
    });
  }

  // Actualizar plan de suscripción
  const btnUpgrade = document.getElementById('btnActualizarPlan');
  if (btnUpgrade) {
    btnUpgrade.addEventListener('click', () => {
      const nuevoPlan = prompt('Ingresa el nuevo plan (por ejemplo: Pro)');
      if (nuevoPlan) {
        const idEmpresa = localStorage.getItem('id_empresa');
        const form = new URLSearchParams();
        form.append('id_empresa', idEmpresa);
        form.append('plan', nuevoPlan);
        fetch('../../scripts/php/update_subscription_plan.php', {
          method: 'POST',
          body: form
        })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              alert('Plan actualizado');
              location.reload();
            } else {
              alert(data.message || 'Error al actualizar plan');
            }
          });
      }
    });
  }
});
