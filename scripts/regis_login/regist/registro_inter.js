document.addEventListener("DOMContentLoaded", function () {
    // Configurar logging
    console.log("=== Inicializando página de verificación ===");
    
    // Obtener email de la URL o sessionStorage
    const urlParams = new URLSearchParams(window.location.search);
    let email = urlParams.get('email');
    
    console.log("Email obtenido de URL:", email);
    
    if (email && email !== "retry") {
        sessionStorage.setItem('email', email);
        console.log("Email almacenado en sessionStorage");
    } else {
        email = sessionStorage.getItem('email');
        console.log("Email recuperado de sessionStorage:", email);
    }

    if (email) {
        console.log("Mostrando email en la interfaz:", email);
        document.getElementById('email').textContent = email;
        
        // Mostrar código de sesión para debug (solo desarrollo)
        console.log("SessionStorage actual:", JSON.stringify(sessionStorage));
        
        resendVerificationEmail(email);
    } else {
        console.error("No se encontró email para verificar");
        alert("No se pudo verificar el correo. Intenta nuevamente.");
        window.location.href = "../login/login.html";
    }

    // Configurar evento del formulario
    document.getElementById('verificationForm').addEventListener('submit', function (e) {
        e.preventDefault();
        
        const verificationCode = document.getElementById('verificationCode').value.trim();
        console.log("Código ingresado:", verificationCode);
        
        if (!verificationCode || verificationCode.length < 4) {
            console.warn("Código no válido:", verificationCode);
            alert("Por favor ingresa un código de verificación válido (mínimo 4 caracteres)");
            return;
        }
        
        verifyCode(email, verificationCode);
    });
});

async function verifyCode(email, code) {
    console.log("Iniciando verificación para:", email);
    
    try {
        console.log("Preparando solicitud a servidor...");
        const startTime = performance.now();
        
        const response = await fetch('../../../scripts/php/verificacion.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Debug-Token': 'true'
            },
            body: JSON.stringify({ 
                email: email, 
                code: code,
                client_time: new Date().toISOString(),
                user_agent: navigator.userAgent
            })
        });
        
        const endTime = performance.now();
        console.log(`Solicitud completada en ${(endTime - startTime).toFixed(2)}ms`);
        
        console.log("Respuesta del servidor:", {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries())
        });
        
        const data = await response.json();
        console.log("Datos de respuesta:", data);
        
        if (!response.ok) {
            console.error("Error en la respuesta:", data);
            throw new Error(data.message || `Error HTTP ${response.status}`);
        }
        
        if (data.success) {
            console.log("Verificación exitosa. Datos recibidos:", data);
            
            // Guardar datos en localStorage
            localStorage.setItem('usuario_id', data.id_usuario);
            localStorage.setItem('usuario_nombre', data.nombre);
            localStorage.setItem('usuario_email', data.correo);
            localStorage.setItem('usuario_rol', data.rol);
            
            if (data.id_empresa) {
                localStorage.setItem('id_empresa', data.id_empresa);
                localStorage.setItem('empresa_nombre', data.empresa_nombre || '');
            }
            
            console.log("Redirigiendo...");
            if (data.id_empresa) {
                window.location.href = '../../main_menu/main_menu.html';
            } else {
                window.location.href = 'regist_empresa.html';
            }
        } else {
            console.error("Error en la verificación:", data.message);
            alert(`Error: ${data.message}\n\nDetalles: ${JSON.stringify(data.debug || {}, null, 2)}`);
        }
    } catch (error) {
        console.error("Error en el proceso de verificación:", error);
        
        let errorMessage = error.message;
        if (error instanceof TypeError && error.message.includes('JSON')) {
            errorMessage = "Error al procesar la respuesta del servidor";
        }
        
        alert(`Error al verificar el código:\n\n${errorMessage}\n\nPor favor revisa la consola para más detalles.`);
        
        // Opción para reenviar el código
        const shouldResend = confirm("¿Deseas que reenviemos el código de verificación?");
        if (shouldResend) {
            resendVerificationEmail(email);
        }
    }
}

async function resendVerificationEmail(email) {
    console.log("Solicitando reenvío de código para:", email);
    
    try {
        const response = await fetch('../../../scripts/php/resend_verificacion.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                email: email,
                reason: 'user_request'
            })
        });
        
        const data = await response.json();
        console.log("Respuesta de reenvío:", data);
        
        if (data.success) {
            alert("Se ha enviado un nuevo código de verificación a tu correo.");
            
            // Mostrar información de debug si está disponible
            if (data.debug) {
                console.log("Información de debug del reenvío:", data.debug);
            }
        } else {
            console.error("Error al reenviar:", data);
            alert(`Error al reenviar el código: ${data.message || 'Error desconocido'}`);
        }
    } catch (error) {
        console.error("Error en el reenvío:", error);
        alert("Ocurrió un error al intentar reenviar el código. Por favor intenta nuevamente.");
    }
}