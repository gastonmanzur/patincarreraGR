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
import ExcelJS from 'exceljs';
// Importación diferida de pdf-parse para evitar errores al iniciar el servidor
// cuando el módulo no está instalado o no se requiere.
// Se cargará dinámicamente en la ruta que procesa resultados en PDF.

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

// Define la URI de MongoDB con un valor predeterminado para evitar errores
// cuando no se proporciona la variable de entorno correspondiente.
const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/backend-auth';

mongoose
  .connect(MONGODB_URI)
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

const ordenarPorCategoria = (lista) => {
  const pos = (cat) => {
    const idx = ORDEN_CATEGORIAS.indexOf(cat);
    return idx === -1 ? ORDEN_CATEGORIAS.length : idx;
  };
  return lista.sort((a, b) => pos(a.categoria) - pos(b.categoria));
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
  try {
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
  } catch (err) {
    console.error('Error en /api/auth/login', err);
    res.status(500).json({ mensaje: 'Error al iniciar sesión' });
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
  try {
    const notificaciones = await Notification.find({ destinatario: req.usuario.id })
      .sort({ createdAt: -1 });
    res.json(notificaciones);
  } catch (err) {
    console.error(err);
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

app.post(
  '/api/tournaments/:id/competitions',
  protegerRuta,
  permitirRol('Delegado'),
  async (req, res) => {
    const { nombre, fecha } = req.body;
    if (!nombre || !fecha) {
      return res.status(400).json({ mensaje: 'Faltan datos' });
    }
    try {
      const torneo = await Torneo.findById(req.params.id);
      if (!torneo) return res.status(404).json({ mensaje: 'Torneo no encontrado' });
      const competencia = await Competencia.create({ nombre, fecha, torneo: torneo._id });
      await crearNotificacionesParaTodos(`Nueva competencia ${nombre}`, competencia._id);
      res.status(201).json(competencia);
    } catch (err) {
      console.error(err);
      res.status(500).json({ mensaje: 'Error al crear competencia' });
    }
  }
);

app.get('/api/tournaments/:id/competitions', protegerRuta, async (req, res) => {
  try {
    const comps = await Competencia.find({ torneo: req.params.id }).sort({ fecha: 1 });
    res.json(comps);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al obtener competencias' });
  }
});

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
        row.getCell(2).value = 'SA';
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

app.get('/api/competitions/:id/resultados', protegerRuta, async (req, res) => {
  try {
    const resultados = await Resultado.find({ competencia: req.params.id }).sort({ posicion: 1 });
    res.json(resultados);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al obtener resultados' });
  }
});

app.get('/api/competitions/:id/puntajes', protegerRuta, async (req, res) => {
  try {
    const resultados = await Resultado.find({ competencia: req.params.id }).lean();
    const tabla = resultados.reduce((acc, r) => {
      const key = `${r.numero}-${r.club}-${r.nombre}`;
      if (!acc[key]) {
        acc[key] = { nombre: r.nombre, numero: r.numero, club: r.club, puntosTotales: 0 };
      }
      acc[key].puntosTotales += Number(r.puntos) || 0;
      return acc;
    }, {});
    const lista = Object.values(tabla).sort((a, b) => b.puntosTotales - a.puntosTotales);
    res.json(lista);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al obtener tabla de puntos' });
  }
});

app.get('/api/skaters-externos/:categoria', protegerRuta, async (req, res) => {
  try {
    const patinadores = await PatinadorExterno.find({
      categoria: req.params.categoria
    })
      .select('nombre club numero')
      .lean();
    res.json(patinadores);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al obtener patinadores' });
  }
});

app.post(
  '/api/competitions/:id/resultados',
  protegerRuta,
  permitirRol('Delegado'),
  async (req, res) => {
    const { nombre, club, numero, puntos, categoria } = req.body;
    if (!nombre || !club || !numero || !puntos) {
      return res.status(400).json({ mensaje: 'Faltan datos' });
    }
    try {
      const comp = await Competencia.findById(req.params.id);
      if (!comp) return res.status(404).json({ mensaje: 'Competencia no encontrada' });
      const resultado = await Resultado.create({
        competencia: comp._id,
        nombre,
        club,
        numero,
        puntos,
        categoria
      });
      if (club !== CLUB_LOCAL) {
        await PatinadorExterno.findOneAndUpdate(
          { nombre, club, numero, categoria },
          { nombre, club, numero, categoria },
          { upsert: true, new: true }
        );
      }
      res.status(201).json(resultado);
    } catch (err) {
      console.error(err);
      res.status(500).json({ mensaje: 'Error al cargar resultado' });
    }
  }
);

app.post(
  '/api/competitions/:id/resultados/pdf',
  protegerRuta,
  permitirRol('Delegado'),
  upload.single('archivo'),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ mensaje: 'Archivo no proporcionado' });
    }
    try {
      const buffer = fs.readFileSync(req.file.path);
      // Importar directamente la implementación principal de pdf-parse para
      // evitar la carga del archivo de prueba inexistente que provoca el
      // error ENOENT. El paquete expone la funcionalidad en
      // "lib/pdf-parse.js" sin dependencias a archivos externos.
      const pdfParse = (
        await import('pdf-parse/lib/pdf-parse.js')
      ).default;
      const data = await pdfParse(buffer);
      const lines = data.text
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l);
      let count = 0;
      for (const line of lines) {
        if (/apellido/i.test(line) && /nro/i.test(line) && /club/i.test(line)) {
          continue;
        }
        const parts = line.split(/\s{2,}/);
        if (parts.length < 4) continue;
        const [nombre, numeroStr, club, categoria] = parts;
        const numero = parseInt(numeroStr, 10);
        if (!nombre || !numero || !club || !categoria) continue;
        if (club !== CLUB_LOCAL) {
          await PatinadorExterno.findOneAndUpdate(
            { nombre, club, numero, categoria },
            { nombre, club, numero, categoria },
            { upsert: true, new: true }
          );
          count++;
        }
      }
      fs.unlinkSync(req.file.path);
      res.json({ mensaje: 'Archivo procesado', cantidad: count });
    } catch (err) {
      fs.unlinkSync(req.file.path);
      console.error(err);
      res.status(500).json({ mensaje: 'Error al procesar el archivo' });
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
