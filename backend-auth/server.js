import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import User from './models/User.js';
import Patinador from './models/Patinador.js';
import { protegerRuta, permitirRol } from './middlewares/authMiddleware.js';
import upload from './utils/multer.js';
import News from './models/News.js';

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
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}
app.use('/uploads', express.static('uploads'));

const CODIGO_DELEGADO = process.env.CODIGO_DELEGADO || 'DEL123';
const CODIGO_TECNICO = process.env.CODIGO_TECNICO || 'TEC456';
const JWT_SECRET = process.env.JWT_SECRET || 'secreto';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

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
  const token = crypto.randomBytes(20).toString('hex');

  await User.create({
    nombre,
    apellido,
    email,
    password: hashed,
    rol: rolGuardado,
    tokenConfirmacion: token
  });

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const url = `${BACKEND_URL}/api/auth/confirmar/${token}`;
  await transporter.sendMail({
    from: '"Mi Proyecto" <no-reply@miweb.com>',
    to: email,
    subject: 'Confirmá tu cuenta',
    html: `<p>Hacé clic en el siguiente enlace para confirmar tu cuenta:</p><a href="${url}">${url}</a>`
  });

  return res
    .status(201)
    .json({ mensaje: 'Usuario registrado con éxito. Revisa tu email para confirmar la cuenta.' });
});

app.get('/api/auth/confirmar/:token', async (req, res) => {
  const { token } = req.params;
  const usuario = await User.findOne({ tokenConfirmacion: token });
  if (!usuario) {
    return res.status(400).send('Token no válido o ya usado');
  }
  usuario.confirmado = true;
  usuario.tokenConfirmacion = null;
  await usuario.save();
  return res.redirect(`${FRONTEND_URL}/`);
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const usuario = await User.findOne({ email });
  if (!usuario) {
    return res.status(400).json({ mensaje: 'Credenciales inválidas' });
  }
  if (!usuario.confirmado) {
    return res.status(403).json({ mensaje: 'Tenés que confirmar tu cuenta primero' });
  }
  const valido = bcrypt.compareSync(password, usuario.password);
  if (!valido) {
    return res.status(400).json({ mensaje: 'Credenciales inválidas' });
  }
  // Extendemos la duración del token para evitar que la sesión
  // se cierre de manera prematura. Antes el token expiraba en 1 hora,
  // lo cual provocaba que el usuario perdiera la sesión rápidamente.
  // Ahora el token tiene una vigencia de 24 horas.
  const token = jwt.sign({ id: usuario._id, rol: usuario.rol }, JWT_SECRET, {
    expiresIn: '24h'
  });
  return res.json({
    token,
    usuario: { nombre: usuario.nombre, rol: usuario.rol, foto: usuario.foto || '' }
  });
});

app.get('/api/protegido/usuario', protegerRuta, async (req, res) => {
  try {
    const usuario = await User.findById(req.usuario.id).select('-password');
    res.json({ usuario });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener el usuario' });
  }
});

app.post(
  '/api/protegido/foto-perfil',
  protegerRuta,
  upload.single('foto'),
  async (req, res) => {
    try {
      const user = await User.findById(req.usuario.id);
      user.foto = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
      await user.save();
      res.json({ mensaje: 'Foto actualizada', foto: user.foto });
    } catch (err) {
      console.error(err);
      res.status(500).json({ mensaje: 'Error al actualizar la foto' });
    }
  }
);

app.post(
  '/api/patinadores',
  protegerRuta,
  upload.fields([
    { name: 'fotoRostro', maxCount: 1 },
    { name: 'foto', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const {
        primerNombre,
        segundoNombre,
        apellido,
        edad,
        fechaNacimiento,
        dni,
        cuil,
        direccion,
        dniMadre,
        dniPadre,
        telefono,
        sexo,
        nivel,
        numeroCorredor,
        categoria
      } = req.body;

      const fotoRostroFile = req.files?.fotoRostro?.[0];
      const fotoFile = req.files?.foto?.[0];

      const patinador = await Patinador.create({
        primerNombre,
        segundoNombre,
        apellido,
        edad,
        fechaNacimiento,
        dni,
        cuil,
        direccion,
        dniMadre,
        dniPadre,
        telefono,
        sexo,
        nivel,
        numeroCorredor,
        categoria,
        fotoRostro: fotoRostroFile
          ? `${req.protocol}://${req.get('host')}/uploads/${fotoRostroFile.filename}`
          : undefined,
        foto: fotoFile
          ? `${req.protocol}://${req.get('host')}/uploads/${fotoFile.filename}`
          : undefined
      });

      res.status(201).json(patinador);
    } catch (err) {
      console.error(err);

      // Manejo específico de errores de validación y duplicados
      if (err.name === 'ValidationError') {
        const mensajes = Object.values(err.errors).map((e) => e.message);
        return res.status(400).json({ mensaje: mensajes.join(', ') });
      }

      if (err.code === 11000) {
        const campo = Object.keys(err.keyValue || {})[0];
        return res.status(400).json({ mensaje: `${campo} ya existe` });
      }

  res.status(500).json({ mensaje: 'Error al crear el patinador' });
    }
  }
);

app.get('/api/patinadores', async (req, res) => {
  try {
    const patinadores = await Patinador.find().sort({ edad: 1 });
    res.json(patinadores);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al obtener patinadores' });
  }
});

app.get('/api/patinadores/:id', async (req, res) => {
  try {
    const patinador = await Patinador.findById(req.params.id);
    if (!patinador) {
      return res.status(404).json({ mensaje: 'Patinador no encontrado' });
    }
    res.json(patinador);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al obtener el patinador' });
  }
});

app.put(
  '/api/patinadores/:id',
  protegerRuta,
  upload.fields([
    { name: 'fotoRostro', maxCount: 1 },
    { name: 'foto', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const actualizacion = { ...req.body };
      const fotoRostroFile = req.files?.fotoRostro?.[0];
      const fotoFile = req.files?.foto?.[0];

      if (fotoRostroFile) {
        actualizacion.fotoRostro = `${req.protocol}://${req.get('host')}/uploads/${fotoRostroFile.filename}`;
      }
      if (fotoFile) {
        actualizacion.foto = `${req.protocol}://${req.get('host')}/uploads/${fotoFile.filename}`;
      }

      const patinadorActualizado = await Patinador.findByIdAndUpdate(
        req.params.id,
        actualizacion,
        { new: true, runValidators: true }
      );

      if (!patinadorActualizado) {
        return res.status(404).json({ mensaje: 'Patinador no encontrado' });
      }

      res.json(patinadorActualizado);
    } catch (err) {
      console.error(err);
      res.status(500).json({ mensaje: 'Error al actualizar el patinador' });
    }
  }
);

  app.delete('/api/patinadores/:id', protegerRuta, async (req, res) => {
    try {
      const patinador = await Patinador.findByIdAndDelete(req.params.id);
      if (!patinador) {
        return res.status(404).json({ mensaje: 'Patinador no encontrado' });
      }
      res.json({ mensaje: 'Patinador eliminado' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ mensaje: 'Error al eliminar el patinador' });
    }
  });

  // Asociar patinadores a un usuario por DNI de padre o madre
  app.post('/api/patinadores/asociar', protegerRuta, async (req, res) => {
    try {
      const { dni } = req.body;
      if (!dni) {
        return res.status(400).json({ mensaje: 'DNI requerido' });
      }

      const patinadores = await Patinador.find({
        $or: [{ dniMadre: dni }, { dniPadre: dni }]
      });

      if (patinadores.length === 0) {
        return res.status(404).json({ mensaje: 'No se encontraron patinadores' });
      }

      await User.findByIdAndUpdate(
        req.usuario.id,
        { $addToSet: { patinadores: { $each: patinadores.map((p) => p._id) } } },
        { new: true }
      );

      res.json(patinadores);
    } catch (err) {
      console.error(err);
      res.status(500).json({ mensaje: 'Error al asociar patinadores' });
    }
  });

  // Obtener patinadores asociados a un usuario
  app.get('/api/patinadores/asociados', protegerRuta, async (req, res) => {
    try {
      const usuario = await User.findById(req.usuario.id).populate('patinadores');
      if (!usuario) {
        return res.status(404).json({ mensaje: 'Usuario no encontrado' });
      }
      res.json(usuario.patinadores || []);
    } catch (err) {
      console.error(err);
      res.status(500).json({ mensaje: 'Error al obtener patinadores asociados' });
    }
  });

app.get('/api/news', async (req, res) => {
  try {
    const noticias = await News.find()
      .sort({ fecha: -1 })
      .populate('autor', 'nombre apellido');
    const respuesta = noticias.map((n) => ({
      _id: n._id,
      titulo: n.titulo,
      contenido: n.contenido,
      imagen: n.imagen,
      autor: n.autor ? `${n.autor.nombre} ${n.autor.apellido}` : 'Anónimo',
      fecha: n.fecha
    }));
    res.json(respuesta);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al obtener noticias' });
  }
});

app.post(
  '/api/news',
  protegerRuta,
  permitirRol('Delegado', 'Tecnico'),
  upload.single('imagen'),
  async (req, res) => {
    try {
      const { titulo, contenido } = req.body;
      const imagen = req.file
        ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
        : undefined;
      const noticia = await News.create({
        titulo,
        contenido,
        imagen,
        autor: req.usuario.id
      });
      res.status(201).json(noticia);
    } catch (err) {
      console.error(err);
      res.status(500).json({ mensaje: 'Error al crear la noticia' });
    }
  }
);

// Inicio de sesión con Google (OAuth 2.0 sin dependencias externas)
app.get('/api/auth/google', (req, res) => {
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback';
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'profile email',
    access_type: 'offline',
    prompt: 'consent'
  });
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  res.redirect(authUrl);
});

// Callback de Google
app.get('/api/auth/google/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).json({ mensaje: 'Código no proporcionado por Google' });
  }
  try {
    const redirectUri =
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback';
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });
    const tokenData = await tokenRes.json();
    const idToken = tokenData.id_token;
    if (!idToken) {
      return res.status(400).json({ mensaje: 'Token de Google no recibido' });
    }
    const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());

    let usuario = await User.findOne({ googleId: payload.sub });
    if (!usuario) {
      usuario = await User.create({
        nombre: payload.given_name || payload.name || 'Usuario',
        apellido: payload.family_name || '',
        email: payload.email,
        confirmado: true,
        googleId: payload.sub,
        foto: payload.picture || ''
      });
    }

    // Generamos un token con vigencia de 24 horas para evitar que la
    // sesión de los usuarios que inician con Google se cierre de manera
    // prematura. De esta forma se mantiene el mismo tiempo de expiración
    // que en el inicio de sesión tradicional.
    const token = jwt.sign(
      { id: usuario._id, rol: usuario.rol, foto: usuario.foto || '' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.redirect(`${FRONTEND_URL}/google-success?token=${token}`);
  } catch (err) {
    console.error('Error en autenticación de Google', err);
    res.redirect(`${FRONTEND_URL}/login?error=google`);
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});
