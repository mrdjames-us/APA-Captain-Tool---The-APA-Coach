// POST /api/apa/scout  { deviceRefreshToken, teamId }
//   -> { success, page, roster }
// Opponent scouting: pulls ANY team's roster + metadata by id. The same
// teamRoster query works for opposing teams, so this exposes their players'
// skill levels and win rates for match-night planning.
import { scoutTeam } from '../../_lib/apaClient.js';
import { json, errorResponse, readJson } from '../../_lib/http.js';

export async function onRequestPost({ request }) {
  try {
    const { deviceRefreshToken, teamId } = await readJson(request);
    if (!deviceRefreshToken) {
      return json({ success: false, error: 'Not connected to APA. Please reconnect.' }, 401);
    }
    if (!teamId) return json({ success: false, error: 'teamId is required.' }, 400);
    const result = await scoutTeam(deviceRefreshToken, teamId);
    return json({ success: true, ...result });
  } catch (err) {
    return errorResponse(err);
  }
}
