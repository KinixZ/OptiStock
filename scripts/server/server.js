const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const mysql = require('mysql');
const app = express();
app.use(express.json()); // Para parsear JSON

const CLIENT_ID = '145523824957-hoi7fcgdfg6qep6i5shhc5qpg3b8mc2g.apps.googleusercontent.com'; // Reemplaza con tu CLIENT_ID
const client = new OAuth2Client(CLIENT_ID);

// Configuración de la base de datos
const db = mysql.createConnection({
    host: 'localhost',
    user: 'admin',
    password: 'admin123',
    database: 'u296155119_OptiStock',
});

db.connect();

// Función para verificar el token de Google
async function verifyToken(idToken) {
    const ticket = await client.verifyIdToken({
        idToken: idToken,
        audience: CLIENT_ID, // Especificar el CLIENT_ID de Google para el cual se emitió el token
    });
    const payload = ticket.getPayload(); // Información del usuario
    return payload; // Devuelve la información del usuario
}

// Función para comprobar si el usuario ya existe
async function checkIfUserExists(email) {
    return new Promise((resolve, reject) => {
        db.query('SELECT * FROM usuario WHERE correo = ?', [email], (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
}

// Función para crear un nuevo usuario
async function createUser(userData) {
    return new Promise((resolve, reject) => {
        const { nombre, apellido, correo, fecha_nacimiento } = userData;
        db.query('INSERT INTO usuario (nombre, apellido, correo, fecha_nacimiento) VALUES (?, ?, ?, ?)', 
            [nombre, apellido, correo, fecha_nacimiento], (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
}

// Endpoint para recibir el token de Google
app.post('/auth/google', async (req, res) => {
    const { token } = req.body;

    try {
        const userData = await verifyToken(token);  // Verifica el token
        console.log(userData);  // Información del usuario (nombre, correo, etc.)

        // Verificar si el usuario ya existe en la base de datos
        const existingUser = await checkIfUserExists(userData.email);

        if (existingUser.length > 0) {
            // Si el usuario ya existe, verificar si la cuenta está verificada
            const user = existingUser[0];
            if (user.verificacion_cuenta) {
                // Si la cuenta está verificada, iniciar sesión
                res.status(200).json({ success: true, user });
            } else {
                // Si la cuenta no está verificada, redirigir a la página de verificación de correo
                res.status(200).json({ success: false, message: "Verifica tu correo antes de acceder." });
            }
        } else {
            // Si el usuario no existe, lo creamos y enviamos el correo de verificación
            await createUser(userData);
            res.status(200).json({ success: true, message: "Usuario creado. Revisa tu correo para verificar la cuenta." });
        }
    } catch (error) {
        res.status(400).json({ success: false, error: 'Token inválido' });
    }
});


// Inicia el servidor
const port = 3000;
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
