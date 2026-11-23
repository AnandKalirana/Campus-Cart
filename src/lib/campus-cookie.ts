/** Shared by the client picker and the server: the cookie that carries the visitor's chosen campus (a slug). */
export const CAMPUS_COOKIE = "cc_campus";

const SLUG = /^[a-z0-9-]{1,60}$/;

/**
 * The campus slug to filter by. Priority: explicit ?campus= in the URL, then the saved cookie, then the default.
 * "all" in the URL means the visitor deliberately chose every campus. Pure so it can be unit tested.
 * Returns undefined for "show every campus".
 */
export function effectiveCampus(urlCampus: string | undefined, cookieValue: string | undefined, known: readonly string[], fallback: string): string | undefined {
  if (urlCampus === "all") return undefined;
  const valid = (v: string | undefined): v is string => !!v && SLUG.test(v) && known.includes(v);
  if (valid(urlCampus)) return urlCampus;
  if (valid(cookieValue)) return cookieValue;
  return known.includes(fallback) ? fallback : undefined;
}
