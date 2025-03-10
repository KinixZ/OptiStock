import { getAuth, signInWithPopup, GoogleAuthProvider, FacebookAuthProvider } from "firebase/auth"; // Importa los métodos de Firebase
import app from "../../firebase/firebase-config.js";  // Asegúrate de que la ruta sea correcta

const auth = getAuth(app);  // Obtiene la instancia de autenticación

// Función para manejar el inicio de sesión con Google
document.getElementById("google-login").addEventListener("click", () => {
    const provider = new GoogleAuthProvider();  // Crea un nuevo proveedor de autenticación con Google
    signInWithPopup(auth, provider)
        .then((result) => {
            const user = result.user;  // Usuario autenticado
            console.log("Usuario autenticado con Google:", user);
            // Aquí puedes redirigir al usuario a la página principal o hacer algo más
        })
        .catch((error) => {
            console.error("Error en autenticación con Google:", error);
        });
});

// Función para manejar el inicio de sesión con Facebook
document.getElementById("facebook-login").addEventListener("click", () => {
    const provider2 = new FacebookAuthProvider();  // Crea un nuevo proveedor de autenticación con Facebook
    signInWithPopup(auth, provider2)
        .then((result) => {
            const user = result.user;  // Usuario autenticado
            console.log("Usuario autenticado con Facebook:", user);
            // Aquí puedes redirigir al usuario a la página principal o hacer algo más
        })
        .catch((error) => {
            console.error("Error en autenticación con Facebook:", error);
        });
});
