import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { spawn } from 'child_process';

const app = express();
app.use(cors());
app.use(express.json());

const DB_FILE = './usuarios.db';

function runQuery(sql) {
  return new Promise((resolve, reject) => {
    const child = spawn('sqlite3', ['-json', DB_FILE, sql]);
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(err));
      } else {
        if (!out.trim()) return resolve([]);
        try {
          resolve(JSON.parse(out));
        } catch (e) {
          reject(e);
        }
      }
    });
  });
}

const esc = (s) => s.replace(/'/g, "''");

await runQuery(`CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  rol TEXT NOT NULL
)`);

const CODIGO_DELEGADO = process.env.CODIGO_DELEGADO || 'DEL123';
const CODIGO_TECNICO = process.env.CODIGO_TECNICO || 'TEC456';
const JWT_SECRET = process.env.JWT_SECRET || 'secreto';

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

app.post('/api/auth/registro', async (req, res) => {
  const { nombre, apellido, email, password, confirmarPassword, rol, codigo } = req.body;

  if (!nombre || !apellido || !email || !password || !confirmarPassword || !rol) {
    return res.status(400).json({ mensaje: 'Faltan datos' });
  }
  if (password !== confirmarPassword) {
    return res.status(400).json({ mensaje: 'Las contraseñas no coinciden' });
  }
  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      mensaje: 'La contraseña debe tener al menos 8 caracteres, incluir mayúsculas, minúsculas, números y un carácter especial.'
    });
  }
  if (rol === 'delegado' && codigo !== CODIGO_DELEGADO) {
    return res.status(400).json({ mensaje: 'Código de delegado incorrecto' });
  }
  if (rol === 'tecnico' && codigo !== CODIGO_TECNICO) {
    return res.status(400).json({ mensaje: 'Código de técnico incorrecto' });
  }

  const existente = await runQuery(
    `SELECT id FROM usuarios WHERE email='${esc(email)}' LIMIT 1;`
  );
  if (existente.length) {
    return res.status(400).json({ mensaje: 'El email ya está registrado' });
  }

  const hashed = bcrypt.hashSync(password, 10);
  await runQuery(
    `INSERT INTO usuarios (nombre, apellido, email, password, rol) VALUES ('${esc(
      nombre
    )}', '${esc(apellido)}', '${esc(email)}', '${esc(hashed)}', '${esc(rol)}')`
  );
  return res.status(201).json({ mensaje: 'Usuario registrado con éxito' });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const rows = await runQuery(
    `SELECT * FROM usuarios WHERE email='${esc(email)}' LIMIT 1;`
  );
  const usuario = rows[0];
  if (!usuario) {
    return res.status(400).json({ mensaje: 'Credenciales inválidas' });
  }
  const valido = bcrypt.compareSync(password, usuario.password);
  if (!valido) {
    return res.status(400).json({ mensaje: 'Credenciales inválidas' });
  }
  const token = jwt.sign({ id: usuario.id, rol: usuario.rol }, JWT_SECRET, {
    expiresIn: '1h'
  });
  return res.json({ token, usuario: { nombre: usuario.nombre, rol: usuario.rol, foto: '' } });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});
