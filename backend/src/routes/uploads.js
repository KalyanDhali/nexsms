import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { authenticate } from '../middleware/auth.js';
import { query } from '../models/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

const MIME_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/bmp': 'bmp',
};

const MAX_SIZE = 8 * 1024 * 1024;

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const router = Router();
router.use(authenticate);

// POST /api/uploads — upload an image for MMS. Body: { filename, data (base64, optional data: prefix) }
router.post('/', async (req, res) => {
  try {
    const { filename = '', data } = req.body;
    if (!data) return res.status(400).json({ error: 'data (base64 image) required' });

    // Toggle (MMS) feature gate
    const { rows: ft } = await query(`SELECT enabled FROM feature_toggles WHERE key = 'mm_support'`);
    const gate = ft.length ? ft[0].enabled : false;
    if (!gate) return res.status(403).json({ error: 'MMS uploads are disabled by the platform' });

    // Strip data URL prefix
    const base64 = String(data).includes(',') ? String(data).split(',')[1] : String(data);
    const buf = Buffer.from(base64, 'base64');
    if (!buf.length) return res.status(400).json({ error: 'Invalid base64 data' });
    if (buf.length > MAX_SIZE) return res.status(400).json({ error: 'File too large (max 8MB)' });

    // Detect mime from base64 magic bytes
    const sniff = (b) => {
      if (b[0] === 0xff && b[1] === 0xd8) return 'image/jpeg';
      if (b[0] === 0x89 && b[1] === 0x50) return 'image/png';
      if (b[0] === 0x47 && b[1] === 0x49) return 'image/gif';
      if (b[0] === 0x52 && b[1] === 0x49) return 'image/webp';
      if (b[0] === 0x42 && b[1] === 0x4d) return 'image/bmp';
      return MIME_EXT[String(req.body.mimeType || '').toLowerCase()] ? req.body.mimeType : null;
    };
    const mime = sniff(buf);
    if (!mime) return res.status(400).json({ error: 'Unsupported image type (use JPEG, PNG, GIF, WebP, BMP)' });

    const ext = MIME_EXT[mime];
    const name = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);

    res.status(201).json({ url: `/api/media/${name}`, name, size: buf.length, mime });
  } catch (err) {
    console.error('Upload error:', err.message);
    res.status(500).json({ error: 'Upload failed' });
  }
});

export default router;
