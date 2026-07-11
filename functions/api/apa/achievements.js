// POST /api/apa/achievements  { deviceRefreshToken, teamId }
//   -> { success, teamId, players }
// Trophy Case: best-effort break-and-run / mini-slam / skunk counts per player.
// Isolated from the roster/schedule sync — if this query ever breaks (field
// names captured from a cached-state dump, not verified live), only the
// Trophy Case UI degrades, nothing else in the app.
import { syncAchievements } from '../../_lib/apaClient.js';
import { json, errorResponse, readJson } from '../../_lib/http.js';

export async function onRequestPost({ request }) {
  try {
    const { deviceRefreshToken, teamId } = await readJson(request);
    if (!deviceRefreshToken) {
      return json({ success: false, error: 'Not connected to APA. Please reconnect.' }, 401);
    }
    if (!teamId) return json({ success: false, error: 'teamId is required.' }, 400);
    const result = await syncAchievements(deviceRefreshToken, teamId);
    return json({ success: true, ...result });
  } catch (err) {
    return errorResponse(err);
  }
}
