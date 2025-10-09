function validatePassword(password) {
    const minLength = /.{8,}/;
    const uppercase = /[A-Z]/;
    const number = /[0-9]/;
    const specialChar = /[!@#$%^&*(),.?":{}|<>]/;
    return minLength.test(password) && uppercase.test(password) && number.test(password) && specialChar.test(password);
}

document.getElementById('registerForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Detiene el envío automático del formulario

    const nombre = document.getElementById('nombre').value;
    const apellido = document.getElementById('apellido').value;
    const nacimiento = document.getElementById('nacimiento').value;
    const telefono = document.getElementById('tel').value;
    const correo = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    const passwordError = document.getElementById('passwordError');
    const confirmPasswordError = document.getElementById('confirmPasswordError');
    const passwordValid = document.getElementById('passwordValid');

    // Validaciones
    let valid = true;

    if (!validateForm(nombre, apellido, nacimiento, telefono, correo, password, confirmPassword)) {
        alert("Por favor, completa correctamente todos los campos.");
        return;
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

    if (!valid) return;

    // Enviar datos al backend PHP
    fetch('../../../scripts/php/registro.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            nombre,
            apellido,
            fecha_nacimiento: nacimiento,
            telefono,
            correo,
            contrasena: password
        })
    })
    .then(res => {
        if (!res.ok) {
            throw new Error(`HTTP error! Status: ${res.status}`);
        }
        return res.json();
    })
    .then(data => {
        if (data.success) {
            console.log("Usuario registrado correctamente.");
            alert(data.message || "Usuario registrado correctamente. Ahora puedes iniciar sesión.");
            window.location.href = "../login/login.html";
        } else {
            alert("Error en el registro: " + (data.message || "Vuelva a intentarlo."));
        }
    })
    .catch(error => {
        console.error('Error al registrar:', error);
        alert("Ocurrió un error al registrar.");
    });
});

// Validaciones en tiempo real
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
