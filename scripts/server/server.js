const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const mysql = require('mysql');
const app = express();
app.use(express.json()); // Para parsear JSON
const bcrypt = require('bcrypt');
const saltRounds = 10;  // Número de rondas de sal
const crypto = require('crypto');


const CLIENT_ID = '145523824957-hoi7fcgdfg6qep6i5shhc5qpg3b8mc2g.apps.googleusercontent.com'; // Reemplaza con tu CLIENT_ID
const client = new OAuth2Client(CLIENT_ID);

// Configuración de la base de datos
const db = mysql.createConnection({
    host: 'optistock.site',
    user: 'u296155119_Admin	',
    password: 'admin123',
    database: 'u296155119_OptiStock',
});

db.connect((err) => {
    if (err) {
        console.error('Error de conexión:', err);
    } else {
        console.log('Conectado a la base de datos');
    }
});

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
    const { nombre, apellido, correo, fecha_nacimiento, telefono, contrasena } = userData;

    // Encriptar la contraseña
    const hashedPassword = await bcrypt.hash(contrasena, saltRounds);

    return new Promise((resolve, reject) => {
        db.query('INSERT INTO usuario (nombre, apellido, correo, fecha_nacimiento, telefono, contrasena) VALUES (?, ?, ?, ?, ?, ?)', 
            [nombre, apellido, correo, fecha_nacimiento, telefono, hashedPassword], 
            (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
    });
}


app.post('/registro', (req, res) => {
    const { nombre, apellido, fecha_nacimiento, telefono, correo, contrasena } = req.body;

    if (!nombre || !apellido || !fecha_nacimiento || !telefono || !correo || !contrasena) {
        return res.status(400).json({ success: false, message: "Faltan campos requeridos." });
    }

    // Encriptar la contraseña usando SHA1 (como en tu tabla)
    const contrasenaEncriptada = crypto.createHash('sha1').update(contrasena).digest('hex');

    const query = `
        INSERT INTO usuario (nombre, apellido, fecha_nacimiento, telefono, correo, contrasena)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(query, [nombre, apellido, fecha_nacimiento, telefono, correo, contrasenaEncriptada], (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ success: false, message: "El correo ya está registrado." });
            }
            return res.status(500).json({ success: false, error: err });
        }
        res.status(200).json({ success: true, message: "Usuario registrado correctamente." });
    });
});



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

