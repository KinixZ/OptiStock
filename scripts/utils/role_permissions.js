(function (global) {
  const root = global || {};
  const STORAGE_KEY = 'optistock::configuracion_permisos_roles';
  const roleCache = new Map();
  let cachedConfig = null;

  function canUseLocalStorage() {
    try {
      return typeof root.localStorage !== 'undefined';
    } catch (error) {
      return false;
    }
  }

  function readConfig() {
    if (!canUseLocalStorage()) {
      return {};
    }

    try {
      const raw = root.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return {};
      }

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return {};
      }

      return parsed;
    } catch (error) {
      console.warn('No se pudieron cargar los permisos guardados de roles.', error);
      return {};
    }
  }

  function getConfig() {
    if (cachedConfig) {
      return cachedConfig;
    }

    cachedConfig = readConfig();
    return cachedConfig;
  }

  function cloneConfig(config) {
    try {
      return JSON.parse(JSON.stringify(config));
    } catch (error) {
      return {};
    }
  }

  function normalizeListToSet(list) {
    if (!Array.isArray(list)) {
      return null;
    }

    const set = new Set();
    list.forEach(value => {
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed) {
          set.add(trimmed);
        }
      }
    });
    return set;
  }

  function computeRoleEntry(rol) {
    if (!rol) {
      return null;
    }

    const config = getConfig();
    const registro = config && typeof config === 'object' ? config[rol] : null;
    if (!registro) {
      return null;
    }

    const activos = normalizeListToSet(registro.activos || registro);
    const conocidos = normalizeListToSet(registro.conocidos);

    if (!activos) {
      return null;
    }

    return {
      activos,
      conocidos
    };
  }

  function getRoleEntry(rol) {
    if (!rol) {
      return null;
    }

    if (!roleCache.has(rol)) {
      roleCache.set(rol, computeRoleEntry(rol));
    }

    return roleCache.get(rol);
  }

  function getActivePermissions(rol) {
    const entry = getRoleEntry(rol);
    if (!entry) {
      return null;
    }

    return Array.from(entry.activos);
  }

  function isPermissionEnabled(rol, permiso) {
    if (!permiso) {
      return true;
    }

    const entry = getRoleEntry(rol);
    if (!entry) {
      return true;
    }

    if (entry.activos.has(permiso)) {
      return true;
    }

    if (entry.conocidos && !entry.conocidos.has(permiso)) {
      return true;
    }

    return false;
  }

  function loadConfig() {
    return cloneConfig(getConfig());
  }

  function saveConfig(config) {
    if (!canUseLocalStorage()) {
      return false;
    }

    try {
      const data = config && typeof config === 'object' ? config : {};
      root.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      refresh();
      return true;
    } catch (error) {
      console.warn('No se pudieron guardar los permisos de roles.', error);
      return false;
    }
  }

  function refresh(rol) {
    if (typeof rol === 'string') {
      roleCache.delete(rol);
    } else {
      roleCache.clear();
    }
    cachedConfig = null;
  }

  function getKnownPermissions(rol) {
    const entry = getRoleEntry(rol);
    if (!entry || !entry.conocidos) {
      return null;
    }

    return Array.from(entry.conocidos);
  }

  const api = Object.freeze({
    STORAGE_KEY,
    canUseLocalStorage,
    loadConfig,
    saveConfig,
    refresh,
    isPermissionEnabled,
    getActivePermissions,
    getKnownPermissions
  });

  if (typeof global !== 'undefined') {
    global.OptiStockPermissions = api;
  }
})(typeof window !== 'undefined' ? window : this);
