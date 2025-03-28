        document.addEventListener("DOMContentLoaded", function () {
            // Configuración de Google
            function handleCredentialResponse(response) {
                console.log("Google ID Token:", response.credential);
        
                // Enviar el token al backend para validación
                fetch("http://localhost:3000/auth/google", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token: response.credential })
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        window.location.href = "../../main_menu/main_menu.html"; // Redirigir tras login exitoso
                    } else {
                        alert("Error en autenticación con Google.");
                    }
                })
                .catch(error => console.error("Error:", error));
            }
        
            google.accounts.id.initialize({
                client_id: "145523824957-hoi7fcgdfg6qep6i5shhc5qpg3b8mc2g.apps.googleusercontent.com", // 🔴 Reemplazar con tu CLIENT_ID de Google
                callback: handleCredentialResponse
            });
        
            google.accounts.id.renderButton(
                document.getElementById("google-login"),
                { 
                    theme: "outline", // Opciones: "outline" o "filled"
                    size: "large",    // Opciones: "small", "medium", "large"
                    text: "signin_with", // Opciones: "signin_with", "signup_with", "continue_with"
                    shape: "rectangular", // Opciones: "rectangular", "pill"
                    logo_alignment: "left", // Opciones: "left", "center"
                }
            );
        });
        
        document.getElementById("loginForm").addEventListener("submit", function(event) {
            event.preventDefault(); // Evitar el envío tradicional del formulario
            console.log("Evento submit interceptado");
        
            const correo = document.getElementById('email').value;
            const contrasena = document.getElementById('password').value;
        
            console.log("Correo:", correo);
            console.log("Contraseña:", contrasena);
        
            // Crear los datos en formato application/x-www-form-urlencoded
            const formData = new URLSearchParams();
            formData.append('correo', correo);
            formData.append('contrasena', contrasena);
        
            // Realizar la solicitud al servidor para validar el login
            fetch('../../../scripts/php/login.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData.toString()
            })
            .then(response => response.json())
            .then(data => {
                const errorMessage = document.getElementById('error-message');
                if (data.success) {
                    // Redirigir al usuario según la respuesta del servidor
                    console.log("Redirigiendo a:", data.redirect);
                    window.location.href = data.redirect;
                } else {
                    // Mostrar el mensaje de error devuelto por el servidor
                    errorMessage.textContent = data.message;
                }
            })
            .catch(err => console.error('Error en la solicitud:', err));
        });//