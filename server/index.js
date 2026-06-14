// Local development proxy server.
//
// In production the APA endpoints are served by Cloudflare Pages Functions
// (see ../functions/api/apa/*). This Express server exists ONLY so the same
// /api/apa/* routes work locally under `npm run dev` (Vite proxies /api here).
// It shares the exact same scraping logic as the Pages Functions via
// ../functions/_lib/apaScraper.js, so behavior never drifts between the two.

import express from 'express';
import cors from 'cors';
import { apaLogin, apaGetRoster, apaGetStats } from '../functions/_lib/apaScraper.js';

const app = express();
const PORT = process.env.APA_SERVER_PORT || 3001;

app.use(
  cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://0.0.0.0:3000'],
    credentials: true,
  })
);
app.use(express.json());

app.post('/api/apa/login', async (req, res) => {
  const { memberId, password } = req.body || {};
  if (!memberId || !password) {
    return res.status(400).json({ success: false, error: 'Member ID and password are required.' });
  }
  try {
    const result = await apaLogin(String(memberId), String(password));
    return res.status(result.success ? 200 : 401).json(result);
  } catch (err) {
    console.error('[APA /login]', err.message);
    return res.status(502).json({
      success: false,
      error: `Connection error reaching poolplayers.com: ${err.message}`,
    });
  }
});

app.get('/api/apa/roster', async (req, res) => {
  const sessionId = req.headers['x-apa-session'];
  if (!sessionId) return res.status(401).json({ success: false, error: 'APA session expired. Please reconnect.' });
  try {
    const roster = await apaGetRoster(String(sessionId));
    return res.json({ success: true, roster });
  } catch (err) {
    console.error('[APA /roster]', err.message);
    return res.status(500).json({ success: false, error: `Roster fetch failed: ${err.message}` });
  }
});

app.get('/api/apa/stats', async (req, res) => {
  const sessionId = req.headers['x-apa-session'];
  if (!sessionId) return res.status(401).json({ success: false, error: 'APA session expired. Please reconnect.' });
  try {
    const stats = await apaGetStats(String(sessionId));
    return res.json({ success: true, stats });
  } catch (err) {
    console.error('[APA /stats]', err.message);
    return res.status(500).json({ success: false, error: `Stats fetch failed: ${err.message}` });
  }
});

app.post('/api/apa/logout', (_, res) => res.json({ success: true }));
app.get('/api/apa/health', (_, res) => res.json({ ok: true, runtime: 'local-express' }));

app.listen(PORT, () => {
  console.log(`✓ APA local dev proxy → http://localhost:${PORT}`);
});
