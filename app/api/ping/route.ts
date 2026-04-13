/**
 * Lightweight public liveness endpoint.
 * Use /api/health for authenticated dependency probes.
 */
export async function GET() {
  const pong = Date.now();
  const timestamp = new Date().toISOString();

  // Using a plain Response to ensure status code is respected
  return new Response(
    JSON.stringify({
      ok: true,
      pong,
      timestamp,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    }
  );
}
