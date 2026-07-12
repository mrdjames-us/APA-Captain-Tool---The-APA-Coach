// POST /api/apa/lifetime  { deviceRefreshToken, teamId, format }
//   -> { success, teamId, format, players: [{ memberNumber, matchesPlayed }] }
// Lifetime match counts per roster member, for the APA "10 lifetime matches"
// eligibility rule. Isolated from roster/schedule sync — the underlying query
// is unverified against live traffic, so if it breaks only the Vegas lifetime
// meter degrades, nothing else.
import { syncLifetime } from '../../_lib/apaClient.js';
import { json, errorResponse, readJson } from '../../_lib/http.js';

export async function onRequestPost({ request }) {
  try {
    const { deviceRefreshToken, teamId, format } = await readJson(request);
    if (!deviceRefreshToken) {
      return json({ success: false, error: 'Not connected to APA. Please reconnect.' }, 401);
    }
    if (!teamId) return json({ success: false, error: 'teamId is required.' }, 400);
    const result = await syncLifetime(deviceRefreshToken, teamId, format);
    return json({ success: true, ...result });
  } catch (err) {
    return errorResponse(err);
  }
}
