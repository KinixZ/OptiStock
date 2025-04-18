document.getElementById("recoveryForm").addEventListener("submit", function (event) {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const recoveryMessage = document.getElementById("recovery-message");

    fetch('../../../scripts/php/pass_recuperar.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                recoveryMessage.textContent = "Se ha enviado un enlace de recuperación a tu correo.";
                recoveryMessage.style.color = "green";
            } else {
                recoveryMessage.textContent = data.message || "Error al enviar el enlace de recuperación.";
                recoveryMessage.style.color = "red";
            }
        })
        .catch(err => {
            console.error("Error en la solicitud de recuperación:", err);
            recoveryMessage.textContent = "Hubo un error. Inténtalo de nuevo más tarde.";
            recoveryMessage.style.color = "red";
        });
});