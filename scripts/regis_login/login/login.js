document.addEventListener("DOMContentLoaded", function () {

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

        const email = encodeURIComponent(userData.email);
        // Redirigir a completar registro
        window.location.href = `../regist/regist_google.html?email=${email}`;

        // Enviar al backend
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
            if (data.success) {
                window.location.href = "../../main_menu/main_menu.html";
            } else {
                alert("Error en autenticación con Google.");
            }
        })
        .catch(error => console.error("Error:", error));
    }

    // Esperar a que Google esté listo antes de usarlo
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
            // Reintentar cada 100ms hasta que esté listo
            setTimeout(initGoogleLogin, 100);
        }
    }

    initGoogleLogin();
});

// Login normal
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
        .then(response => response.json())
        .then(data => {
            const errorMessage = document.getElementById('error-message');
            if (data.success) {
                window.location.href = data.redirect;
            } else {
                errorMessage.textContent = data.message;
            }
        })
        .catch(err => console.error('Error en la solicitud:', err));
});
