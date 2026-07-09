// Shared helpers for the APA Pages Functions routes.
import { ApaError } from './apaClient.js';

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

// Map an ApaError (or unknown error) to an { status, body } pair.
export function errorResponse(err) {
  if (err instanceof ApaError) {
    const status =
      err.code === 'DENIED' || err.code === 'AUTH' ? 401 : err.code === 'NETWORK' ? 502 : 400;
    return json({ success: false, code: err.code, error: err.message }, status);
  }
  return json({ success: false, code: 'UNKNOWN', error: err.message || String(err) }, 500);
}

// Parse a JSON body, throwing a clean error on failure.
export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new ApaError('GQL', 'Invalid JSON request body.');
  }
}
