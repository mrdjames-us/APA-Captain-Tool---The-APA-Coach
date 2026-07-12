// Local development proxy server.
//
// In production the APA endpoints are served by Cloudflare Pages Functions
// (see ../functions/api/apa/*). This Express server exists ONLY so the same
// /api/apa/* routes work locally under `npm run dev` (Vite proxies /api here).
// It shares the exact same GraphQL client as the Pages Functions via
// ../functions/_lib/apaClient.js, so behavior never drifts between the two.

import express from 'express';
import cors from 'cors';
import { login, syncTeams, syncTeam, scoutTeam, syncAchievements, syncLifetime, ApaError } from '../functions/_lib/apaClient.js';

const app = express();
const PORT = process.env.APA_SERVER_PORT || 3001;

app.use(
  cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://0.0.0.0:3000'],
    credentials: true,
  })
);
app.use(express.json());

const sendError = (res, err) => {
  if (err instanceof ApaError) {
    const status = err.code === 'DENIED' || err.code === 'AUTH' ? 401 : err.code === 'NETWORK' ? 502 : 400;
    return res.status(status).json({ success: false, code: err.code, error: err.message });
  }
  console.error('[APA]', err);
  return res.status(500).json({ success: false, code: 'UNKNOWN', error: err.message });
};

app.post('/api/apa/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required.' });
  }
  try {
    const { deviceRefreshToken, suspended, leagueIds } = await login(String(username), String(password));
    const { member, teams } = await syncTeams(deviceRefreshToken);
    res.json({ success: true, deviceRefreshToken, suspended, leagueIds, member, teams });
  } catch (err) {
    sendError(res, err);
  }
});

app.post('/api/apa/teams', async (req, res) => {
  const { deviceRefreshToken } = req.body || {};
  if (!deviceRefreshToken) return res.status(401).json({ success: false, error: 'Not connected to APA.' });
  try {
    res.json({ success: true, ...(await syncTeams(deviceRefreshToken)) });
  } catch (err) {
    sendError(res, err);
  }
});

app.post('/api/apa/team', async (req, res) => {
  const { deviceRefreshToken, teamId } = req.body || {};
  if (!deviceRefreshToken) return res.status(401).json({ success: false, error: 'Not connected to APA.' });
  if (!teamId) return res.status(400).json({ success: false, error: 'teamId is required.' });
  try {
    res.json({ success: true, ...(await syncTeam(deviceRefreshToken, teamId)) });
  } catch (err) {
    sendError(res, err);
  }
});

app.post('/api/apa/scout', async (req, res) => {
  const { deviceRefreshToken, teamId } = req.body || {};
  if (!deviceRefreshToken) return res.status(401).json({ success: false, error: 'Not connected to APA.' });
  if (!teamId) return res.status(400).json({ success: false, error: 'teamId is required.' });
  try {
    res.json({ success: true, ...(await scoutTeam(deviceRefreshToken, teamId)) });
  } catch (err) {
    sendError(res, err);
  }
});

app.post('/api/apa/achievements', async (req, res) => {
  const { deviceRefreshToken, teamId } = req.body || {};
  if (!deviceRefreshToken) return res.status(401).json({ success: false, error: 'Not connected to APA.' });
  if (!teamId) return res.status(400).json({ success: false, error: 'teamId is required.' });
  try {
    res.json({ success: true, ...(await syncAchievements(deviceRefreshToken, teamId)) });
  } catch (err) {
    sendError(res, err);
  }
});

app.post('/api/apa/lifetime', async (req, res) => {
  const { deviceRefreshToken, teamId, format } = req.body || {};
  if (!deviceRefreshToken) return res.status(401).json({ success: false, error: 'Not connected to APA.' });
  if (!teamId) return res.status(400).json({ success: false, error: 'teamId is required.' });
  try {
    res.json({ success: true, ...(await syncLifetime(deviceRefreshToken, teamId, format)) });
  } catch (err) {
    sendError(res, err);
  }
});

app.post('/api/apa/logout', (_, res) => res.json({ success: true }));
app.get('/api/apa/health', (_, res) => res.json({ ok: true, runtime: 'local-express' }));

app.listen(PORT, () => {
  console.log(`✓ APA local dev proxy → http://localhost:${PORT}`);
});
