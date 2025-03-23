document.addEventListener("DOMContentLoaded", function() {
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email');
    
    if (email) {
        document.getElementById('email').textContent = email;

        // Simula que la verificación es exitosa después de que el usuario haga clic en el enlace
        setTimeout(() => {
            // Simula el proceso de verificación en el backend (en un caso real, sería una verificación de token en el servidor)
            console.log("Correo verificado correctamente");

            // Redirigir al siguiente paso de registro
            window.location.href = `registro_p2.html?email=${encodeURIComponent(email)}`;
        }, 3000); // Simula un retraso de 3 segundos para la verificación
    } else {
        alert("No se pudo verificar el correo. Intenta nuevamente.");
        window.location.href = "registro_p1.html"; // Si no hay correo en la URL, redirigir a la página anterior
    }
});
