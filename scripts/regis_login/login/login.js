document.addEventListener("DOMContentLoaded", function () {

    // Verificar si la sesión está activa
    if (localStorage.getItem('usuario_id') && localStorage.getItem('usuario_nombre')) {
        // Si ya está logueado, redirigir directamente al menú principal
        window.location.href = "../../main_menu/main_menu.html";
        return;  // Salir de la función para evitar más redirecciones
    }

    const permissionsHelper =
        typeof window !== 'undefined' && window.OptiStockPermissions
            ? window.OptiStockPermissions
            : null;

    const errorMessageEl = document.getElementById('error-message');

    const mostrarError = (mensaje) => {
        if (errorMessageEl) {
            errorMessageEl.textContent = mensaje || '';
            errorMessageEl.style.color = 'red';
            errorMessageEl.classList.remove('d-none');
        } else if (mensaje) {
            alert(mensaje);
        }
    };

    const limpiarError = () => {
        if (errorMessageEl) {
            errorMessageEl.textContent = '';
            errorMessageEl.classList.add('d-none');
        }
    };

    const tienePermiso = (rol, permiso) => {
        if (!permiso) return true;
        if (!permissionsHelper || typeof permissionsHelper.isPermissionEnabled !== 'function') {
            return true;
        }
        return permissionsHelper.isPermissionEnabled(rol, permiso);
    };

    const cerrarSesionServidor = () => {
        return fetch('../../../scripts/php/logout.php', {
            method: 'POST',
            credentials: 'include'
        }).catch(() => {});
    };

    const sincronizarPermisosRoles = async (idEmpresa) => {
        if (!permissionsHelper) {
            return;
        }

        const opciones = {};
        const numeroEmpresa = Number.parseInt(idEmpresa, 10);
        if (Number.isFinite(numeroEmpresa) && numeroEmpresa > 0) {
            opciones.idEmpresa = numeroEmpresa;
        }

        if (typeof permissionsHelper.synchronizeFromServer === 'function') {
            await permissionsHelper.synchronizeFromServer(opciones);
            return;
        }

        if (typeof window.fetch !== 'function') {
            throw new Error('Sin soporte para sincronizar permisos.');
        }

        const payload = opciones.idEmpresa ? { id_empresa: opciones.idEmpresa } : {};
        const respuesta = await fetch('/scripts/php/get_role_permissions.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!respuesta.ok) {
            throw new Error(`HTTP ${respuesta.status}`);
        }

        const data = await respuesta.json();
        if (!data?.success) {
            throw new Error(data?.message || 'No se pudo obtener la configuración de permisos.');
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
    };

    const params = new URLSearchParams(window.location.search);
    if (params.get('msg') === 'created') {
        const statusDiv = document.getElementById('status-message');
        if (statusDiv) {
            statusDiv.textContent = 'Usuario creado. Ahora puedes iniciar sesión.';
            statusDiv.classList.remove('d-none');
        }
    }

    const storeTutorialStatus = (userId, status) => {
        if (!userId) return;
        const normalizedStatus = (status === 1 || status === '1' || status === true) ? '1' : '0';
        localStorage.setItem(`tutorialVisto_${userId}`, normalizedStatus);
        localStorage.removeItem(`tutorialShown_${userId}`);
    };

    // Función para manejar la respuesta del login con Google
    async function handleCredentialResponse(response) {
        function parseJwt(token) {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));

            return JSON.parse(jsonPayload);
        }

        console.log("Google ID Token:", response.credential);

        const userData = parseJwt(response.credential);
        console.log("Datos decodificados del token:", userData);

        const nombre = encodeURIComponent(userData.given_name || '');
        const apellido = encodeURIComponent(userData.family_name || '');
        const email = encodeURIComponent(userData.email || '');

        try {
            const respuesta = await fetch("../../../scripts/php/login_google.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token: response.credential,
                    email: userData.email,
                    nombre: userData.given_name,
                    apellido: userData.family_name,
                    picture: userData.picture,
                    google_id: userData.sub
                })
            });

            const data = await respuesta.json();
            console.log("Respuesta del backend:", data);

            if (!data.success) {
                mostrarError(data.message || "Error en autenticación con Google.");
                console.error("Mensaje backend:", data.message || data.error);
                return;
            }

            try {
                await sincronizarPermisosRoles(data.id_empresa);
            } catch (error) {
                console.error('No se pudieron sincronizar los permisos del rol.', error);
                await cerrarSesionServidor();
                mostrarError('No se pudieron validar tus permisos. Inténtalo más tarde.');
                return;
            }

            if (!tienePermiso(data.rol, 'auth.login')) {
                await cerrarSesionServidor();
                mostrarError('Tu cuenta no tiene permiso para acceder.');
                return;
            }

            limpiarError();
            // Guardar la sesión en localStorage
            localStorage.setItem('usuario_id', data.id);
            localStorage.setItem('usuario_nombre', data.nombre);
            localStorage.setItem('usuario_email', userData.email);
            localStorage.setItem('usuario_rol', data.rol);
            localStorage.setItem('usuario_suscripcion', data.suscripcion);

            localStorage.setItem('id_empresa', data.id_empresa);
            localStorage.setItem('empresa_nombre', data.empresa_nombre);

            storeTutorialStatus(data.id, data.tutorial_visto ?? 0);

            // Normaliza la ruta antes de guardar en localStorage
            let fotoPerfil = data.foto_perfil || '/images/profile.jpg';
            if (fotoPerfil && !fotoPerfil.startsWith('/')) {
                fotoPerfil = '/' + fotoPerfil;
            }
            localStorage.setItem('foto_perfil', fotoPerfil);

            if (data.completo) {
                window.location.href = "../../main_menu/main_menu.html";
            } else {
                window.location.href = `../regist/regist_google.html?email=${email}&nombre=${nombre}&apellido=${apellido}`;
            }
        } catch (error) {
            console.error('Error en autenticación con Google:', error);
            mostrarError('No se pudo completar el inicio de sesión con Google. Inténtalo más tarde.');
        }
    }

    // Inicialización del login con Google
    function initGoogleLogin() {
        if (window.google && google.accounts && google.accounts.id) {
            google.accounts.id.initialize({
                client_id: "145523824957-hoi7fcgdfg6qep6i5shhc5qpg3b8mc2g.apps.googleusercontent.com",
                callback: handleCredentialResponse
            });

            google.accounts.id.renderButton(
                document.getElementById("google-login"),
                {
                    theme: "outline",
                    size: "large"
                }
            );
        } else {
            setTimeout(initGoogleLogin, 100);
        }
    }

    initGoogleLogin();

    // Login tradicional (correo y contraseña)
    document.getElementById("loginForm").addEventListener("submit", function (event) {
        event.preventDefault();

        const correo = document.getElementById('email').value;
        const contrasena = document.getElementById('password').value;

        console.log("Correo:", correo);
        console.log("Contraseña:", contrasena);

        const formData = new URLSearchParams();
        formData.append('correo', correo);
        formData.append('contrasena', contrasena);

        fetch('../../../scripts/php/login.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString()
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(async data => {
            console.log("Respuesta del backend:", data);
            if (data.success) {
                try {
                    await sincronizarPermisosRoles(data.id_empresa);
                } catch (error) {
                    console.error('No se pudieron sincronizar los permisos del rol.', error);
                    await cerrarSesionServidor();
                    mostrarError('No se pudieron validar tus permisos. Inténtalo más tarde.');
                    return;
                }

                if (!tienePermiso(data.rol, 'auth.login')) {
                    await cerrarSesionServidor();
                    mostrarError('Tu cuenta no tiene permiso para acceder.');
                    return;
                }

                limpiarError();
                // Guardar la sesión en localStorage
                localStorage.setItem('usuario_id', data.id_usuario);
                localStorage.setItem('usuario_nombre', data.nombre);
                localStorage.setItem('usuario_email', data.correo);
                localStorage.setItem('usuario_rol', data.rol);
                localStorage.setItem('usuario_suscripcion', data.suscripcion);

                localStorage.setItem('id_empresa',      data.id_empresa     ?? '');
                localStorage.setItem('empresa_nombre',  data.empresa_nombre ?? '');

                storeTutorialStatus(data.id_usuario, data.tutorial_visto ?? 0);

                // Normaliza la ruta antes de guardar en localStorage
                let fotoPerfil = data.foto_perfil || '/images/profile.jpg';
                if (fotoPerfil && !fotoPerfil.startsWith('/')) {
                    fotoPerfil = '/' + fotoPerfil;
                }
                localStorage.setItem('foto_perfil', fotoPerfil);

                window.location.href = data.redirect;
            } else {
                mostrarError(data.message || 'Error al iniciar sesión.');
            }
        })
        .catch(err => {
            console.error('Error en la solicitud:', err);
            mostrarError("Parece que hubo un error a la hora de iniciar sesión. Revisa tus datos e inténtalo de nuevo.");
        });
    });

});
