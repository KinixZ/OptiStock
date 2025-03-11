
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
    const confirmPassword = document.getElementById('confirmPassword').value;
    const passwordError = document.getElementById('passwordError');
    const confirmPasswordError = document.getElementById('confirmPasswordError');
    const passwordValid = document.getElementById('passwordValid');

    let valid = true;

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
