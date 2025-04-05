document.addEventListener("DOMContentLoaded", function () {
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email');  // Obtenemos el correo del parámetro de la URL

    if (email) {
        // Si hay un correo en la URL, lo mostramos en la página
        document.getElementById('email').textContent = email;

        // Hacemos una solicitud para verificar el correo en la base de datos
        verifyEmail(email);
    } else {
        alert("No se pudo verificar el correo. Intenta nuevamente.");
        window.location.href = "regist_inter.html?email=retry";  // Si no hay correo en la URL, redirigir a la página anterior
    }
});

function verifyEmail(email) {
    // Hacemos una solicitud POST a PHP para verificar la cuenta
    fetch('../../../scripts/php/verificacion.php?token=' + encodeURIComponent(email), {
        method: 'GET',
    })
    .then(response => response.text()) // Esperamos la respuesta del servidor
    .then(data => {
        if (data.includes("Tu cuenta ha sido verificada exitosamente")) {
            // Si la verificación fue exitosa, redirigir al siguiente paso
            window.location.href = `registro_p2.html?email=${encodeURIComponent(email)}`;
        } else {
            alert(data);  // Si hubo un error, mostramos el mensaje de error
        }
    })
    .catch(error => {
        console.error("Error en la verificación:", error);
        alert("Ocurrió un error al verificar el correo.");
    });
}
