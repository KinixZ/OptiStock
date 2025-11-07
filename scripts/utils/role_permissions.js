(function (global) {
  const root = global || {};
  const STORAGE_KEY = 'optistock::configuracion_permisos_roles';

  function resolveScriptsBasePath() {
    if (typeof document === 'undefined') {
      return '/scripts/';
    }

    const pickScriptSource = script => {
      if (!script) {
        return '';
      }
      return script.getAttribute('src') || script.src || '';
    };

    let scriptSrc = pickScriptSource(document.currentScript);
    if (!scriptSrc) {
      const scripts = document.getElementsByTagName('script');
      for (let i = scripts.length - 1; i >= 0; i -= 1) {
        const candidate = pickScriptSource(scripts[i]);
        if (candidate && candidate.indexOf('role_permissions.js') !== -1) {
          scriptSrc = candidate;
          break;
        }
      }
    }

    if (!scriptSrc) {
      return '/scripts/';
    }

    const cleaned = scriptSrc.split('#')[0].split('?')[0].replace(/\+/g, '/');
    if (cleaned) {
      const relativeBase = cleaned.replace(/role_permissions\.js$/, '').replace(/utils\/?$/, '');
      if (relativeBase && relativeBase !== cleaned) {
        return relativeBase.endsWith('/') ? relativeBase : `${relativeBase}/`;
      }
    }

    try {
      const baseReference = typeof window !== 'undefined' && window.location ? window.location.href : undefined;
      const absolute = new URL(scriptSrc, baseReference);
      const absoluteBase = absolute.href.replace(/\/utils\/role_permissions\.js(?:\?.*)?$/, '/');
      return absoluteBase.endsWith('/') ? absoluteBase : `${absoluteBase}/`;
    } catch (error) {
      return '/scripts/';
    }
  }

  const SCRIPTS_BASE_PATH = resolveScriptsBasePath();

  function buildEndpoint(path) {
    if (!path) {
      return path;
    }

    if (/^(?:https?:|file:|\/)/i.test(path)) {
      return path;
    }

    if (/^\.\.?\//.test(path)) {
      return path;
    }

    const sanitized = path.replace(/^\/+/, '');
    const base = SCRIPTS_BASE_PATH.endsWith('/') ? SCRIPTS_BASE_PATH : `${SCRIPTS_BASE_PATH}/`;
    return `${base}${sanitized}`;
  }

  const API_ENDPOINTS = Object.freeze({
    fetch: buildEndpoint('php/roles/obtener_permisos_roles.php'),
    save: buildEndpoint('php/roles/guardar_permisos_rol.php')
  });
  const roleCache = new Map();
  let cachedConfig = null;
  let lastSyncEmpresaId = null;
  let lastSyncPromise = null;

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

  function sanitizePermissionList(list) {
    if (!Array.isArray(list)) {
      return [];
    }

    const sanitized = [];
    list.forEach(value => {
      if (typeof value !== 'string') {
        value = value != null ? String(value) : '';
      }

      const trimmed = value.trim();
      if (trimmed && !sanitized.includes(trimmed)) {
        sanitized.push(trimmed);
      }
    });

    return sanitized;
  }

  function parseTimestamp(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim()) {
      const numeric = Number(value);
      if (Number.isFinite(numeric)) {
        return numeric;
      }

      const parsedDate = new Date(value);
      if (!Number.isNaN(parsedDate.getTime())) {
        return parsedDate.getTime();
      }
    }

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.getTime();
    }

    return null;
  }

  function normalizeServerRecord(record) {
    if (!record || typeof record !== 'object') {
      return null;
    }

    const activos = sanitizePermissionList(
      record.activos || record.permisos_activos || record.active || []
    );
    const conocidosRaw = record.conocidos ?? record.permisos_conocidos ?? null;
    const conocidos = Array.isArray(conocidosRaw)
      ? sanitizePermissionList(conocidosRaw)
      : null;
    const actualizado = parseTimestamp(
      record.actualizado || record.actualizado_en || record.updated_at || null
    );

    return {
      activos,
      conocidos,
      actualizado
    };
  }

  function normalizeServerConfig(payload) {
    if (!payload) {
      return {};
    }

    if (Array.isArray(payload)) {
      return payload.reduce((acc, item) => {
        if (!item || typeof item !== 'object') {
          return acc;
        }

        const rol = typeof item.rol === 'string' ? item.rol.trim() : '';
        if (!rol) {
          return acc;
        }

        const normalizado = normalizeServerRecord(item);
        if (!normalizado) {
          return acc;
        }

        acc[rol] = normalizado;
        return acc;
      }, {});
    }

    if (typeof payload === 'object') {
      return Object.entries(payload).reduce((acc, [rol, data]) => {
        if (typeof rol !== 'string' || !rol.trim()) {
          return acc;
        }

        const normalizado = normalizeServerRecord(data);
        if (!normalizado) {
          return acc;
        }

        acc[rol.trim()] = normalizado;
        return acc;
      }, {});
    }

    return {};
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
    const data = config && typeof config === 'object' ? config : {};

    if (canUseLocalStorage()) {
      try {
        root.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (error) {
        console.warn('No se pudieron guardar los permisos de roles en el almacenamiento local.', error);
      }
    }

    refresh();
    cachedConfig = cloneConfig(data);
    return true;
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

  function buildRequestPayload(data) {
    return JSON.stringify(data);
  }

  function syncWithServer(empresaId, options = {}) {
    const opts = options && typeof options === 'object' ? options : {};
    const force = Boolean(opts.force);
    const silent = Boolean(opts.silent);

    if (empresaId == null || empresaId === '') {
      return Promise.resolve(loadConfig());
    }

    const empresaClave = typeof empresaId === 'string' && empresaId.trim() ? empresaId.trim() : empresaId;

    if (!force && lastSyncPromise && lastSyncEmpresaId === empresaClave) {
      return lastSyncPromise.then(cloneConfig);
    }

    lastSyncEmpresaId = empresaClave;
    lastSyncPromise = fetch(API_ENDPOINTS.fetch, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: buildRequestPayload({ id_empresa: empresaClave })
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then(payload => {
        if (!payload || payload.success === false) {
          const mensaje = payload && payload.message ? payload.message : 'No se pudo obtener la configuración de permisos.';
          throw new Error(mensaje);
        }

        const normalizado = normalizeServerConfig(payload.data || payload.config || payload.permisos || {});
        saveConfig(normalizado);
        return cloneConfig(normalizado);
      })
      .catch(error => {
        if (!silent) {
          console.warn('No se pudieron sincronizar los permisos desde el servidor.', error);
        }
        throw error;
      });

    return lastSyncPromise;
  }

  function saveRoleRemote(empresaId, rol, registro, options = {}) {
    const opts = options && typeof options === 'object' ? options : {};
    const silent = Boolean(opts.silent);
    const rolClave = typeof rol === 'string' ? rol.trim() : '';

    if (!rolClave) {
      return Promise.reject(new Error('Rol inválido.'));
    }

    if (empresaId == null || empresaId === '') {
      return Promise.reject(new Error('Empresa inválida.'));
    }

    const activos = sanitizePermissionList(registro?.activos || []);
    const conocidos = Array.isArray(registro?.conocidos)
      ? sanitizePermissionList(registro.conocidos)
      : null;

    const payload = {
      id_empresa: typeof empresaId === 'string' && empresaId.trim() ? empresaId.trim() : empresaId,
      rol: rolClave,
      activos,
      conocidos
    };

    return fetch(API_ENDPOINTS.save, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: buildRequestPayload(payload)
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (!data || data.success === false) {
          const mensaje = data && data.message ? data.message : 'No se pudo guardar la configuración del rol.';
          throw new Error(mensaje);
        }

        const normalizado = normalizeServerRecord(data.record || data.data || { activos, conocidos, actualizado: Date.now() }) || {
          activos,
          conocidos,
          actualizado: Date.now()
        };

        const configuracionActual = loadConfig();
        configuracionActual[rolClave] = normalizado;
        saveConfig(configuracionActual);
        return normalizado;
      })
      .catch(error => {
        if (!silent) {
          console.warn('No se pudo guardar la configuración del rol en el servidor.', error);
        }
        throw error;
      });
  }

  const api = Object.freeze({
    STORAGE_KEY,
    canUseLocalStorage,
    loadConfig,
    saveConfig,
    refresh,
    isPermissionEnabled,
    getActivePermissions,
    getKnownPermissions,
    syncWithServer,
    saveRoleRemote
  });

  if (typeof global !== 'undefined') {
    global.OptiStockPermissions = api;
  }
})(typeof window !== 'undefined' ? window : this);
