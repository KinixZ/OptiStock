// Gestion de cuenta y suscripción

async function obtenerDatosCuenta(idUsuario){
  const resp = await fetch(`../../scripts/php/get_account_data.php?usuario_id=${idUsuario}`);
  return resp.json();
}


document.addEventListener('DOMContentLoaded', () => {
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

  async function cargar(){
    const data = await obtenerDatosCuenta(usuarioId);
    console.log("Respuesta get_account_data:", data);

    if(data.success){
      const u = data.usuario;
      nombreEl.textContent = `${u.nombre} ${u.apellido}`;
      correoEl.textContent = u.correo;
      telEl.textContent = u.telefono || '';
      fotoEl.src = u.foto_perfil ? u.foto_perfil : '/images/profile.jpg';
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
    const payload = {
      id_usuario: usuarioId,
      nombre: document.getElementById('inputNombre').value,
      apellido: document.getElementById('inputApellido').value,
      telefono: document.getElementById('inputTelefono').value,
      correo: document.getElementById('inputCorreo').value,
      contrasena: document.getElementById('inputContrasena').value
    };
    const resp = await fetch('../../scripts/php/update_user.php', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    }).then(r=>r.json());
    if(resp.success){
      const file = document.getElementById('inputFoto').files[0];
      if(file){
        const fd = new FormData();
        fd.append('usuario_id', usuarioId);
        fd.append('foto_perfil', file);
        await fetch('../../scripts/php/upload_profile_picture.php', { method:'POST', body: fd })
          .then(r=>r.json()).then(d=>{ if(d.success){ fotoEl.src = d.foto; } });
      }
      localStorage.setItem('usuario_nombre', payload.nombre + ' ' + payload.apellido);
      localStorage.setItem('usuario_email', payload.correo);
      localStorage.setItem('usuario_telefono', payload.telefono);
      modalUsuario.hide();
      cargar();
    }else{
      alert('Error al actualizar usuario');
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
      document.getElementById('inputLogoEmpresa').value = e.logo_empresa || '';
      modalEmpresa.show();
    }
  });

  document.getElementById('btnGuardarCambiosEmpresa').addEventListener('click', async () => {
    const payload = {
      id_empresa: idEmpresa,
      nombre_empresa: document.getElementById('inputNombreEmpresa').value,
      sector_empresa: document.getElementById('inputSectorEmpresa').value,
      logo_empresa: document.getElementById('inputLogoEmpresa').value
    };
    const resp = await fetch('../../scripts/php/update_empresa.php', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    }).then(r=>r.json());
    if(resp.success){
      localStorage.setItem('empresa_nombre', payload.nombre_empresa);
      modalEmpresa.hide();
      cargar();
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
      fetch('../../scripts/php/update_subscription_plan.php', { method:'POST', body: form })
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
}); // cierre DOMContentLoaded

