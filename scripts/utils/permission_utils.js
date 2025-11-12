(function (global) {
  const root = typeof global !== 'undefined' ? global : window;

  function getHelper() {
    const helper = root && root.OptiStockPermissions ? root.OptiStockPermissions : null;
    return helper && typeof helper.isPermissionEnabled === 'function' ? helper : null;
  }

  function getActiveRole() {
    if (!root) {
      return null;
    }
    try {
      const raw = root.localStorage ? root.localStorage.getItem('usuario_rol') : null;
      return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
    } catch (error) {
      return null;
    }
  }

  function hasPermission(permission) {
    if (!permission) {
      return true;
    }
    const helper = getHelper();
    if (!helper) {
      return true;
    }
    const role = getActiveRole();
    try {
      return helper.isPermissionEnabled(role, permission);
    } catch (error) {
      return true;
    }
  }

  function normalizeList(list) {
    if (!Array.isArray(list)) {
      return [];
    }
    return list.filter(item => typeof item === 'string' && item.trim());
  }

  function hasAny(permissions) {
    const list = normalizeList(permissions);
    if (!list.length) {
      return true;
    }
    return list.some(hasPermission);
  }

  function hasAll(permissions) {
    const list = normalizeList(permissions);
    if (!list.length) {
      return true;
    }
    return list.every(hasPermission);
  }

  function showDenied(message) {
    const text = typeof message === 'string' && message.trim()
      ? message.trim()
      : 'No tienes permiso para realizar esta acción.';

    if (root && typeof root.toastError === 'function') {
      root.toastError(text);
      return;
    }
    if (root && typeof root.alert === 'function') {
      root.alert(text);
    }
  }

  function markAvailability(element, allowed, message) {
    if (!element || typeof element !== 'object') {
      return;
    }

    const isAllowed = Boolean(allowed);
    if (isAllowed) {
      element.classList.remove('permission-disabled');
      element.removeAttribute('aria-disabled');
      if (element.dataset) {
        delete element.dataset.permissionDenied;
        delete element.dataset.permissionMessage;
      }
      return;
    }

    element.classList.add('permission-disabled');
    element.setAttribute('aria-disabled', 'true');
    if (element.dataset) {
      element.dataset.permissionDenied = 'true';
      if (message) {
        element.dataset.permissionMessage = message;
      }
    }
  }

  function createDeniedHandler(message) {
    return function handleDenied(event) {
      if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      if (event && typeof event.stopPropagation === 'function') {
        event.stopPropagation();
      }
      showDenied(message);
    };
  }

  function blockPage(options = {}) {
    if (!root || typeof root.document === 'undefined') {
      return;
    }
    const { container, message } = options;
    const target = typeof container === 'string'
      ? root.document.querySelector(container)
      : container || root.document.body;

    if (!target) {
      return;
    }

    const text = typeof message === 'string' && message.trim()
      ? message.trim()
      : 'No tienes los permisos necesarios para acceder a este módulo.';

    target.innerHTML = `
      <section class="permission-block">
        <div class="permission-block__card">
          <h2>Acceso restringido</h2>
          <p>${text}</p>
        </div>
      </section>
    `;
  }

  function ensureModuleAccess(options = {}) {
    const list = normalizeList(options.permissions);
    if (!list.length || hasAny(list)) {
      return true;
    }
    blockPage({ container: options.container, message: options.message });
    return false;
  }

  root.PermissionUtils = {
    getHelper,
    getActiveRole,
    hasPermission,
    hasAny,
    hasAll,
    showDenied,
    markAvailability,
    createDeniedHandler,
    blockPage,
    ensureModuleAccess
  };
})(typeof window !== 'undefined' ? window : this);
