document.addEventListener("DOMContentLoaded", function() {
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email');  // Obtenemos el correo del parámetro de la URL

    if (email) {
        // Si hay un correo en la URL, lo mostramos en la página
        document.getElementById('email').textContent = email;

        // Simulamos un tiempo de espera para realizar la verificación
        setTimeout(() => {
            // Aquí puedes hacer una llamada real al backend para verificar el correo.
            console.log("Correo verificado correctamente");

            // Redirigimos a la siguiente página (registro_p2.html) cuando la verificación sea exitosa
            window.location.href = `registro_p2.html?email=${encodeURIComponent(email)}`;
        }, 5000); // Simulamos un retraso de 3 segundos para la verificación
    } else {
        alert("No se pudo verificar el correo. Intenta nuevamente.");
        window.location.href = "regist_inter.html?email=retry";  // Si no hay correo en la URL, redirigir a la página anterior
    }
});
