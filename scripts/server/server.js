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

const crearTablaReportes = `
    CREATE TABLE IF NOT EXISTS reportes_generados (
        id INT AUTO_INCREMENT PRIMARY KEY,
        folio VARCHAR(40) NOT NULL UNIQUE,
        usuario_id INT NOT NULL,
        modulos VARCHAR(255) NOT NULL,
        total_registros INT NOT NULL DEFAULT 0,
        tipo_exportacion ENUM('pdf','excel') NOT NULL DEFAULT 'pdf',
        fecha_generado DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_reportes_usuario FOREIGN KEY (usuario_id) REFERENCES usuario(id_usuario)
            ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
`;

db.query(crearTablaReportes, (err) => {
    if (err) {
        console.error('No se pudo asegurar la tabla reportes_generados:', err);
    } else {
        console.log('Tabla reportes_generados lista para usarse');
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

app.post('/api/reportes', (req, res) => {
    const { folio, usuarioId, modulos, totalRegistros, tipo } = req.body || {};

    if (!folio || !usuarioId || !modulos || (Array.isArray(modulos) && modulos.length === 0)) {
        return res.status(400).json({ success: false, message: 'Faltan datos obligatorios para guardar el reporte.' });
    }

    const modulosTexto = Array.isArray(modulos) ? modulos.join(', ') : String(modulos);
    const registros = Number.isFinite(Number(totalRegistros)) ? Number(totalRegistros) : 0;
    const tipoExportacion = tipo === 'excel' ? 'excel' : 'pdf';

    const query = `
        INSERT INTO reportes_generados (folio, usuario_id, modulos, total_registros, tipo_exportacion, fecha_generado)
        VALUES (?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
            usuario_id = VALUES(usuario_id),
            modulos = VALUES(modulos),
            total_registros = VALUES(total_registros),
            tipo_exportacion = VALUES(tipo_exportacion),
            fecha_generado = NOW();
    `;

    db.query(query, [folio, usuarioId, modulosTexto, registros, tipoExportacion], (err) => {
        if (err) {
            console.error('Error al guardar el reporte generado:', err);
            return res.status(500).json({ success: false, message: 'Error al guardar el reporte generado.' });
        }
        res.json({ success: true });
    });
});

app.get('/api/reportes', (req, res) => {
    const limiteSolicitado = Number.parseInt(req.query.limit, 10);
    const usuarioFiltro = req.query.usuarioId ? Number.parseInt(req.query.usuarioId, 10) : null;
    const limite = Number.isFinite(limiteSolicitado) ? Math.max(1, Math.min(100, limiteSolicitado)) : 20;

    let query = `
        SELECT r.folio, r.modulos, r.total_registros, r.tipo_exportacion, r.fecha_generado,
               u.id_usuario AS usuario_id, u.nombre, u.apellido, u.rol
        FROM reportes_generados r
        LEFT JOIN usuario u ON u.id_usuario = r.usuario_id
    `;
    const params = [];

    if (Number.isInteger(usuarioFiltro)) {
        query += ' WHERE r.usuario_id = ?';
        params.push(usuarioFiltro);
    }

    query += ' ORDER BY r.fecha_generado DESC LIMIT ?';
    params.push(limite);

    db.query(query, params, (err, resultados) => {
        if (err) {
            console.error('Error al obtener el historial de reportes:', err);
            return res.status(500).json({ success: false, message: 'No se pudo obtener el historial de reportes.' });
        }

        const reportes = Array.isArray(resultados)
            ? resultados.map((fila) => ({
                  folio: fila.folio,
                  modulos: fila.modulos,
                  totalRegistros: Number(fila.total_registros) || 0,
                  tipo: fila.tipo_exportacion,
                  fecha: fila.fecha_generado,
                  usuario: {
                      id: fila.usuario_id,
                      nombre: fila.nombre || '',
                      apellido: fila.apellido || '',
                      rol: fila.rol || ''
                  }
              }))
            : [];

        res.json({ success: true, reportes });
    });
});


// Inicia el servidor
const port = 3000;
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

