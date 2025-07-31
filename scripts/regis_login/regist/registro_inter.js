document.addEventListener("DOMContentLoaded", function () {
    const urlParams = new URLSearchParams(window.location.search);
    let email = urlParams.get('email');

    if (email && email !== "retry") {
        sessionStorage.setItem('email', email);
    } else {
        email = sessionStorage.getItem('email');
    }

    if (email) {
        document.getElementById('email').textContent = email;
        resendVerificationEmail(email);
    } else {
        alert("No se pudo verificar el correo. Intenta nuevamente.");
        window.location.href = "../login/login.html";
    }

    document.getElementById('verificationForm').addEventListener('submit', function (e) {
        e.preventDefault();
        const verificationCode = document.getElementById('verificationCode').value.trim();
        
        if (!verificationCode || verificationCode.length < 4) {
            alert("Por favor ingresa un código de verificación válido");
            return;
        }

        verifyCode(email, verificationCode);
    });
});

function verifyCode(email, code) {
    console.log("Verificando código para:", email);
    
    fetch('../../../scripts/php/verificacion.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email, code: code })
    })
    .then(response => {
        console.log("Estado de la respuesta:", response.status);
        if (!response.ok) {
            return response.text().then(text => {
                console.error("Error detallado:", text);
                throw new Error(`Error HTTP ${response.status}: ${text}`);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log("Respuesta del servidor:", data);
        if (data.success) {
            // Guardar en localStorage
            localStorage.setItem('usuario_id', data.id_usuario);
            localStorage.setItem('usuario_nombre', data.nombre);
            localStorage.setItem('usuario_email', data.correo);
            localStorage.setItem('usuario_rol', data.rol);

            if (data.id_empresa) {
                localStorage.setItem('id_empresa', data.id_empresa);
                localStorage.setItem('empresa_nombre', data.empresa_nombre || '');
            }

            // Redirigir según si tiene empresa o no
            if (data.id_empresa) {
                window.location.href = '../../main_menu/main_menu.html';
            } else {
                window.location.href = 'regist_empresa.html';
            }
        } else {
            alert(data.message || "Error en la verificación");
        }
    })
    .catch(error => {
        console.error("Error completo:", error);
        alert("Error al verificar el código. Por favor revisa la consola para más detalles.");
    });
}

function resendVerificationEmail(email) {
    console.log("Reenviando código a:", email);
    
    fetch('../../../scripts/php/resend_verificacion.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email })
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(text || "Error al reenviar el código");
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            alert("El código de verificación ha sido reenviado.");
        } else {
            alert("Error: " + (data.message || "No se pudo reenviar el código"));
        }
    })
    .catch(error => {
        console.error("Error al reenviar:", error);
        alert("Error al reenviar el código: " + error.message);
    });
}