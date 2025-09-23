import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import User from './models/User.js';
import Patinador from './models/Patinador.js';
import { protegerRuta, permitirRol } from './middlewares/authMiddleware.js';
import upload from './utils/multer.js';
import News from './models/News.js';
import Notification from './models/Notification.js';
import Torneo from './models/Torneo.js';
import Competencia from './models/Competencia.js';
import Resultado from './models/Resultado.js';
import PatinadorExterno from './models/PatinadorExterno.js';
import Club from './models/Club.js';
import Entrenamiento from './models/Entrenamiento.js';
import Progreso from './models/Progreso.js';
import ExcelJS from 'exceljs';
import pdfToJson from './utils/pdfToJson.js';
import parseResultadosJson from './utils/parseResultadosJson.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const resolveUploadsDir = () => {
  const configured = process.env.UPLOADS_DIR?.trim();
  if (configured) {
    return path.resolve(configured);
  }
  return path.join(__dirname, 'uploads');
};

const UPLOADS_DIR = resolveUploadsDir();
process.env.UPLOADS_DIR = UPLOADS_DIR;

// Configurar zona horaria para Argentina
process.env.TZ = 'America/Argentina/Buenos_Aires';

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

const sanitizeMongoUri = (uri) => {
  if (!uri) return '';
  try {
    const parsed = new URL(uri);
    if (parsed.password) {
      parsed.password = '***';
    }
    if (parsed.username) {
      parsed.username = '***';
    }
    return parsed.toString();
  } catch (err) {
    return '';
  }
};

// Define la URI de MongoDB con un valor predeterminado para evitar errores
// cuando no se proporciona la variable de entorno correspondiente.
const DEFAULT_MONGODB_URI = 'mongodb://localhost:27017/backend-auth';
const MONGODB_ENV_KEYS = [
  'MONGODB_URI',
  'MONGO_URI',
  'MONGODB_URL',
  'MONGO_URL',
  'DATABASE_URL',
  'DB_URI',
  'DB_URL'
];

const resolveMongoUri = () => {
  for (const key of MONGODB_ENV_KEYS) {
    const value = process.env[key];
    if (typeof value === 'string' && value.trim()) {
      const trimmed = value.trim();
      if (key !== 'MONGODB_URI') {
        process.env.MONGODB_URI = trimmed;
      }
      return trimmed;
    }
  }
  return DEFAULT_MONGODB_URI;
};

const MONGODB_URI = resolveMongoUri();
process.env.MONGODB_URI = MONGODB_URI;

const sanitizedMongoUri = sanitizeMongoUri(MONGODB_URI);
if (sanitizedMongoUri) {
  console.log(`Intentando conectar a MongoDB usando ${sanitizedMongoUri}`);
}

mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log('MongoDB conectado');
    // Mantener los índices sincronizados con el esquema actual
    await PatinadorExterno.syncIndexes();
  })

  .catch((err) => {
    console.error('Error conectando a MongoDB:', err.message);
    const sanitizedUri = sanitizeMongoUri(MONGODB_URI);
    if (sanitizedUri) {
      console.error(`URI utilizada: ${sanitizedUri}`);
    }
  });


const isProduction = process.env.NODE_ENV === 'production';


const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://patincarrera.net',
  'https://www.patincarrera.net'
];

const FALLBACK_FRONTEND_URL = isProduction
  ? 'https://patincarrera.net'
  : 'http://localhost:5173';
const FALLBACK_FRONTEND_URL_WWW = isProduction
  ? 'https://www.patincarrera.net'
  : 'http://localhost:5173';
const FALLBACK_BACKEND_URL = isProduction
  ? 'https://patincarrera.net'
  : 'http://localhost:5000';

const FRONTEND_URL = (process.env.FRONTEND_URL || FALLBACK_FRONTEND_URL).replace(/\/+$/, '');
const FRONTEND_URL_WWW = (process.env.FRONTEND_URL_WWW || FALLBACK_FRONTEND_URL_WWW).replace(/\/+$/, '');
const BACKEND_URL = (process.env.BACKEND_URL || FALLBACK_BACKEND_URL).replace(/\/+$/, '');
process.env.BACKEND_URL = BACKEND_URL;

// Some deployments proxy the backend under the `/api` prefix while others
// forward requests directly to the Express app without rewriting the path.
// Accepting both versions keeps the API resilient to minor proxy
// misconfigurations and prevents confusing 404 errors such as the one
// reported when hitting `/api/auth/login`.
const withApiAliases = (path) => {
  if (Array.isArray(path)) {
    return path.flatMap(withApiAliases);
  }

  if (typeof path !== 'string' || !path.startsWith('/api/')) {
    return [path];
  }

  const withoutApiPrefix = path.slice(4) || '/';
  return [path, withoutApiPrefix];
};

// Some deployments proxy the backend under the `/api` prefix while others
// forward requests directly to the Express app without rewriting the path.
// Accepting both versions keeps the API resilient to minor proxy
// misconfigurations and prevents confusing 404 errors such as the one
// reported when hitting `/api/auth/login`.
const withApiAliases = (path) => {
  if (Array.isArray(path)) {
    return path.flatMap(withApiAliases);
  }

  if (typeof path !== 'string' || !path.startsWith('/api/')) {
    return [path];
  }

  const withoutApiPrefix = path.slice(4) || '/';
  return [path, withoutApiPrefix];
};

const allowedOrigins = Array.from(
  new Set([
    ...DEFAULT_ALLOWED_ORIGINS.map((url) => url.replace(/\/+$/, '')),
    FRONTEND_URL,
    FRONTEND_URL_WWW
  ])
).filter(Boolean);

const app = express();

const registerWithAliases = (originalMethod) => (path, ...handlers) => {
  const looksLikePath =
    typeof path === 'string' || Array.isArray(path) || path instanceof RegExp;

  if (!looksLikePath) {
    return originalMethod(path, ...handlers);
  }

  const uniquePaths = [...new Set(withApiAliases(path))];
  uniquePaths.forEach((alias) => {
    originalMethod(alias, ...handlers);
  });

  return app;
};

['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'all'].forEach(
  (method) => {
    const original = app[method].bind(app);
    app[method] = registerWithAliases(original);
  }
);

const originalUse = app.use.bind(app);
app.use = (path, ...handlers) => {
  const looksLikePath =
    typeof path === 'string' || Array.isArray(path) || path instanceof RegExp;

  if (!looksLikePath) {
    return originalUse(path, ...handlers);
  }

  const uniquePaths = [...new Set(withApiAliases(path))];
  uniquePaths.forEach((alias) => {
    originalUse(alias, ...handlers);
  });

  return app;
};


// Fallback CORS handler to guarantee headers are always sent

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  next();
});

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin = origin.replace(/\/+$/, '');
    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    return callback(null, false);
  },
  credentials: true
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));


app.use((req, res, next) => {
  const origin = req.headers.origin?.replace(/\/+$/, '');
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    );
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, PATCH, DELETE, OPTIONS'
    );
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
  }
  next();
});

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

app.use((err, req, res, next) => {
  if (err?.type === 'entity.too.large') {
    const origin = req.headers.origin?.replace(/\/+$/, '');
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    return res.status(413).json({ message: 'Payload too large' });
  }
  return next(err);
});

app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/api/uploads', express.static(UPLOADS_DIR));


const CODIGO_DELEGADO = process.env.CODIGO_DELEGADO || 'DEL123';
const CODIGO_TECNICO = process.env.CODIGO_TECNICO || 'TEC456';
const JWT_SECRET = process.env.JWT_SECRET || 'secreto';

const CLUB_LOCAL = process.env.CLUB_LOCAL || 'Gral. Rodríguez';

const ORDEN_CATEGORIAS = [
  'CHP',
  'M7DE',
  'M7VE',
  'PDE',
  'PVE',
  '6DE',
  '6VE',
  '5DE',
  '5VE',
  '4DE',
  '4VE',
  'JDE',
  'JVE',
  'MDE',
  'MVE',
  'PDT',
  'PVT',
  '6DT',
  '6VT',
  '5DT',
  '5VT',
  '4DT',
  '4VT',
  'JDI',
  'JVI',
  'MDI',
  'MVI',
  'PDF',
  'PVF',
  '6DF',
  '6VF',
  '5DF',
  '5VF',
  '4DF',
  '4VF',
  'JDF',
  'JVF',
  'MDF',
  'MVF'
];

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

const posCategoria = (cat) => {
  const idx = ORDEN_CATEGORIAS.indexOf(cat);
  return idx === -1 ? ORDEN_CATEGORIAS.length : idx;
};

const ordenarPorCategoria = (lista) =>
  lista.sort((a, b) => posCategoria(a.categoria) - posCategoria(b.categoria));

const ordenarResultados = (lista) =>
  lista.sort((a, b) => {
    const diff = posCategoria(a.categoria) - posCategoria(b.categoria);
    return diff !== 0 ? diff : (b.puntos || 0) - (a.puntos || 0);
  });

const recalcularPosiciones = async (competenciaId, categoria = null) => {
  const filtro = { competenciaId };
  if (categoria) filtro.categoria = categoria;
  const resultados = await Resultado.find(filtro);
  const porCategoria = resultados.reduce((acc, r) => {
    acc[r.categoria] = acc[r.categoria] || [];
    acc[r.categoria].push(r);
    return acc;
  }, {});
  const promesas = [];
  for (const cat of Object.keys(porCategoria)) {
    porCategoria[cat]
      .sort((a, b) => (b.puntos || 0) - (a.puntos || 0))
      .forEach((r, idx) => {
        if (r.posicion !== idx + 1) {
          r.posicion = idx + 1;
          promesas.push(r.save());
        }
      });
  }
  await Promise.all(promesas);
};

async function crearNotificacionesParaTodos(mensaje, competencia = null) {
  try {
    const usuarios = await User.find({}, '_id');
    const notificaciones = usuarios.map((u) => ({
      destinatario: u._id,
      mensaje,
      ...(competencia ? { competencia } : {})
    }));
    if (notificaciones.length > 0) {
      await Notification.insertMany(notificaciones);
    }
  } catch (e) {
    console.error('Error creando notificaciones', e);
  }
}

app.post(withApiAliases('/api/auth/registro'), async (req, res) => {
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

app.get(withApiAliases('/api/auth/confirmar/:token'), async (req, res) => {
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

app.post(withApiAliases('/api/auth/login'), async (req, res) => {
  try {
    const { email, password } = req.body;
    const usuario = await User.findOne({ email });
    if (!usuario) {
      return res.status(400).json({ mensaje: 'Credenciales inválidas' });
    }
    if (!usuario.confirmado) {
      return res.status(403).json({ mensaje: 'Tenés que confirmar tu cuenta primero' });
    }
    if (!usuario.password) {
      return res.status(400).json({
        mensaje:
          'Este usuario se registró con Google y no tiene una contraseña local. Iniciá sesión con Google.'
      });
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
  } catch (err) {
    console.error('Error en /api/auth/login', err);
    res.status(500).json({ mensaje: 'Error al iniciar sesión' });
  }
});

app.post('/api/contacto', protegerRuta, async (req, res) => {
  const { mensaje } = req.body;
  if (!mensaje) {
    return res.status(400).json({ mensaje: 'Mensaje requerido' });
  }
  try {
    const usuario = await User.findById(req.usuario.id).select('nombre email');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    await transporter.sendMail({
      from: `"${usuario.nombre}" <${usuario.email}>`,
      to: 'patincarreragr25@gmail.com',
      subject: 'Nuevo mensaje de contacto',
      text: mensaje,
      html: `<p>${mensaje}</p>`
    });
    res.json({ mensaje: 'Mensaje enviado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al enviar el mensaje' });
  }
});

app.get('/api/protegido/usuario', protegerRuta, async (req, res) => {
  try {
    const usuario = await User.findById(req.usuario.id)
      .select('-password')
      .populate('patinadores');
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
      // Use the configured backend URL when returning the uploaded image so the
      // path is valid even when requests are proxied through another host.
      user.foto = `${BACKEND_URL}/uploads/${req.file.filename}`;
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
        seguro,
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
        seguro,
        numeroCorredor,
        categoria,
        fotoRostro: fotoRostroFile
          ? `${BACKEND_URL}/uploads/${fotoRostroFile.filename}`
          : undefined,
        foto: fotoFile
          ? `${BACKEND_URL}/uploads/${fotoFile.filename}`
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

app.get('/api/patinadores-externos', protegerRuta, async (req, res) => {
  try {
    const filtro = {};
    if (req.query.categoria) {
      filtro.categoria = req.query.categoria;
    }
    const externos = await PatinadorExterno.find(filtro).sort({
      apellido: 1,
      primerNombre: 1
    });
    res.json(externos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al obtener patinadores externos' });
  }
});

app.get('/api/clubs', protegerRuta, async (req, res) => {
  try {
    const clubs = await Club.find().sort({ nombre: 1 });
    res.json(clubs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al obtener clubes' });
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

app.post('/api/patinadores/:id/seguro', protegerRuta, async (req, res) => {
  try {
    const { tipo } = req.body;
    if (!['SD', 'SA'].includes(tipo)) {
      return res.status(400).json({ mensaje: 'Tipo de seguro inválido' });
    }
    const patinador = await Patinador.findById(req.params.id);
    if (!patinador) {
      return res.status(404).json({ mensaje: 'Patinador no encontrado' });
    }
    const anoActual = new Date().getFullYear();
    const diarias = patinador.historialSeguros.filter(
      (s) => s.tipo === 'SD' && new Date(s.fecha).getFullYear() === anoActual
    ).length;
    const anuales = patinador.historialSeguros.filter(
      (s) => s.tipo === 'SA' && new Date(s.fecha).getFullYear() === anoActual
    ).length;
    if (anuales > 0) {
      return res
        .status(400)
        .json({ mensaje: 'El seguro anual ya fue solicitado este año' });
    }
    if (tipo === 'SD' && diarias >= 2) {
      return res.status(400).json({
        mensaje: 'El seguro diario solo puede solicitarse dos veces por año'
      });
    }
    patinador.seguro = tipo;
    patinador.historialSeguros.push({ tipo, fecha: new Date() });
    await patinador.save();
    res.json(patinador);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al solicitar el seguro' });
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
        actualizacion.fotoRostro = `${BACKEND_URL}/uploads/${fotoRostroFile.filename}`;
      }
      if (fotoFile) {
        actualizacion.foto = `${BACKEND_URL}/uploads/${fotoFile.filename}`;
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

app.post('/api/patinadores/asociar', protegerRuta, async (req, res) => {
  const { dniPadre, dniMadre } = req.body;
  if (!dniPadre && !dniMadre) {
    return res.status(400).json({ mensaje: 'Debe proporcionar dniPadre o dniMadre' });
  }
  try {
    const condiciones = [];
    if (dniPadre) condiciones.push({ dniPadre });
    if (dniMadre) condiciones.push({ dniMadre });
    const patinadores = await Patinador.find({ $or: condiciones });
    if (patinadores.length === 0) {
      return res.status(404).json({ mensaje: 'No se encontraron patinadores' });
    }
    const usuario = await User.findById(req.usuario.id);
    const ids = patinadores.map((p) => p._id);
    const existentes = (usuario.patinadores || []).map((id) => id.toString());
    ids.forEach((id) => {
      if (!existentes.includes(id.toString())) {
        usuario.patinadores.push(id);
      }
    });
    await usuario.save();
    res.json(patinadores);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al asociar patinadores' });
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

app.get('/api/news/:id', async (req, res) => {
  try {
    const noticia = await News.findById(req.params.id).populate(
      'autor',
      'nombre apellido'
    );
    if (!noticia) {
      return res.status(404).json({ mensaje: 'Noticia no encontrada' });
    }
    const respuesta = {
      _id: noticia._id,
      titulo: noticia.titulo,
      contenido: noticia.contenido,
      imagen: noticia.imagen,
      autor: noticia.autor
        ? `${noticia.autor.nombre} ${noticia.autor.apellido}`
        : 'Anónimo',
      fecha: noticia.fecha
    };
    res.json(respuesta);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al obtener la noticia' });
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
        ? `${BACKEND_URL}/uploads/${req.file.filename}`
        : undefined;
      const noticia = await News.create({
        titulo,
        contenido,
        imagen,
        autor: req.usuario.id
      });
      await crearNotificacionesParaTodos(`Nueva noticia: ${titulo}`);
      res.status(201).json(noticia);
    } catch (err) {
      console.error(err);
      res.status(500).json({ mensaje: 'Error al crear la noticia' });
    }
  }
);



app.post(
  '/api/notifications',
  protegerRuta,
  permitirRol('Delegado', 'Tecnico'),
  async (req, res) => {
    const { mensaje } = req.body;
    if (!mensaje) return res.status(400).json({ mensaje: 'Mensaje requerido' });
    await crearNotificacionesParaTodos(mensaje);
    res.status(201).json({ mensaje: 'Notificaciones enviadas' });
  },
);

app.get('/api/notifications', protegerRuta, async (req, res) => {
  const userId = req.usuario?.id;

  if (!userId) {
    return res.status(401).json({ mensaje: 'Usuario no autenticado' });
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    console.warn('ID de usuario inválido recibido en /api/notifications', userId);
    return res.status(400).json({ mensaje: 'Identificador de usuario inválido' });
  }

  const limitParam = Number.parseInt(req.query?.limit ?? '', 10);
  const limit = Number.isNaN(limitParam) ? 100 : Math.max(1, Math.min(limitParam, 200));

  try {
    const destinatarioId = new mongoose.Types.ObjectId(userId);
    const notificaciones = await Notification.find({ destinatario: destinatarioId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json(notificaciones);
  } catch (err) {
    console.error('Error al obtener notificaciones', err);
    res.status(500).json({ mensaje: 'Error al obtener notificaciones' });
  }
});

app.put('/api/notifications/:id/read', protegerRuta, async (req, res) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, destinatario: req.usuario.id },
      { leido: true },
      { new: true }
    );
    if (!notif) return res.status(404).json({ mensaje: 'Notificación no encontrada' });
    res.json(notif);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al marcar notificación' });
  }
});

app.delete('/api/notifications/:id', protegerRuta, permitirRol('Delegado', 'Tecnico'), async (req, res) => {
  try {
    const notif = await Notification.findById(req.params.id);
    if (!notif) return res.status(404).json({ mensaje: 'Notificación no encontrada' });
    if (String(notif.destinatario) !== req.usuario.id) {
      return res.status(403).json({ mensaje: 'No autorizado' });
    }
    await Notification.deleteMany({ mensaje: notif.mensaje, leido: false });
    res.json({ mensaje: 'Notificaciones eliminadas' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al eliminar notificaciones' });
  }
});

// ---- TORNEOS Y COMPETENCIAS ----

app.post('/api/tournaments', protegerRuta, permitirRol('Delegado'), async (req, res) => {
  const { nombre, fechaInicio, fechaFin } = req.body;
  if (!nombre || !fechaInicio || !fechaFin) {
    return res.status(400).json({ mensaje: 'Faltan datos' });
  }
  try {
    const torneo = await Torneo.create({ nombre, fechaInicio, fechaFin });
    res.status(201).json(torneo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al crear torneo' });
  }
});

app.get('/api/tournaments', protegerRuta, async (req, res) => {
  try {
    const torneos = await Torneo.find().sort({ fechaInicio: -1 });
    res.json(torneos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al obtener torneos' });
  }
});

app.put('/api/tournaments/:id', protegerRuta, permitirRol('Delegado'), async (req, res) => {
  const { nombre, fechaInicio, fechaFin } = req.body;
  try {
    const torneo = await Torneo.findByIdAndUpdate(
      req.params.id,
      { nombre, fechaInicio, fechaFin },
      { new: true, runValidators: true }
    );
    if (!torneo) return res.status(404).json({ mensaje: 'Torneo no encontrado' });
    res.json(torneo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al actualizar torneo' });
  }
});

app.delete('/api/tournaments/:id', protegerRuta, permitirRol('Delegado'), async (req, res) => {
  try {
    const comps = await Competencia.find({ torneo: req.params.id }, '_id');
    const compIds = comps.map((c) => c._id);
    await Resultado.deleteMany({ competenciaId: { $in: compIds } });
    await Competencia.deleteMany({ torneo: req.params.id });
    const torneo = await Torneo.findByIdAndDelete(req.params.id);
    if (!torneo) return res.status(404).json({ mensaje: 'Torneo no encontrado' });
    res.json({ mensaje: 'Torneo eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al eliminar torneo' });
  }
});

app.post(
  '/api/tournaments/:id/competitions',
  protegerRuta,
  permitirRol('Delegado'),
  upload.single('imagen'),
  async (req, res) => {
    const { nombre, fecha } = req.body;
    if (!nombre || !fecha) {
      return res.status(400).json({ mensaje: 'Faltan datos' });
    }
    try {
      const torneo = await Torneo.findById(req.params.id);
      if (!torneo) return res.status(404).json({ mensaje: 'Torneo no encontrado' });
      const imagen = req.file
        ? `${BACKEND_URL}/uploads/${req.file.filename}`
        : undefined;
      const competencia = await Competencia.create({
        nombre,
        fecha,
        torneo: torneo._id,
        ...(imagen ? { imagen } : {})
      });
      await crearNotificacionesParaTodos(`Nueva competencia ${nombre}`, competencia._id);
      res.status(201).json(competencia);
    } catch (err) {
      console.error(err);
      res.status(500).json({ mensaje: 'Error al crear competencia' });
    }
  }
);

app.get('/api/competencias', async (req, res) => {
  try {
    const comps = await Competencia.find().sort({ fecha: 1 });
    res.json(comps);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al obtener competencias' });
  }
});

app.get('/api/tournaments/:id/competitions', protegerRuta, async (req, res) => {
  try {
    const comps = await Competencia.find({ torneo: req.params.id }).sort({ fecha: 1 });
    res.json(comps);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al obtener competencias' });
  }
});

app.put(
  '/api/competitions/:id',
  protegerRuta,
  permitirRol('Delegado'),
  upload.single('imagen'),
  async (req, res) => {
    const { nombre, fecha } = req.body;
    const update = { nombre, fecha };
    if (req.file) {
      update.imagen = `${BACKEND_URL}/uploads/${req.file.filename}`;
    }
    try {
      const comp = await Competencia.findByIdAndUpdate(req.params.id, update, {
        new: true,
        runValidators: true
      });
      if (!comp) return res.status(404).json({ mensaje: 'Competencia no encontrada' });
      res.json(comp);
    } catch (err) {
      console.error(err);
      res.status(500).json({ mensaje: 'Error al actualizar competencia' });
    }
  }
);

app.delete('/api/competitions/:id', protegerRuta, permitirRol('Delegado'), async (req, res) => {
  try {
    await Resultado.deleteMany({ competenciaId: req.params.id });
    // Elimina notificaciones no leídas asociadas a la competencia
    await Notification.deleteMany({ competencia: req.params.id, leido: false });
    const comp = await Competencia.findByIdAndDelete(req.params.id);
    if (!comp) return res.status(404).json({ mensaje: 'Competencia no encontrada' });
    res.json({ mensaje: 'Competencia eliminada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al eliminar competencia' });
  }
});

app.get('/api/competitions/:id/resultados', protegerRuta, async (req, res) => {
  try {
    await recalcularPosiciones(req.params.id);
    const resultados = await Resultado.find({ competenciaId: req.params.id })
      .populate('deportistaId', 'primerNombre segundoNombre apellido')
      .populate('invitadoId', 'primerNombre segundoNombre apellido club');
    res.json(ordenarResultados(resultados));
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al obtener resultados' });
  }
});

app.post(
  '/api/competitions/:id/resultados/import-pdf',
  protegerRuta,
  permitirRol('Delegado'),
  upload.single('archivo'),
  async (req, res) => {
    try {
      const competencia = await Competencia.findById(req.params.id);
      if (!competencia) {
        return res.status(404).json({ mensaje: 'Competencia no encontrada' });
      }
      if (!req.file) {
        return res.status(400).json({ mensaje: 'Archivo no proporcionado' });
      }
      const buffer = fs.readFileSync(req.file.path);
      const jsonPath = req.file.path.replace(/\.[^./]+$/, '.json');
      const json = await pdfToJson(buffer, jsonPath);
      fs.unlinkSync(req.file.path);
      const hash = crypto.createHash('md5').update(buffer).digest('hex');
      const filas = parseResultadosJson(json);
      let count = 0;
      for (const fila of filas) {
        const patinador = await Patinador.findOne({
          numeroCorredor: Number(fila.dorsal)
        });
        if (!patinador) continue;
        await Resultado.findOneAndUpdate(
          {
            competenciaId: competencia._id,
            deportistaId: patinador._id,
            categoria: fila.categoria
          },
          {
            puntos: fila.puntos,
            dorsal: fila.dorsal,
            fuenteImportacion: {
              archivo: req.file.originalname,
              hash
            }
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        count++;
      }
      await recalcularPosiciones(competencia._id);
      res.json({
        mensaje: 'Importación completada',
        procesados: count,
        archivoJson: path.basename(jsonPath),
        resultados: filas
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ mensaje: 'Error al importar resultados' });
    }
  }
);

app.post(
  '/api/competitions/:id/resultados/manual',
  protegerRuta,
  permitirRol('Delegado'),
  async (req, res) => {
    const { categoria, puntos, dorsal, patinadorId, invitado } = req.body;
    try {
      const competencia = await Competencia.findById(req.params.id);
      if (!competencia) {
        return res.status(404).json({ mensaje: 'Competencia no encontrada' });
      }
      const filtro = { competenciaId: competencia._id, categoria };
      let clubDoc;
      if (patinadorId) {
        const pat = await Patinador.findById(patinadorId);
        if (!pat) {
          return res.status(404).json({ mensaje: 'Patinador no encontrado' });
        }
        filtro.deportistaId = pat._id;
        clubDoc = await Club.findOne({ nombre: 'GENERAL RODRIGUEZ' });
        if (!clubDoc) {
          clubDoc = await Club.create({ nombre: 'GENERAL RODRIGUEZ' });
        }
      } else if (invitado) {
        const { primerNombre, segundoNombre, apellido, club } = invitado;
        if (!primerNombre || !apellido || !club) {
          return res.status(400).json({ mensaje: 'Datos de invitado incompletos' });
        }
        const clubNombre = club.trim().toUpperCase();
        clubDoc = await Club.findOne({ nombre: clubNombre });
        if (!clubDoc) {
          clubDoc = await Club.create({ nombre: clubNombre });
        }
        let ext = await PatinadorExterno.findOne({
          primerNombre,
          segundoNombre,
          apellido,
          club: clubNombre
        });
        if (!ext) {
          ext = await PatinadorExterno.create({
            primerNombre,
            segundoNombre,
            apellido,
            club: clubNombre,
            categoria,
            numeroCorredor: dorsal
          });
        } else {
          let actualizado = false;
          if (ext.categoria !== categoria) {
            ext.categoria = categoria;
            actualizado = true;
          }
          if (dorsal && ext.numeroCorredor !== Number(dorsal)) {
            ext.numeroCorredor = Number(dorsal);
            actualizado = true;
          }
          if (actualizado) await ext.save();
        }
        filtro.invitadoId = ext._id;
      } else {
        return res
          .status(400)
          .json({ mensaje: 'Debe proporcionar patinadorId o datos de invitado' });
      }

      const actualizacion = { puntos, dorsal };
      if (clubDoc) {
        actualizacion.clubId = clubDoc._id;
      }

      const resultado = await Resultado.findOneAndUpdate(filtro, actualizacion, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      });

      await recalcularPosiciones(competencia._id, categoria);
      const actualizado = await Resultado.findById(resultado._id);
      res.json(actualizado);
    } catch (err) {
      console.error(err);
      res.status(500).json({ mensaje: 'Error al guardar resultado' });
    }
  }
);

app.post('/api/competitions/:id/responder', protegerRuta, async (req, res) => {
  const { participa } = req.body;
  try {
    const competencia = await Competencia.findById(req.params.id);
    if (!competencia) return res.status(404).json({ mensaje: 'Competencia no encontrada' });
    const usuario = await User.findById(req.usuario.id).populate('patinadores');
    const notif = await Notification.findOne({
      destinatario: req.usuario.id,
      competencia: competencia._id
    });
    if (!notif) return res.status(404).json({ mensaje: 'Notificación no encontrada' });
    notif.estadoRespuesta = participa ? 'Participo' : 'No Participo';
    notif.leido = true;
    await notif.save();
    if (participa) {
      const ids = usuario.patinadores.map((p) => p._id);
      competencia.listaBuenaFe.addToSet(...ids);
      await competencia.save();
    }
    res.json({ mensaje: 'Respuesta registrada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al responder' });
  }
});

app.get(
  '/api/competitions/:id/lista-buena-fe',
  protegerRuta,
  permitirRol('Delegado'),
  async (req, res) => {
    try {
      const comp = await Competencia.findById(req.params.id).populate('listaBuenaFe');
      if (!comp) return res.status(404).json({ mensaje: 'Competencia no encontrada' });
      const listaOrdenada = ordenarPorCategoria([...comp.listaBuenaFe]);
      res.json(listaOrdenada);
    } catch (err) {
      console.error(err);
      res.status(500).json({ mensaje: 'Error al obtener lista' });
    }
  }
);

app.get(
  '/api/competitions/:id/lista-buena-fe/excel',
  protegerRuta,
  permitirRol('Delegado'),
  async (req, res) => {
    try {
      const comp = await Competencia.findById(req.params.id).populate('listaBuenaFe');
      if (!comp) return res.status(404).json({ mensaje: 'Competencia no encontrada' });

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Lista');
      sheet.getColumn(1).width = 1.89;
      sheet.getColumn(2).width = 10.22;
      sheet.getColumn(3).width = 7.56;
      sheet.getColumn(4).width = 37.78;
      sheet.getColumn(5).width = 10.33;
      sheet.getColumn(6).width = 13.22;
      sheet.getColumn(7).width = 11.6;
      sheet.getColumn(8).width = 11.33;

      sheet.getRow(1);

      const allBorders = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      const imgPath = path.resolve(
        __dirname,
        '../frontend-auth/public/APM.png'
      );
      if (fs.existsSync(imgPath)) {
        const imgBase64 = fs.readFileSync(imgPath, { encoding: 'base64' });
        const imgId = workbook.addImage({ base64: imgBase64, extension: 'png' });
        sheet.mergeCells('A2:C5');
        sheet.addImage(imgId, 'A2:C5');
      }

      sheet.mergeCells('D2:H2');
      const r2 = sheet.getCell('D2');
      r2.value = 'ASOCIACIÓN PATINADORES METROPOLITANOS';
      r2.font = { name: 'Verdana', size: 16, color: { argb: 'FFFFFFFF' } };
      r2.alignment = { horizontal: 'center', vertical: 'middle' };
      r2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00008B' } };
      r2.border = allBorders;

      sheet.mergeCells('D3:H3');
      const r3 = sheet.getCell('D3');
      r3.value =
        'patinapm@gmail.com - patincarreraapm@gmail.com - lbfpatincarrera@gmail.com';
      r3.font = { name: 'Arial', size: 10, color: { argb: 'FF000000' } };
      r3.alignment = { horizontal: 'center', vertical: 'middle' };
      r3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
      r3.border = allBorders;

      sheet.mergeCells('D4:H4');
      const r4 = sheet.getCell('D4');
      r4.value = 'COMITÉ DE CARRERAS';
      r4.font = { name: 'Franklin Gothic Medium', size: 16, color: { argb: 'FFFFFFFF' } };
      r4.alignment = { horizontal: 'center', vertical: 'middle' };
      r4.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00008B' } };
      r4.border = allBorders;

      sheet.mergeCells('D5:H5');
      const r5 = sheet.getCell('D5');
      r5.value =
        'LISTA DE BUENA FE  ESCUELA-TRANSICION-INTERMEDIA-FEDERADOS-LIBRES';
      r5.font = { name: 'Lucida Console', size: 10, color: { argb: 'FFFFFFFF' } };
      r5.alignment = { horizontal: 'center', vertical: 'middle' };
      r5.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00008B' } };
      r5.border = allBorders;

      sheet.mergeCells('B6:C6');
      const b6 = sheet.getCell('B6');
      b6.value = 'FECHA DE EMISION';
      b6.font = { name: 'Calibri', size: 11 };
      b6.alignment = { horizontal: 'center', vertical: 'middle' };
      b6.border = allBorders;
      sheet.mergeCells('D6:H6');
      const d6 = sheet.getCell('D6');
      const emision = new Date();
      const meses = [
        'Enero',
        'Febrero',
        'Marzo',
        'Abril',
        'Mayo',
        'Junio',
        'Julio',
        'Agosto',
        'Septiembre',
        'Octubre',
        'Noviembre',
        'Diciembre'
      ];
      d6.value = `${emision.getDate()} de ${meses[emision.getMonth()]} de ${emision.getFullYear()}`;
      d6.font = { name: 'Arial', size: 10 };
      d6.alignment = { horizontal: 'center', vertical: 'middle' };
      d6.border = allBorders;

      sheet.mergeCells('B7:C7');
      const b7 = sheet.getCell('B7');
      b7.value = 'EVENTO Y FECHA';
      b7.font = { name: 'Calibri', size: 11 };
      b7.alignment = { horizontal: 'center', vertical: 'middle' };
      b7.border = allBorders;
      sheet.mergeCells('D7:H7');
      const d7 = sheet.getCell('D7');
      const compDate = new Date(comp.fecha);
      d7.value = `${comp.nombre} ${compDate.getDate()} de ${meses[compDate.getMonth()]} de ${compDate.getFullYear()}`;
      d7.font = { name: 'Arial', size: 10 };
      d7.alignment = { horizontal: 'center', vertical: 'middle' };
      d7.border = allBorders;

      sheet.mergeCells('B8:C8');
      const b8 = sheet.getCell('B8');
      b8.value = 'ORGANIZADOR';
      b8.font = { name: 'Calibri', size: 11 };
      b8.alignment = { horizontal: 'center', vertical: 'middle' };
      b8.border = allBorders;
      sheet.mergeCells('D8:H8');
      const d8 = sheet.getCell('D8');
      d8.value = req.query.organizador || '';
      d8.font = { name: 'Arial', size: 10 };
      d8.alignment = { horizontal: 'center', vertical: 'middle' };
      d8.border = allBorders;

      const lista = Array.isArray(comp.listaBuenaFe)
        ? ordenarPorCategoria([...comp.listaBuenaFe])
        : [];
      const getUltimaLetra = (cat) => {
        if (!cat || typeof cat !== 'string') return '';
        return cat.trim().slice(-1).toUpperCase();
      };

      let rowNum = 9;
      const CLUB = CLUB_LOCAL;
      lista.forEach((p, idx) => {
        const row = sheet.getRow(rowNum++);
        row.getCell(1).value = idx + 1;
        row.getCell(2).value = p.seguro;
        row.getCell(3).value = p.numeroCorredor;
        row.getCell(4).value = `${p.apellido} ${p.primerNombre}`;
        row.getCell(5).value = p.categoria;
        row.getCell(6).value = CLUB;
        row.getCell(7).value = new Date(p.fechaNacimiento).toLocaleDateString();
        row.getCell(8).value = p.dni;
        for (let c = 1; c <= 8; c++) {
          const cell = row.getCell(c);
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = allBorders;
        }
        row.commit();

        const next = lista[idx + 1];
        const currL = getUltimaLetra(row.getCell(5).value);
        const nextL = next ? getUltimaLetra(next.categoria) : null;
        if (
          !next ||
          (currL === 'E' && (nextL === 'T' || nextL === 'I')) ||
          ((currL === 'T' || currL === 'I') && nextL === 'F')
        ) {
          const sep = sheet.getRow(rowNum++);
          sep.height = 10;
          for (let c = 1; c <= 8; c++) {
            sep.getCell(c).fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FF000000' }
            };
          }
          sep.commit();
        }
      });

      // After listing all skaters, add additional certification info
      for (let i = 0; i < 2; i++) {
        sheet.getRow(rowNum++).commit();
      }

      const staff = [
        {
          name: 'MANZUR VANESA CAROLINA',
          role: 'TECN',
          birth: '08/07/1989',
          dni: '34543626'
        },
        {
          name: 'MANZUR GASTON ALFREDO',
          role: 'DELEG',
          birth: '14/12/1983',
          dni: '30609550'
        },
        {
          name: 'CURA VANESA ELIZABEHT',
          role: 'DELEG',
          birth: '24/02/1982',
          dni: '29301868'
        }
      ];

      staff.forEach(({ name, role, birth, dni }) => {
        const row = sheet.getRow(rowNum);
        const values = [name, role, birth, dni];
        values.forEach((value, idx) => {
          const cell = row.getCell(4 + idx);
          cell.value = value;
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = allBorders;
          cell.font = { color: { argb: 'FF000000' }, bold: true };
        });
        row.commit();
        rowNum++;
      });

      sheet.getRow(rowNum++).commit();

      const fechaRow = sheet.getRow(rowNum++);
      const cFecha = fechaRow.getCell(3);
      cFecha.value = 'FECHA';
      cFecha.font = { bold: true };
      cFecha.alignment = { horizontal: 'center', vertical: 'middle' };
      const gFecha = fechaRow.getCell(7);
      gFecha.value = 'FECHA';
      gFecha.font = { bold: true };
      gFecha.alignment = { horizontal: 'center', vertical: 'middle' };
      fechaRow.commit();

      const sigRow = sheet.getRow(rowNum++);
      const cSig = sigRow.getCell(3);
      cSig.value = 'SECRETARIO/A CLUB';
      cSig.font = { bold: true };
      cSig.alignment = { horizontal: 'center', vertical: 'middle' };
      const gSig = sigRow.getCell(7);
      gSig.value = 'PRESIDENTE/A CLUB';
      gSig.font = { bold: true };
      gSig.alignment = { horizontal: 'center', vertical: 'middle' };
      sigRow.commit();

      sheet.getRow(rowNum++).commit();

      sheet.mergeCells(`B${rowNum}:H${rowNum}`);
      const med1 = sheet.getCell(`B${rowNum}`);
      med1.value =
        'CERTIFICACION MEDICA: CERTIFICO QUE LAS PERSONAS DETALLADAS PRECEDENTEMENTE SE ENCUENTRAN APTAS FISICA Y';
      med1.font = { color: { argb: 'FFFF0000' } };
      med1.alignment = { horizontal: 'left', vertical: 'middle' };
      sheet.getRow(rowNum).commit();
      rowNum++;

      sheet.mergeCells(`B${rowNum}:H${rowNum}`);
      const med2 = sheet.getCell(`B${rowNum}`);
      med2.value =
        'PSIQUICAMENTE, PARA LA PRACTICA ACTIVA DE ESTE DEPORTE Y CUENTAN CON SEGURO CON POLIZA VIGENTE.';
      med2.font = { color: { argb: 'FFFF0000' } };
      med2.alignment = { horizontal: 'left', vertical: 'middle' };
      sheet.getRow(rowNum).commit();
      rowNum++;

      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="lista_buena_fe.xlsx"'
      );
      res.send(Buffer.from(buffer));
    } catch (err) {
      console.error(err);
      res.status(500).json({ mensaje: 'Error al generar excel' });
    }
  }
);
// ---- RANKINGS ----

app.get('/api/tournaments/:id/ranking/individual', protegerRuta, async (req, res) => {
  try {
    const comps = await Competencia.find({ torneo: req.params.id }, '_id');
    const compIds = comps.map((c) => c._id);
    const resultados = await Resultado.find({ competenciaId: { $in: compIds } })
      .populate('deportistaId', 'primerNombre segundoNombre apellido')
      .populate('invitadoId', 'primerNombre segundoNombre apellido')
      .populate('clubId', 'nombre');
    const clubGR = await Club.findOne({ nombre: 'GENERAL RODRIGUEZ' });
    const clubDefault = clubGR
      ? { _id: clubGR._id, nombre: 'General Rodriguez' }
      : { nombre: 'General Rodriguez' };
    const agrupado = {};
    for (const r of resultados) {
      const categoria = r.categoria;
      const persona = r.deportistaId || r.invitadoId;
      if (!persona) continue;
      const id = String(persona._id);
      if (!agrupado[categoria]) agrupado[categoria] = {};
      if (!agrupado[categoria][id]) {
        const nombre = `${persona.primerNombre}${
          persona.segundoNombre ? ` ${persona.segundoNombre}` : ''
        } ${persona.apellido}`;
        agrupado[categoria][id] = {
          id,
          nombre,
          puntos: 0,
          club: r.clubId
            ? { _id: r.clubId._id, nombre: r.clubId.nombre }
            : clubDefault
        };
      }
      agrupado[categoria][id].puntos += r.puntos || 0;
    }
    const respuesta = Object.keys(agrupado)
      .sort((a, b) => posCategoria(a) - posCategoria(b))
      .map((cat) => ({
        categoria: cat,
        patinadores: Object.values(agrupado[cat]).sort(
          (a, b) => b.puntos - a.puntos
        )
      }));
    res.json(respuesta);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al obtener ranking individual' });
  }
});

app.get('/api/tournaments/:id/ranking/club', protegerRuta, async (req, res) => {
  try {
    const comps = await Competencia.find({ torneo: req.params.id }, '_id');
    const compIds = comps.map((c) => c._id);
    const resultados = await Resultado.find({
      competenciaId: { $in: compIds }
    }).populate('clubId', 'nombre');
    const clubGR = await Club.findOne({ nombre: 'GENERAL RODRIGUEZ' });
    const clubDefault = clubGR
      ? { _id: clubGR._id, nombre: 'General Rodriguez' }
      : { nombre: 'General Rodriguez' };
    const ranking = {};
    for (const r of resultados) {
      const clubDoc = r.clubId
        ? { _id: r.clubId._id, nombre: r.clubId.nombre }
        : clubDefault;
      const cid = String(clubDoc._id || 'default');
      if (!ranking[cid]) {
        ranking[cid] = { club: clubDoc, puntos: 0 };
      }
      ranking[cid].puntos += r.puntos || 0;
    }
    const respuesta = Object.values(ranking).sort((a, b) => b.puntos - a.puntos);
    res.json(respuesta);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al obtener ranking por club' });
  }
});

// Entrenamientos
app.get('/api/entrenamientos', protegerRuta, permitirRol('Tecnico'), async (req, res) => {
  try {
    const entrenamientos = await Entrenamiento.find().sort({ fecha: -1 });
    res.json(entrenamientos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al obtener entrenamientos' });
  }
});

app.get('/api/entrenamientos/:id', protegerRuta, permitirRol('Tecnico'), async (req, res) => {
  try {
    const entrenamiento = await Entrenamiento.findById(req.params.id).populate(
      'asistencias.patinador',
      'primerNombre apellido'
    );
    if (!entrenamiento) {
      return res.status(404).json({ mensaje: 'Entrenamiento no encontrado' });
    }
    res.json(entrenamiento);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al obtener entrenamiento' });
  }
});

app.post('/api/entrenamientos', protegerRuta, permitirRol('Tecnico'), async (req, res) => {
  try {
    const { fecha, asistencias } = req.body;
    if (!fecha) {
      return res.status(400).json({ mensaje: 'La fecha es obligatoria' });
    }
    const nuevo = await Entrenamiento.create({
      fecha,
      asistencias,
      tecnico: req.usuario.id
    });
    res.status(201).json(nuevo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al crear entrenamiento' });
  }
});

app.put('/api/entrenamientos/:id', protegerRuta, permitirRol('Tecnico'), async (req, res) => {
  try {
    const { asistencias, fecha } = req.body;
    if (!fecha) {
      return res.status(400).json({ mensaje: 'La fecha es obligatoria' });
    }
    const actualizado = await Entrenamiento.findByIdAndUpdate(
      req.params.id,
      { asistencias, fecha },
      { new: true }
    );
    if (!actualizado) {
      return res.status(404).json({ mensaje: 'Entrenamiento no encontrado' });
    }
    res.json(actualizado);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al actualizar entrenamiento' });
  }
});

app.delete('/api/entrenamientos/:id', protegerRuta, permitirRol('Tecnico'), async (req, res) => {
  try {
    const eliminado = await Entrenamiento.findByIdAndDelete(req.params.id);
    if (!eliminado) {
      return res.status(404).json({ mensaje: 'Entrenamiento no encontrado' });
    }
    res.json({ mensaje: 'Entrenamiento eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al eliminar entrenamiento' });
  }
});

// Progresos: registro y consulta
app.post('/api/progresos', protegerRuta, permitirRol('Tecnico'), async (req, res) => {
  try {
    const { patinador, descripcion, fecha } = req.body;
    if (!patinador || !descripcion) {
      return res.status(400).json({ mensaje: 'Patinador y descripcion son obligatorios' });
    }
    const nuevo = await Progreso.create({
      patinador,
      tecnico: req.usuario.id,
      descripcion,
      fecha: fecha || Date.now()
    });
    res.status(201).json(nuevo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al crear progreso' });
  }
});

app.post('/api/progresos/:id/enviar', protegerRuta, permitirRol('Tecnico'), async (req, res) => {
  try {
    const prog = await Progreso.findById(req.params.id).populate(
      'patinador',
      'primerNombre apellido'
    );
    if (!prog) {
      return res.status(404).json({ mensaje: 'Progreso no encontrado' });
    }
    if (prog.enviado) {
      return res.status(400).json({ mensaje: 'Progreso ya enviado' });
    }
    const usuarios = await User.find({
      patinadores: prog.patinador._id
    });
    if (usuarios.length === 0) {
      return res
        .status(404)
        .json({ mensaje: 'No se encontró destinatario para el progreso' });
    }
    const mensaje = `Nuevo progreso de ${prog.patinador.primerNombre} ${prog.patinador.apellido}`;
    const notificaciones = usuarios.map((u) => ({
      destinatario: u._id,
      mensaje,
      progreso: prog._id
    }));
    await Notification.insertMany(notificaciones);
    prog.enviado = true;
    await prog.save();
    res.json({ mensaje: 'Reporte enviado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al enviar reporte' });
  }
});

app.get('/api/progresos/:patinadorId', protegerRuta, async (req, res) => {
  try {
    const { patinadorId } = req.params;
    const usuario = await User.findById(req.usuario.id);
    if (
      usuario.rol !== 'Tecnico' &&
      !(usuario.patinadores || []).some((id) => id.toString() === patinadorId)
    ) {
      return res.status(403).json({ mensaje: 'Acceso denegado' });
    }
    const progresos = await Progreso.find({ patinador: patinadorId })
      .sort({ fecha: -1 })
      .populate('tecnico', 'nombre apellido');
    res.json(progresos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al obtener progresos' });
  }
});

app.get('/api/progreso/:id', protegerRuta, async (req, res) => {
  try {
    const prog = await Progreso.findById(req.params.id)
      .populate('tecnico', 'nombre apellido')
      .populate('patinador', 'primerNombre apellido');
    if (!prog) {
      return res.status(404).json({ mensaje: 'Progreso no encontrado' });
    }
    const usuario = await User.findById(req.usuario.id);
    if (
      usuario.rol !== 'Tecnico' &&
      !(usuario.patinadores || []).some((id) => id.toString() === prog.patinador._id.toString())
    ) {
      return res.status(403).json({ mensaje: 'Acceso denegado' });
    }
    res.json(prog);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al obtener progreso' });
  }
});

// Inicio de sesión con Google (OAuth 2.0 sin dependencias externas)
app.get(withApiAliases('/api/auth/google'), (req, res) => {
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    'https://patincarrera.net/api/auth/google/callback';
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
app.get(withApiAliases('/api/auth/google/callback'), async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).json({ mensaje: 'Código no proporcionado por Google' });
  }
  try {
    const redirectUri =
      process.env.GOOGLE_REDIRECT_URI ||
      'https://patincarrera.net/api/auth/google/callback';
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
