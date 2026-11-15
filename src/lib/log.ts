import "server-only";
import { randomUUID } from "node:crypto";

/** Structured one-line JSON logs. Callers pass ids and codes only: never tokens, cookies, passwords or free text from users. */
export function log(level: "info" | "warn" | "error", event: string, fields: Record<string, string | number | boolean | undefined> = {}) {
  const line = JSON.stringify({ t: new Date().toISOString(), level, event, ...fields });
  (level === "error" ? console.error : level === "warn" ? console.warn : console.info)(line);
}
export const requestId = () => randomUUID();
