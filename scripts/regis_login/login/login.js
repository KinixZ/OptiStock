import { getAuth, signInWithPopup, GoogleAuthProvider, FacebookAuthProvider } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import app from "../../firebase/firebase-config.js";  // Asegúrate de que la ruta sea correcta

const auth = getAuth(app);
const db = getFirestore(app);

// Función para verificar si el usuario ya está registrado
async function checkUserExists(email) {
    const userRef = doc(db, "users", email); // Asumiendo que la colección es "users"
    const userSnap = await getDoc(userRef);
    return userSnap.exists();
}

// Función para manejar el registro automático
async function registerUser(user) {
    const userRef = doc(db, "users", user.email);
    await setDoc(userRef, {
        name: user.displayName || "",
        email: user.email,
        provider: user.providerId,
        createdAt: new Date()
    });
    console.log("Usuario registrado en la base de datos");
}

// Manejo del inicio de sesión con Google
document.getElementById("google-login").addEventListener("click", async () => {
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        const exists = await checkUserExists(user.email);
        if (!exists) {
            sessionStorage.setItem("tempUserEmail", user.email);
            window.location.href = "../regist/registro_p1.html"; // Redirigir a completar datos
        } else {
            console.log("Inicio de sesión exitoso con Google:", user);
            window.location.href = "dashboard.html"; // Página principal tras iniciar sesión
        }
    } catch (error) {
        console.error("Error en autenticación con Google:", error);
    }
});

// Manejo del inicio de sesión con Facebook
document.getElementById("facebook-login").addEventListener("click", async () => {
    const provider = new FacebookAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        const exists = await checkUserExists(user.email);
        if (!exists) {
            sessionStorage.setItem("tempUserEmail", user.email);
            window.location.href = "../regist/registro_p1.html"; // Redirigir a completar datos
        } else {
            console.log("Inicio de sesión exitoso con Facebook:", user);
            window.location.href = "dashboard.html"; // Página principal tras iniciar sesión
        }
    } catch (error) {
        console.error("Error en autenticación con Facebook:", error);
    }
});

// Facebook Login
window.fbAsyncInit = function () {
    FB.init({
        appId: 'YOUR_FACEBOOK_APP_ID', // 🔴 Reemplazar con tu App ID de Facebook
        cookie: true,
        xfbml: true,
        version: 'v12.0'
    });
};
document.getElementById("facebook-login").addEventListener("click", function () {
    FB.login(function (response) {
        if (response.authResponse) {
            console.log("Facebook Login Success", response);
        }
    }, { scope: 'public_profile,email' });
});

// Google Login
function handleCredentialResponse(response) {
    console.log("Google ID Token: ", response.credential);
}
window.onload = function () {
    google.accounts.id.initialize({
        client_id: "145523824957-hoi7fcgdfg6qep6i5shhc5qpg3b8mc2g.apps.googleusercontent.com", // 🔴 Reemplazar con tu CLIENT_ID de Google
        callback: handleCredentialResponse
    });
    google.accounts.id.renderButton(
        document.getElementById("google-login"), // 🔵 Se asigna el botón al div con ID google-login
        { theme: "outline", size: "large" }
    );
};
