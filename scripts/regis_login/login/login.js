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

            fetch('../../php/login.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ correo: correo, contrasena: contrasena })
            })
            .then(response => response.json())
            .then(data => {
                console.log(data); // Ver el contenido de la respuesta
                if (data.success) {
                    if (data.verificacion_cuenta === 1) {
                        window.location.href = '../../main_menu/main_menu.html';  // Redirigir si la cuenta está verificada
                    } else {
                        window.location.href = '../regist/regist_inter.html';  // Redirigir si la cuenta no está verificada
                    }
                } else {
                    alert('Datos incorrectos');
                }
            })
            .catch(err => console.error('Error en la verificación:', err));
            
        });
        