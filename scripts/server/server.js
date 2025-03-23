require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const mysql = require("mysql2");

const app = express();
app.use(cors());
app.use(express.json());

// Conexión a la base de datos MySQL
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "password",
    database: "auth_db"
});
db.connect(err => {
    if (err) throw err;
    console.log("Conectado a MySQL");
});

// Verificación de Google
app.post("/auth/google", async (req, res) => {
    const { token } = req.body;

    try {
        const googleResponse = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
        const { email, name, picture } = googleResponse.data;

        const sql = `INSERT INTO users (email, name, picture, provider) VALUES (?, ?, ?, ?) 
                     ON DUPLICATE KEY UPDATE name=?, picture=?`;
        db.query(sql, [email, name, picture, "Google", name, picture], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });

            const authToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "7d" });
            res.json({ success: true, token: authToken });
        });

    } catch (error) {
        res.status(400).json({ error: "Token inválido" });
    }
});

// Verificación de Facebook
app.post("/auth/facebook", async (req, res) => {
    const { token } = req.body;

    try {
        const facebookResponse = await axios.get(`https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${token}`);
        const { email, name, picture } = facebookResponse.data;

        const sql = `INSERT INTO users (email, name, picture, provider) VALUES (?, ?, ?, ?) 
                     ON DUPLICATE KEY UPDATE name=?, picture=?`;
        db.query(sql, [email, name, picture.data.url, "Facebook", name, picture.data.url], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });

            const authToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "7d" });
            res.json({ success: true, token: authToken });
        });

    } catch (error) {
        res.status(400).json({ error: "Token inválido" });
    }
});

app.listen(3000, () => console.log("Servidor corriendo en http://localhost:3000"));
