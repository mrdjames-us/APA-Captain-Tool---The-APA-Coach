// POST /api/apa/teams  { deviceRefreshToken }
//   -> { success, member, teams }
// Re-fetches the member's teams using a stored deviceRefreshToken (no password).
import { syncTeams } from '../../_lib/apaClient.js';
import { json, errorResponse, readJson } from '../../_lib/http.js';

export async function onRequestPost({ request }) {
  try {
    const { deviceRefreshToken } = await readJson(request);
    if (!deviceRefreshToken) {
      return json({ success: false, error: 'Not connected to APA. Please reconnect.' }, 401);
    }
    const { member, teams } = await syncTeams(deviceRefreshToken);
    return json({ success: true, member, teams });
  } catch (err) {
    return errorResponse(err);
  }
}
