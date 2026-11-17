// GET /api/health — liveness only: the process is up. No dependencies are touched, nothing internal is revealed.
export function GET() {
  return Response.json({ status: "ok" }, { headers: { "cache-control": "no-store" } });
}
