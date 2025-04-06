// completar_registro.js
const urlParams = new URLSearchParams(window.location.search);
const correo = urlParams.get("email");
document.querySelector("input[name='correo']").value = correo;
