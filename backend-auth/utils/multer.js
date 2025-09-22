import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure the uploads directory exists so Multer can save files without errors.
const uploadDir = (() => {
  const configured = process.env.UPLOADS_DIR?.trim();
  if (configured) {
    return path.resolve(configured);
  }
  return path.resolve(__dirname, '..', 'uploads');
})();
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}${ext}`);
  }
});

const upload = multer({ storage });

export default upload;
