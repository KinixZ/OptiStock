document.addEventListener("DOMContentLoaded", function () {
    const urlParams = new URLSearchParams(window.location.search);
    let email = urlParams.get('email');

    if (email && email !== "retry") {
        sessionStorage.setItem('email', email);
    } else {
        email = sessionStorage.getItem('email');
    }

    const emailElement = document.getElementById('email');
    const infoElement = document.getElementById('verificationInfo');

    if (emailElement) {
        emailElement.textContent = email || 'tu cuenta';
    }

    if (!email && infoElement) {
        infoElement.textContent = "No se pudo identificar la cuenta. Regresa al inicio de sesión e inténtalo nuevamente.";
    }
});
