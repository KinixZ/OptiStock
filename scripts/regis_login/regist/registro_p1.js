/* registro_p1.js actualizado para OptiStock */

// Verifica requisitos de la contraseña
function validatePassword(password) {
    const minLength   = /.{8,}/;
    const uppercase   = /[A-Z]/;
    const number      = /[0-9]/;
    const specialChar = /[!@#$%^&*(),.?":{}|<>]/;
    return (
        minLength.test(password) &&
        uppercase.test(password)  &&
        number.test(password)     &&
        specialChar.test(password)
    );
}

// Verifica campos obligatorios y formato de correo
function validateForm(nombre, apellido, nacimiento, telefono, email, password, confirmPassword) {
    if (!nombre || !apellido || !nacimiento || !telefono || !email || !password || !confirmPassword) {
        return false;
    }
    const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!emailPattern.test(email)) {
        alert("Por favor ingresa un correo válido.");
        return false;
    }
    return true;
}

// Referencias a elementos
const form               = document.getElementById('registerForm');
const passwordError      = document.getElementById('passwordError');
const passwordValid      = document.getElementById('passwordValid');
const confirmPasswordErr = document.getElementById('confirmPasswordError');

// Evento submit: validación y envío
form.addEventListener('submit', function(event) {
    event.preventDefault();

    // Obtener valores de los campos
    const nombre          = document.getElementById('nombre').value.trim();
    const apellido        = document.getElementById('apellido').value.trim();
    const nacimiento      = document.getElementById('fecha_nacimiento').value;
    const telefono        = document.getElementById('telefono').value.trim();
    const correo          = document.getElementById('correo').value.trim();
    const password        = document.getElementById('contrasena').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    let valid = true;

    // Validación de campos completos
    if (!validateForm(nombre, apellido, nacimiento, telefono, correo, password, confirmPassword)) {
        alert("Por favor, completa correctamente todos los campos.");
        return;
    }

    // Validación de contraseña
    if (!validatePassword(password)) {
        passwordError.style.display = 'block';
        passwordValid.style.display = 'none';
        valid = false;
    } else {
        passwordError.style.display = 'none';
        passwordValid.style.display = 'block';
    }

    // Validación de confirmación
    if (password !== confirmPassword) {
        confirmPasswordErr.style.display = 'block';
        valid = false;
    } else {
        confirmPasswordErr.style.display = 'none';
    }

    if (!valid) return;

    // Todos los checks pasan: enviar formulario al backend PHP
    this.submit();
});

// Validación en tiempo real de contraseña
document.getElementById('contrasena').addEventListener('input', function() {
    const pwd = this.value;
    if (validatePassword(pwd)) {
        passwordError.style.display = 'none';
        passwordValid.style.display = 'block';
    } else {
        passwordError.style.display = 'block';
        passwordValid.style.display = 'none';
    }
});

// Validación en tiempo real de confirmación de contraseña
document.getElementById('confirmPassword').addEventListener('input', function() {
    const pwd   = document.getElementById('contrasena').value;
    const conf  = this.value;
    if (pwd !== conf) {
        confirmPasswordErr.style.display = 'block';
    } else {
        confirmPasswordErr.style.display = 'none';
    }
});
// Validación de campos al cargar la página
window.addEventListener('load', function() {
    // Disparar evento de entrada para validar contraseñas
    document.getElementById('contrasena').dispatchEvent(new Event('input'));
    document.getElementById('confirmPassword').dispatchEvent(new Event('input'));
});
