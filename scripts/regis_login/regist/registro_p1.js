
/* script.js */
function validatePassword(password) {
    const minLength = /.{8,}/;
    const uppercase = /[A-Z]/;
    const number = /[0-9]/;
    const specialChar = /[!@#$%^&*(),.?":{}|<>]/;

    return minLength.test(password) && uppercase.test(password) && number.test(password) && specialChar.test(password);
}

document.getElementById('registerForm').addEventListener('submit', function(event) {
    const password = document.getElementById('password').value;
    const nombre = document.getElementById('nombre').value;
    const apellido = document.getElementById('apellido').value;
    const nacimiento = document.getElementById('nacimiento').value;
    const telefono = document.getElementById('tel').value;
    const email = document.getElementById('email').value;

    const confirmPassword = document.getElementById('confirmPassword').value;
    const passwordError = document.getElementById('passwordError');
    const confirmPasswordError = document.getElementById('confirmPasswordError');
    const passwordValid = document.getElementById('passwordValid');


    let valid = true;

    if (validateForm(nombre, apellido, nacimiento, telefono, email, password, confirmPassword)) {
        // Aquí enviarías el correo de verificación (simulamos esta parte)
        sendVerificationEmail(email);

        // Redirigir a la página intermedia de verificación
        window.location.href = `regist_inter.html?email=${encodeURIComponent(email)}`;
    } else {
        alert("Por favor, completa correctamente todos los campos.");
    }

    if (!validatePassword(password)) {
        passwordError.style.display = 'block';
        passwordValid.style.display = 'none';
        valid = false;
    } else {
        passwordError.style.display = 'none';
        passwordValid.style.display = 'block';
    }

    if (password !== confirmPassword) {
        confirmPasswordError.style.display = 'block';
        valid = false;
    } else {
        confirmPasswordError.style.display = 'none';
    }

    if (!valid) {
        event.preventDefault(); // Prevent form submission if there are errors
    }
});

// Real-time validation
document.getElementById('password').addEventListener('input', function() {
    const password = this.value;
    const passwordError = document.getElementById('passwordError');
    const passwordValid = document.getElementById('passwordValid');

    if (validatePassword(password)) {
        passwordError.style.display = 'none';
        passwordValid.style.display = 'block';
    } else {
        passwordError.style.display = 'block';
        passwordValid.style.display = 'none';
    }
});

document.getElementById('confirmPassword').addEventListener('input', function() {
    const password = document.getElementById('password').value;
    const confirmPassword = this.value;
    const confirmPasswordError = document.getElementById('confirmPasswordError');

    if (password !== confirmPassword) {
        confirmPasswordError.style.display = 'block';
    } else {
        confirmPasswordError.style.display = 'none';
    }
});

document.addEventListener("DOMContentLoaded", function () {
    const emailField = document.querySelector('input[type="email"]');
    const email = sessionStorage.getItem("tempUserEmail");

    if (email) {
        emailField.value = email;
        emailField.readOnly = true; // Para evitar que lo editen manualmente
    }
});

function validateForm(nombre, apellido, nacimiento, telefono, email, password, confirmPassword) {
    // Validación simple de los campos
    if (!nombre || !apellido || !nacimiento || !telefono || !email || !password || !confirmPassword) {
        return false;
    }

    // Validación de formato de correo
    const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!emailPattern.test(email)) {
        alert("Por favor ingresa un correo válido.");
        return false;
    }

    return true;
}

function sendVerificationEmail(email) {
    // Lógica para enviar un correo de verificación (esto se simula aquí)
    console.log("Correo de verificación enviado a: " + email);

    // En un escenario real, se enviaría un correo a este correo con un enlace único para la verificación.
}