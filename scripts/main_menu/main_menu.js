document.addEventListener("DOMContentLoaded", function () {
    const userName = document.getElementById("user-name");
    
    // Obtener el nombre del usuario desde la sesión (lo puedes recuperar con una solicitud AJAX si es necesario)
    const nombreUsuario = localStorage.getItem('usuario_nombre');
    userName.textContent = nombreUsuario || "Usuario";

    // Verificar si el usuario tiene una empresa registrada
    fetch('../php/verificar_empresa.php', {
        method: 'GET',
    })
    .then(response => response.json())
    .then(data => {
        if (!data.tiene_empresa) {
            // Redirigir si no tiene empresa
            window.location.href = "../../pages/regis_login/regist/regist_empresa.html";
        }
    })
    .catch(error => console.error('Error:', error));
});

function redirectTo(page) {
    window.location.href = page;
}
