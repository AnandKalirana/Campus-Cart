export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function domainOf(email: string): string | null {
  const at = email.lastIndexOf("@");
  return at > 0 && at < email.length - 1 ? email.slice(at + 1) : null;
}

/**
 * True if the email's domain equals an allowed institutional domain or is a true subdomain of it
 * (cs.iitb.ac.in matches iitb.ac.in). "evil-iitb.ac.in" and "iitb.ac.in.evil.com" do not match.
 */
export function emailMatchesDomains(email: string, allowed: readonly string[]): boolean {
  const domain = domainOf(normalizeEmail(email));
  if (!domain) return false;
  return allowed.some(raw => {
    const d = raw.trim().toLowerCase().replace(/^@/, "");
    return d.length > 0 && (domain === d || domain.endsWith("." + d));
  });
}
