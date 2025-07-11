document.addEventListener("DOMContentLoaded", function () {

    // Verificar si la sesión está activa
    if (localStorage.getItem('usuario_id') && localStorage.getItem('usuario_nombre')) {
        // Si ya está logueado, redirigir directamente al menú principal
        window.location.href = "../../main_menu/main_menu.html";
        return;  // Salir de la función para evitar más redirecciones
    } 

    // Función para manejar la respuesta del login con Google
    function handleCredentialResponse(response) {
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

        fetch("../../../scripts/php/login_google.php", {
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
        })
        .then(res => res.json())
        .then(data => {
            console.log("Respuesta del backend:", data);

            if (data.success) {
                // Guardar la sesión en localStorage
                localStorage.setItem('usuario_id', data.id);
                localStorage.setItem('usuario_nombre', data.nombre);
                localStorage.setItem('usuario_email', userData.email);
                localStorage.setItem('usuario_rol', data.rol);
                localStorage.setItem('usuario_suscripcion', data.suscripcion);

                if (data.completo) {
                    window.location.href = "../../main_menu/main_menu.html";
                } else {
                    window.location.href = `../regist/regist_google.html?email=${email}&nombre=${nombre}&apellido=${apellido}`;
                }
            } else {
                alert("Error en autenticación con Google.");
                console.error("Mensaje backend:", data.message || data.error);
            }
        });
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
        .then(data => {
            console.log("Respuesta del backend:", data);
            const errorMessage = document.getElementById('error-message');
            if (data.success) {
                // Guardar la sesión en localStorage
                localStorage.setItem('usuario_id', data.id_usuario);
                localStorage.setItem('usuario_nombre', data.nombre);
                localStorage.setItem('usuario_email', data.correo);
                localStorage.setItem('usuario_rol', data.rol);
                localStorage.setItem('usuario_suscripcion', data.suscripcion);

                window.location.href = data.redirect;
            } else {
                errorMessage.textContent = data.message;
                errorMessage.style.color = "red";
            }
        })
        .catch(err => {
            console.error('Error en la solicitud:', err);
            alert("Parece que hubo un error a la hora de iniciar sesión. Revisa tus datos e intentelo de nuevo.");
        });
    });

});
