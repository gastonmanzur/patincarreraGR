import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { extract, confirm, getIncidencias } from '../services/pdfImportService.js';
import { protegerRuta } from '../middlewares/authMiddleware.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const tmpDir = path.resolve('uploads/tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

const upload = multer({
  dest: tmpDir,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Solo se permiten PDF'));
    }
    cb(null, true);
  }
});

router.post('/extract', protegerRuta, upload.single('file'), async (req, res) => {
  try {
    const competenciaId = req.query.competenciaId;
    const info = await extract(req.file.path, competenciaId);
    fs.unlink(req.file.path, () => {});
    res.json(info);
  } catch (e) {
    res.status(400).json({ mensaje: e.message });
  }
});

router.post('/confirm', protegerRuta, async (req, res) => {
  try {
    const { extractionId, competenciaId, columnMapping } = req.body;
    const result = await confirm({ extractionId, competenciaId, columnMapping });
    res.json(result);
  } catch (e) {
    res.status(400).json({ mensaje: e.message });
  }
});

router.get('/incidencias', protegerRuta, async (req, res) => {
  try {
    const { competenciaId } = req.query;
    const items = await getIncidencias(competenciaId);
    res.json(items);
  } catch (e) {
    res.status(400).json({ mensaje: e.message });
  }
});

export default router;
