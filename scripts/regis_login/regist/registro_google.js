const urlParams = new URLSearchParams(window.location.search);
document.getElementById("correo").value = urlParams.get("email");
