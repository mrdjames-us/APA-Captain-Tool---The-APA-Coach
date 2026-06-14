import { apaLogin } from '../../_lib/apaScraper.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export async function onRequestPost({ request }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: 'Invalid request body.' }, 400);
  }

  const { memberId, password } = body || {};
  if (!memberId || !password) {
    return json({ success: false, error: 'Member ID and password are required.' }, 400);
  }

  try {
    const result = await apaLogin(String(memberId), String(password));
    return json(result, result.success ? 200 : 401);
  } catch (err) {
    return json(
      { success: false, error: `Connection error reaching poolplayers.com: ${err.message}` },
      502
    );
  }
}
