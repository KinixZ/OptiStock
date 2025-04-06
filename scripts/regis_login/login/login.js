        document.addEventListener("DOMContentLoaded", function () {
            // Configuración de Google
            function handleCredentialResponse(response) {

                function parseJwt(token) {
                    const base64Url = token.split('.')[1];
                    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                    }).join(''));
                
                    return JSON.parse(jsonPayload);
                }
                
                console.log("Google ID Token:", response.credential);
            
                // Decodificar el token
                const userData = parseJwt(response.credential);
                console.log("Datos decodificados del token:", userData);

                const email = encodeURIComponent(userData.email);
                // Si es nuevo, lo rediriges a completar registro
                window.location.href = `../regist/regist.google.html?email=${email}`;
            
                // Puedes probar mostrarlo en pantalla si quieres visualizarlo en el DOM:
                document.body.innerHTML += `<pre>${JSON.stringify(userData, null, 2)}</pre>`;
            
                // Aquí puedes decidir qué datos enviar al backend
                fetch("http://localhost:3000/auth/google", {
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
            
        
            google.accounts.id.initialize({
                client_id: "145523824957-hoi7fcgdfg6qep6i5shhc5qpg3b8mc2g.apps.googleusercontent.com", // 🔴 Reemplazar con tu CLIENT_ID de Google
                callback: handleCredentialResponse
            });
        
            google.accounts.id.renderButton(
                document.getElementById("google-login"),
                { 
                    theme: "outline", size: "large"
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