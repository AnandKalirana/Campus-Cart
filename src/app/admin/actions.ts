"use server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { adminActionLimiter } from "@/lib/request-guards";
import { fieldErrors } from "@/lib/auth/actions-helpers";
import { campusSchema, listingModerationSchema, resolveReportSchema, userModerationSchema } from "@/lib/validation/admin";
import { idSchema } from "@/lib/validation/listing";
import { moderateListing, moderateUser, resolveReport, saveCampus } from "@/services/admin-service";
import { log } from "@/lib/log";

// Only async server actions may be exported from this file (each export becomes a public endpoint).
// Each one: session role check -> rate limit -> Zod -> service (which re-checks admin in the DB and writes the audit log).
export type AdminState = { ok?: boolean; message?: string; errors?: Record<string, string>; values?: Record<string, string> } | undefined;

const NOT_ALLOWED: AdminState = { message: "You don't have permission to do that." };
const BUSY: AdminState = { message: "Too many actions. Wait a moment and try again." };
const GENERIC: AdminState = { message: "That didn't work. Please try again." };

async function gate() {
  const u = await getCurrentUser();
  if (!u || u.role !== "ADMIN") return null;
  return adminActionLimiter.check(u.id).ok ? u : "busy" as const;
}
const form = (fd: FormData) => Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string"));

async function run(fd: FormData, parse: (raw: Record<string, unknown>) => { success: true; data: unknown } | { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } }, exec: (adminId: string, data: never) => Promise<{ ok: boolean; message?: string }>, event: string): Promise<AdminState> {
  const g = await gate();
  if (!g) return NOT_ALLOWED;
  if (g === "busy") return BUSY;
  const p = parse(form(fd));
  if (!p.success) return { errors: fieldErrors(p.error.issues), message: Object.values(fieldErrors(p.error.issues))[0] };
  try {
    const r = await exec(g.id, p.data as never);
    if (!r.ok) return { message: r.message };
    revalidatePath("/admin", "layout");
    return { ok: true, message: "Done." };
  } catch (e) {
    log("error", event, { adminId: g.id, name: e instanceof Error ? e.name : "unknown" });
    return GENERIC;
  }
}

export async function resolveReportAction(_p: AdminState, fd: FormData): Promise<AdminState> {
  return run(fd, r => resolveReportSchema.safeParse(r), (id, d: { reportId: string; decision: "dismiss" | "remove_listing"; reason?: string }) => resolveReport({ id }, d.reportId, d.decision, d.reason), "admin_report_failed");
}
export async function moderateListingAction(_p: AdminState, fd: FormData): Promise<AdminState> {
  return run(fd, r => listingModerationSchema.safeParse(r), (id, d: { productId: string; decision: "remove" | "restore"; reason: string }) => moderateListing({ id }, d.productId, d.decision, d.reason), "admin_listing_failed");
}
export async function moderateUserAction(_p: AdminState, fd: FormData): Promise<AdminState> {
  return run(fd, r => userModerationSchema.safeParse(r), (id, d: { userId: string; decision: "suspend" | "reinstate"; reason: string }) => moderateUser({ id }, d.userId, d.decision, d.reason), "admin_user_failed");
}
export async function saveCampusAction(_p: AdminState, fd: FormData): Promise<AdminState> {
  const raw = form(fd);
  const idRaw = String(raw.id ?? "");
  if (idRaw && !idSchema.safeParse(idRaw).success) return GENERIC;
  const input = { name: raw.name, city: raw.city ?? "", domains: raw.domains ?? "", isActive: raw.isActive === "on" };
  const res = await run(fd, () => campusSchema.safeParse(input), async (adminId, d: { name: string; city?: string; domains: string; isActive: boolean }) => {
    const r = await saveCampus({ id: adminId }, idRaw || null, d);
    return r.ok ? { ok: true } : { ok: false, message: r.message };
  }, "admin_campus_failed");
  // React resets uncontrolled fields after every action; echo what was typed back on failure so nothing is lost.
  return res?.ok ? res : { ...res, values: { name: String(raw.name ?? ""), city: String(raw.city ?? ""), domains: String(raw.domains ?? ""), isActive: raw.isActive === "on" ? "on" : "" } };
}
