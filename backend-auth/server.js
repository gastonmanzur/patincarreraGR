// server.js (ESM) 
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';

const app = express();

// Middlewares base
app.use(cors({ origin: ['https://patincarrera.net', 'http://localhost:5173'], credentials: true }));
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('tiny'));

// Health simple (SIN depender de routers)
app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

// Conexión a Mongo robusta
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/backend-auth';
console.log('Intentando conectar a MongoDB usando', MONGO_URI);
try {
  await mongoose.connect(MONGO_URI);
  console.log('MongoDB conectado');
} catch (err) {
  console.error('Error conectando a Mongo:', err);
  // No hacemos process.exit(1) para poder ver el /api/health igual
}

// IMPORTÁ y MONTÁ tus rutas **SIN invocarlas**
// Ejemplo:
// import authRoutes from './routes/auth.routes.js';
// app.use('/api', authRoutes);

// Manejador de errores al final
app.use((err, _req, res, _next) => {
  console.error('ERR:', err);
  res.status(err.status || 500).json({ error: true, message: err.message || 'Internal error' });
});

const PORT = process.env.PORT || 5000;
// IMPORTANTE: NO hagas app = app.listen(...). No llames app() NI exportes app().
app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});

// export default app; // opcional, pero SIN paréntesis
