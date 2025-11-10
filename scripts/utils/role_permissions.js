(function (global) {
  const root = global || {};
  const STORAGE_KEY = 'optistock::configuracion_permisos_roles';
  const CATALOG_STORAGE_KEY = 'optistock::catalogo_permisos_roles';
  const roleCache = new Map();
  let cachedConfig = null;
  let cachedCatalog = null;
  let cachedCatalogSet = null;
  const SERVER_ENDPOINT = '/scripts/php/get_role_permissions.php';
  let memoryPersistedConfig = null;
  let memoryPersistedCatalog = null;
  let storageWarningShown = false;
  let catalogWarningShown = false;

  function canUseLocalStorage() {
    try {
      return typeof root.localStorage !== 'undefined';
    } catch (error) {
      return false;
    }
  }

  function readPersistedConfig() {
    if (canUseLocalStorage()) {
      try {
        const raw = root.localStorage.getItem(STORAGE_KEY);
        if (!raw) {
          return memoryPersistedConfig ? cloneConfig(memoryPersistedConfig) : {};
        }

        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          return {};
        }

        return parsed;
      } catch (error) {
        if (!storageWarningShown) {
          console.warn('No se pudieron cargar los permisos guardados de roles.', error);
          storageWarningShown = true;
        }
        return memoryPersistedConfig ? cloneConfig(memoryPersistedConfig) : {};
      }
    }

    return memoryPersistedConfig ? cloneConfig(memoryPersistedConfig) : {};
  }

  function readPersistedCatalog() {
    if (canUseLocalStorage()) {
      try {
        const raw = root.localStorage.getItem(CATALOG_STORAGE_KEY);
        if (!raw) {
          return memoryPersistedCatalog ? memoryPersistedCatalog.slice() : [];
        }

        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
          return [];
        }

        return sanitizePermissionArray(parsed);
      } catch (error) {
        if (!catalogWarningShown) {
          console.warn('No se pudo cargar el catálogo de permisos guardado.', error);
          catalogWarningShown = true;
        }
        return memoryPersistedCatalog ? memoryPersistedCatalog.slice() : [];
      }
    }

    return memoryPersistedCatalog ? memoryPersistedCatalog.slice() : [];
  }

  function storePersistedConfig(config) {
    const persistable = config && typeof config === 'object' ? config : {};
    const serialized = JSON.stringify(persistable);

    if (canUseLocalStorage()) {
      try {
        root.localStorage.setItem(STORAGE_KEY, serialized);
        memoryPersistedConfig = null;
        storageWarningShown = false;
        return true;
      } catch (error) {
        memoryPersistedConfig = cloneConfig(persistable);
        if (!storageWarningShown) {
          console.warn('No se pudieron guardar los permisos de roles en almacenamiento local.', error);
          storageWarningShown = true;
        }
        return false;
      }
    }

    memoryPersistedConfig = cloneConfig(persistable);
    return false;
  }

  function storePersistedCatalog(list) {
    const sanitized = sanitizePermissionArray(list || []);
    const serialized = JSON.stringify(sanitized);

    if (canUseLocalStorage()) {
      try {
        root.localStorage.setItem(CATALOG_STORAGE_KEY, serialized);
        memoryPersistedCatalog = null;
        catalogWarningShown = false;
        return true;
      } catch (error) {
        memoryPersistedCatalog = sanitized.slice();
        if (!catalogWarningShown) {
          console.warn('No se pudo guardar el catálogo de permisos.', error);
          catalogWarningShown = true;
        }
        return false;
      }
    }

    memoryPersistedCatalog = sanitized.slice();
    return false;
  }

  function prepareConfigForPersistence(config) {
    const resultado = {};
    if (!config || typeof config !== 'object') {
      return resultado;
    }

    Object.keys(config).forEach(rol => {
      const registro = config[rol];
      if (!registro || typeof registro !== 'object') {
        return;
      }

      const activos = Array.isArray(registro.activos)
        ? registro.activos.slice()
        : [];

      const persistente = { activos };

      if (typeof registro.origen === 'string' && registro.origen.trim()) {
        persistente.origen = registro.origen.trim();
      }

      if (typeof registro.actualizado === 'number' && Number.isFinite(registro.actualizado)) {
        persistente.actualizado = registro.actualizado;
      }

      resultado[rol] = persistente;
    });

    return resultado;
  }

  function saveCatalogList(list) {
    const sanitized = sanitizePermissionArray(list || []);
    if (!sanitized.length) {
      cachedCatalog = [];
      cachedCatalogSet = null;
      return storePersistedCatalog([]);
    }

    cachedCatalog = sanitized.slice();
    cachedCatalogSet = new Set(cachedCatalog);
    return storePersistedCatalog(cachedCatalog);
  }

  function getConfig() {
    if (cachedConfig) {
      return cachedConfig;
    }

    const persisted = readPersistedConfig();
    const catalogoPersistido = readPersistedCatalog();
    cachedConfig = sanitizeServerConfigMap(persisted, catalogoPersistido);
    return cachedConfig;
  }

  function cloneConfig(config) {
    try {
      return JSON.parse(JSON.stringify(config));
    } catch (error) {
      return {};
    }
  }

  function sanitizePermissionArray(list, fallbackList) {
    const set = new Set();

    const appendValues = values => {
      if (!values) {
        return;
      }

      if (Array.isArray(values)) {
        values.forEach(value => {
          if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed) {
              set.add(trimmed);
            }
          }
        });
        return;
      }

      if (typeof values === 'string') {
        const trimmed = values.trim();
        if (trimmed) {
          set.add(trimmed);
        }
      }
    };

    appendValues(list);
    appendValues(fallbackList);

    return Array.from(set);
  }

  function sanitizeServerRoleEntry(entry, fallbackCatalog) {
    const activos = sanitizePermissionArray(entry?.activos || []);
    let conocidos = sanitizePermissionArray(entry?.conocidos || [], fallbackCatalog);

    if (!conocidos.length && Array.isArray(fallbackCatalog) && fallbackCatalog.length) {
      conocidos = sanitizePermissionArray(fallbackCatalog);
    }

    const actualizado = typeof entry?.actualizado === 'number' && Number.isFinite(entry.actualizado)
      ? entry.actualizado
      : null;

    const origen = typeof entry?.origen === 'string' && entry.origen.trim()
      ? entry.origen.trim()
      : null;

    return {
      activos,
      conocidos,
      actualizado,
      origen
    };
  }

  function sanitizeServerConfigMap(map, fallbackCatalog) {
    const resultado = {};
    if (!map || typeof map !== 'object') {
      return resultado;
    }

    Object.keys(map).forEach(rol => {
      resultado[rol] = sanitizeServerRoleEntry(map[rol] || {}, fallbackCatalog);
    });

    return resultado;
  }

  function mergeServerConfigs(defaults, overrides) {
    const merged = {};
    const roles = new Set([
      ...Object.keys(defaults || {}),
      ...Object.keys(overrides || {})
    ]);

    roles.forEach(rol => {
      if (overrides && Object.prototype.hasOwnProperty.call(overrides, rol)) {
        merged[rol] = overrides[rol];
      } else if (defaults && Object.prototype.hasOwnProperty.call(defaults, rol)) {
        merged[rol] = defaults[rol];
      }
    });

    return merged;
  }

  function computeCatalogFromConfig(config) {
    const set = new Set();
    if (!config || typeof config !== 'object') {
      return [];
    }

    Object.values(config).forEach(entry => {
      const conocidos = Array.isArray(entry?.conocidos) ? entry.conocidos : null;
      const activos = Array.isArray(entry?.activos) ? entry.activos : null;
      sanitizePermissionArray(conocidos || activos || []).forEach(value => set.add(value));
    });

    return Array.from(set);
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
    const conocidos = normalizeListToSet(registro.conocidos) || getCatalogSet();

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

    const conocidos = entry.conocidos || getCatalogSet();
    if (conocidos && !conocidos.has(permiso)) {
      return true;
    }

    return false;
  }

  function loadConfig() {
    return cloneConfig(getConfig());
  }

  function saveConfig(config, options = {}) {
    const catalogSource = options && Array.isArray(options.catalog) ? options.catalog : null;
    const catalogOption = catalogSource ? sanitizePermissionArray(catalogSource) : null;

    const fallbackCatalog = catalogOption && catalogOption.length
      ? catalogOption
      : getCatalog();

    const sanitizedConfig = sanitizeServerConfigMap(config, fallbackCatalog);
    cachedConfig = sanitizedConfig;
    roleCache.clear();
    cachedCatalogSet = null;

    const persistable = prepareConfigForPersistence(cachedConfig);
    const persisted = storePersistedConfig(persistable);

    const effectiveCatalog = catalogOption && catalogOption.length
      ? catalogOption
      : computeCatalogFromConfig(cachedConfig);

    saveCatalogList(effectiveCatalog);

    return persisted;
  }

  function refresh(rol) {
    if (typeof rol === 'string') {
      roleCache.delete(rol);
    } else {
      roleCache.clear();
    }
    cachedConfig = null;
    cachedCatalog = null;
    cachedCatalogSet = null;
  }

  function getCatalog() {
    if (cachedCatalog && cachedCatalog.length) {
      return cachedCatalog.slice();
    }

    const persisted = readPersistedCatalog();
    if (persisted.length) {
      cachedCatalog = persisted.slice();
      cachedCatalogSet = new Set(cachedCatalog);
      return cachedCatalog.slice();
    }

    const config = getConfig();
    const computed = computeCatalogFromConfig(config);
    cachedCatalog = computed.length ? computed : [];
    cachedCatalogSet = cachedCatalog.length ? new Set(cachedCatalog) : null;

    if (cachedCatalog.length) {
      storePersistedCatalog(cachedCatalog);
    }

    return cachedCatalog.slice();
  }

  function getCatalogSet() {
    if (cachedCatalogSet) {
      return cachedCatalogSet;
    }

    const catalogo = getCatalog();
    if (!catalogo.length) {
      return null;
    }

    cachedCatalogSet = new Set(catalogo);
    return cachedCatalogSet;
  }

  async function synchronizeFromServer(options = {}) {
    if (typeof root.fetch !== 'function') {
      throw new Error('La API fetch no está disponible en este entorno.');
    }

    const payload = {};
    if (options && typeof options === 'object') {
      const candidate = options.idEmpresa ?? options.id_empresa ?? options.companyId ?? null;
      const numericId = Number.parseInt(candidate, 10);
      if (Number.isFinite(numericId) && numericId > 0) {
        payload.id_empresa = numericId;
      }
    }

    let response;
    try {
      response = await root.fetch(SERVER_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      throw new Error('No se pudo conectar con el servidor de permisos.');
    }

    if (!response.ok) {
      throw new Error(`Error ${response.status} al consultar permisos.`);
    }

    let data;
    try {
      data = await response.json();
    } catch (error) {
      throw new Error('La respuesta de permisos no es un JSON válido.');
    }

    if (!data || !data.success) {
      throw new Error(data?.message || 'No se pudieron obtener los permisos.');
    }

    const catalogList = sanitizePermissionArray(data.catalog || []);
    const defaults = sanitizeServerConfigMap(data.defaults || {}, catalogList);
    const overrides = sanitizeServerConfigMap(data.config || {}, catalogList);
    const merged = mergeServerConfigs(defaults, overrides);

    saveConfig(merged, { catalog: catalogList });

    return {
      merged: cloneConfig(merged),
      defaults: cloneConfig(defaults),
      overrides: cloneConfig(overrides),
      catalog: catalogList.slice()
    };
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
    getKnownPermissions,
    getCatalog,
    synchronizeFromServer
  });

  if (typeof global !== 'undefined') {
    global.OptiStockPermissions = api;
  }
})(typeof window !== 'undefined' ? window : this);
