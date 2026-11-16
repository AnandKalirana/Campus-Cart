import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

export type ReportResult = { ok: true } | { ok: false; code: "not_found" | "forbidden" | "conflict"; message: string };

/** A student reports a publicly visible listing that isn't theirs. One report per user per listing (DB-enforced). */
export async function createReport(reporterId: string, productId: string, reason: string): Promise<ReportResult> {
  const p = await db().product.findFirst({ where: { id: productId, status: { in: ["ACTIVE", "SOLD"] }, seller: { status: "ACTIVE" } }, select: { sellerId: true } });
  if (!p) return { ok: false, code: "not_found", message: "Listing not found." };
  if (p.sellerId === reporterId) return { ok: false, code: "forbidden", message: "You can't report your own listing." };
  try {
    await db().report.create({ data: { productId, reporterId, reason: reason.trim() } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { ok: false, code: "conflict", message: "You've already reported this listing. Our team will review it." };
    throw e;
  }
  return { ok: true };
}
