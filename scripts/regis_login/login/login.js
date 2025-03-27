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
        
            // Configuración de Facebook
            window.fbAsyncInit = function () {
                FB.init({
                    appId: "TU_FACEBOOK_APP_ID", // 🔴 Reemplazar con tu Facebook App ID
                    cookie: true,
                    xfbml: true,
                    version: "v12.0"
                });
            };
        
            document.getElementById("facebook-login").addEventListener("click", function () {
                FB.login(function (response) {
                    if (response.authResponse) {
                        console.log("Facebook Access Token:", response.authResponse.accessToken);
        
                        // Enviar el token al backend para validación
                        fetch("http://localhost:3000/auth/facebook", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ token: response.authResponse.accessToken })
                        })
                        .then(res => res.json())
                        .then(data => {
                            if (data.success) {
                                window.location.href = "dashboard.html"; // Redirigir tras login exitoso
                            } else {
                                alert("Error en autenticación con Facebook.");
                            }
                        })
                        .catch(error => console.error("Error:", error));
                    }
                }, { scope: "public_profile,email" });
            });
        });
        
