 // Obtener el token de la URL
 const urlParams = new URLSearchParams(window.location.search);
 const token = urlParams.get('token');
 document.getElementById('token').value = token;

 document.getElementById("resetForm").addEventListener("submit", function (event) {
     event.preventDefault();

     const newPassword = document.getElementById("new-password").value;
     const confirmPassword = document.getElementById("confirm-password").value;
     const resetMessage = document.getElementById("reset-message");

     if (newPassword !== confirmPassword) {
         resetMessage.textContent = "Las contraseñas no coinciden.";
         resetMessage.style.color = "red";
         return;
     }

     fetch('../../../scripts/php/reset_password.php', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ token, password: newPassword })
     })
         .then(response => response.json())
         .then(data => {
             if (data.success) {
                 resetMessage.textContent = "Contraseña restablecida con éxito.";
                 resetMessage.style.color = "green";
             } else {
                 resetMessage.textContent = data.message || "Error al restablecer la contraseña.";
                 resetMessage.style.color = "red";
             }
         })
         .catch(err => {
             console.error("Error en la solicitud de restablecimiento:", err);
             resetMessage.textContent = "Hubo un error. Inténtalo de nuevo más tarde.";
             resetMessage.style.color = "red";
         });
 });