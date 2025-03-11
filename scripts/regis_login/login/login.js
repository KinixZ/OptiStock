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
