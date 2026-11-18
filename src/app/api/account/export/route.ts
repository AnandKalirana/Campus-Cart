import { NextResponse } from "next/server";
import { guardRead, serverError } from "@/lib/api-route";
import { accountExportLimiter } from "@/lib/request-guards";
import { exportAccountData } from "@/services/account-service";
import { log } from "@/lib/log";

// GET /api/account/export — the signed-in user's own data as a JSON download. 3 / hour / user.
// Auth: session. Authorization: the id comes from the session only; there is no id parameter to tamper with.
export async function GET(req: Request) {
  const g = await guardRead(req, accountExportLimiter);
  if (!g.ok) return g.res;
  try {
    const data = await exportAccountData(g.user.id);
    if (!data) return g.ctx.json({ ok: false, code: "not_found", message: "Account not found." }, 404);
    log("info", "account_exported", { rid: g.ctx.rid, uid: g.user.id });
    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="campus-cart-export-${data.exportedAt.slice(0, 10)}.json"`,
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
        "x-request-id": g.ctx.rid,
      },
    });
  } catch (e) { return serverError(g.ctx, "account_export_failed", e); }
}
