import dotenv from 'dotenv';
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
import helmet from 'helmet';
import morgan from 'morgan';

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
import Federation from './models/Federation.js';
import Entrenamiento from './models/Entrenamiento.js';
import Progreso from './models/Progreso.js';
import ExcelJS from 'exceljs';
import pdfToJson from './utils/pdfToJson.js';
import parseResultadosJson from './utils/parseResultadosJson.js';
import { comparePasswordWithHash } from './utils/passwordUtils.js';

dotenv.config();

// --------- Paths / TZ ---------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
process.env.TZ = 'America/Argentina/Buenos_Aires';

// --------- Uploads dir ---------
const resolveUploadsDir = () => {
  const configured = process.env.UPLOADS_DIR?.trim();
  if (configured) return path.resolve(configured);
  return path.join(__dirname, 'uploads');
};
const normalizeDirectories = (dirs) =>
  Array.from(
    new Set(
      (dirs || [])
        .filter(Boolean)
        .map((dir) => path.resolve(dir))
    )
  );

const UPLOADS_DIR = resolveUploadsDir();
process.env.UPLOADS_DIR = UPLOADS_DIR;
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const parseFallbackDirs = (raw) => {
  if (!raw || typeof raw !== 'string') return [];
  return raw
    .split(/[,;:\n]+/)
    .map((dir) => dir.trim())
    .filter(Boolean);
};

const candidateFallbackDirs = [
  ...parseFallbackDirs(process.env.UPLOADS_FALLBACK_DIRS),
  path.resolve(__dirname, '..', 'uploads'),
  path.resolve(process.cwd(), 'uploads')
];

const UPLOADS_DIRS = normalizeDirectories([UPLOADS_DIR, ...candidateFallbackDirs]);

const resolvePublicUploadsPath = () => {
  const raw = process.env.PUBLIC_UPLOADS_PATH || process.env.UPLOADS_PUBLIC_PATH;
  const trimmed = raw?.trim();
  if (!trimmed) return '/uploads';
  return `/${trimmed.replace(/^\/+/, '').replace(/\/+$/, '')}`;
};

const PUBLIC_UPLOADS_PATH = resolvePublicUploadsPath();
process.env.PUBLIC_UPLOADS_PATH = PUBLIC_UPLOADS_PATH;

const buildUploadUrl = (filename) => {
  if (!filename) return '';
  const normalized = String(filename).trim().replace(/^\/+/, '');
  if (!normalized) return '';
  const base = `${BACKEND_URL}${PUBLIC_UPLOADS_PATH}`.replace(/\/+$/, '');
  return `${base}/${normalized}`;
};

const DATE_ONLY_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

const LOCAL_CLUB_CANONICAL_NAME = 'GENERAL RODRIGUEZ';
const LOCAL_CLUB_DISPLAY_NAME = 'General Rodriguez';

const parseDateOnly = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const dateOnlyMatch = DATE_ONLY_REGEX.exec(trimmed);
    if (dateOnlyMatch) {
      const year = Number(dateOnlyMatch[1]);
      const month = Number(dateOnlyMatch[2]);
      const day = Number(dateOnlyMatch[3]);
      const date = new Date(year, month - 1, day);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    const parsed = Date.parse(trimmed);
    if (!Number.isNaN(parsed)) {
      const date = new Date(parsed);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    return null;
  }

  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
};

// --------- Mongo URI ---------
mongoose.set('strictQuery', true);

const DEFAULT_MONGODB_URI = 'mongodb://127.0.0.1:27017/patincarrera';
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
    const v = process.env[key];
    if (typeof v === 'string' && v.trim()) {
      if (key !== 'MONGODB_URI') process.env.MONGODB_URI = v.trim();
      return v.trim();
    }
  }
  return DEFAULT_MONGODB_URI;
};
const sanitizeMongoUri = (uri) => {
  if (!uri) return '';
  try {
    const parsed = new URL(uri);
    if (parsed.password) parsed.password = '***';
    if (parsed.username) parsed.username = '***';
    return parsed.toString();
  } catch {
    return '';
  }
};

const MONGODB_URI = resolveMongoUri();
process.env.MONGODB_URI = MONGODB_URI;

const sanitizedMongoUri = sanitizeMongoUri(MONGODB_URI);
if (sanitizedMongoUri) console.log(`Intentando conectar a MongoDB usando ${sanitizedMongoUri}`);

mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log('MongoDB conectado');
    try {
      await Promise.all([Patinador.syncIndexes(), PatinadorExterno.syncIndexes()]);
    } catch (syncError) {
      console.error('Error al sincronizar índices de patinadores:', syncError.message);
    }
  })
  .catch((err) => {
    console.error('Error conectando a MongoDB:', err.message);
    const s = sanitizeMongoUri(MONGODB_URI);
    if (s) console.error(`URI utilizada: ${s}`);
  });

// --------- App / Security / Logs ---------
const app = express();
const isProduction = process.env.NODE_ENV === 'production';

const CLIENT_ORIGIN =
  (process.env.CLIENT_ORIGIN || 'https://patincarrera.net').replace(/\/+$/, '');

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'http://patincarrera.net',
  'http://www.patincarrera.net',
  'https://patincarrera.net',
  'https://www.patincarrera.net',
  CLIENT_ORIGIN
].map((u) => u.replace(/\/+$/, ''));

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
const FRONTEND_URL_WWW = (process.env.FRONTEND_URL_WWW || FALLBACK_FRONTEND_URL_WWW).replace(
  /\/+$/,
  ''
);
const BACKEND_URL = (process.env.BACKEND_URL || FALLBACK_BACKEND_URL).replace(/\/+$/, '');
process.env.BACKEND_URL = BACKEND_URL;

const allowedOrigins = Array.from(new Set([...DEFAULT_ALLOWED_ORIGINS, FRONTEND_URL, FRONTEND_URL_WWW]))
  .filter(Boolean);

if (isProduction) {
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  }));
}
app.use(morgan(isProduction ? 'combined' : 'dev'));

// Body limits (subidas PDF/Excel, etc.)
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// CORS
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // Postman / curl
    const norm = origin.replace(/\/+$/, '');
    if (allowedOrigins.includes(norm)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Preflight + size error handler
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

// Static uploads (permite buscar en múltiples directorios para mantener archivos históricos)
const serveUpload = (req, res, next) => {
  const rawPath = req.params[0] || '';
  let decodedPath = rawPath;

  try {
    decodedPath = decodeURIComponent(rawPath);
  } catch {
    if (req.method === 'HEAD') return res.sendStatus(400);
    return res.status(400).json({ mensaje: 'Ruta de archivo inválida' });
  }

  const normalizedPath = path
    .normalize(decodedPath)
    .replace(/^([.]{1,2}[\/])+/, '')
    .replace(/\\/g, '/');

  if (!normalizedPath) {
    if (req.method === 'HEAD') return res.sendStatus(404);
    return res.status(404).json({ mensaje: 'Archivo no encontrado' });
  }

  if (normalizedPath.split('/').some((segment) => segment === '..')) {
    if (req.method === 'HEAD') return res.sendStatus(400);
    return res.status(400).json({ mensaje: 'Ruta de archivo inválida' });
  }

  for (const dir of UPLOADS_DIRS) {
    const candidate = path.join(dir, normalizedPath);
    try {
      const stat = fs.statSync(candidate);
      if (stat.isFile()) {
        if (dir !== UPLOADS_DIR) {
          console.log(`Sirviendo ${normalizedPath} desde directorio alternativo: ${dir}`);
        }
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return res.sendFile(candidate);
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        return next(error);
      }
    }
  }

  if (req.method === 'HEAD') return res.sendStatus(404);
  return res.status(404).json({ mensaje: 'Archivo no encontrado' });
};

app.get('/api/uploads/*', serveUpload);
app.head('/api/uploads/*', serveUpload);
app.get(`${PUBLIC_UPLOADS_PATH}/*`, serveUpload);
app.head(`${PUBLIC_UPLOADS_PATH}/*`, serveUpload);

// Request log liviano
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  next();
});

// --------- Health ---------
const mongoConnectionStates = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting'
};
app.get('/api/health', (_req, res) => {
  const st = mongoose.connection.readyState;
  res
    .status(st === 1 ? 200 : 503)
    .set('Cache-Control', 'no-store')
    .json({ status: st === 1 ? 'ok' : 'degraded', uptime: process.uptime(), database: mongoConnectionStates[st] ?? 'unknown' });
});

// --------- Config / Constantes ---------
const CODIGO_DELEGADO = process.env.CODIGO_DELEGADO || 'DEL123';
const CODIGO_TECNICO = process.env.CODIGO_TECNICO || 'TEC456';
const CODIGO_ADMIN = process.env.CODIGO_ADMIN || 'ADM789';
const JWT_SECRET = process.env.JWT_SECRET || 'secreto';
const CLUB_LOCAL = process.env.CLUB_LOCAL || 'Gral. Rodríguez';

const ORDEN_CATEGORIAS = [
  'CHP','M7DE','M7VE','PDE','PVE','6DE','6VE','5DE','5VE','4DE','4VE','JDE','JVE','MDE','MVE',
  'PDT','PVT','6DT','6VT','5DT','5VT','4DT','4VT','JDI','JVI','MDI','MVI','PDF','PVF','6DF','6VF','5DF','5VF','4DF','4VF','JDF','JVF','MDF','MVF'
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

const isValidObjectId = (value) => {
  if (!value) return false;
  try {
    return mongoose.Types.ObjectId.isValid(value);
  } catch {
    return false;
  }
};

const normaliseObjectId = (value) => {
  if (!isValidObjectId(value)) return null;
  return new mongoose.Types.ObjectId(value);
};

const isAdminUser = (req) => (req.usuario?.rol || '').toLowerCase() === 'admin';

const ensureAdminHasNoAssociations = async (usuario) => {
  if (!usuario) return usuario;
  const rol = (usuario.rol || '').toLowerCase();
  if (rol !== 'admin') return usuario;

  let modified = false;
  if (usuario.club) {
    if (typeof usuario.set === 'function') {
      usuario.set('club', undefined);
    } else {
      usuario.club = undefined;
    }
    modified = true;
  }

  if (Array.isArray(usuario.patinadores) && usuario.patinadores.length > 0) {
    if (typeof usuario.set === 'function') {
      usuario.set('patinadores', []);
    } else {
      usuario.patinadores = [];
    }
    modified = true;
  }

  if (modified && typeof usuario.save === 'function') {
    await usuario.save();
  }

  return usuario;
};

const decodeUserFromAuthHeader = async (req) => {
  const header = req.headers?.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  if (!token) return null;

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const usuario = await User.findById(payload.id).select('rol club');
    if (!usuario) return null;
    return {
      id: usuario._id.toString(),
      rol: usuario.rol,
      club: usuario.club ? usuario.club.toString() : null
    };
  } catch {
    return null;
  }
};

const ensureRequestUser = async (req) => {
  if (req.usuario) return req.usuario;
  const usuario = await decodeUserFromAuthHeader(req);
  if (usuario) {
    req.usuario = usuario;
  }
  return usuario;
};

const getClubIdFromRequest = (req) => {
  if (req.query?.clubId && isValidObjectId(req.query.clubId)) {
    return req.query.clubId;
  }

  if (isAdminUser(req) && req.body?.clubId && isValidObjectId(req.body.clubId)) {
    return req.body.clubId;
  }

  if (req.usuario?.club && isValidObjectId(req.usuario.club)) {
    return req.usuario.club;
  }

  if (req.headers?.['x-club-id'] && isValidObjectId(req.headers['x-club-id'])) {
    return req.headers['x-club-id'];
  }

  return null;
};

const ensureClubForRequest = async (req, res, { allowFallbackToLocal = false } = {}) => {
  const clubId = getClubIdFromRequest(req);
  if (clubId) return clubId;

  if (allowFallbackToLocal) {
    const club = await ensureLocalClub();
    return club._id.toString();
  }

  res
    .status(428)
    .json({ mensaje: 'Debes seleccionar un club para continuar' });
  return null;
};

const loadClubForRequest = async (req, res, { allowFallbackToLocal = false } = {}) => {
  const clubId = await ensureClubForRequest(req, res, { allowFallbackToLocal });
  if (clubId === null) return null;

  const clubDoc = await Club.findById(clubId);
  if (clubDoc) return clubDoc;

  if (allowFallbackToLocal) {
    return ensureLocalClub();
  }

  res.status(404).json({ mensaje: 'Club no encontrado' });
  return null;
};

const scopeQueryByClub = async (req, res, query = {}, options = {}) => {
  const clubId = await ensureClubForRequest(req, res, options);
  if (clubId === null) return null;

  const scopedQuery = { ...query };
  if (isAdminUser(req) && options.allowAdminAll && !clubId) {
    return scopedQuery;
  }

  scopedQuery.club = normaliseObjectId(clubId);
  return scopedQuery;
};

const enforceClubOwnership = (doc, req, res) => {
  if (!doc) return null;
  if (isAdminUser(req)) return doc;

  const clubId = req.usuario?.club;
  if (!clubId) {
    res.status(428).json({ mensaje: 'Debes seleccionar un club para continuar' });
    return null;
  }

  if (doc.club && doc.club.toString() !== clubId) {
    res.status(403).json({ mensaje: 'No tenés permiso para acceder a este recurso' });
    return null;
  }

  return doc;
};

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

async function crearNotificacionesParaClub(clubId, mensaje, competencia = null) {
  if (!clubId) return;

  try {
    const clubFilter = normaliseObjectId(clubId) ?? clubId;
    const usuarios = await User.find({ club: clubFilter, rol: { $ne: 'Admin' } }, '_id');
    const notificaciones = usuarios.map((u) => ({
      destinatario: u._id,
      mensaje,
      club: clubId,
      ...(competencia ? { competencia } : {})
    }));
    if (notificaciones.length > 0) {
      await Notification.insertMany(notificaciones);
    }
  } catch (e) {
    console.error('Error creando notificaciones', e);
  }
}

const ensureLocalClub = async () => {
  let club = await Club.findOne({ nombre: LOCAL_CLUB_CANONICAL_NAME });
  if (!club) {
    club = await Club.create({ nombre: LOCAL_CLUB_CANONICAL_NAME });
  }
  return club;
};

const computeLocalIndividualTitles = async (clubId) => {
  if (!clubId) return [];

  const resultados = await Resultado.find({ clubId, posicion: 1 }).populate(
    'deportistaId',
    'primerNombre segundoNombre apellido'
  );

  const acumulado = new Map();

  for (const resultado of resultados) {
    const deportista = resultado.deportistaId;
    if (!deportista) continue;

    const id = deportista._id.toString();
    const nombrePartes = [deportista.primerNombre, deportista.segundoNombre, deportista.apellido]
      .filter(Boolean)
      .map((parte) => parte.trim())
      .filter(Boolean);
    const nombre = nombrePartes.join(' ').replace(/\s+/g, ' ').trim();

    const existente = acumulado.get(id) || { id, nombre, titulos: 0 };
    existente.titulos += 1;
    acumulado.set(id, existente);
  }

  return Array.from(acumulado.values()).sort((a, b) => {
    if (b.titulos !== a.titulos) return b.titulos - a.titulos;
    return a.nombre.localeCompare(b.nombre);
  });
};

const pickNonEmptyString = (...values) => {
  for (const value of values) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    } else if (value instanceof Date) {
      if (!Number.isNaN(value.getTime())) return value.toISOString();
    } else if (value !== undefined && value !== null) {
      const stringified = `${value}`.trim();
      if (stringified) return stringified;
    }
  }
  return '';
};

const escapeRegExp = (value) =>
  value.replace(/[.*+?^${}()|\[\]\\]/g, '\$&');

const trimmedOrNull = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const normaliseUrlOrNull = (value) => {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!trimmed) return null;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const parsePossibleYear = (value) => {
  if (value === undefined || value === null) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return parsePossibleYear(value.getFullYear());
  }

  const normalized = typeof value === 'number' ? value : Number.parseInt(`${value}`.trim(), 10);
  if (!Number.isFinite(normalized)) return null;

  const currentYear = new Date().getFullYear();
  if (normalized < 1900 || normalized > currentYear + 1) return null;

  return normalized;
};

const normalizeLegacyImage = (value) => {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return '';
  if (/^(https?:)?\/\//i.test(raw) || raw.startsWith('data:')) return raw;
  if (raw.startsWith(PUBLIC_UPLOADS_PATH)) return `${BACKEND_URL}${raw}`;
  if (raw.startsWith('/')) return `${BACKEND_URL}${raw}`;
  return buildUploadUrl(raw);
};

const LEGACY_TITULOS_COLLECTION = 'tituloclubs';

const getLegacyTitulosCollection = async () => {
  if (!mongoose.connection?.db || mongoose.connection.readyState !== 1) return null;

  try {
    const collections = await mongoose.connection.db
      .listCollections({ name: LEGACY_TITULOS_COLLECTION })
      .toArray();
    if (!collections.length) return null;
    return mongoose.connection.db.collection(LEGACY_TITULOS_COLLECTION);
  } catch (error) {
    console.error('Error verificando la colección de títulos legados', error);
    return null;
  }
};

const normalizeLegacyTitulo = (doc) => {
  if (!doc) return null;

  const titulo = pickNonEmptyString(doc.titulo, doc.nombre, doc.tituloClub, doc.titulo_club);
  if (!titulo) return null;

  const descripcion = pickNonEmptyString(doc.descripcion, doc.detalle, doc.descripcionTitulo);
  const anio = parsePossibleYear(
    doc.anio ?? doc.year ?? doc.anioTitulo ?? doc.anio_titulo ?? doc.fecha ?? doc.fechaTitulo
  );
  const imagen = normalizeLegacyImage(doc.imagen || doc.foto || doc.image || doc.imageUrl || doc.imagenUrl);
  const creadoEn =
    parseDateOnly(doc.creadoEn || doc.createdAt || doc.fecha || doc.fechaTitulo) ||
    (doc.actualizadoEn instanceof Date ? doc.actualizadoEn : null);

  return {
    _id: doc._id,
    titulo,
    anio,
    descripcion,
    imagen,
    creadoEn,
    creadoPor: null
  };
};

const loadLegacyClubTitles = async () => {
  try {
    const collection = await getLegacyTitulosCollection();
    if (!collection) return null;

    const rawDocs = await collection.find({}).sort({ anio: -1, createdAt: -1 }).toArray();
    if (!rawDocs.length) return null;

    const titulos = rawDocs.map(normalizeLegacyTitulo).filter(Boolean);
    if (!titulos.length) return null;

    const referenciaClub = rawDocs.find((doc) =>
      pickNonEmptyString(doc.nombreClub, doc.club, doc.clubNombre)
    );
    const nombreAmigable =
      pickNonEmptyString(
        referenciaClub?.nombreClub,
        referenciaClub?.club,
        referenciaClub?.clubNombre,
        referenciaClub?.club_nombre
      ) || LOCAL_CLUB_DISPLAY_NAME;
    const nombreCanonico = nombreAmigable ? nombreAmigable.trim().toUpperCase() : LOCAL_CLUB_CANONICAL_NAME;

    return {
      club: {
        _id: null,
        nombre: nombreCanonico,
        nombreAmigable,
        titulos
      },
      individuales: [],
      resumen: {
        totalClub: titulos.length,
        totalIndividuales: 0
      }
    };
  } catch (error) {
    console.error('Error al cargar los títulos legados del club', error);
    return null;
  }
};

const mergeLegacyPayload = (payload, legacyPayload) => {
  if (!legacyPayload?.club?.titulos?.length) return payload;

  const actuales = payload && typeof payload === 'object' ? payload : {};
  const clubActual = actuales.club || {};
  const individuales =
    Array.isArray(actuales.individuales) && actuales.individuales.length
      ? actuales.individuales
      : legacyPayload.individuales || [];
  const totalIndividuales =
    typeof actuales?.resumen?.totalIndividuales === 'number'
      ? actuales.resumen.totalIndividuales
      : legacyPayload?.resumen?.totalIndividuales ?? 0;

  return {
    club: {
      _id: clubActual._id ?? legacyPayload.club._id ?? null,
      nombre: clubActual.nombre || legacyPayload.club.nombre || LOCAL_CLUB_CANONICAL_NAME,
      nombreAmigable:
        clubActual.nombreAmigable ||
        legacyPayload.club.nombreAmigable ||
        clubActual.nombre ||
        LOCAL_CLUB_DISPLAY_NAME,
      titulos: legacyPayload.club.titulos
    },
    individuales,
    resumen: {
      totalClub: legacyPayload.club.titulos.length,
      totalIndividuales
    }
  };
};

const loadLegacyClubTitleById = async (id) => {
  if (!id) return null;

  try {
    const collection = await getLegacyTitulosCollection();
    if (!collection) return null;

    const queries = [];
    if (typeof id === 'string') {
      queries.push({ _id: id });
      if (mongoose.Types.ObjectId.isValid(id)) {
        queries.push({ _id: new mongoose.Types.ObjectId(id) });
      }
    } else {
      queries.push({ _id: id });
    }

    let raw = null;
    for (const query of queries) {
      // eslint-disable-next-line no-await-in-loop
      raw = await collection.findOne(query);
      if (raw) break;
    }

    if (!raw) return null;

    const titulo = normalizeLegacyTitulo(raw);
    if (!titulo) return null;

    const nombreAmigable =
      pickNonEmptyString(raw.nombreClub, raw.club, raw.clubNombre, raw.club_nombre) || LOCAL_CLUB_DISPLAY_NAME;
    const nombreCanonico = nombreAmigable ? nombreAmigable.trim().toUpperCase() : LOCAL_CLUB_CANONICAL_NAME;

    return {
      club: {
        _id: null,
        nombre: nombreCanonico,
        nombreAmigable
      },
      titulo
    };
  } catch (error) {
    console.error('Error al recuperar el título legado del club', error);
    return null;
  }
};

const buildLocalClubPayload = async (clubDoc, individuales = []) => {
  if (!clubDoc) {
    const totalIndividuales = (individuales || []).reduce(
      (acc, item) => acc + (item.titulos || 0),
      0
    );
    return {
      club: null,
      individuales: individuales || [],
      resumen: { totalClub: 0, totalIndividuales }
    };
  }

  await clubDoc.populate('titulos.creadoPor', 'nombre apellido');

  const titulosOrdenados = Array.from(clubDoc.titulos || []).sort((a, b) => {
    const yearA = Number.isInteger(a.anio) ? a.anio : 0;
    const yearB = Number.isInteger(b.anio) ? b.anio : 0;
    if (yearA !== yearB) return yearB - yearA;

    const timeA = a.creadoEn ? new Date(a.creadoEn).getTime() : 0;
    const timeB = b.creadoEn ? new Date(b.creadoEn).getTime() : 0;
    return timeB - timeA;
  });

  const titulos = titulosOrdenados.map((titulo) => ({
    _id: titulo._id,
    titulo: titulo.titulo,
    anio: Number.isInteger(titulo.anio) ? titulo.anio : null,
    descripcion: titulo.descripcion || '',
    imagen: titulo.imagen || '',
    creadoEn: titulo.creadoEn || null,
    creadoPor: titulo.creadoPor
      ? {
          _id: titulo.creadoPor._id,
          nombre: titulo.creadoPor.nombre,
          apellido: titulo.creadoPor.apellido
        }
      : null
  }));

  const totalIndividuales = (individuales || []).reduce(
    (acc, item) => acc + (item.titulos || 0),
    0
  );

  return {
    club: {
      _id: clubDoc._id,
      nombre: clubDoc.nombre,
      nombreAmigable:
        clubDoc.nombre === LOCAL_CLUB_CANONICAL_NAME
          ? LOCAL_CLUB_DISPLAY_NAME
          : clubDoc.nombre,
      titulos
    },
    individuales: individuales || [],
    resumen: {
      totalClub: Array.isArray(clubDoc.titulos) ? clubDoc.titulos.length : 0,
      totalIndividuales
    }
  };
};

// --------- Rutas (Auth / Usuarios / Recursos) ---------
app.post('/api/auth/registro', upload.single('clubLogo'), async (req, res) => {
  try {
    const body = req.body ?? {};
    const nombre = trimmedOrNull(body.nombre);
    const apellido = trimmedOrNull(body.apellido);
    const email = trimmedOrNull(body.email);
    const password = body.password ?? '';
    const confirmarPassword = body.confirmarPassword ?? '';
    const codigo = trimmedOrNull(body.codigo);
    const rolLower = (body.rol || '').toString().trim().toLowerCase();

    if (!nombre || !apellido || !email || !password || !confirmarPassword || !rolLower) {
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

    if (rolLower === 'delegado' && codigo !== CODIGO_DELEGADO) {
      return res.status(400).json({ mensaje: 'Código de delegado incorrecto' });
    }
    if (rolLower === 'tecnico' && codigo !== CODIGO_TECNICO) {
      return res.status(400).json({ mensaje: 'Código de técnico incorrecto' });
    }
    if (rolLower === 'admin' && codigo !== CODIGO_ADMIN) {
      return res.status(400).json({ mensaje: 'Código de administrador incorrecto' });
    }

    const existente = await User.findOne({ email });
    if (existente) {
      return res.status(400).json({ mensaje: 'El email ya está registrado' });
    }

    const crearNuevoClub = String(body.crearNuevoClub ?? '').toLowerCase() === 'true';
    let clubDoc = null;

    const requireClubSeleccion = ['delegado', 'tecnico', 'deportista'];
    if (requireClubSeleccion.includes(rolLower)) {
      if (rolLower === 'delegado' && crearNuevoClub) {
        const nuevoClubNombre = trimmedOrNull(body.nuevoClubNombre);
        if (!nuevoClubNombre) {
          return res.status(400).json({ mensaje: 'El nombre del nuevo club es obligatorio' });
        }

        const federacionId = trimmedOrNull(body.nuevoClubFederacion);
        let federationDoc = null;
        if (federacionId) {
          if (!isValidObjectId(federacionId)) {
            return res.status(400).json({ mensaje: 'Federación inválida' });
          }
          federationDoc = await Federation.findById(federacionId);
          if (!federationDoc) {
            return res.status(404).json({ mensaje: 'Federación no encontrada' });
          }
        }

        if (!req.file) {
          return res.status(400).json({ mensaje: 'Debes subir el logo del nuevo club' });
        }

        clubDoc = await Club.create({
          nombre: nuevoClubNombre,
          federation: federationDoc?._id,
          logo: buildUploadUrl(req.file.filename)
        });
      } else {
        const clubId = trimmedOrNull(body.clubId);
        if (!clubId || !isValidObjectId(clubId)) {
          return res.status(400).json({ mensaje: 'Debes seleccionar un club válido' });
        }
        clubDoc = await Club.findById(clubId);
        if (!clubDoc) {
          return res.status(404).json({ mensaje: 'Club no encontrado' });
        }
      }
    }

    const hashed = await bcrypt.hash(password, 10);
    const rolGuardado = rolLower.charAt(0).toUpperCase() + rolLower.slice(1);
    const token = crypto.randomBytes(20).toString('hex');

    const nuevoUsuario = await User.create({
      nombre,
      apellido,
      email,
      password: hashed,
      rol: rolGuardado,
      tokenConfirmacion: token,
      club: clubDoc?._id || undefined
    });

    if (clubDoc && !clubDoc.creadoPor) {
      clubDoc.creadoPor = nuevoUsuario._id;
      await clubDoc.save();
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });

    const url = `${BACKEND_URL}/api/auth/confirmar/${token}`;
    await transporter.sendMail({
      from: '"Mi Proyecto" <no-reply@miweb.com>',
      to: email,
      subject: 'Confirmá tu cuenta',
      html: `<p>Hacé clic en el siguiente enlace para confirmar tu cuenta:</p><a href="${url}">${url}</a>`
    });

    return res.status(201).json({ mensaje: 'Usuario registrado con éxito. Revisa tu email para confirmar la cuenta.' });
  } catch (error) {
    console.error('Error en registro', error);
    return res.status(500).json({ mensaje: 'Error al registrar usuario' });
  }
});

app.get('/api/auth/confirmar/:token', async (req, res) => {
  const { token } = req.params;
  const usuario = await User.findOne({ tokenConfirmacion: token });
  if (!usuario) return res.status(400).send('Token no válido o ya usado');
  usuario.confirmado = true;
  usuario.tokenConfirmacion = null;
  await usuario.save();
  return res.redirect(`${FRONTEND_URL}/`);
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const body = req.body ?? {};
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!email || !password) {
      return res.status(400).json({ mensaje: 'Email y contraseña son obligatorios' });
    }

    const usuario = await User.findOne({ email });
    if (!usuario) return res.status(400).json({ mensaje: 'Credenciales inválidas' });
    if (!usuario.confirmado) return res.status(403).json({ mensaje: 'Tenés que confirmar tu cuenta primero' });
    if (!usuario.password) {
      return res.status(400).json({ mensaje: 'Este usuario se registró con Google y no tiene una contraseña local. Iniciá sesión con Google.' });
    }

    const comparacion = await comparePasswordWithHash(password, usuario.password);
    if (!comparacion.matches) {
      if (comparacion.reason === 'invalid-hash') {
        console.warn(`Hash de contraseña inválido para el usuario ${email}. Se requiere restablecer la contraseña.`);
        return res.status(400).json({ mensaje: 'Las credenciales no son válidas. Restablecé tu contraseña o contactá al administrador.' });
      }
      if (comparacion.reason === 'error') {
        console.error('Error comparando contraseña para el usuario', email, comparacion.error);
        return res.status(500).json({ mensaje: 'Error al iniciar sesión' });
      }
      return res.status(400).json({ mensaje: 'Credenciales inválidas' });
    }

    await ensureAdminHasNoAssociations(usuario);

    const tokenPayload = {
      id: usuario._id,
      rol: usuario.rol,
      club: usuario.club ? usuario.club.toString() : null
    };
    const needsClubSelection = !usuario.club && usuario.rol !== 'Admin';
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });
    return res.json({
      token,
      usuario: {
        nombre: usuario.nombre,
        rol: usuario.rol,
        foto: usuario.foto || '',
        club: usuario.club ? usuario.club.toString() : null
      },
      needsClubSelection
    });
  } catch (err) {
    console.error('Error en /api/auth/login', err);
    res.status(500).json({ mensaje: 'Error al iniciar sesión' });
  }
});

app.post('/api/contacto', protegerRuta, async (req, res) => {
  const { mensaje } = req.body;
  if (!mensaje) return res.status(400).json({ mensaje: 'Mensaje requerido' });
  try {
    const usuario = await User.findById(req.usuario.id).select('nombre email');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
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
    const usuario = await User.findById(req.usuario.id).select('-password').populate('patinadores');
    res.json({ usuario });
  } catch {
    res.status(500).json({ mensaje: 'Error al obtener el usuario' });
  }
});

app.get('/api/protegido/usuarios', protegerRuta, permitirRol('Delegado', 'Admin'), async (req, res) => {
  try {
    const filtro = {};
    if (!isAdminUser(req)) {
      const clubId = await ensureClubForRequest(req, res);
      if (!clubId) return;
      filtro.club = normaliseObjectId(clubId);
    }

    const usuarios = await User.find(filtro).select('-password').sort({ apellido: 1, nombre: 1 });
    res.json(usuarios);
  } catch (err) {
    console.error('Error al obtener usuarios', err);
    res.status(500).json({ mensaje: 'Error al obtener usuarios' });
  }
});

app.post('/api/protegido/foto-perfil', protegerRuta, upload.single('foto'), async (req, res) => {
  try {
    const user = await User.findById(req.usuario.id);
    user.foto = buildUploadUrl(req.file.filename);
    await user.save();
    res.json({ mensaje: 'Foto actualizada', foto: user.foto });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al actualizar la foto' });
  }
});

app.post('/api/patinadores', protegerRuta, upload.fields([{ name: 'fotoRostro', maxCount: 1 }, { name: 'foto', maxCount: 1 }]), async (req, res) => {
  try {
    const clubId = await ensureClubForRequest(req, res);
    if (!clubId) return;

    const {
      primerNombre, segundoNombre, apellido, edad, fechaNacimiento, dni, cuil, direccion,
      dniMadre, dniPadre, telefono, sexo, nivel, seguro, numeroCorredor, categoria
    } = req.body;

    const fotoRostroFile = req.files?.fotoRostro?.[0];
    const fotoFile = req.files?.foto?.[0];

    const patinador = await Patinador.create({
      primerNombre, segundoNombre, apellido, edad, fechaNacimiento, dni, cuil, direccion,
      dniMadre, dniPadre, telefono, sexo, nivel, seguro, numeroCorredor, categoria,
      fotoRostro: fotoRostroFile ? buildUploadUrl(fotoRostroFile.filename) : undefined,
      foto: fotoFile ? buildUploadUrl(fotoFile.filename) : undefined,
      club: clubId
    });

    res.status(201).json(patinador);
  } catch (err) {
    console.error(err);
    if (err.name === 'ValidationError') {
      const mensajes = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ mensaje: mensajes.join(', ') });
    }
    if (err.code === 11000) {
      if (err.keyPattern?.categoria && err.keyPattern?.numeroCorredor) {
        return res
          .status(400)
          .json({ mensaje: 'El número de corredor ya está asignado en esta categoría' });
      }
      const campo = Object.keys(err.keyValue || {})[0];
      return res.status(400).json({ mensaje: `${campo} ya existe` });
    }
    res.status(500).json({ mensaje: 'Error al crear el patinador' });
  }
});

app.get('/api/patinadores', async (req, res) => {
  try {
    const clubId = await ensureClubForRequest(req, res, { allowFallbackToLocal: true });
    if (!clubId) return;

    const patinadores = await Patinador.find({ club: normaliseObjectId(clubId) }).sort({ edad: 1 });
    res.json(patinadores);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al obtener patinadores' });
  }
});

app.get('/api/patinadores-externos', protegerRuta, async (req, res) => {
  try {
    const filtro = {};
    if (req.query.categoria) filtro.categoria = req.query.categoria;
    const externos = await PatinadorExterno.find(filtro).sort({ apellido: 1, primerNombre: 1 });
    res.json(externos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al obtener patinadores externos' });
  }
});

app.get('/api/clubs', protegerRuta, async (req, res) => {
  try {
    const filtro = {};
    if (!isAdminUser(req)) {
      const clubId = await ensureClubForRequest(req, res);
      if (!clubId) return;
      filtro._id = normaliseObjectId(clubId);
    }

    const clubs = await Club.find(filtro).sort({ nombre: 1 }).populate('federation', 'nombre');
    res.json(clubs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al obtener clubes' });
  }
});

app.get('/api/public/clubs', async (_req, res) => {
  try {
    const clubs = await Club.find()
      .select('nombre logo federation')
      .sort({ nombre: 1 })
      .lean();
    res.json(clubs);
  } catch (err) {
    console.error('Error al obtener clubes públicos', err);
    res.status(500).json({ mensaje: 'Error al obtener clubes' });
  }
});

app.get('/api/federaciones', async (_req, res) => {
  try {
    const federaciones = await Federation.find().sort({ nombre: 1 });
    res.json(federaciones);
  } catch (err) {
    console.error('Error al obtener federaciones', err);
    res.status(500).json({ mensaje: 'Error al obtener las federaciones' });
  }
});

app.post('/api/federaciones', protegerRuta, permitirRol('Admin'), async (req, res) => {
  try {
    const nombre = trimmedOrNull(req.body?.nombre);
    if (!nombre) {
      return res.status(400).json({ mensaje: 'El nombre de la federación es obligatorio' });
    }

    const descripcion = trimmedOrNull(req.body?.descripcion);
    const contacto = trimmedOrNull(req.body?.contacto);
    const sitioWeb = normaliseUrlOrNull(req.body?.sitioWeb);
    const nameRegex = new RegExp(`^${escapeRegExp(nombre)}$`, 'i');

    const existente = await Federation.findOne({ nombre: nameRegex });

    if (existente) {
      return res.status(400).json({ mensaje: 'Ya existe una federación con ese nombre' });
    }

    const federacion = await Federation.create({
      nombre,
      descripcion: descripcion ?? undefined,
      contacto: contacto ?? undefined,
      sitioWeb: sitioWeb ?? undefined
    });

    res.status(201).json(federacion);
  } catch (err) {
    console.error('Error al crear federación', err);
    if (err.code === 11000) {
      return res.status(400).json({ mensaje: 'Ya existe una federación con ese nombre' });
    }
    res.status(500).json({ mensaje: 'Error al crear la federación' });
  }
});

app.put('/api/federaciones/:id', protegerRuta, permitirRol('Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const nombre = trimmedOrNull(req.body?.nombre);

    if (!nombre) {
      return res.status(400).json({ mensaje: 'El nombre de la federación es obligatorio' });
    }

    const descripcion = trimmedOrNull(req.body?.descripcion);
    const contacto = trimmedOrNull(req.body?.contacto);
    const sitioWeb = normaliseUrlOrNull(req.body?.sitioWeb);
    const nameRegex = new RegExp(`^${escapeRegExp(nombre)}$`, 'i');

    const conflicto = await Federation.findOne({ _id: { $ne: id }, nombre: nameRegex });

    if (conflicto) {
      return res.status(400).json({ mensaje: 'Ya existe una federación con ese nombre' });
    }

    const federacion = await Federation.findByIdAndUpdate(
      id,
      {
        nombre,
        descripcion: descripcion ?? undefined,
        contacto: contacto ?? undefined,
        sitioWeb: sitioWeb ?? undefined
      },
      { new: true, runValidators: true }
    );

    if (!federacion) {
      return res.status(404).json({ mensaje: 'Federación no encontrada' });
    }

    res.json(federacion);
  } catch (err) {
    console.error('Error al actualizar federación', err);
    if (err.name === 'CastError') {
      return res.status(404).json({ mensaje: 'Federación no encontrada' });
    }
    if (err.code === 11000) {
      return res.status(400).json({ mensaje: 'Ya existe una federación con ese nombre' });
    }
    res.status(500).json({ mensaje: 'Error al actualizar la federación' });
  }
});

app.delete('/api/federaciones/:id', protegerRuta, permitirRol('Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const federacion = await Federation.findByIdAndDelete(id);

    if (!federacion) {
      return res.status(404).json({ mensaje: 'Federación no encontrada' });
    }

    res.json({ mensaje: 'Federación eliminada' });
  } catch (err) {
    console.error('Error al eliminar federación', err);
    if (err.name === 'CastError') {
      return res.status(404).json({ mensaje: 'Federación no encontrada' });
    }
    res.status(500).json({ mensaje: 'Error al eliminar la federación' });
  }
});

app.post('/api/admin/clubs', protegerRuta, permitirRol('Admin'), upload.single('logo'), async (req, res) => {
  try {
    const nombre = trimmedOrNull(req.body?.nombre);
    if (!nombre) {
      return res.status(400).json({ mensaje: 'El nombre del club es obligatorio' });
    }

    const nameRegex = new RegExp(`^${escapeRegExp(nombre)}$`, 'i');
    const existente = await Club.findOne({ nombre: nameRegex });
    if (existente) {
      return res.status(400).json({ mensaje: 'Ya existe un club con ese nombre' });
    }

    let federationId = null;
    if (Object.prototype.hasOwnProperty.call(req.body ?? {}, 'federation')) {
      const federationRaw = trimmedOrNull(req.body.federation);
      if (federationRaw) {
        if (!isValidObjectId(federationRaw)) {
          return res.status(400).json({ mensaje: 'Federación inválida' });
        }
        const federationDoc = await Federation.findById(federationRaw);
        if (!federationDoc) {
          return res.status(404).json({ mensaje: 'Federación no encontrada' });
        }
        federationId = federationDoc._id;
      }
    }

    const creadorId = normaliseObjectId(req.usuario?.id);
    const club = await Club.create({
      nombre,
      federation: federationId ?? undefined,
      logo: req.file ? buildUploadUrl(req.file.filename) : undefined,
      creadoPor: creadorId ?? undefined
    });

    const poblado = await Club.findById(club._id).populate('federation', 'nombre').lean();
    res.status(201).json(poblado || club);
  } catch (err) {
    console.error('Error al crear club', err);
    if (err.code === 11000) {
      return res.status(400).json({ mensaje: 'Ya existe un club con ese nombre' });
    }
    res.status(500).json({ mensaje: 'Error al crear el club' });
  }
});

app.put('/api/admin/clubs/:id', protegerRuta, permitirRol('Admin'), upload.single('logo'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ mensaje: 'Club inválido' });
    }

    const club = await Club.findById(id);
    if (!club) {
      return res.status(404).json({ mensaje: 'Club no encontrado' });
    }

    const nombre = trimmedOrNull(req.body?.nombre);
    if (!nombre) {
      return res.status(400).json({ mensaje: 'El nombre del club es obligatorio' });
    }

    const nameRegex = new RegExp(`^${escapeRegExp(nombre)}$`, 'i');
    const conflicto = await Club.findOne({ _id: { $ne: club._id }, nombre: nameRegex });
    if (conflicto) {
      return res.status(400).json({ mensaje: 'Ya existe un club con ese nombre' });
    }

    club.nombre = nombre;

    if (Object.prototype.hasOwnProperty.call(req.body ?? {}, 'federation')) {
      const federationRaw = trimmedOrNull(req.body.federation);
      if (federationRaw) {
        if (!isValidObjectId(federationRaw)) {
          return res.status(400).json({ mensaje: 'Federación inválida' });
        }
        const federationDoc = await Federation.findById(federationRaw);
        if (!federationDoc) {
          return res.status(404).json({ mensaje: 'Federación no encontrada' });
        }
        club.federation = federationDoc._id;
      } else {
        club.federation = undefined;
      }
    }

    const removeLogo = Object.prototype.hasOwnProperty.call(req.body ?? {}, 'removeLogo')
      && String(req.body.removeLogo).toLowerCase() === 'true';
    if (removeLogo) {
      club.logo = undefined;
    }
    if (req.file) {
      club.logo = buildUploadUrl(req.file.filename);
    }

    await club.save();
    const actualizado = await Club.findById(club._id).populate('federation', 'nombre').lean();
    res.json(actualizado || club);
  } catch (err) {
    console.error('Error al actualizar club', err);
    if (err.name === 'CastError') {
      return res.status(404).json({ mensaje: 'Club no encontrado' });
    }
    if (err.code === 11000) {
      return res.status(400).json({ mensaje: 'Ya existe un club con ese nombre' });
    }
    res.status(500).json({ mensaje: 'Error al actualizar el club' });
  }
});

app.delete('/api/admin/clubs/:id', protegerRuta, permitirRol('Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ mensaje: 'Club inválido' });
    }

    const club = await Club.findById(id);
    if (!club) {
      return res.status(404).json({ mensaje: 'Club no encontrado' });
    }

    const usuariosAsociados = await User.countDocuments({ club: club._id });
    const patinadoresAsociados = await Patinador.countDocuments({ club: club._id });
    if (usuariosAsociados > 0 || patinadoresAsociados > 0) {
      return res
        .status(409)
        .json({ mensaje: 'No se puede eliminar un club con usuarios o patinadores asociados' });
    }

    await Club.deleteOne({ _id: club._id });
    res.json({ mensaje: 'Club eliminado' });
  } catch (err) {
    console.error('Error al eliminar club', err);
    if (err.name === 'CastError') {
      return res.status(404).json({ mensaje: 'Club no encontrado' });
    }
    res.status(500).json({ mensaje: 'Error al eliminar el club' });
  }
});

app.get('/api/clubs/local/titulos', protegerRuta, async (req, res) => {
  let club = null;
  try {
    club = await loadClubForRequest(req, res, { allowFallbackToLocal: true });
    if (!club) return;
    const individuales = await computeLocalIndividualTitles(club?._id);
    let payload = await buildLocalClubPayload(club, individuales);
    const hasTitulos = Array.isArray(payload?.club?.titulos) && payload.club.titulos.length > 0;

    const isLocalClub = club.nombre === LOCAL_CLUB_CANONICAL_NAME;

    if (!hasTitulos && isLocalClub) {
      const legacyPayload = await loadLegacyClubTitles();
      if (legacyPayload?.club?.titulos?.length) {
        payload = mergeLegacyPayload(payload, legacyPayload);
      }
    }

    res.json(payload);
  } catch (err) {
    console.error('Error al obtener los títulos del club local', err);
    if (!club || club.nombre === LOCAL_CLUB_CANONICAL_NAME) {
      try {
        const legacyPayload = await loadLegacyClubTitles();
        if (legacyPayload?.club?.titulos?.length) {
          return res.json(legacyPayload);
        }
      } catch (legacyError) {
        console.error('Error al intentar recuperar los títulos legados del club', legacyError);
      }
    }
    res.status(500).json({ mensaje: 'Error al obtener los títulos del club' });
  }
});

app.post(
  '/api/clubs/local/titulos',
  protegerRuta,
  permitirRol('Delegado'),
  upload.single('imagen'),
  async (req, res) => {
    try {
      const titulo = typeof req.body?.titulo === 'string' ? req.body.titulo.trim() : '';
      const descripcion = typeof req.body?.descripcion === 'string' ? req.body.descripcion.trim() : '';
      const rawYear = req.body?.anio;

      if (!titulo) {
        return res.status(400).json({ mensaje: 'El título del club es obligatorio' });
      }

      let anio = null;
      if (rawYear !== undefined && rawYear !== null && `${rawYear}`.trim() !== '') {
        const parsed = Number.parseInt(rawYear, 10);
        const currentYear = new Date().getFullYear();
        if (Number.isNaN(parsed) || parsed < 1900 || parsed > currentYear + 1) {
          return res.status(400).json({ mensaje: 'El año proporcionado no es válido' });
        }
        anio = parsed;
      }

      const club = await loadClubForRequest(req, res);
      if (!club) return;

      club.titulos.push({
        titulo,
        ...(anio ? { anio } : {}),
        ...(descripcion ? { descripcion } : {}),
        ...(req.file ? { imagen: buildUploadUrl(req.file.filename) } : {}),
        creadoPor: req.usuario.id,
        creadoEn: new Date()
      });

      await club.save();

      const individuales = await computeLocalIndividualTitles(club._id);
      const payload = await buildLocalClubPayload(club, individuales);

      res.status(201).json({ mensaje: 'Título agregado correctamente', ...payload });
    } catch (err) {
      console.error('Error al agregar un título al club local', err);
      res.status(500).json({ mensaje: 'Error al agregar el título del club' });
    }
  }
);

app.put(
  '/api/clubs/local/titulos/:id',
  protegerRuta,
  permitirRol('Delegado'),
  upload.single('imagen'),
  async (req, res) => {
    try {
      const club = await loadClubForRequest(req, res);
      if (!club) return;
      const titulo = club.titulos.id(req.params.id);

      if (!titulo) {
        return res.status(404).json({ mensaje: 'Título no encontrado' });
      }

      let datosActualizados = false;

      if ('titulo' in req.body) {
        const nuevoTitulo = typeof req.body.titulo === 'string' ? req.body.titulo.trim() : '';
        if (!nuevoTitulo) {
          return res.status(400).json({ mensaje: 'El título del club es obligatorio' });
        }
        titulo.titulo = nuevoTitulo;
        datosActualizados = true;
      }

      if ('descripcion' in req.body) {
        const descripcion =
          typeof req.body.descripcion === 'string' ? req.body.descripcion.trim() : '';
        titulo.descripcion = descripcion;
        datosActualizados = true;
      }

      if ('anio' in req.body) {
        const rawYear = req.body.anio;
        if (rawYear === '' || rawYear === null || (typeof rawYear === 'string' && rawYear.trim() === '')) {
          titulo.anio = undefined;
        } else {
          const parsed = Number.parseInt(rawYear, 10);
          const currentYear = new Date().getFullYear();
          if (Number.isNaN(parsed) || parsed < 1900 || parsed > currentYear + 1) {
            return res.status(400).json({ mensaje: 'El año proporcionado no es válido' });
          }
          titulo.anio = parsed;
        }
        datosActualizados = true;
      }

      const eliminarImagen = req.body?.eliminarImagen === 'true';

      if (req.file) {
        titulo.imagen = buildUploadUrl(req.file.filename);
        datosActualizados = true;
      } else if (eliminarImagen) {
        titulo.imagen = '';
        datosActualizados = true;
      }

      if (!datosActualizados) {
        return res.status(400).json({ mensaje: 'No se proporcionaron datos para actualizar' });
      }

      await club.save();

      const individuales = await computeLocalIndividualTitles(club._id);
      const payload = await buildLocalClubPayload(club, individuales);

      return res.json({ mensaje: 'Título actualizado correctamente', ...payload });
    } catch (err) {
      console.error('Error al actualizar un título del club local', err);
      return res.status(500).json({ mensaje: 'Error al actualizar el título del club' });
    }
  }
);

app.delete(
  '/api/clubs/local/titulos/:id',
  protegerRuta,
  permitirRol('Delegado'),
  async (req, res) => {
    try {
      const club = await loadClubForRequest(req, res);
      if (!club) return;
      const titulo = club.titulos.id(req.params.id);

      if (!titulo) {
        return res.status(404).json({ mensaje: 'Título no encontrado' });
      }

      await titulo.deleteOne();
      await club.save();

      const individuales = await computeLocalIndividualTitles(club._id);
      const payload = await buildLocalClubPayload(club, individuales);

      return res.json({ mensaje: 'Título eliminado correctamente', ...payload });
    } catch (err) {
      console.error('Error al eliminar un título del club local', err);
      return res.status(500).json({ mensaje: 'Error al eliminar el título del club' });
    }
  }
);

app.get('/api/clubs/local/titulos/:id', protegerRuta, async (req, res) => {
  let club = null;
  try {
    club = await loadClubForRequest(req, res, { allowFallbackToLocal: true });
    if (!club) return;
    await club.populate('titulos.creadoPor', 'nombre apellido');

    const titulo = club.titulos.id(req.params.id);

    if (!titulo) {
      if (club.nombre === LOCAL_CLUB_CANONICAL_NAME) {
        const legacy = await loadLegacyClubTitleById(req.params.id);
        if (legacy?.titulo) {
          const nombreAmigable =
            club?.nombre === LOCAL_CLUB_CANONICAL_NAME ? LOCAL_CLUB_DISPLAY_NAME : club?.nombre;
          return res.json({
            club: {
              _id: club?._id ?? legacy.club._id ?? null,
              nombre: club?.nombre || legacy.club.nombre,
              nombreAmigable: nombreAmigable || legacy.club.nombreAmigable
            },
            titulo: legacy.titulo
          });
        }
      }

      return res.status(404).json({ mensaje: 'Título no encontrado' });
    }

    const autor = titulo.creadoPor
      ? {
          _id: titulo.creadoPor._id,
          nombre: titulo.creadoPor.nombre,
          apellido: titulo.creadoPor.apellido
        }
      : null;

    return res.json({
      club: {
        _id: club._id,
        nombre: club.nombre,
        nombreAmigable:
          club.nombre === LOCAL_CLUB_CANONICAL_NAME ? LOCAL_CLUB_DISPLAY_NAME : club.nombre
      },
      titulo: {
        _id: titulo._id,
        titulo: titulo.titulo,
        anio: Number.isInteger(titulo.anio) ? titulo.anio : null,
        descripcion: titulo.descripcion || '',
        imagen: titulo.imagen || '',
        creadoEn: titulo.creadoEn || null,
        creadoPor: autor
      }
    });
  } catch (err) {
    console.error('Error al obtener el detalle del título del club local', err);
    if (!club || club.nombre === LOCAL_CLUB_CANONICAL_NAME) {
      try {
        const legacy = await loadLegacyClubTitleById(req.params.id);
        if (legacy?.titulo) {
          const nombreAmigable =
            club?.nombre === LOCAL_CLUB_CANONICAL_NAME ? LOCAL_CLUB_DISPLAY_NAME : club?.nombre;
          return res.json({
            club: {
              _id: club?._id ?? legacy.club._id ?? null,
              nombre: club?.nombre || legacy.club.nombre,
              nombreAmigable: nombreAmigable || legacy.club.nombreAmigable
            },
            titulo: legacy.titulo
          });
        }
      } catch (legacyError) {
        console.error('Error al recuperar el título legado del club', legacyError);
      }
    }
    res.status(500).json({ mensaje: 'Error al obtener el título del club' });
  }
});

app.get('/api/patinadores/:id', async (req, res) => {
  try {
    const clubId = await ensureClubForRequest(req, res, { allowFallbackToLocal: true });
    if (!clubId) return;

    const patinador = await Patinador.findOne({
      _id: req.params.id,
      club: normaliseObjectId(clubId)
    });
    if (!patinador) return res.status(404).json({ mensaje: 'Patinador no encontrado' });
    res.json(patinador);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al obtener el patinador' });
  }
});

app.post('/api/patinadores/:id/seguro', protegerRuta, async (req, res) => {
  try {
    const { tipo } = req.body;
    if (!['SD', 'SA'].includes(tipo)) return res.status(400).json({ mensaje: 'Tipo de seguro inválido' });

    const clubId = await ensureClubForRequest(req, res);
    if (!clubId) return;

    const patinador = await Patinador.findOne({
      _id: req.params.id,
      club: normaliseObjectId(clubId)
    });
    if (!patinador) return res.status(404).json({ mensaje: 'Patinador no encontrado' });

    const anoActual = new Date().getFullYear();
    const diarias = patinador.historialSeguros.filter((s) => s.tipo === 'SD' && new Date(s.fecha).getFullYear() === anoActual).length;
    const anuales = patinador.historialSeguros.filter((s) => s.tipo === 'SA' && new Date(s.fecha).getFullYear() === anoActual).length;
    if (anuales > 0) return res.status(400).json({ mensaje: 'El seguro anual ya fue solicitado este año' });
    if (tipo === 'SD' && diarias >= 2) {
      return res.status(400).json({ mensaje: 'El seguro diario solo puede solicitarse dos veces por año' });
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

app.put('/api/patinadores/:id', protegerRuta, upload.fields([{ name: 'fotoRostro', maxCount: 1 }, { name: 'foto', maxCount: 1 }]), async (req, res) => {
  try {
    const clubId = await ensureClubForRequest(req, res);
    if (!clubId) return;

    const actualizacion = { ...req.body };
    const fotoRostroFile = req.files?.fotoRostro?.[0];
    const fotoFile = req.files?.foto?.[0];

    if (fotoRostroFile) actualizacion.fotoRostro = buildUploadUrl(fotoRostroFile.filename);
    if (fotoFile) actualizacion.foto = buildUploadUrl(fotoFile.filename);

    const patinadorActualizado = await Patinador.findOneAndUpdate(
      { _id: req.params.id, club: normaliseObjectId(clubId) },
      actualizacion,
      { new: true, runValidators: true }
    );
    if (!patinadorActualizado) return res.status(404).json({ mensaje: 'Patinador no encontrado' });
    res.json(patinadorActualizado);
  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      if (err.keyPattern?.categoria && err.keyPattern?.numeroCorredor) {
        return res
          .status(400)
          .json({ mensaje: 'El número de corredor ya está asignado en esta categoría' });
      }
      const campo = Object.keys(err.keyValue || {})[0];
      return res.status(400).json({ mensaje: `${campo} ya existe` });
    }
    res.status(500).json({ mensaje: 'Error al actualizar el patinador' });
  }
});

app.delete('/api/patinadores/:id', protegerRuta, async (req, res) => {
  try {
    const clubId = await ensureClubForRequest(req, res);
    if (!clubId) return;

    const patinador = await Patinador.findOneAndDelete({
      _id: req.params.id,
      club: normaliseObjectId(clubId)
    });
    if (!patinador) return res.status(404).json({ mensaje: 'Patinador no encontrado' });
    res.json({ mensaje: 'Patinador eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al eliminar el patinador' });
  }
});

app.post('/api/patinadores/asociar', protegerRuta, async (req, res) => {
  const { dniPadre, dniMadre } = req.body;
  if (!dniPadre && !dniMadre) return res.status(400).json({ mensaje: 'Debe proporcionar dniPadre o dniMadre' });
  if (isAdminUser(req)) {
    return res.status(403).json({ mensaje: 'Los administradores no pueden asociar patinadores' });
  }
  try {
    const condiciones = [];
    if (dniPadre) condiciones.push({ dniPadre });
    if (dniMadre) condiciones.push({ dniMadre });
    const clubId = await ensureClubForRequest(req, res);
    if (!clubId) return;

    const patinadores = await Patinador.find({ $or: condiciones, club: normaliseObjectId(clubId) });
    if (patinadores.length === 0) return res.status(404).json({ mensaje: 'No se encontraron patinadores' });
    const usuario = await User.findById(req.usuario.id);
    const ids = patinadores.map((p) => p._id);
    const existentes = (usuario.patinadores || []).map((id) => id.toString());
    ids.forEach((id) => {
      if (!existentes.includes(id.toString())) usuario.patinadores.push(id);
    });
    await usuario.save();
    res.json(patinadores);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al asociar patinadores' });
  }
});

app.post('/api/users/club', protegerRuta, async (req, res) => {
  try {
    const clubIdRaw = trimmedOrNull(req.body?.clubId);
    if (!clubIdRaw || !isValidObjectId(clubIdRaw)) {
      return res.status(400).json({ mensaje: 'Club inválido' });
    }

    const club = await Club.findById(clubIdRaw);
    if (!club) {
      return res.status(404).json({ mensaje: 'Club no encontrado' });
    }

    const usuario = await User.findById(req.usuario.id);
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    if (usuario.rol === 'Admin') {
      return res.status(403).json({ mensaje: 'Los administradores no pueden asociarse a clubes' });
    }

    if (usuario.rol !== 'Admin' && usuario.club && usuario.club.toString() !== club._id.toString()) {
      return res.status(400).json({ mensaje: 'No podés cambiar de club una vez asignado' });
    }

    usuario.club = club._id;
    await usuario.save();

    const tokenPayload = {
      id: usuario._id,
      rol: usuario.rol,
      foto: usuario.foto || '',
      club: club._id.toString(),
      needsClubSelection: false
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      mensaje: 'Club asignado correctamente',
      token,
      usuario: {
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        rol: usuario.rol,
        email: usuario.email,
        club: club._id.toString(),
        foto: usuario.foto || ''
      }
    });
  } catch (err) {
    console.error('Error al asignar club', err);
    res.status(500).json({ mensaje: 'Error al asignar club' });
  }
});

// News
app.get('/api/news', async (req, res) => {
  try {
    await ensureRequestUser(req);
    if (isAdminUser(req)) {
      return res.json([]);
    }

    const clubId = await ensureClubForRequest(req, res, { allowFallbackToLocal: true });
    if (!clubId) return;

    const noticias = await News.find({ club: normaliseObjectId(clubId) })
      .sort({ fecha: -1 })
      .populate('autor', 'nombre apellido');
    const respuesta = noticias.map((n) => ({
      _id: n._id, titulo: n.titulo, contenido: n.contenido, imagen: n.imagen,
      autor: n.autor ? `${n.autor.nombre} ${n.autor.apellido}` : 'Anónimo', fecha: n.fecha
    }));
    res.json(respuesta);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al obtener noticias' });
  }
});

app.get('/api/news/:id', async (req, res) => {
  try {
    const noticia = await News.findById(req.params.id).populate('autor', 'nombre apellido club');
    if (!noticia) return res.status(404).json({ mensaje: 'Noticia no encontrada' });

    if (req.query?.clubId && isValidObjectId(req.query.clubId)) {
      if (!noticia.club || noticia.club.toString() !== req.query.clubId) {
        return res.status(404).json({ mensaje: 'Noticia no encontrada en este club' });
      }
    }
    const respuesta = {
      _id: noticia._id, titulo: noticia.titulo, contenido: noticia.contenido, imagen: noticia.imagen,
      autor: noticia.autor ? `${noticia.autor.nombre} ${noticia.autor.apellido}` : 'Anónimo', fecha: noticia.fecha
    };
    res.json(respuesta);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al obtener la noticia' });
  }
});

app.post('/api/news', protegerRuta, permitirRol('Delegado', 'Tecnico'), upload.single('imagen'), async (req, res) => {
  try {
    const { titulo, contenido } = req.body;
    const imagen = req.file ? buildUploadUrl(req.file.filename) : undefined;
    const clubId = await ensureClubForRequest(req, res);
    if (!clubId) return;

    const noticia = await News.create({ titulo, contenido, imagen, autor: req.usuario.id, club: clubId });
    await crearNotificacionesParaClub(clubId, `Nueva noticia: ${titulo}`);
    res.status(201).json(noticia);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al crear la noticia' });
  }
});

app.put('/api/news/:id', protegerRuta, permitirRol('Delegado', 'Tecnico'), upload.single('imagen'), async (req, res) => {
  try {
    const actualizacion = {};
    if (typeof req.body.titulo !== 'undefined') actualizacion.titulo = req.body.titulo;
    if (typeof req.body.contenido !== 'undefined') actualizacion.contenido = req.body.contenido;
    if (req.file) actualizacion.imagen = buildUploadUrl(req.file.filename);

    const noticiaActualizada = await News.findOneAndUpdate(
      { _id: req.params.id, ...(isAdminUser(req) ? {} : { club: req.usuario.club }) },
      actualizacion,
      {
        new: true,
        runValidators: true
      }
    ).populate('autor', 'nombre apellido');

    if (!noticiaActualizada) {
      return res.status(404).json({ mensaje: 'Noticia no encontrada' });
    }

    const respuesta = {
      _id: noticiaActualizada._id,
      titulo: noticiaActualizada.titulo,
      contenido: noticiaActualizada.contenido,
      imagen: noticiaActualizada.imagen,
      autor: noticiaActualizada.autor
        ? `${noticiaActualizada.autor.nombre} ${noticiaActualizada.autor.apellido}`
        : 'Anónimo',
      fecha: noticiaActualizada.fecha
    };

    res.json(respuesta);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al actualizar la noticia' });
  }
});

app.delete('/api/news/:id', protegerRuta, permitirRol('Delegado', 'Tecnico'), async (req, res) => {
  try {
    const filtro = { _id: req.params.id };
    if (!isAdminUser(req)) {
      const clubId = await ensureClubForRequest(req, res);
      if (!clubId) return;
      filtro.club = normaliseObjectId(clubId);
    }

    const noticia = await News.findOneAndDelete(filtro);
    if (!noticia) {
      return res.status(404).json({ mensaje: 'Noticia no encontrada' });
    }
    res.json({ mensaje: 'Noticia eliminada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al eliminar la noticia' });
  }
});

// Notifications
app.post('/api/notifications', protegerRuta, permitirRol('Delegado', 'Tecnico'), async (req, res) => {
  const { mensaje } = req.body;
  if (!mensaje) return res.status(400).json({ mensaje: 'Mensaje requerido' });
  const clubId = await ensureClubForRequest(req, res);
  if (!clubId) return;

  await crearNotificacionesParaClub(clubId, mensaje);
  res.status(201).json({ mensaje: 'Notificaciones enviadas' });
});

app.get('/api/notifications', protegerRuta, async (req, res) => {
  const userId = req.usuario?.id;
  if (!userId) return res.status(401).json({ mensaje: 'Usuario no autenticado' });
  if (isAdminUser(req)) {
    return res.json([]);
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
      .sort({ createdAt: -1 }).limit(limit).lean();
    res.json(notificaciones);
  } catch (err) {
    console.error('Error al obtener notificaciones', err);
    res.status(500).json({ mensaje: 'Error al obtener notificaciones' });
  }
});

app.put('/api/notifications/:id/read', protegerRuta, async (req, res) => {
  try {
    const filtro = { _id: req.params.id, destinatario: req.usuario.id };
    if (!isAdminUser(req)) {
      const clubId = await ensureClubForRequest(req, res);
      if (!clubId) return;
      filtro.club = normaliseObjectId(clubId);
    }

    const notif = await Notification.findOneAndUpdate(filtro, { leido: true }, { new: true });
    if (!notif) return res.status(404).json({ mensaje: 'Notificación no encontrada' });
    res.json(notif);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al marcar notificación' });
  }
});

app.delete('/api/notifications/:id', protegerRuta, permitirRol('Delegado', 'Tecnico'), async (req, res) => {
  try {
    const clubId = await ensureClubForRequest(req, res);
    if (!clubId) return;

    const notif = await Notification.findOne({
      _id: req.params.id,
      destinatario: req.usuario.id,
      club: normaliseObjectId(clubId)
    });
    if (!notif) return res.status(404).json({ mensaje: 'Notificación no encontrada' });

    await Notification.deleteMany({ mensaje: notif.mensaje, leido: false, club: normaliseObjectId(clubId) });
    res.json({ mensaje: 'Notificaciones eliminadas' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al eliminar notificaciones' });
  }
});

// ---- TORNEOS / COMPETENCIAS ----
app.post('/api/tournaments', protegerRuta, permitirRol('Delegado'), async (req, res) => {
  const { nombre, fechaInicio, fechaFin } = req.body;
  if (!nombre || !fechaInicio || !fechaFin) return res.status(400).json({ mensaje: 'Faltan datos' });

  const inicio = parseDateOnly(fechaInicio);
  const fin = parseDateOnly(fechaFin);
  if (!inicio || !fin) return res.status(400).json({ mensaje: 'Fechas inválidas' });

  try {
    const clubId = await ensureClubForRequest(req, res);
    if (!clubId) return;

    const torneo = await Torneo.create({ nombre, fechaInicio: inicio, fechaFin: fin, club: clubId });
    res.status(201).json(torneo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al crear torneo' });
  }
});

app.get('/api/tournaments', protegerRuta, async (req, res) => {
  try {
    const clubId = await ensureClubForRequest(req, res);
    if (!clubId) return;

    const torneos = await Torneo.find({ club: normaliseObjectId(clubId) }).sort({ fechaInicio: -1 });
    res.json(torneos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al obtener torneos' });
  }
});

app.put('/api/tournaments/:id', protegerRuta, permitirRol('Delegado'), async (req, res) => {
  const { nombre, fechaInicio, fechaFin } = req.body;

  const update = {};
  if (typeof nombre !== 'undefined') update.nombre = nombre;

  if (typeof fechaInicio !== 'undefined') {
    const inicio = parseDateOnly(fechaInicio);
    if (!inicio) return res.status(400).json({ mensaje: 'Fecha de inicio inválida' });
    update.fechaInicio = inicio;
  }

  if (typeof fechaFin !== 'undefined') {
    const fin = parseDateOnly(fechaFin);
    if (!fin) return res.status(400).json({ mensaje: 'Fecha de fin inválida' });
    update.fechaFin = fin;
  }

  try {
    const clubId = await ensureClubForRequest(req, res);
    if (!clubId) return;

    const torneo = await Torneo.findOneAndUpdate(
      { _id: req.params.id, club: normaliseObjectId(clubId) },
      update,
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
    const clubId = await ensureClubForRequest(req, res);
    if (!clubId) return;

    const torneo = await Torneo.findOne({ _id: req.params.id, club: normaliseObjectId(clubId) });
    if (!torneo) return res.status(404).json({ mensaje: 'Torneo no encontrado' });

    const comps = await Competencia.find({ torneo: req.params.id, club: normaliseObjectId(clubId) }, '_id');
    const compIds = comps.map((c) => c._id);
    await Resultado.deleteMany({ competenciaId: { $in: compIds }, club: normaliseObjectId(clubId) });
    await Notification.deleteMany({ competencia: { $in: compIds }, club: normaliseObjectId(clubId) });
    await Competencia.deleteMany({ torneo: req.params.id, club: normaliseObjectId(clubId) });
    await Torneo.deleteOne({ _id: torneo._id });
    res.json({ mensaje: 'Torneo eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al eliminar torneo' });
  }
});

app.post('/api/tournaments/:id/competitions', protegerRuta, permitirRol('Delegado'), upload.single('imagen'), async (req, res) => {
  const { nombre, fecha } = req.body;
  if (!nombre || !fecha) return res.status(400).json({ mensaje: 'Faltan datos' });
  try {
    const clubId = await ensureClubForRequest(req, res);
    if (!clubId) return;

    const torneo = await Torneo.findOne({ _id: req.params.id, club: normaliseObjectId(clubId) });
    if (!torneo) return res.status(404).json({ mensaje: 'Torneo no encontrado' });
    const imagen = req.file ? buildUploadUrl(req.file.filename) : undefined;
    const fechaNormalizada = parseDateOnly(fecha);
    if (!fechaNormalizada) return res.status(400).json({ mensaje: 'Fecha inválida' });
    const competencia = await Competencia.create({
      nombre,
      fecha: fechaNormalizada,
      torneo: torneo._id,
      club: clubId,
      ...(imagen ? { imagen } : {})
    });
    await crearNotificacionesParaClub(clubId, `Nueva competencia ${nombre}`, competencia._id);
    res.status(201).json(competencia);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al crear competencia' });
  }
});

app.get('/api/competencias', async (req, res) => {
  try {
    const clubId = await ensureClubForRequest(req, res, { allowFallbackToLocal: true });
    if (!clubId) return;

    const comps = await Competencia.find({ club: normaliseObjectId(clubId) }).sort({ fecha: 1 });
    res.json(comps);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al obtener competencias' });
  }
});

app.get('/api/tournaments/:id/competitions', protegerRuta, async (req, res) => {
  try {
    const clubId = await ensureClubForRequest(req, res);
    if (!clubId) return;

    const torneo = await Torneo.findOne({ _id: req.params.id, club: normaliseObjectId(clubId) });
    if (!torneo) return res.status(404).json({ mensaje: 'Torneo no encontrado' });

    const comps = await Competencia.find({ torneo: req.params.id, club: normaliseObjectId(clubId) }).sort({ fecha: 1 });
    res.json(comps);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al obtener competencias' });
  }
});

app.put('/api/competitions/:id', protegerRuta, permitirRol('Delegado'), upload.single('imagen'), async (req, res) => {
  const { nombre, fecha } = req.body;
  const update = {};
  if (typeof nombre !== 'undefined') update.nombre = nombre;
  if (typeof fecha !== 'undefined') {
    const fechaNormalizada = parseDateOnly(fecha);
    if (!fechaNormalizada) return res.status(400).json({ mensaje: 'Fecha inválida' });
    update.fecha = fechaNormalizada;
  }
  if (req.file) update.imagen = buildUploadUrl(req.file.filename);
  try {
    const clubId = await ensureClubForRequest(req, res);
    if (!clubId) return;

    const comp = await Competencia.findOneAndUpdate(
      { _id: req.params.id, club: normaliseObjectId(clubId) },
      update,
      { new: true, runValidators: true }
    );
    if (!comp) return res.status(404).json({ mensaje: 'Competencia no encontrada' });
    res.json(comp);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al actualizar competencia' });
  }
});

app.delete('/api/competitions/:id', protegerRuta, permitirRol('Delegado'), async (req, res) => {
  try {
    const clubId = await ensureClubForRequest(req, res);
    if (!clubId) return;

    const comp = await Competencia.findOneAndDelete({
      _id: req.params.id,
      club: normaliseObjectId(clubId)
    });
    if (!comp) return res.status(404).json({ mensaje: 'Competencia no encontrada' });
    await Resultado.deleteMany({ competenciaId: req.params.id, club: normaliseObjectId(clubId) });
    await Notification.deleteMany({ competencia: req.params.id, club: normaliseObjectId(clubId) });
    res.json({ mensaje: 'Competencia eliminada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al eliminar competencia' });
  }
});

app.get('/api/competitions/:id/resultados', protegerRuta, async (req, res) => {
  try {
    const clubId = await ensureClubForRequest(req, res);
    if (!clubId) return;

    const competencia = await Competencia.findOne({
      _id: req.params.id,
      club: normaliseObjectId(clubId)
    });
    if (!competencia) return res.status(404).json({ mensaje: 'Competencia no encontrada' });

    await recalcularPosiciones(req.params.id);
    const resultados = await Resultado.find({ competenciaId: req.params.id, club: normaliseObjectId(clubId) })
      .populate('deportistaId', 'primerNombre segundoNombre apellido')
      .populate('invitadoId', 'primerNombre segundoNombre apellido club');
    res.json(ordenarResultados(resultados));
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al obtener resultados' });
  }
});

app.post('/api/competitions/:id/resultados/import-pdf', protegerRuta, permitirRol('Delegado'), upload.single('archivo'), async (req, res) => {
  try {
    const clubId = await ensureClubForRequest(req, res);
    if (!clubId) return;

    const competencia = await Competencia.findOne({
      _id: req.params.id,
      club: normaliseObjectId(clubId)
    });
    if (!competencia) return res.status(404).json({ mensaje: 'Competencia no encontrada' });
    if (!req.file) return res.status(400).json({ mensaje: 'Archivo no proporcionado' });

    const buffer = fs.readFileSync(req.file.path);
    const jsonPath = req.file.path.replace(/\.[^./]+$/, '.json');
    const json = await pdfToJson(buffer, jsonPath);
    fs.unlinkSync(req.file.path);
    const hash = crypto.createHash('md5').update(buffer).digest('hex');
    const filas = parseResultadosJson(json);
    let count = 0;

    for (const fila of filas) {
      const patinador = await Patinador.findOne({
        numeroCorredor: Number(fila.dorsal),
        categoria: fila.categoria,
        club: normaliseObjectId(clubId)
      });
      if (!patinador) continue;
      await Resultado.findOneAndUpdate(
        { competenciaId: competencia._id, deportistaId: patinador._id, categoria: fila.categoria },
        {
          puntos: fila.puntos,
          dorsal: fila.dorsal,
          club: clubId,
          fuenteImportacion: { archivo: req.file.originalname, hash }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      count++;
    }
    await recalcularPosiciones(competencia._id);
    res.json({ mensaje: 'Importación completada', procesados: count, archivoJson: path.basename(jsonPath), resultados: filas });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al importar resultados' });
  }
});

app.post('/api/competitions/:id/resultados/manual', protegerRuta, permitirRol('Delegado'), async (req, res) => {
  const { categoria, puntos, dorsal, patinadorId, invitado } = req.body;
  try {
    const clubId = await ensureClubForRequest(req, res);
    if (!clubId) return;

    const competencia = await Competencia.findOne({
      _id: req.params.id,
      club: normaliseObjectId(clubId)
    });
    if (!competencia) return res.status(404).json({ mensaje: 'Competencia no encontrada' });

    const filtro = { competenciaId: competencia._id, categoria };
    let clubDoc;

    if (patinadorId) {
      const pat = await Patinador.findOne({ _id: patinadorId, club: normaliseObjectId(clubId) });
      if (!pat) return res.status(404).json({ mensaje: 'Patinador no encontrado' });
      filtro.deportistaId = pat._id;
      clubDoc = await Club.findById(clubId);
    } else if (invitado) {
      const { primerNombre, segundoNombre, apellido, club } = invitado;
      if (!primerNombre || !apellido || !club) {
        return res.status(400).json({ mensaje: 'Datos de invitado incompletos' });
      }
      const clubNombre = club.trim().toUpperCase();
      clubDoc = await Club.findOne({ nombre: clubNombre }) || await Club.create({ nombre: clubNombre });

      let ext = await PatinadorExterno.findOne({ primerNombre, segundoNombre, apellido, club: clubNombre });
      if (!ext) {
        ext = await PatinadorExterno.create({ primerNombre, segundoNombre, apellido, club: clubNombre, categoria, numeroCorredor: dorsal });
      } else {
        let actualizado = false;
        if (ext.categoria !== categoria) { ext.categoria = categoria; actualizado = true; }
        if (dorsal && ext.numeroCorredor !== Number(dorsal)) { ext.numeroCorredor = Number(dorsal); actualizado = true; }
        if (actualizado) await ext.save();
      }
      filtro.invitadoId = ext._id;
    } else {
      return res.status(400).json({ mensaje: 'Debe proporcionar patinadorId o datos de invitado' });
    }

    const actualizacion = { puntos, dorsal };
    if (clubDoc) {
      actualizacion.clubId = clubDoc._id;
    }
    actualizacion.club = clubId;

    const resultado = await Resultado.findOneAndUpdate(filtro, actualizacion, {
      upsert: true, new: true, setDefaultsOnInsert: true
    });

    await recalcularPosiciones(competencia._id, categoria);
    const actualizado = await Resultado.findById(resultado._id);
    res.json(actualizado);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al guardar resultado' });
  }
});

app.post('/api/competitions/:id/responder', protegerRuta, async (req, res) => {
  const { participa } = req.body;
  try {
    const clubId = await ensureClubForRequest(req, res);
    if (!clubId) return;

    const competencia = await Competencia.findOne({
      _id: req.params.id,
      club: normaliseObjectId(clubId)
    });
    if (!competencia) return res.status(404).json({ mensaje: 'Competencia no encontrada' });

    const usuario = await User.findById(req.usuario.id).populate('patinadores');
    const notif = await Notification.findOne({
      destinatario: req.usuario.id,
      competencia: competencia._id,
      club: normaliseObjectId(clubId)
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

app.get('/api/competitions/:id/lista-buena-fe', protegerRuta, permitirRol('Delegado'), async (req, res) => {
  try {
    const clubId = await ensureClubForRequest(req, res);
    if (!clubId) return;

    const comp = await Competencia.findOne({
      _id: req.params.id,
      club: normaliseObjectId(clubId)
    }).populate('listaBuenaFe');
    if (!comp) return res.status(404).json({ mensaje: 'Competencia no encontrada' });
    const listaOrdenada = ordenarPorCategoria([...comp.listaBuenaFe]);
    res.json(listaOrdenada);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al obtener lista' });
  }
});

app.get('/api/competitions/:id/lista-buena-fe/excel', protegerRuta, permitirRol('Delegado'), async (req, res) => {
  try {
    const clubId = await ensureClubForRequest(req, res);
    if (!clubId) return;

    const comp = await Competencia.findOne({
      _id: req.params.id,
      club: normaliseObjectId(clubId)
    }).populate('listaBuenaFe');
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

    const allBorders = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

    const imgPath = path.resolve(__dirname, '../frontend-auth/public/APM.png');
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
    r3.value = 'patinapm@gmail.com - patincarreraapm@gmail.com - lbfpatincarrera@gmail.com';
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
    r5.value = 'LISTA DE BUENA FE  ESCUELA-TRANSICION-INTERMEDIA-FEDERADOS-LIBRES';
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
    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
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

    const lista = Array.isArray(comp.listaBuenaFe) ? ordenarPorCategoria([...comp.listaBuenaFe]) : [];
    const getUltimaLetra = (cat) => (!cat || typeof cat !== 'string') ? '' : cat.trim().slice(-1).toUpperCase();

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
      if (!next || (currL === 'E' && (nextL === 'T' || nextL === 'I')) || ((currL === 'T' || currL === 'I') && nextL === 'F')) {
        const sep = sheet.getRow(rowNum++);
        sep.height = 10;
        for (let c = 1; c <= 8; c++) {
          sep.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };
        }
        sep.commit();
      }
    });

    for (let i = 0; i < 2; i++) sheet.getRow(rowNum++).commit();

    const staff = [
      { name: 'MANZUR VANESA CAROLINA', role: 'TECN', birth: '08/07/1989', dni: '34543626' },
      { name: 'MANZUR GASTON ALFREDO', role: 'DELEG', birth: '14/12/1983', dni: '30609550' },
      { name: 'CURA VANESA ELIZABEHT', role: 'DELEG', birth: '24/02/1982', dni: '29301868' }
    ];
    staff.forEach(({ name, role, birth, dni }) => {
      const row = sheet.getRow(rowNum);
      [name, role, birth, dni].forEach((value, i) => {
        const cell = row.getCell(4 + i);
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
    med1.value = 'CERTIFICACION MEDICA: CERTIFICO QUE LAS PERSONAS DETALLADAS PRECEDENTEMENTE SE ENCUENTRAN APTAS FISICA Y';
    med1.font = { color: { argb: 'FFFF0000' } };
    med1.alignment = { horizontal: 'left', vertical: 'middle' };
    sheet.getRow(rowNum).commit();
    rowNum++;

    sheet.mergeCells(`B${rowNum}:H${rowNum}`);
    const med2 = sheet.getCell(`B${rowNum}`);
    med2.value = 'PSIQUICAMENTE, PARA LA PRACTICA ACTIVA DE ESTE DEPORTE Y CUENTAN CON SEGURO CON POLIZA VIGENTE.';
    med2.font = { color: { argb: 'FFFF0000' } };
    med2.alignment = { horizontal: 'left', vertical: 'middle' };
    sheet.getRow(rowNum).commit();
    rowNum++;

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="lista_buena_fe.xlsx"');
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al generar excel' });
  }
});

// ---- RANKINGS ----
app.get('/api/tournaments/:id/ranking/individual', protegerRuta, async (req, res) => {
  try {
    const clubId = await ensureClubForRequest(req, res);
    if (!clubId) return;

    const clubObjectId = normaliseObjectId(clubId);
    if (!clubObjectId) return res.status(400).json({ mensaje: 'Club inválido' });

    const torneo = await Torneo.findOne({ _id: req.params.id, club: clubObjectId });
    if (!torneo) return res.status(404).json({ mensaje: 'Torneo no encontrado' });

    const comps = await Competencia.find({ torneo: torneo._id, club: clubObjectId }, '_id');
    const compIds = comps.map((c) => c._id);

    const resultados = await Resultado.find({ competenciaId: { $in: compIds }, club: clubObjectId })
      .populate('deportistaId', 'primerNombre segundoNombre apellido')
      .populate('invitadoId', 'primerNombre segundoNombre apellido')
      .populate('clubId', 'nombre');

    const clubDoc = await Club.findById(clubObjectId).select('nombre');
    const clubDefault = clubDoc
      ? { _id: clubDoc._id, nombre: clubDoc.nombre }
      : { nombre: 'Club' };

    const agrupado = {};
    for (const r of resultados) {
      const categoria = r.categoria;
      const persona = r.deportistaId || r.invitadoId;
      if (!persona) continue;
      const id = String(persona._id);
      if (!agrupado[categoria]) agrupado[categoria] = {};
      if (!agrupado[categoria][id]) {
        const nombre = `${persona.primerNombre}${persona.segundoNombre ? ` ${persona.segundoNombre}` : ''} ${persona.apellido}`;
        agrupado[categoria][id] = {
          id,
          nombre,
          puntos: 0,
          club: r.clubId ? { _id: r.clubId._id, nombre: r.clubId.nombre } : clubDefault
        };
      }
      agrupado[categoria][id].puntos += r.puntos || 0;
    }

    const respuesta = Object.keys(agrupado)
      .sort((a, b) => posCategoria(a) - posCategoria(b))
      .map((cat) => ({ categoria: cat, patinadores: Object.values(agrupado[cat]).sort((a, b) => b.puntos - a.puntos) }));

    res.json(respuesta);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al obtener ranking individual' });
  }
});

app.get('/api/tournaments/:id/ranking/club', protegerRuta, async (req, res) => {
  try {
    const clubId = await ensureClubForRequest(req, res);
    if (!clubId) return;

    const clubObjectId = normaliseObjectId(clubId);
    if (!clubObjectId) return res.status(400).json({ mensaje: 'Club inválido' });

    const torneo = await Torneo.findOne({ _id: req.params.id, club: clubObjectId });
    if (!torneo) return res.status(404).json({ mensaje: 'Torneo no encontrado' });

    const comps = await Competencia.find({ torneo: torneo._id, club: clubObjectId }, '_id');
    const compIds = comps.map((c) => c._id);

    const resultados = await Resultado.find({ competenciaId: { $in: compIds }, club: clubObjectId }).populate('clubId', 'nombre');

    const clubDoc = await Club.findById(clubObjectId).select('nombre');
    const clubDefault = clubDoc
      ? { _id: clubDoc._id, nombre: clubDoc.nombre }
      : { nombre: 'Club' };

    const ranking = {};
    for (const r of resultados) {
      const clubParticipante = r.clubId ? { _id: r.clubId._id, nombre: r.clubId.nombre } : clubDefault;
      const cid = String(clubParticipante._id || 'default');
      if (!ranking[cid]) {
        ranking[cid] = { club: clubParticipante, puntos: 0 };
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
    const clubId = await ensureClubForRequest(req, res);
    if (!clubId) return;

    const entrenamientos = await Entrenamiento.find({ club: normaliseObjectId(clubId) }).sort({ fecha: -1 });
    res.json(entrenamientos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al obtener entrenamientos' });
  }
});

app.get('/api/entrenamientos/:id', protegerRuta, permitirRol('Tecnico'), async (req, res) => {
  try {
    const clubId = await ensureClubForRequest(req, res);
    if (!clubId) return;

    const entrenamiento = await Entrenamiento.findOne({
      _id: req.params.id,
      club: normaliseObjectId(clubId)
    }).populate('asistencias.patinador', 'primerNombre apellido');
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
    const clubId = await ensureClubForRequest(req, res);
    if (!clubId) return;

    const { fecha, asistencias } = req.body;
    if (!fecha) {
      return res.status(400).json({ mensaje: 'La fecha es obligatoria' });
    }
    const nuevo = await Entrenamiento.create({
      fecha,
      asistencias,
      tecnico: req.usuario.id,
      club: clubId
    });
    res.status(201).json(nuevo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al crear entrenamiento' });
  }
});

app.put('/api/entrenamientos/:id', protegerRuta, permitirRol('Tecnico'), async (req, res) => {
  try {
    const clubId = await ensureClubForRequest(req, res);
    if (!clubId) return;

    const { asistencias, fecha } = req.body;
    if (!fecha) {
      return res.status(400).json({ mensaje: 'La fecha es obligatoria' });
    }
    const actualizado = await Entrenamiento.findOneAndUpdate(
      { _id: req.params.id, club: normaliseObjectId(clubId) },
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
    const clubId = await ensureClubForRequest(req, res);
    if (!clubId) return;

    const eliminado = await Entrenamiento.findOneAndDelete({
      _id: req.params.id,
      club: normaliseObjectId(clubId)
    });
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
    const clubId = await ensureClubForRequest(req, res);
    if (!clubId) return;

    const { patinador, descripcion, fecha } = req.body;
    if (!patinador || !descripcion) {
      return res.status(400).json({ mensaje: 'Patinador y descripcion son obligatorios' });
    }
    const patinadorDoc = await Patinador.findOne({
      _id: patinador,
      club: normaliseObjectId(clubId)
    });
    if (!patinadorDoc) {
      return res.status(404).json({ mensaje: 'Patinador no encontrado en tu club' });
    }

    const nuevo = await Progreso.create({
      patinador,
      tecnico: req.usuario.id,
      descripcion,
      fecha: fecha || Date.now(),
      club: clubId
    });
    res.status(201).json(nuevo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al crear progreso' });
  }
});

app.post('/api/progresos/:id/enviar', protegerRuta, permitirRol('Tecnico'), async (req, res) => {
  try {
    const clubId = await ensureClubForRequest(req, res);
    if (!clubId) return;

    const prog = await Progreso.findOne({
      _id: req.params.id,
      club: normaliseObjectId(clubId)
    }).populate('patinador', 'primerNombre apellido');
    if (!prog) {
      return res.status(404).json({ mensaje: 'Progreso no encontrado' });
    }
    if (prog.enviado) {
      return res.status(400).json({ mensaje: 'Progreso ya enviado' });
    }
    const usuarios = await User.find({
      patinadores: prog.patinador._id,
      club: normaliseObjectId(clubId)
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
      progreso: prog._id,
      club: clubId
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
    const clubId = await ensureClubForRequest(req, res);
    if (!clubId) return;

    const { patinadorId } = req.params;
    const usuario = await User.findById(req.usuario.id);
    if (
      usuario.rol !== 'Tecnico' &&
      !(usuario.patinadores || []).some((id) => id.toString() === patinadorId)
    ) {
      return res.status(403).json({ mensaje: 'Acceso denegado' });
    }
    const progresos = await Progreso.find({
      patinador: patinadorId,
      club: normaliseObjectId(clubId)
    })
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
    const clubId = await ensureClubForRequest(req, res);
    if (!clubId) return;

    const prog = await Progreso.findOne({
      _id: req.params.id,
      club: normaliseObjectId(clubId)
    })
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
app.get('/api/auth/google', (req, res) => {
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

app.get('/api/auth/google/callback', async (req, res) => {
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
    if (!idToken) return res.status(400).json({ mensaje: 'Token de Google no recibido' });

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

    await ensureAdminHasNoAssociations(usuario);

    const tokenPayload = {
      id: usuario._id,
      rol: usuario.rol,
      foto: usuario.foto || '',
      club: usuario.club ? usuario.club.toString() : null,
      needsClubSelection: !usuario.club && usuario.rol !== 'Admin'
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

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
