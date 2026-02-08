import express from 'express';
import PushToken from '../models/PushToken.js';
import { initFirebaseAdmin } from '../src/firebaseAdmin.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { userId, token, platform, device } = req.body;

    if (!userId || !token || !platform) {
      return res.status(400).json({ ok: false, error: 'userId, token, platform son requeridos' });
    }

    await PushToken.updateOne(
      { token },
      { $set: { userId, token, platform, device, lastSeenAt: new Date() } },
      { upsert: true }
    );

    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/test', async (req, res) => {
  try {
    const { userId, title = 'Prueba', body = 'Push OK', data = {} } = req.body;
    if (!userId) return res.status(400).json({ ok: false, error: 'userId requerido' });

    const admin = initFirebaseAdmin();

    const tokens = await PushToken.find({ userId }).lean();
    if (!tokens.length) return res.status(404).json({ ok: false, error: 'No hay tokens para este userId' });

    const base = {
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [String(k), String(v)])),
      android: { priority: 'high', notification: { channelId: 'patincarrera_default' } },
      webpush: {
        headers: { Urgency: 'high' },
        notification: { icon: '/icons/icon-192.png', badge: '/icons/badge-72.png' }
      }
    };

    const sent = [];
    for (const t of tokens) {
      try {
        const id = await admin.messaging().send({ ...base, token: t.token });
        sent.push({ token: t.token, ok: true, messageId: id });
      } catch (err) {
        sent.push({ token: t.token, ok: false, error: err.message });
      }
    }

    return res.json({ ok: true, sent });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;
