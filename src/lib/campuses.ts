// Dependency-free on purpose (no React/icons) so the server, the picker and unit tests can all import it.
export const CAMPUSES = ["University of Washington", "IIT Bombay", "TCET Mumbai", "University of Mumbai", "VJTI Mumbai"] as const;
/** Database slug of each campus (prisma/seed.ts). The campus picker stores the slug in a cookie so the server can filter listings. */
export const CAMPUS_SLUG: Record<(typeof CAMPUSES)[number], string> = {
  "University of Washington": "university-of-washington", "IIT Bombay": "iit-bombay", "TCET Mumbai": "tcet-mumbai", "University of Mumbai": "university-of-mumbai", "VJTI Mumbai": "vjti-mumbai",
};
export const DEFAULT_CAMPUS_SLUG = CAMPUS_SLUG[CAMPUSES[0]];
/** Short names used in the slangy copy ("UW EXCLUSIVE"). Keep in sync with CAMPUSES. */
export const CAMPUS_SHORT: Record<(typeof CAMPUSES)[number], string> = {
  "University of Washington": "UW", "IIT Bombay": "IITB", "TCET Mumbai": "TCET", "University of Mumbai": "MU", "VJTI Mumbai": "VJTI",
};
