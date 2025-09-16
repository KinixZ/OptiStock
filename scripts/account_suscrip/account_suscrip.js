(() => {
// Gestion de cuenta y suscripción

function getContrastingColor(hexColor) {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#ffffff';
}

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
  const subscriptionStatusBadge = document.getElementById('subscriptionStatusBadge');
  const subscriptionLastRenewalEl = document.getElementById('subscriptionLastRenewal');
  const subscriptionNextRenewalEl = document.getElementById('subscriptionNextRenewal');
  const subscriptionMessageEl = document.getElementById('subscriptionMessage');
  const subscriptionToggleBtn = document.getElementById('btnSubscriptionToggle');
  const subscriptionRenewBtn = document.getElementById('btnSubscriptionRenew');
  const SUBSCRIPTION_STORAGE_KEY = 'optistock_subscription_state';

  async function cargar(){
    const data = await obtenerDatosCuenta(usuarioId);
    console.log("Respuesta get_account_data:", data);

    if(data.success){
    const config = data.configuracion;
    if (config && config.color_topbar) {
      document.documentElement.style.setProperty('--topbar-color', config.color_topbar);
      const textColor = getContrastingColor(config.color_topbar);
      document.documentElement.style.setProperty('--topbar-text-color', textColor);
    }

    const u = data.usuario;
    nombreEl.textContent = `${u.nombre} ${u.apellido}`;
    correoEl.textContent = u.correo;
    telEl.textContent = u.telefono || '';
    fotoEl.src = u.foto_perfil ? `/${u.foto_perfil}` : '/images/profile.jpg';

    // Actualiza localStorage con los datos más recientes
    localStorage.setItem('usuario_nombre', `${u.nombre} ${u.apellido}`);
    localStorage.setItem('usuario_email', u.correo);
    localStorage.setItem('usuario_telefono', u.telefono || '');
    localStorage.setItem('foto_perfil', u.foto_perfil || '');

    const e = data.empresa || {};
    empNomEl.textContent = e.nombre_empresa || '';
    empSecEl.textContent = e.sector_empresa || '';
    if(e.logo_empresa){ empLogo.src = '/' + e.logo_empresa.replace(/^\/+/,''); }

    localStorage.setItem('empresa_nombre', e.nombre_empresa || '');
    localStorage.setItem('empresa_sector', e.sector_empresa || '');
    localStorage.setItem('logo_empresa', e.logo_empresa ? '/' + e.logo_empresa.replace(/^\/+/,'') : '');
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
    localStorage.setItem('empresa_sector', formData.get('sector_empresa'));
    if (resp.logo_empresa) {
      const logoPath = '/' + resp.logo_empresa.replace(/^\/+/,'');
      localStorage.setItem('logo_empresa', logoPath);
      empLogo.src = logoPath;
    }
    modalEmpresa.hide();
    location.reload();
  }else{
    alert(resp.message || 'Error al actualizar empresa');
  }
});

  // --- Suscripción local (estado 0/1) ---
  if (subscriptionStatusBadge || subscriptionToggleBtn || subscriptionRenewBtn) {
    function getDefaultSubscriptionState() {
      return {
        status: 0,
        lastRenewal: null,
        nextRenewal: null
      };
    }

    function loadSubscriptionState() {
      try {
        const raw = localStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
        if (!raw) {
          return getDefaultSubscriptionState();
        }
        const parsed = JSON.parse(raw);
        return {
          status: Number(parsed.status) === 1 ? 1 : 0,
          lastRenewal: parsed.lastRenewal || null,
          nextRenewal: parsed.nextRenewal || null
        };
      } catch (error) {
        console.warn('No se pudo leer la suscripción guardada', error);
        return getDefaultSubscriptionState();
      }
    }

    function saveSubscriptionState(state) {
      try {
        const normalized = {
          status: state.status === 1 ? 1 : 0,
          lastRenewal: state.lastRenewal || null,
          nextRenewal: state.nextRenewal || null
        };
        localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(normalized));
      } catch (error) {
        console.warn('No se pudo guardar la suscripción', error);
      }
    }

    function addMonths(date, months) {
      const result = new Date(date.getTime());
      const originalDay = result.getDate();
      result.setMonth(result.getMonth() + months);
      if (result.getDate() !== originalDay) {
        result.setDate(0);
      }
      return result;
    }

    function formatDate(value) {
      if (!value) {
        return '-';
      }
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return '-';
      }
      return new Intl.DateTimeFormat('es-ES', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(date);
    }

    function ensureSubscriptionFreshness(state) {
      const normalized = { ...state };
      if (normalized.status === 1 && normalized.nextRenewal) {
        const nextDate = new Date(normalized.nextRenewal);
        if (!Number.isNaN(nextDate.getTime()) && Date.now() >= nextDate.getTime()) {
          normalized.status = 0;
        }
      }
      return normalized;
    }

    function updateSubscriptionUI(state) {
      const now = new Date();
      const nextDate = state.nextRenewal ? new Date(state.nextRenewal) : null;
      const isExpired = !!(nextDate && !Number.isNaN(nextDate.getTime()) && nextDate <= now);

      if (subscriptionStatusBadge) {
        subscriptionStatusBadge.textContent = state.status === 1 ? 'Activo (1)' : 'Inactivo (0)';
        subscriptionStatusBadge.classList.remove('bg-success', 'bg-secondary', 'bg-warning');
        if (state.status === 1) {
          subscriptionStatusBadge.classList.add('bg-success');
        } else if (isExpired) {
          subscriptionStatusBadge.classList.add('bg-warning');
        } else {
          subscriptionStatusBadge.classList.add('bg-secondary');
        }
      }

      if (subscriptionLastRenewalEl) {
        subscriptionLastRenewalEl.textContent = formatDate(state.lastRenewal);
      }

      if (subscriptionNextRenewalEl) {
        subscriptionNextRenewalEl.textContent = formatDate(state.nextRenewal);
      }

      if (subscriptionToggleBtn) {
        subscriptionToggleBtn.textContent = state.status === 1 ? 'Cancelar suscripción' : 'Activar suscripción';
        subscriptionToggleBtn.classList.toggle('btn-success', state.status !== 1);
        subscriptionToggleBtn.classList.toggle('btn-danger', state.status === 1);
      }

      if (subscriptionRenewBtn) {
        const canRenew = state.status === 1 || isExpired;
        subscriptionRenewBtn.disabled = !canRenew;
      }

      if (subscriptionMessageEl) {
        if (isExpired) {
          subscriptionMessageEl.textContent = `Tu suscripción venció el ${formatDate(state.nextRenewal)}. Pulsa "Renovar por un mes" para activarla nuevamente.`;
          subscriptionMessageEl.classList.remove('d-none');
        } else {
          subscriptionMessageEl.textContent = '';
          subscriptionMessageEl.classList.add('d-none');
        }
      }
    }

    function createActivatedState(previousState) {
      const now = new Date();
      const next = addMonths(now, 1);
      return {
        ...previousState,
        status: 1,
        lastRenewal: now.toISOString(),
        nextRenewal: next.toISOString()
      };
    }

    function createRenewedState(previousState) {
      const now = new Date();
      const storedNext = previousState.nextRenewal ? new Date(previousState.nextRenewal) : null;
      const hasValidStoredNext = storedNext && !Number.isNaN(storedNext.getTime());
      const baseDate = hasValidStoredNext && storedNext > now ? storedNext : now;
      const next = addMonths(baseDate, 1);
      return {
        ...previousState,
        status: 1,
        lastRenewal: now.toISOString(),
        nextRenewal: next.toISOString()
      };
    }

    let subscriptionState = ensureSubscriptionFreshness(loadSubscriptionState());
    saveSubscriptionState(subscriptionState);
    updateSubscriptionUI(subscriptionState);

    if (subscriptionToggleBtn) {
      subscriptionToggleBtn.addEventListener('click', () => {
        if (subscriptionState.status === 1) {
          if (!confirm('¿Seguro que deseas cancelar la suscripción?')) {
            return;
          }
          subscriptionState = {
            ...subscriptionState,
            status: 0,
            nextRenewal: null
          };
          saveSubscriptionState(subscriptionState);
          updateSubscriptionUI(subscriptionState);
          alert('Suscripción cancelada. Puedes activarla de nuevo cuando quieras.');
        } else {
          subscriptionState = createActivatedState(subscriptionState);
          saveSubscriptionState(subscriptionState);
          updateSubscriptionUI(subscriptionState);
          alert(`Suscripción activada. Próxima renovación el ${formatDate(subscriptionState.nextRenewal)}.`);
        }
      });
    }

    if (subscriptionRenewBtn) {
      subscriptionRenewBtn.addEventListener('click', () => {
        const now = new Date();
        const nextDate = subscriptionState.nextRenewal ? new Date(subscriptionState.nextRenewal) : null;
        const isExpired = !!(nextDate && !Number.isNaN(nextDate.getTime()) && nextDate <= now);

        if (subscriptionState.status === 0 && !isExpired) {
          alert('Activa la suscripción antes de renovarla.');
          return;
        }

        subscriptionState = createRenewedState(subscriptionState);
        saveSubscriptionState(subscriptionState);
        updateSubscriptionUI(subscriptionState);
        alert(`Suscripción renovada. La próxima renovación será el ${formatDate(subscriptionState.nextRenewal)}.`);
      });
    }
  }

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

}

// Ejecutar el código principal según el estado del DOM
if (document.readyState !== 'loading') {
  mainAccountSuscrip();
} else {
  document.addEventListener('DOMContentLoaded', mainAccountSuscrip, { once: true });
}
})();
