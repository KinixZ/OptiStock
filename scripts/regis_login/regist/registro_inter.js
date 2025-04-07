document.addEventListener("DOMContentLoaded", function () {
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email');  // Obtenemos el correo del parámetro de la URL

    if (email) {
        // Si hay un correo en la URL, lo mostramos en la página
        document.getElementById('email').textContent = email;
    } else {
        alert("No se pudo verificar el correo. Intenta nuevamente.");
        window.location.href = "regist_inter.html?email=retry";  // Si no hay correo en la URL, redirigir a la página anterior
    }

    // Manejar el formulario de verificación
    document.getElementById('verificationForm').addEventListener('submit', function (e) {
        e.preventDefault(); // Prevenir el envío del formulario

        const verificationCode = document.getElementById('verificationCode').value;

        // Hacemos una solicitud para verificar el código
        verifyCode(email, verificationCode);
    });
});

function verifyCode(email, code) {
    fetch('../../../scripts/php/verificacion.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email, code: code })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Si la verificación fue exitosa, redirigir al siguiente paso
            window.location.href = `registro_p2.html?email=${encodeURIComponent(email)}`;
        } else {
            alert(data.message);  // Si hubo un error, mostramos el mensaje de error
        }
    })
    .catch(error => {
        console.error("Error en la verificación:", error);
        alert("Ocurrió un error al verificar el código.");
    });
}
