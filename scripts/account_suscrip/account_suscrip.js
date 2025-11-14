(() => {
// Gestión de datos de cuenta

const permissionUtils =
  typeof window !== 'undefined' && window.PermissionUtils
    ? window.PermissionUtils
    : null;
const permisosHelper =
  typeof window !== 'undefined' && window.OptiStockPermissions
    ? window.OptiStockPermissions
    : null;

const ACCOUNT_ACCESS_PERMISSIONS = [
  'account.profile.read',
  'account.profile.update',
  'account.theme.configure'
];

function tienePermiso(clave) {
  if (!clave) {
    return true;
  }

  if (permissionUtils && typeof permissionUtils.hasPermission === 'function') {
    return permissionUtils.hasPermission(clave);
  }

  if (permisosHelper && typeof permisosHelper.isPermissionEnabled === 'function') {
    try {
      const rol = typeof localStorage !== 'undefined' ? localStorage.getItem('usuario_rol') : null;
      return permisosHelper.isPermissionEnabled(rol, clave);
    } catch (error) {
      return true;
    }
  }

  return true;
}

function marcarDisponibilidad(elemento, permitido, mensaje) {
  if (!elemento) {
    return;
  }

  if (permissionUtils && typeof permissionUtils.markAvailability === 'function') {
    permissionUtils.markAvailability(elemento, permitido, mensaje);
    return;
  }

  if (permitido) {
    elemento.classList.remove('permission-disabled');
    elemento.removeAttribute('aria-disabled');
    if (elemento.dataset) {
      delete elemento.dataset.permissionDenied;
      delete elemento.dataset.permissionMessage;
    }
    return;
  }

  elemento.classList.add('permission-disabled');
  elemento.setAttribute('aria-disabled', 'true');
  if (elemento.dataset) {
    elemento.dataset.permissionDenied = 'true';
    if (mensaje) {
      elemento.dataset.permissionMessage = mensaje;
    }
  }
}

function obtenerHandlerDenegado(mensaje) {
  if (permissionUtils && typeof permissionUtils.createDeniedHandler === 'function') {
    return permissionUtils.createDeniedHandler(mensaje);
  }

  return function (evento) {
    if (evento && typeof evento.preventDefault === 'function') {
      evento.preventDefault();
    }
    if (evento && typeof evento.stopPropagation === 'function') {
      evento.stopPropagation();
    }

    const texto = mensaje || 'No tienes permiso para realizar esta acción.';
    if (typeof window !== 'undefined' && typeof window.toastError === 'function') {
      window.toastError(texto);
    } else if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert(texto);
    }
  };
}

function asegurarAccesoCuenta(contenedor) {
  if (permissionUtils && typeof permissionUtils.ensureModuleAccess === 'function') {
    return permissionUtils.ensureModuleAccess({
      permissions: ACCOUNT_ACCESS_PERMISSIONS,
      container: contenedor || document.querySelector('.account-page'),
      message:
        'Solicita al administrador que habilite los permisos de cuenta o personalización para acceder a esta sección.'
    });
  }

  const puedeAcceder = ACCOUNT_ACCESS_PERMISSIONS.some((permiso) => tienePermiso(permiso));
  if (puedeAcceder) {
    return true;
  }

  const destino = contenedor || document.querySelector('.account-page');
  if (destino) {
    destino.innerHTML = `
      <section class="permission-block">
        <div class="permission-block__card">
          <h2>Acceso restringido</h2>
          <p>Solicita al administrador que habilite los permisos de cuenta o personalización para continuar.</p>
        </div>
      </section>
    `;
  }

  return false;
}

const APP_ROOT = (() => {
  const path = window.location.pathname;
  const pagesIndex = path.indexOf('/pages/');
  if (pagesIndex !== -1) {
    return path.slice(0, pagesIndex);
  }
  const lastSlash = path.lastIndexOf('/');
  if (lastSlash <= 0) {
    return '';
  }
  return path.slice(0, lastSlash);
})();

function resolveUrl(path) {
  if (!path) return '';
  const normalized = `${path}`.replace(/\\/g, '/').trim();
  if (/^(?:[a-z]+:)?\/\//i.test(normalized)) {
    return normalized;
  }
  const withoutLeadingDots = normalized.replace(/^(\.\/)+/, '');
  const cleaned = withoutLeadingDots.replace(/^\/+/, '');
  const base = APP_ROOT ? `${APP_ROOT.replace(/\/+$/, '')}/` : '/';
  return `${base}${cleaned}`;
}

const DEFAULT_PROFILE_IMG = resolveUrl('images/profile.jpg');
const DEFAULT_COMPANY_LOGO = resolveUrl('images/optistockLogo.png');
const ACCOUNT_DATA_URL = resolveUrl('scripts/php/get_account_data.php');
const UPDATE_USER_URL = resolveUrl('scripts/php/update_user.php');
const UPDATE_EMPRESA_URL = resolveUrl('scripts/php/update_empresa.php');

function getContrastingColor(hexColor) {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#ffffff';
}

async function obtenerDatosCuenta(id_usuario) {
  const res = await fetch(`${ACCOUNT_DATA_URL}?usuario_id=${id_usuario}`);
  return res.json();
}

function sanitizePath(path) {
  if (!path) return '';
  const normalized = `${path}`.replace(/\\/g, '/').trim();
  if (/^(?:[a-z]+:)?\/\//i.test(normalized)) {
    return normalized;
  }
  if (APP_ROOT) {
    const basePrefix = APP_ROOT.replace(/\/+$/, '');
    if (basePrefix && normalized.startsWith(`${basePrefix}/`)) {
      return normalized;
    }
  } else if (normalized.startsWith('/')) {
    return normalized;
  }
  return resolveUrl(normalized);
}

function setTextContent(field, value, fallback = '—') {
  const finalValue = value && `${value}`.trim() !== '' ? value : fallback;
  document.querySelectorAll(`[data-field="${field}"]`).forEach((el) => {
    el.textContent = finalValue;
  });
}

function setImageContent(field, value, fallback) {
  const candidate = value && `${value}`.trim() !== '' ? value : fallback;
  if (!candidate) return;
  const src = sanitizePath(candidate);
  if (!src) return;
  document.querySelectorAll(`[data-field-image="${field}"]`).forEach((img) => {
    img.src = src;
  });
}

function mainAccountSuscrip() {
  console.log('✅ account_suscrip.js está corriendo');

  const pageContainer = document.querySelector('.account-page');
  if (!asegurarAccesoCuenta(pageContainer)) {
    return;
  }

  const usuarioId = localStorage.getItem('usuario_id');
  const idEmpresa = localStorage.getItem('id_empresa');

  if (!usuarioId) {
    alert('Falta información del usuario en localStorage.');
    return;
  }

  const puedeActualizarPerfil = tienePermiso('account.profile.update');
  const puedeConfigurarTema = tienePermiso('account.theme.configure');

  const mensajeActualizarPerfilDenegado =
    'No tienes permiso para modificar la información personal. Solicita a un administrador que habilite account.profile.update.';
  const mensajeConfigurarTemaDenegado =
    'No tienes permiso para personalizar la empresa. Solicita a un administrador que habilite account.theme.configure.';

  const manejadorPerfilDenegado = obtenerHandlerDenegado(mensajeActualizarPerfilDenegado);
  const manejadorConfigurarTemaDenegado = obtenerHandlerDenegado(mensajeConfigurarTemaDenegado);

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
    setImageContent('fotoPerfil', usuario.foto_perfil, DEFAULT_PROFILE_IMG);

    localStorage.setItem('usuario_nombre', nombreCompleto || '');
    localStorage.setItem('usuario_email', usuario.correo || '');
    localStorage.setItem('usuario_telefono', usuario.telefono || '');
    const fotoFinal = usuario.foto_perfil ? sanitizePath(usuario.foto_perfil) : DEFAULT_PROFILE_IMG;
    localStorage.setItem('foto_perfil', fotoFinal || '');

    const empresa = data.empresa || {};
    setTextContent('nombreEmpresa', empresa.nombre_empresa, '—');
    setTextContent('sectorEmpresa', empresa.sector_empresa, '—');
    setImageContent('logoEmpresa', empresa.logo_empresa, DEFAULT_COMPANY_LOGO);

    localStorage.setItem('empresa_nombre', empresa.nombre_empresa || '');
    localStorage.setItem('empresa_sector', empresa.sector_empresa || '');
    const logoFinal = empresa.logo_empresa ? sanitizePath(empresa.logo_empresa) : DEFAULT_COMPANY_LOGO;
    localStorage.setItem('logo_empresa', logoFinal || DEFAULT_COMPANY_LOGO);

  }

  cargar();

  const btnEditarUsuario = document.getElementById('btnEditarUsuario');
  const btnEditarEmpresa = document.getElementById('btnEditarEmpresa');
  const btnGuardarCambiosUsuario = document.getElementById('btnGuardarCambiosUsuario');
  const btnGuardarCambiosEmpresa = document.getElementById('btnGuardarCambiosEmpresa');

  const modalUsuarioElemento = document.getElementById('modalEditarUsuario');
  const modalEmpresaElemento = document.getElementById('modalEditarEmpresa');
  const modalUsuario =
    typeof bootstrap !== 'undefined' && modalUsuarioElemento
      ? new bootstrap.Modal(modalUsuarioElemento)
      : null;
  const modalEmpresa =
    typeof bootstrap !== 'undefined' && modalEmpresaElemento
      ? new bootstrap.Modal(modalEmpresaElemento)
      : null;

  if (puedeActualizarPerfil) {

    btnEditarUsuario?.addEventListener('click', async () => {
      const d = await obtenerDatosCuenta(usuarioId);
      if (d.success) {
        const u = d.usuario || {};
        const inputNombre = document.getElementById('inputNombre');
        const inputApellido = document.getElementById('inputApellido');
        const inputCorreo = document.getElementById('inputCorreo');
        const inputTelefono = document.getElementById('inputTelefono');
        const inputContrasena = document.getElementById('inputContrasena');
        const inputConfirmar = document.getElementById('inputConfirmarContrasena');

        if (inputNombre) inputNombre.value = u.nombre || '';
        if (inputApellido) inputApellido.value = u.apellido || '';
        if (inputCorreo) inputCorreo.value = u.correo || '';
        if (inputTelefono) inputTelefono.value = u.telefono || '';
        if (inputContrasena) inputContrasena.value = '';
        if (inputConfirmar) inputConfirmar.value = '';

        modalUsuario?.show();
      }
    });

    btnGuardarCambiosUsuario?.addEventListener('click', async (evento) => {
      if (!tienePermiso('account.profile.update')) {
        manejadorPerfilDenegado(evento);
        return;
      }

      const formData = new FormData();
      formData.append('id_usuario', usuarioId);
      formData.append('nombre', document.getElementById('inputNombre')?.value || '');
      formData.append('apellido', document.getElementById('inputApellido')?.value || '');
      formData.append('telefono', document.getElementById('inputTelefono')?.value || '');
      formData.append('correo', document.getElementById('inputCorreo')?.value || '');
      const nuevaContrasena = (document.getElementById('inputContrasena')?.value || '').trim();
      const confirmarContrasena = (document.getElementById('inputConfirmarContrasena')?.value || '').trim();

      if (nuevaContrasena !== confirmarContrasena) {
        alert('Las contraseñas no coinciden.');
        return;
      }

      formData.append('contrasena', nuevaContrasena);
      const file = document.getElementById('inputFoto')?.files?.[0];
      if (file) formData.append('foto_perfil', file);

      const resp = await fetch(UPDATE_USER_URL, {
        method: 'POST',
        body: formData,
      }).then((r) => r.json());

      if (resp?.solicitud) {
        alert(`Solicitud registrada para revisión (folio ${resp.solicitud.id}). Recibirás los cambios una vez aprobados.`);
        modalUsuario?.hide();
        return;
      }

      if (!resp?.success) {
        alert(resp?.message || 'Error al registrar la solicitud de cambio de usuario');
        return;
      }

      await cargar();
      modalUsuario?.hide();
      alert(resp?.message || 'Datos del usuario actualizados.');
    });

  } else {
    [btnEditarUsuario, btnGuardarCambiosUsuario].forEach((boton) => {
      if (!boton) {
        return;
      }
      marcarDisponibilidad(boton, false, mensajeActualizarPerfilDenegado);
      boton.addEventListener('click', manejadorPerfilDenegado);
    });
  }

  if (puedeConfigurarTema) {
    btnEditarEmpresa?.addEventListener('click', async () => {
      const d = await obtenerDatosCuenta(usuarioId);
      if (d.success && d.empresa) {
        const e = d.empresa;
        const inputNombreEmpresa = document.getElementById('inputNombreEmpresa');
        const inputSectorEmpresa = document.getElementById('inputSectorEmpresa');
        const inputLogoEmpresa = document.getElementById('inputLogoEmpresaFile');

        if (inputNombreEmpresa) inputNombreEmpresa.value = e.nombre_empresa || '';
        if (inputSectorEmpresa) inputSectorEmpresa.value = e.sector_empresa || '';
        if (inputLogoEmpresa) inputLogoEmpresa.value = '';

        modalEmpresa?.show();
      }
    });

    btnGuardarCambiosEmpresa?.addEventListener('click', async (evento) => {
      if (!tienePermiso('account.theme.configure')) {
        manejadorConfigurarTemaDenegado(evento);
        return;
      }

      const formData = new FormData();
      formData.append('id_empresa', idEmpresa);
      formData.append('nombre_empresa', document.getElementById('inputNombreEmpresa')?.value || '');
      formData.append('sector_empresa', document.getElementById('inputSectorEmpresa')?.value || '');
      const file = document.getElementById('inputLogoEmpresaFile')?.files?.[0];
      if (file) formData.append('logo_empresa', file);

      const resp = await fetch(UPDATE_EMPRESA_URL, {
        method: 'POST',
        body: formData,
      }).then((r) => r.json());

      if (resp?.solicitud) {
        alert(`Solicitud enviada. Los cambios en la empresa se aplicarán cuando sean aprobados (folio ${resp.solicitud.id}).`);
        modalEmpresa?.hide();
        return;
      }

      if (!resp?.success) {
        alert(resp?.message || 'Error al registrar la solicitud de actualización de empresa');
        return;
      }

      await cargar();
      modalEmpresa?.hide();
      alert(resp?.message || 'Información de la empresa actualizada.');
    });
  } else {
    [btnEditarEmpresa, btnGuardarCambiosEmpresa].forEach((boton) => {
      if (!boton) {
        return;
      }
      marcarDisponibilidad(boton, false, mensajeConfigurarTemaDenegado);
      boton.addEventListener('click', manejadorConfigurarTemaDenegado);
    });
  }

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

}

if (document.readyState !== 'loading') {
  mainAccountSuscrip();
} else {
  document.addEventListener('DOMContentLoaded', mainAccountSuscrip, { once: true });
}
})();
