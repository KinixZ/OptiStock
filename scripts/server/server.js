const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const mysql = require('mysql');
const fs = require('fs');
const path = require('path');
const app = express();
app.use(express.json({ limit: '25mb' })); // Para parsear JSON con archivos codificados en base64
const bcrypt = require('bcrypt');
const saltRounds = 10;  // Número de rondas de sal
const crypto = require('crypto');

const REPORT_RETENTION_DAYS = 60; // Aproximadamente dos meses
const REPORT_RETENTION_MS = REPORT_RETENTION_DAYS * 24 * 60 * 60 * 1000;
const REPORTS_ROOT = path.join(__dirname, '../../docs/report-history');
const REPORT_FILES_DIR = path.join(REPORTS_ROOT, 'files');
const REPORT_INDEX_FILE = path.join(REPORTS_ROOT, 'index.json');

const MIME_EXTENSION_MAP = {
    'application/pdf': '.pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/vnd.ms-excel': '.xls',
    'text/csv': '.csv'
};

function ensureReportStorage() {
    if (!fs.existsSync(REPORTS_ROOT)) {
        fs.mkdirSync(REPORTS_ROOT, { recursive: true });
    }
    if (!fs.existsSync(REPORT_FILES_DIR)) {
        fs.mkdirSync(REPORT_FILES_DIR, { recursive: true });
    }
    if (!fs.existsSync(REPORT_INDEX_FILE)) {
        fs.writeFileSync(REPORT_INDEX_FILE, '[]', 'utf8');
    }
}

function readReportIndex() {
    ensureReportStorage();
    try {
        const raw = fs.readFileSync(REPORT_INDEX_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error('No se pudo leer el índice de reportes:', error);
        return [];
    }
}

function writeReportIndex(index) {
    try {
        fs.writeFileSync(REPORT_INDEX_FILE, JSON.stringify(index, null, 2), 'utf8');
    } catch (error) {
        console.error('No se pudo escribir el índice de reportes:', error);
    }
}

function removeReportFile(storageName) {
    if (!storageName) {
        return;
    }
    const filePath = path.join(REPORT_FILES_DIR, storageName);
    if (fs.existsSync(filePath)) {
        try {
            fs.unlinkSync(filePath);
        } catch (error) {
            console.error(`No se pudo eliminar el archivo de reporte ${storageName}:`, error);
        }
    }
}

function cleanupOldReports(index) {
    const reports = Array.isArray(index) ? index : readReportIndex();
    const now = Date.now();
    const filtered = [];
    let hasChanges = false;

    for (const report of reports) {
        const createdAt = new Date(report.createdAt).getTime();
        if (!Number.isFinite(createdAt) || now - createdAt >= REPORT_RETENTION_MS) {
            removeReportFile(report.storageName);
            hasChanges = true;
        } else {
            filtered.push(report);
        }
    }

    if (hasChanges) {
        writeReportIndex(filtered);
    }

    return filtered;
}

function safeRandomId() {
    if (typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return crypto.randomBytes(16).toString('hex');
}

function sanitizeFileName(fileName) {
    if (typeof fileName !== 'string' || !fileName.trim()) {
        return 'reporte';
    }
    return path.basename(fileName).replace(/[\\/:*?"<>|]+/g, '_');
}

function ensureExtension(fileName, mimeType) {
    const currentExt = path.extname(fileName);
    if (currentExt) {
        return fileName;
    }
    const extension = MIME_EXTENSION_MAP[mimeType] || '';
    return `${fileName}${extension}`;
}

ensureReportStorage();
cleanupOldReports();


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


app.get('/api/report-history', (req, res) => {
    try {
        const reports = cleanupOldReports();
        const sorted = reports.slice().sort((a, b) => {
            const aDate = new Date(a.createdAt).getTime();
            const bDate = new Date(b.createdAt).getTime();
            return Number.isFinite(bDate) - Number.isFinite(aDate) || bDate - aDate;
        });
        res.json({ success: true, reports: sorted, retentionDays: REPORT_RETENTION_DAYS });
    } catch (error) {
        console.error('No se pudo obtener el historial de reportes:', error);
        res.status(500).json({ success: false, message: 'No se pudo obtener el historial de reportes.' });
    }
});

app.post('/api/report-history', (req, res) => {
    const { fileName, mimeType, fileContent, source, notes } = req.body || {};

    if (!fileName || !mimeType || !fileContent) {
        return res.status(400).json({ success: false, message: 'Datos del archivo incompletos.' });
    }

    let base64Payload = fileContent;
    if (typeof base64Payload !== 'string') {
        return res.status(400).json({ success: false, message: 'Contenido del archivo inválido.' });
    }

    const dataUrlIndex = base64Payload.indexOf('base64,');
    if (dataUrlIndex !== -1) {
        base64Payload = base64Payload.slice(dataUrlIndex + 7);
    }

    let buffer;
    try {
        buffer = Buffer.from(base64Payload, 'base64');
    } catch (error) {
        console.error('Error al decodificar el archivo recibido:', error);
        return res.status(400).json({ success: false, message: 'No se pudo procesar el archivo enviado.' });
    }

    if (!buffer || !buffer.length) {
        return res.status(400).json({ success: false, message: 'El archivo recibido está vacío.' });
    }

    try {
        const sanitizedName = sanitizeFileName(fileName);
        const ensuredName = ensureExtension(sanitizedName, mimeType);
        const storageName = `${Date.now()}-${safeRandomId()}${path.extname(ensuredName)}`;
        const filePath = path.join(REPORT_FILES_DIR, storageName);

        fs.writeFileSync(filePath, buffer);

        const createdAt = new Date().toISOString();
        const expiresAt = new Date(Date.now() + REPORT_RETENTION_MS).toISOString();

        const reports = cleanupOldReports();
        const entry = {
            id: safeRandomId(),
            originalName: ensuredName,
            mimeType,
            storageName,
            size: buffer.length,
            createdAt,
            expiresAt,
            source: typeof source === 'string' ? source.slice(0, 120) : '',
            notes: typeof notes === 'string' ? notes.slice(0, 240) : ''
        };

        reports.push(entry);
        writeReportIndex(reports);

        res.status(201).json({ success: true, report: entry, retentionDays: REPORT_RETENTION_DAYS });
    } catch (error) {
        console.error('No se pudo guardar el archivo en el historial:', error);
        res.status(500).json({ success: false, message: 'No se pudo guardar el archivo en el historial.' });
    }
});

app.get('/api/report-history/:id/download', (req, res) => {
    const { id } = req.params;
    try {
        const reports = cleanupOldReports();
        const report = reports.find((entry) => entry.id === id);

        if (!report) {
            return res.status(404).json({ success: false, message: 'Reporte no encontrado o expirado.' });
        }

        const filePath = path.join(REPORT_FILES_DIR, report.storageName);
        if (!fs.existsSync(filePath)) {
            const filtered = reports.filter((entry) => entry.id !== id);
            writeReportIndex(filtered);
            return res.status(410).json({ success: false, message: 'El archivo ya no está disponible.' });
        }

        res.download(filePath, report.originalName);
    } catch (error) {
        console.error('No se pudo descargar el reporte solicitado:', error);
        res.status(500).json({ success: false, message: 'No se pudo descargar el archivo solicitado.' });
    }
});


// Inicia el servidor
const port = 3000;
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

