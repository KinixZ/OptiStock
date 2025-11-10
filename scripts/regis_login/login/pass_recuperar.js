const emailForm = document.getElementById("recoveryForm");
const codeForm = document.getElementById("codeForm");
const passwordForm = document.getElementById("passwordForm");
const msg = document.getElementById("recovery-message");

const permissionsHelper =
    typeof window !== 'undefined' && window.OptiStockPermissions
        ? window.OptiStockPermissions
        : null;

let rolVerificado = null;
let permisosSincronizados = false;

const tienePermiso = (rol, permiso) => {
    if (!permiso) return true;
    if (!permissionsHelper || typeof permissionsHelper.isPermissionEnabled !== 'function') {
        return true;
    }
    return permissionsHelper.isPermissionEnabled(rol, permiso);
};

const asegurarPermisosDisponibles = async () => {
    if (!permissionsHelper) {
        permisosSincronizados = true;
        return;
    }

    if (permisosSincronizados) {
        return;
    }

    try {
        const configLocal = typeof permissionsHelper.loadConfig === 'function'
            ? permissionsHelper.loadConfig()
            : {};

        if (configLocal && typeof configLocal === 'object' && Object.keys(configLocal).length > 0) {
            permisosSincronizados = true;
            return;
        }

        if (typeof permissionsHelper.synchronizeFromServer === 'function') {
            await permissionsHelper.synchronizeFromServer();
            permisosSincronizados = true;
            return;
        }

        if (typeof window.fetch !== 'function') {
            throw new Error('Sin soporte para sincronizar permisos.');
        }

        const respuesta = await fetch('/scripts/php/get_role_permissions.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });

        if (!respuesta.ok) {
            throw new Error(`HTTP ${respuesta.status}`);
        }

        const data = await respuesta.json();
        if (!data?.success) {
            throw new Error(data?.message || 'No se pudo cargar la configuración de permisos.');
        }

        const defaults = data.defaults && typeof data.defaults === 'object' ? data.defaults : {};
        const overrides = data.config && typeof data.config === 'object' ? data.config : {};
        const merged = { ...defaults };
        Object.keys(overrides).forEach(rol => {
            merged[rol] = overrides[rol];
        });

        if (typeof permissionsHelper.saveConfig === 'function') {
            permissionsHelper.saveConfig(merged, { catalog: data.catalog || [] });
        }

        permisosSincronizados = true;
    } catch (error) {
        permisosSincronizados = false;
        throw error;
    }
};

const mostrarMensaje = (texto, color = 'red') => {
    if (!msg) return;
    msg.textContent = texto;
    msg.style.color = color;
};

const obtenerRolPorCorreo = async (email) => {
    const response = await fetch('../../../scripts/php/obtener_rol_por_correo.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
};

emailForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    const email = document.getElementById("email").value;

    try {
        await asegurarPermisosDisponibles();
        const resultadoRol = await obtenerRolPorCorreo(email);
        if (!resultadoRol.success) {
            mostrarMensaje(resultadoRol.message || 'No se pudo verificar el rol del usuario.');
            return;
        }

        const rol = resultadoRol.rol;
        if (!tienePermiso(rol, 'auth.password.reset')) {
            mostrarMensaje('No tienes permiso para hacer eso.');
            return;
        }

        rolVerificado = rol;
    } catch (error) {
        console.error("Error verificando rol para recuperación:", error);
        mostrarMensaje('No se pudo verificar tu permiso para restablecer la contraseña. Inténtalo más tarde.');
        return;
    }

    fetch('../../../scripts/php/pass_recuperar.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    })
    .then(response => response.json())
    .then(data => {
        mostrarMensaje(data.message, data.success ? 'green' : 'red');

        if (data.success) {
            emailForm.style.display = "none";
            codeForm.style.display = "block";
        } else {
            console.error("Error al enviar el correo de recuperación:", data.message);
        }
    })
    .catch(err => {
        console.error("Error en la solicitud:", err);
        mostrarMensaje("Error inesperado. Intenta más tarde.");
    });
});

// Verificar el código
codeForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const codigo = document.getElementById("codigo").value;

    fetch('../../../scripts/php/verificar_codigo_recuperacion.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo })
    })
    .then(response => response.json())
    .then(data => {
        msg.textContent = data.message;
        msg.style.color = data.success ? "green" : "red";

        if (data.success) {
            codeForm.style.display = "none";
            passwordForm.style.display = "block";
        }
    });
});

// Cambiar la contraseña
passwordForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const pass1 = document.getElementById("pass1").value;
    const pass2 = document.getElementById("pass2").value;

    if (pass1 !== pass2) {
        msg.textContent = "Las contraseñas no coinciden.";
        msg.style.color = "red";
        return;
    }

    fetch('../../../scripts/php/cambiar_contraseña.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nueva: pass1 })
    })
    .then(response => response.json())
    .then(data => {
        msg.textContent = data.message;
        msg.style.color = data.success ? "green" : "red";

        if (data.success) {
            passwordForm.reset();
        }
    });
});
