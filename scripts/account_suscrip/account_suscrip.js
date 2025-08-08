// Gestion de cuenta y suscripción

async function obtenerDatosCuenta(id_usuario) {
  const res = await fetch(`/scripts/php/get_account_data.php?usuario_id=${id_usuario}`);
  const data = await res.json();
  return data;
}

function mainAccountSuscrip() {
  console.log('✅ account_suscrip.js está corriendo');

  const usuarioId = localStorage.getItem('usuario_id');
  const idEmpresa = localStorage.getItem('id_empresa');

  if (!usuarioId) {
    alert('Falta información del usuario en localStorage.');
    return;
  }

  const nombreEl = document.getElementById('nombreCompleto');
  const correoEl = document.getElementById('correoUsuario');
  const telEl    = document.getElementById('telefonoUsuario');
  const fotoEl   = document.getElementById('fotoPerfil');
  const empNomEl = document.getElementById('nombreEmpresa');
  const empSecEl = document.getElementById('sectorEmpresa');
  const empLogo  = document.getElementById('logoEmpresa');
  const btnCancel = document.getElementById('btnCancelarSuscripcion');

  async function cargar(){
    const data = await obtenerDatosCuenta(usuarioId);
    console.log("Respuesta get_account_data:", data);

    if(data.success){
      const u = data.usuario;
      nombreEl.textContent = `${u.nombre} ${u.apellido}`;
      correoEl.textContent = u.correo;
      telEl.textContent = u.telefono || '';
      fotoEl.src = u.foto_perfil ? `/${u.foto_perfil}` : '/images/profile.jpg';
      const e = data.empresa || {};
      empNomEl.textContent = e.nombre_empresa || '';
      empSecEl.textContent = e.sector_empresa || '';
      if(e.logo_empresa){ empLogo.src = e.logo_empresa; }
    }
  }

  cargar();

  // --- Editar usuario ---
  const modalUsuario = new bootstrap.Modal(document.getElementById('modalEditarUsuario'));
  document.getElementById('btnEditarUsuario').addEventListener('click', async () => {
    const d = await obtenerDatosCuenta(usuarioId);
    if(d.success){
      const u = d.usuario;
      document.getElementById('inputNombre').value = u.nombre;
      document.getElementById('inputApellido').value = u.apellido;
      document.getElementById('inputCorreo').value = u.correo;
      document.getElementById('inputTelefono').value = u.telefono || '';
      document.getElementById('inputContrasena').value = '';
      modalUsuario.show();
    }
  });

  document.getElementById('btnGuardarCambiosUsuario').addEventListener('click', async () => {
  const formData = new FormData();
  formData.append('id_usuario', usuarioId);
  formData.append('nombre', document.getElementById('inputNombre').value);
  formData.append('apellido', document.getElementById('inputApellido').value);
  formData.append('telefono', document.getElementById('inputTelefono').value);
  formData.append('correo', document.getElementById('inputCorreo').value);
  formData.append('contrasena', document.getElementById('inputContrasena').value);
  const file = document.getElementById('inputFoto').files[0];
  if (file) formData.append('foto_perfil', file);

  const resp = await fetch('/scripts/php/update_user.php', {
    method: 'POST',
    body: formData
  }).then(r => r.json());

  if(resp.success){
  localStorage.setItem('usuario_nombre', formData.get('nombre') + ' ' + formData.get('apellido'));
  localStorage.setItem('usuario_email', formData.get('correo'));
  localStorage.setItem('usuario_telefono', formData.get('telefono'));
  if(resp.foto_perfil){
    localStorage.setItem('foto_perfil', resp.foto_perfil);
  }
  modalUsuario.hide();
  location.reload();
}else{
    alert(resp.message || 'Error al actualizar usuario');
  }
});

  // --- Editar empresa ---
  const modalEmpresa = new bootstrap.Modal(document.getElementById('modalEditarEmpresa'));
  document.getElementById('btnEditarEmpresa').addEventListener('click', async () => {
  const d = await obtenerDatosCuenta(usuarioId);
  if(d.success && d.empresa){
    const e = d.empresa;
    document.getElementById('inputNombreEmpresa').value = e.nombre_empresa || '';
    document.getElementById('inputSectorEmpresa').value = e.sector_empresa || '';
    // Solo limpiar el input file, no puedes asignar value
    document.getElementById('inputLogoEmpresaFile').value = '';
    modalEmpresa.show();
  }
});

document.getElementById('btnGuardarCambiosEmpresa').addEventListener('click', async () => {
  const formData = new FormData();
  formData.append('id_empresa', idEmpresa);
  formData.append('nombre_empresa', document.getElementById('inputNombreEmpresa').value);
  formData.append('sector_empresa', document.getElementById('inputSectorEmpresa').value);
  const file = document.getElementById('inputLogoEmpresaFile').files[0];
  if (file) formData.append('logo_empresa', file);

  const resp = await fetch('/scripts/php/update_empresa.php', {
    method: 'POST',
    body: formData
  }).then(r=>r.json());

  if(resp.success){
    localStorage.setItem('empresa_nombre', formData.get('nombre_empresa'));
    modalEmpresa.hide();
    location.reload();
  }else{
    alert('Error al actualizar empresa');
  }
});

  // Actualizar plan
  const btnPlan = document.getElementById('btnActualizarPlan');
  btnPlan?.addEventListener('click', () => {
    const plan = prompt('Ingresa el nuevo plan (Pro, etc)');
    if(plan){
      const form = new URLSearchParams();
      form.append('id_empresa', idEmpresa);
      form.append('plan', plan);
      fetch('/scripts/php/update_subscription_plan.php', { method:'POST', body: form })
        .then(r=>r.json()).then(d=>{ if(d.success){ alert('Plan actualizado'); cargar(); } else { alert(d.message||'Error'); } });
    }
  });

  // Navegación lateral
  const menuItems = document.querySelectorAll('.account-menu li');
  const sections = document.querySelectorAll('.account-section');
  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      menuItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      const target = item.getAttribute('data-target');
      sections.forEach(sec => sec.classList.toggle('active', sec.id === target));
    });
  });

  // Cancelar suscripción con doble confirmación
  if (btnCancel) {
    btnCancel.addEventListener('click', () => {
      if (confirm('¿Seguro que deseas cancelar la suscripción?') &&
          confirm('Confirma nuevamente para cancelar')) {
        const idEmpresa = localStorage.getItem('id_empresa');
        const form = new URLSearchParams();
        form.append('id_empresa', idEmpresa);
        fetch('/scripts/php/cancel_subscription.php', {
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
        fetch('/scripts/php/update_subscription_plan.php', {
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
}

// Ejecutar el código principal según el estado del DOM
if (document.readyState !== 'loading') {
  mainAccountSuscrip();
} else {
  document.addEventListener('DOMContentLoaded', mainAccountSuscrip);
}