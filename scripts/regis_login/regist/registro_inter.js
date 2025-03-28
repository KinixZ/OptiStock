document.addEventListener("DOMContentLoaded", function() {
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('correo');

    if (email) {
        document.getElementById('correo').textContent = email;

        setTimeout(() => {
            // Aquí simula la verificación real, puedes hacer una llamada al backend para realizar la verificación
            console.log("Correo verificado correctamente");

            // Redirigir al siguiente paso de registro
            window.location.href = `registro_p2.html?email=${encodeURIComponent(email)}`;
        }, 3000); // Simula un retraso de 3 segundos para la verificación
    } else {
        alert("No se pudo verificar el correo. Intenta nuevamente.");
        window.location.href = "registro_p1.html"; // Si no hay correo en la URL, redirigir a la página anterior
    }
});
