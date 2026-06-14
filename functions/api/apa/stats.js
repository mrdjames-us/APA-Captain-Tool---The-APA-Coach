import { apaGetStats } from '../../_lib/apaScraper.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export async function onRequestGet({ request }) {
  const sessionId = request.headers.get('x-apa-session');
  if (!sessionId) {
    return json({ success: false, error: 'APA session expired. Please reconnect.' }, 401);
  }
  try {
    const stats = await apaGetStats(sessionId);
    return json({ success: true, stats });
  } catch (err) {
    return json({ success: false, error: `Stats fetch failed: ${err.message}` }, 500);
  }
}
