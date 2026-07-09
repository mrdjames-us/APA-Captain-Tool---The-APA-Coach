// POST /api/apa/login  { username, password }
//   -> { success, deviceRefreshToken, member, teams }
// Exchanges credentials for the durable deviceRefreshToken and returns the
// member's teams in the same call so the UI can render immediately. The client
// stores deviceRefreshToken for future syncs; the raw password is never kept.
import { login, syncTeams } from '../../_lib/apaClient.js';
import { json, errorResponse, readJson } from '../../_lib/http.js';

export async function onRequestPost({ request }) {
  try {
    const { username, password } = await readJson(request);
    if (!username || !password) {
      return json({ success: false, error: 'Email and password are required.' }, 400);
    }
    const { deviceRefreshToken, suspended, leagueIds } = await login(String(username), String(password));
    const { member, teams } = await syncTeams(deviceRefreshToken);
    return json({ success: true, deviceRefreshToken, suspended, leagueIds, member, teams });
  } catch (err) {
    return errorResponse(err);
  }
}
