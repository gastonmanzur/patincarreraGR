import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import User from './models/User.js';

// Cargar variables de entorno desde .env si está presente
const envPath = path.resolve('.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^([^#=]+)=([^]*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (!process.env[key]) process.env[key] = value;
    }
  });
}

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB conectado'))
  .catch((err) => console.error('Error conectando a MongoDB:', err.message));

const app = express();
app.use(cors());
app.use(express.json());

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

  const existente = await User.findOne({ email });
  if (existente) {
    return res.status(400).json({ mensaje: 'El email ya está registrado' });
  }

  const hashed = bcrypt.hashSync(password, 10);
  const rolGuardado = rol.charAt(0).toUpperCase() + rol.slice(1);
  await User.create({ nombre, apellido, email, password: hashed, rol: rolGuardado });
  return res.status(201).json({ mensaje: 'Usuario registrado con éxito' });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const usuario = await User.findOne({ email });
  if (!usuario) {
    return res.status(400).json({ mensaje: 'Credenciales inválidas' });
  }
  const valido = bcrypt.compareSync(password, usuario.password);
  if (!valido) {
    return res.status(400).json({ mensaje: 'Credenciales inválidas' });
  }
  const token = jwt.sign({ id: usuario._id, rol: usuario.rol }, JWT_SECRET, {
    expiresIn: '1h'
  });
  return res.json({
    token,
    usuario: { nombre: usuario.nombre, rol: usuario.rol, foto: usuario.foto || '' }
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});
