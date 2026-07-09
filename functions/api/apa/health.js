export function onRequestGet() {
  return new Response(JSON.stringify({ ok: true, runtime: 'cloudflare-pages-function' }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
