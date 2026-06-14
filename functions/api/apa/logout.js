// Sessions are stateless (the client holds the opaque cookie token), so there
// is nothing to invalidate server-side. The client discards its token; we just
// acknowledge.
export function onRequestPost() {
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
