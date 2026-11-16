import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { parseDomains, slugify } from "@/lib/validation/admin";

/**
 * Every function here re-checks that the caller is an active ADMIN in the database (not just in the session or the page),
 * so a mistake in a route or page cannot expose an admin operation. Every state change writes an AuditLog row in the same transaction.
 */
export interface AdminActor { id: string }
export type Res<T = object> = ({ ok: true } & T) | { ok: false; code: "forbidden" | "not_found" | "conflict" | "invalid"; message: string };
const fail = (code: "forbidden" | "not_found" | "conflict" | "invalid", message: string) => ({ ok: false as const, code, message });
export const PAGE = 25;

async function isAdmin(id: string) {
  const u = await db().user.findUnique({ where: { id }, select: { role: true, status: true } });
  return !!u && u.role === "ADMIN" && u.status === "ACTIVE";
}
const FORBIDDEN = fail("forbidden", "Admin access required.");

type Tx = Prisma.TransactionClient;
const audit = (tx: Tx, actorId: string, action: string, targetType: string, targetId: string, detail?: string) =>
  tx.auditLog.create({ data: { actorId, action, targetType, targetId, detail: detail?.slice(0, 500) } });
const notify = (tx: Tx, userId: string, title: string, href?: string) =>
  tx.notification.create({ data: { userId, kind: "moderation", title: title.slice(0, 120), href } });

// ---------- Overview ----------
export async function overview(a: AdminActor) {
  if (!(await isAdmin(a.id))) return null;
  const [openReports, activeListings, users, suspended, campuses] = await Promise.all([
    db().report.count({ where: { status: "OPEN" } }),
    db().product.count({ where: { status: "ACTIVE" } }),
    db().user.count(),
    db().user.count({ where: { status: "SUSPENDED" } }),
    db().university.count({ where: { isActive: true } }),
  ]);
  return { openReports, activeListings, users, suspended, campuses };
}

// ---------- Reports ----------
export async function listReports(a: AdminActor, status: "OPEN" | "DISMISSED" | "ACTIONED", page: number) {
  if (!(await isAdmin(a.id))) return null;
  const where = { status };
  const [total, rows] = await Promise.all([
    db().report.count({ where }),
    db().report.findMany({
      where, orderBy: { createdAt: status === "OPEN" ? "asc" : "desc" }, skip: (page - 1) * PAGE, take: PAGE,
      select: {
        id: true, reason: true, status: true, createdAt: true, resolvedAt: true,
        reporter: { select: { name: true } }, resolvedBy: { select: { name: true } },
        product: { select: { id: true, title: true, status: true, seller: { select: { id: true, name: true, status: true } }, _count: { select: { reports: true } } } },
      },
    }),
  ]);
  return { total, rows };
}

export async function resolveReport(a: AdminActor, reportId: string, decision: "dismiss" | "remove_listing", reason?: string): Promise<Res> {
  if (!(await isAdmin(a.id))) return FORBIDDEN;
  if (decision === "remove_listing" && !reason) return fail("invalid", "A reason is required to remove a listing.");
  const report = await db().report.findUnique({ where: { id: reportId }, select: { id: true, status: true, productId: true, product: { select: { title: true, sellerId: true, status: true } } } });
  if (!report) return fail("not_found", "Report not found.");
  if (report.status !== "OPEN") return fail("conflict", "This report has already been handled.");
  await db().$transaction(async tx => {
    if (decision === "dismiss") {
      await tx.report.update({ where: { id: reportId }, data: { status: "DISMISSED", resolvedById: a.id, resolvedAt: new Date() } });
      await audit(tx, a.id, "report.dismiss", "report", reportId, reason);
      return;
    }
    await removeListingTx(tx, a.id, report.productId, report.product.sellerId, report.product.title, reason!);
    // Every open report about this listing is now handled.
    await tx.report.updateMany({ where: { productId: report.productId, status: "OPEN" }, data: { status: "ACTIONED", resolvedById: a.id, resolvedAt: new Date() } });
    await audit(tx, a.id, "report.action", "report", reportId, reason);
  });
  return { ok: true };
}

// ---------- Listings ----------
async function removeListingTx(tx: Tx, adminId: string, productId: string, sellerId: string, title: string, reason: string) {
  await tx.product.update({ where: { id: productId }, data: { status: "REMOVED" } });
  // Offers on a removed listing can't be completed.
  await tx.purchaseRequest.updateMany({ where: { productId, status: { in: ["PENDING", "ACCEPTED"] } }, data: { status: "CANCELLED" } });
  await audit(tx, adminId, "listing.remove", "listing", productId, reason);
  await notify(tx, sellerId, `Your listing "${title}" was removed by a moderator.`, "/dashboard/listings");
}

export async function listListings(a: AdminActor, q: string | undefined, status: string | undefined, page: number) {
  if (!(await isAdmin(a.id))) return null;
  const where: Prisma.ProductWhereInput = {
    ...(status && ["ACTIVE", "PAUSED", "SOLD", "REMOVED"].includes(status) ? { status: status as "ACTIVE" } : {}),
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { seller: { name: { contains: q, mode: "insensitive" } } }, { seller: { email: { contains: q, mode: "insensitive" } } }] } : {}),
  };
  const [total, rows] = await Promise.all([
    db().product.count({ where }),
    db().product.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE,
      select: { id: true, title: true, price: true, status: true, createdAt: true, seller: { select: { id: true, name: true, email: true, status: true } }, _count: { select: { reports: { where: { status: "OPEN" } } } } } }),
  ]);
  return { total, rows };
}

export async function moderateListing(a: AdminActor, productId: string, decision: "remove" | "restore", reason: string): Promise<Res> {
  if (!(await isAdmin(a.id))) return FORBIDDEN;
  const p = await db().product.findUnique({ where: { id: productId }, select: { id: true, title: true, status: true, sellerId: true } });
  if (!p) return fail("not_found", "Listing not found.");
  if (decision === "remove") {
    if (p.status === "REMOVED") return fail("conflict", "Already removed.");
    await db().$transaction(tx => removeListingTx(tx, a.id, p.id, p.sellerId, p.title, reason));
  } else {
    if (p.status !== "REMOVED") return fail("conflict", "Only removed listings can be restored.");
    // Restored as PAUSED: the owner decides when to publish again.
    await db().$transaction(async tx => {
      await tx.product.update({ where: { id: p.id }, data: { status: "PAUSED" } });
      await audit(tx, a.id, "listing.restore", "listing", p.id, reason);
      await notify(tx, p.sellerId, `Your listing "${p.title}" was restored. It is paused until you publish it.`, "/dashboard/listings");
    });
  }
  return { ok: true };
}

// ---------- Users ----------
export async function listUsers(a: AdminActor, q: string | undefined, status: string | undefined, page: number) {
  if (!(await isAdmin(a.id))) return null;
  const where: Prisma.UserWhereInput = {
    ...(status === "SUSPENDED" || status === "ACTIVE" ? { status } : {}),
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const [total, rows] = await Promise.all([
    db().user.count({ where }),
    db().user.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE,
      select: { id: true, name: true, email: true, role: true, status: true, emailVerified: true, createdAt: true, university: { select: { name: true } }, _count: { select: { products: true } } } }),
  ]);
  return { total, rows };
}

export async function moderateUser(a: AdminActor, userId: string, decision: "suspend" | "reinstate", reason: string): Promise<Res> {
  if (!(await isAdmin(a.id))) return FORBIDDEN;
  if (userId === a.id) return fail("invalid", "You can't change your own account status.");
  const u = await db().user.findUnique({ where: { id: userId }, select: { id: true, role: true, status: true } });
  if (!u) return fail("not_found", "User not found.");
  if (u.role === "ADMIN") return fail("forbidden", "Admin accounts can't be suspended here.");
  if (decision === "suspend") {
    if (u.status === "SUSPENDED") return fail("conflict", "Already suspended.");
    await db().$transaction(async tx => {
      // sessionVersion bump signs out every active session; getCurrentUser also rejects SUSPENDED on each request.
      await tx.user.update({ where: { id: u.id }, data: { status: "SUSPENDED", sessionVersion: { increment: 1 } } });
      await tx.purchaseRequest.updateMany({ where: { status: "PENDING", OR: [{ buyerId: u.id }, { product: { sellerId: u.id } }] }, data: { status: "CANCELLED" } });
      await audit(tx, a.id, "user.suspend", "user", u.id, reason);
    });
  } else {
    if (u.status !== "SUSPENDED") return fail("conflict", "Account is not suspended.");
    await db().$transaction(async tx => {
      await tx.user.update({ where: { id: u.id }, data: { status: "ACTIVE" } });
      await audit(tx, a.id, "user.reinstate", "user", u.id, reason);
    });
  }
  return { ok: true };
}

// ---------- Campuses ----------
export async function listCampuses(a: AdminActor) {
  if (!(await isAdmin(a.id))) return null;
  return db().university.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, city: true, emailDomains: true, isActive: true, _count: { select: { users: true, products: true } } } });
}

const overlaps = (x: string, y: string) => x === y || x.endsWith("." + y) || y.endsWith("." + x);

async function domainConflict(domains: string[], exceptId?: string): Promise<string | null> {
  const others = await db().university.findMany({ where: exceptId ? { NOT: { id: exceptId } } : {}, select: { name: true, emailDomains: true } });
  for (const d of domains) for (const o of others) for (const od of o.emailDomains) if (overlaps(d, od)) return `${d} overlaps ${od}, which belongs to ${o.name}.`;
  return null;
}

export interface CampusInput { name: string; city?: string; domains: string; isActive: boolean }

export async function saveCampus(a: AdminActor, id: string | null, input: CampusInput): Promise<Res<{ id: string }>> {
  if (!(await isAdmin(a.id))) return FORBIDDEN;
  const parsed = parseDomains(input.domains);
  if (!parsed.ok) return fail("invalid", parsed.message);
  if (input.isActive && parsed.domains.length === 0) return fail("invalid", "An active campus needs at least one email domain, or nobody can register for it.");
  const clash = await domainConflict(parsed.domains, id ?? undefined);
  if (clash) return fail("conflict", clash);
  const data = { name: input.name, city: input.city || null, emailDomains: parsed.domains, isActive: input.isActive };
  try {
    const saved = await db().$transaction(async tx => {
      if (id) {
        const before = await tx.university.findUnique({ where: { id }, select: { emailDomains: true, isActive: true, name: true } });
        if (!before) return null;
        const row = await tx.university.update({ where: { id }, data });
        await audit(tx, a.id, "campus.update", "campus", id, `domains: [${before.emailDomains.join(", ")}] -> [${parsed.domains.join(", ")}]; active ${before.isActive} -> ${input.isActive}`);
        return row;
      }
      const row = await tx.university.create({ data: { ...data, slug: slugify(input.name) || `campus-${Date.now().toString(36)}` } });
      await audit(tx, a.id, "campus.create", "campus", row.id, `domains: [${parsed.domains.join(", ")}]`);
      return row;
    });
    if (!saved) return fail("not_found", "Campus not found.");
    return { ok: true, id: saved.id };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return fail("conflict", "A campus with that name already exists.");
    throw e;
  }
}

// ---------- Audit ----------
export async function listAudit(a: AdminActor, page: number) {
  if (!(await isAdmin(a.id))) return null;
  const [total, rows] = await Promise.all([
    db().auditLog.count(),
    db().auditLog.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE, select: { id: true, action: true, targetType: true, targetId: true, detail: true, createdAt: true, actor: { select: { name: true } } } }),
  ]);
  return { total, rows };
}
