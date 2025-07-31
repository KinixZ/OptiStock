document.addEventListener("DOMContentLoaded", function () {
    const urlParams = new URLSearchParams(window.location.search);
    let email = urlParams.get('email'); // Obtenemos el correo del parámetro de la URL

    if (email && email !== "retry") {
        // Guardamos el correo en sessionStorage
        sessionStorage.setItem('email', email);
    } else {
        // Recuperamos el correo de sessionStorage si no está en la URL
        email = sessionStorage.getItem('email');
    }

    if (email) {
        // Si hay un correo válido, lo mostramos en la página
        document.getElementById('email').textContent = email;
        // Enviar el código de verificación automáticamente
        resendVerificationEmail(email);
    } else {
        alert("No se pudo verificar el correo. Intenta nuevamente.");
        window.location.href = "../login/login.html"; // Redirigir al registro si no hay correo
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
    .then(response => response.text().then(text => {
        if (!response.ok) {
            console.error('Respuesta del servidor:', text);
            throw new Error('HTTP ' + response.status);
        }
        try {
            return JSON.parse(text);
        } catch (e) {
            console.error('Respuesta no válida:', text);
            throw e;
        }
    }))
    .then(data => {
        if (data.success) {
            // Guardar la sesión en localStorage para que el menú principal la detecte
            localStorage.setItem('usuario_id', data.id_usuario);
            localStorage.setItem('usuario_nombre', data.nombre);
            localStorage.setItem('usuario_email', data.correo);
            localStorage.setItem('usuario_rol', data.rol);

            if (data.id_empresa) {
                localStorage.setItem('id_empresa', data.id_empresa);
            }
            if (data.empresa_nombre) {
                localStorage.setItem('empresa_nombre', data.empresa_nombre);
            }

            // Redirigir al menú principal
            window.location.href = '../../main_menu/main_menu.html';
        } else {
            alert(data.message);  // Si hubo un error, mostramos el mensaje de error
        }
    })
    .catch(error => {
        console.error("Error en la verificación:", error);
        alert("Ocurrió un error al verificar el código.");
    });
}

function resendVerificationEmail(email) {
    fetch('../../../scripts/php/resend_verificacion.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert("El código de verificación ha sido reenviado.");
        } else {
            alert("Error al reenviar el código: " + data.message);
        }
    })
    .catch(error => {
        console.error("Error al reenviar el código:", error);
        alert("Ocurrió un error al intentar reenviar el código.");
    });
}