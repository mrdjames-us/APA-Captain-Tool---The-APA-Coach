import express from 'express';
import cors from 'cors';
import { APAService } from './apaService.js';

const app = express();
const PORT = process.env.APA_SERVER_PORT || 3001;

app.use(
  cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://0.0.0.0:3000'],
    credentials: true,
  })
);
app.use(express.json());

// In-memory session store: sessionId -> { service, createdAt }
const sessions = new Map();

// Evict sessions older than 2 hours
setInterval(() => {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  for (const [id, data] of sessions.entries()) {
    if (data.createdAt < cutoff) sessions.delete(id);
  }
}, 15 * 60 * 1000);

function getSession(req, res) {
  const sessionId = req.headers['x-apa-session'];
  const session = sessions.get(sessionId);
  if (!session) {
    res.status(401).json({ success: false, error: 'APA session expired. Please reconnect.' });
    return null;
  }
  return session;
}

// POST /api/apa/login
app.post('/api/apa/login', async (req, res) => {
  const { memberId, password } = req.body || {};
  if (!memberId || !password) {
    return res.status(400).json({ success: false, error: 'Member ID and password are required.' });
  }

  try {
    const service = new APAService();
    const result = await service.login(String(memberId), String(password));

    if (result.success) {
      const sessionId = crypto.randomUUID();
      sessions.set(sessionId, { service, createdAt: Date.now() });
      return res.json({ success: true, sessionId, teamInfo: result.teamInfo });
    }

    return res.status(401).json({ success: false, error: result.error || 'Login failed.' });
  } catch (err) {
    console.error('[APA /login]', err.message);
    return res.status(500).json({
      success: false,
      error: `Connection error: ${err.message}. Make sure poolplayers.com is reachable.`,
    });
  }
});

// GET /api/apa/roster
app.get('/api/apa/roster', async (req, res) => {
  const session = getSession(req, res);
  if (!session) return;

  try {
    const roster = await session.service.getRoster();
    return res.json({ success: true, roster });
  } catch (err) {
    console.error('[APA /roster]', err.message);
    return res.status(500).json({ success: false, error: `Roster fetch failed: ${err.message}` });
  }
});

// GET /api/apa/stats
app.get('/api/apa/stats', async (req, res) => {
  const session = getSession(req, res);
  if (!session) return;

  try {
    const stats = await session.service.getStats();
    return res.json({ success: true, stats });
  } catch (err) {
    console.error('[APA /stats]', err.message);
    return res.status(500).json({ success: false, error: `Stats fetch failed: ${err.message}` });
  }
});

// POST /api/apa/logout
app.post('/api/apa/logout', (req, res) => {
  const sessionId = req.headers['x-apa-session'];
  if (sessionId) sessions.delete(sessionId);
  return res.json({ success: true });
});

// Health check
app.get('/api/apa/health', (_, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`✓ APA Proxy Server → http://localhost:${PORT}`);
});
