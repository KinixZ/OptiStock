(() => {
// Gestion de cuenta y suscripción

const DEFAULT_PROFILE_IMG = '/images/profile.jpg';
const DEFAULT_COMPANY_LOGO = '/images/optistockLogo.png';

function getContrastingColor(hexColor) {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#ffffff';
}

async function obtenerDatosCuenta(id_usuario) {
  const res = await fetch(`/scripts/php/get_account_data.php?usuario_id=${id_usuario}`);
  return res.json();
}

function sanitizePath(path) {
  if (!path) return '';
  const normalized = path.replace(/\\/g, '/').trim();
  if (normalized.startsWith('http')) return normalized;
  return `/${normalized.replace(/^\/+/, '')}`;
}

function setTextContent(field, value, fallback = '—') {
  const finalValue = value && `${value}`.trim() !== '' ? value : fallback;
  document.querySelectorAll(`[data-field="${field}"]`).forEach((el) => {
    el.textContent = finalValue;
  });
}

function setImageContent(field, value, fallback) {
  const src = value && `${value}`.trim() !== '' ? sanitizePath(value) : fallback;
  if (!src) return;
  document.querySelectorAll(`[data-field-image="${field}"]`).forEach((img) => {
    img.src = src;
  });
}

function firstAvailable(...values) {
  return values.find((value) => value && `${value}`.trim() !== '');
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
  const btnCancel = document.getElementById('btnCancelarSuscripcion');

  async function cargar() {
    const data = await obtenerDatosCuenta(usuarioId);
    console.log('Respuesta get_account_data:', data);

    if (!data.success) return;

    const config = data.configuracion;
    if (config && config.color_topbar) {
      document.documentElement.style.setProperty('--topbar-color', config.color_topbar);
      const textColor = getContrastingColor(config.color_topbar);
      document.documentElement.style.setProperty('--topbar-text-color', textColor);
    }

    const usuario = data.usuario || {};
    const nombreCompleto = [usuario.nombre, usuario.apellido].filter(Boolean).join(' ').trim();
    setTextContent('nombreCompleto', nombreCompleto, '—');
    setTextContent('correoUsuario', usuario.correo, '—');
    setTextContent('telefonoUsuario', usuario.telefono, '—');
    const fotoPath = usuario.foto_perfil ? sanitizePath(usuario.foto_perfil) : DEFAULT_PROFILE_IMG;
    setImageContent('fotoPerfil', fotoPath, DEFAULT_PROFILE_IMG);

    localStorage.setItem('usuario_nombre', nombreCompleto || '');
    localStorage.setItem('usuario_email', usuario.correo || '');
    localStorage.setItem('usuario_telefono', usuario.telefono || '');
    localStorage.setItem('foto_perfil', usuario.foto_perfil || '');

    const empresa = data.empresa || {};
    setTextContent('nombreEmpresa', empresa.nombre_empresa, '—');
    setTextContent('sectorEmpresa', empresa.sector_empresa, '—');
    const logoPath = empresa.logo_empresa ? sanitizePath(empresa.logo_empresa) : DEFAULT_COMPANY_LOGO;
    setImageContent('logoEmpresa', logoPath, DEFAULT_COMPANY_LOGO);

    localStorage.setItem('empresa_nombre', empresa.nombre_empresa || '');
    localStorage.setItem('empresa_sector', empresa.sector_empresa || '');
    localStorage.setItem('logo_empresa', empresa.logo_empresa ? sanitizePath(empresa.logo_empresa) : '');

    const suscripcion = data.suscripcion || data.subscription || data.plan || {};
    const planName = firstAvailable(
      suscripcion.plan,
      suscripcion.nombre_plan,
      suscripcion.plan_actual,
      suscripcion.nombre
    );
    const fechaRenovacion = firstAvailable(
      suscripcion.renovacion,
      suscripcion.fecha_renovacion,
      suscripcion.fechaRenovacion,
      suscripcion.renovacion_plan
    );
    const metodoPago = firstAvailable(
      suscripcion.metodo_pago,
      suscripcion.metodoPago,
      suscripcion.metodo
    );

    setTextContent('planActual', planName, 'Gratuito');
    setTextContent('fechaRenovacion', fechaRenovacion, '—');
    setTextContent('metodoPago', metodoPago, '—');
  }

  cargar();

  // --- Editar usuario ---
  const modalUsuario = new bootstrap.Modal(document.getElementById('modalEditarUsuario'));
  document.getElementById('btnEditarUsuario').addEventListener('click', async () => {
    const d = await obtenerDatosCuenta(usuarioId);
    if (d.success) {
      const u = d.usuario;
      document.getElementById('inputNombre').value = u.nombre;
      document.getElementById('inputApellido').value = u.apellido;
      document.getElementById('inputCorreo').value = u.correo;
      document.getElementById('inputTelefono').value = u.telefono || '';
      document.getElementById('inputContrasena').value = '';
      document.getElementById('inputConfirmarContrasena').value = '';
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
    const nuevaContrasena = document.getElementById('inputContrasena').value.trim();
    const confirmarContrasena = document.getElementById('inputConfirmarContrasena').value.trim();

    if (nuevaContrasena !== confirmarContrasena) {
      alert('Las contraseñas no coinciden.');
      return;
    }

    formData.append('contrasena', nuevaContrasena);
    const file = document.getElementById('inputFoto').files[0];
    if (file) formData.append('foto_perfil', file);

    const resp = await fetch('/scripts/php/update_user.php', {
      method: 'POST',
      body: formData,
    }).then((r) => r.json());

    if (resp?.solicitud) {
      alert(`Solicitud registrada para revisión (folio ${resp.solicitud.id}). Recibirás los cambios una vez aprobados.`);
      modalUsuario.hide();
      return;
    }

    if (!resp?.success) {
      alert(resp?.message || 'Error al registrar la solicitud de cambio de usuario');
      return;
    }
  });

  // --- Editar empresa ---
  const modalEmpresa = new bootstrap.Modal(document.getElementById('modalEditarEmpresa'));
  document.getElementById('btnEditarEmpresa').addEventListener('click', async () => {
    const d = await obtenerDatosCuenta(usuarioId);
    if (d.success && d.empresa) {
      const e = d.empresa;
      document.getElementById('inputNombreEmpresa').value = e.nombre_empresa || '';
      document.getElementById('inputSectorEmpresa').value = e.sector_empresa || '';
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
      body: formData,
    }).then((r) => r.json());

    if (resp?.solicitud) {
      alert(`Solicitud enviada. Los cambios en la empresa se aplicarán cuando sean aprobados (folio ${resp.solicitud.id}).`);
      modalEmpresa.hide();
      return;
    }

    if (!resp?.success) {
      alert(resp?.message || 'Error al registrar la solicitud de actualización de empresa');
      return;
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

  // Actualizar plan
  const btnPlan = document.getElementById('btnActualizarPlan');
  btnPlan?.addEventListener('click', () => {
    const plan = prompt('Ingresa el nuevo plan (Pro, etc)');
    if (plan) {
      const form = new URLSearchParams();
      form.append('id_empresa', idEmpresa);
      form.append('plan', plan);
      fetch('/scripts/php/update_subscription_plan.php', { method: 'POST', body: form })
        .then((r) => r.json())
        .then((d) => {
          if (d.success) {
            alert('Plan actualizado');
            cargar();
          } else {
            alert(d.message || 'Error');
          }
        });
    }
  });

  // Navegación lateral
  const menuItems = document.querySelectorAll('.account-menu li');
  const sections = document.querySelectorAll('.account-section');
  menuItems.forEach((item) => {
    item.addEventListener('click', () => {
      menuItems.forEach((i) => i.classList.remove('active'));
      item.classList.add('active');
      const target = item.getAttribute('data-target');
      sections.forEach((sec) => sec.classList.toggle('active', sec.id === target));
    });
  });

  // Cancelar suscripción con doble confirmación
  if (btnCancel) {
    btnCancel.addEventListener('click', () => {
      if (
        confirm('¿Seguro que deseas cancelar la suscripción?') &&
        confirm('Confirma nuevamente para cancelar')
      ) {
        const empresaId = localStorage.getItem('id_empresa');
        const form = new URLSearchParams();
        form.append('id_empresa', empresaId);
        fetch('/scripts/php/cancel_subscription.php', {
          method: 'POST',
          body: form,
        })
          .then((res) => res.json())
          .then((response) => {
            if (response.success) {
              alert('Suscripción cancelada');
              location.reload();
            } else {
              alert(response.message || 'Error al cancelar');
            }
          });
      }
    });
  }
}

if (document.readyState !== 'loading') {
  mainAccountSuscrip();
} else {
  document.addEventListener('DOMContentLoaded', mainAccountSuscrip, { once: true });
}
})();