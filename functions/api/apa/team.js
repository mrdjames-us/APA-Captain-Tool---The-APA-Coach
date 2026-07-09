// POST /api/apa/team  { deviceRefreshToken, teamId }
//   -> { success, page, roster, schedule }
// Full pull for one of the member's own teams: metadata, roster (with skill
// levels), and schedule/results.
import { syncTeam } from '../../_lib/apaClient.js';
import { json, errorResponse, readJson } from '../../_lib/http.js';

export async function onRequestPost({ request }) {
  try {
    const { deviceRefreshToken, teamId } = await readJson(request);
    if (!deviceRefreshToken) {
      return json({ success: false, error: 'Not connected to APA. Please reconnect.' }, 401);
    }
    if (!teamId) return json({ success: false, error: 'teamId is required.' }, 400);
    const result = await syncTeam(deviceRefreshToken, teamId);
    return json({ success: true, ...result });
  } catch (err) {
    return errorResponse(err);
  }
}
