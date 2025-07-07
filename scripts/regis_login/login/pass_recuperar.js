const emailForm = document.getElementById("recoveryForm");
const codeForm = document.getElementById("codeForm");
const passwordForm = document.getElementById("passwordForm");
const msg = document.getElementById("recovery-message");

emailForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const email = document.getElementById("email").value;

    fetch('../../../scripts/php/pass_recuperar.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    })
    .then(response => response.json())
    .then(data => {
        msg.textContent = data.message;
        msg.style.color = data.success ? "green" : "red";

        if (data.success) {
            emailForm.style.display = "none";
            codeForm.style.display = "block";
        }
    })
    .catch(err => {
        console.error("Error en la solicitud:", err);
        msg.textContent = "Error inesperado. Intenta más tarde.";
        msg.style.color = "red";
    });
});

// Verificar el código
codeForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const codigo = document.getElementById("codigo").value;

    fetch('../../../scripts/php/verificar_codigo_recuperacion.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo })
    })
    .then(response => response.json())
    .then(data => {
        msg.textContent = data.message;
        msg.style.color = data.success ? "green" : "red";

        if (data.success) {
            codeForm.style.display = "none";
            passwordForm.style.display = "block";
        }
    });
});

// Cambiar la contraseña
passwordForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const pass1 = document.getElementById("pass1").value;
    const pass2 = document.getElementById("pass2").value;

    if (pass1 !== pass2) {
        msg.textContent = "Las contraseñas no coinciden.";
        msg.style.color = "red";
        return;
    }

    fetch('../../../scripts/php/cambiar_contrasena.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nueva: pass1 })
    })
    .then(response => response.json())
    .then(data => {
        msg.textContent = data.message;
        msg.style.color = data.success ? "green" : "red";

        if (data.success) {
            passwordForm.reset();
        }
    });
});
