import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';

const app = express();
app.use(cors());
app.use(express.json());

const DB_FILE = './usuarios.db';

async function leerUsuarios() {
  try {
    const data = await fs.readFile(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function guardarUsuarios(usuarios) {
  await fs.writeFile(DB_FILE, JSON.stringify(usuarios, null, 2));
}

async function buscarUsuarioPorEmail(email) {
  const usuarios = await leerUsuarios();
  return usuarios.find((u) => u.email === email);
}

async function agregarUsuario(usuario) {
  const usuarios = await leerUsuarios();
  const id = usuarios.length > 0 ? Math.max(...usuarios.map((u) => u.id)) + 1 : 1;
  usuarios.push({ id, ...usuario });
  await guardarUsuarios(usuarios);
}

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
      mensaje:
        'La contraseña debe tener al menos 8 caracteres, incluir mayúsculas, minúsculas, números y un carácter especial.'
    });
  }
  if (rol === 'delegado' && codigo !== CODIGO_DELEGADO) {
    return res.status(400).json({ mensaje: 'Código de delegado incorrecto' });
  }
  if (rol === 'tecnico' && codigo !== CODIGO_TECNICO) {
    return res.status(400).json({ mensaje: 'Código de técnico incorrecto' });
  }

  const existente = await buscarUsuarioPorEmail(email);
  if (existente) {
    return res.status(400).json({ mensaje: 'El email ya está registrado' });
  }

  const hashed = bcrypt.hashSync(password, 10);
  await agregarUsuario({ nombre, apellido, email, password: hashed, rol });
  return res.status(201).json({ mensaje: 'Usuario registrado con éxito' });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const usuario = await buscarUsuarioPorEmail(email);
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
  return res.json({
    token,
    usuario: { nombre: usuario.nombre, rol: usuario.rol, foto: '' }
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});
