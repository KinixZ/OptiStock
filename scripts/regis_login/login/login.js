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
                { theme: "outline", size: "large" }
            );
        });
        
        document.getElementById("loginForm").addEventListener("submit", function(event) {
            event.preventDefault(); // Evitar el envío tradicional del formulario
        
            const correo = document.getElementById('email').value;
            const contrasena = document.getElementById('password').value;
        
            const formData = new URLSearchParams();
            formData.append('correo', correo);
            formData.append('contrasena', contrasena);
        
            // Enviar los datos al servidor
            fetch('../../../scripts/php/login.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData.toString()
            })
            .catch(err => console.error('Error en la solicitud:', err));
        });