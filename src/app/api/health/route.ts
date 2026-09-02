export const dynamic = "force-dynamic";

export async function GET() {
  // Option B — local-only: health is always ok, no DB required
  return Response.json({ ok: true, mode: "local", timestamp: new Date().toISOString() });
}
