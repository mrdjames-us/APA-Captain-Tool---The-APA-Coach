// Auth is stateless server-side: the client holds the deviceRefreshToken and
// simply discards it on disconnect. (A future improvement is to call the
// `revokeToken` mutation here to invalidate it upstream too.) We just acknowledge.
export function onRequestPost() {
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
