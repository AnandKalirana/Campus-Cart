import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// Content-Security-Policy. Next.js injects small inline bootstrap scripts, so script-src needs 'unsafe-inline'
// (a per-request nonce would force every page to render dynamically and defeat cacheComponents). Everything else is locked down:
// no plugins, no framing, no foreign form targets. The ONLY third-party origin is Cloudflare Turnstile (challenges.cloudflare.com), needed for the bot check on login and signup. 'unsafe-eval' is only added in development (React refresh).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self' https://challenges.cloudflare.com",
  "frame-src https://challenges.cloudflare.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isProd ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      // Pages only: API routes set their own headers (e.g. /api/images uses a sandboxing CSP and nosniff).
      { source: "/((?!api/).*)", headers: securityHeaders },
      // Private areas must never be indexed, whatever robots.txt says.
      ...["/admin/:path*", "/dashboard/:path*", "/messages/:path*", "/profile/:path*", "/wishlist/:path*", "/sell/:path*"].map(source => ({
        source, headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      })),
    ];
  },
  images: {
    // Listing photos are already re-encoded to WebP (max 1600px) by our upload pipeline and are served from /api/images,
    // which needs the visitor's session for non-public listings. The optimizer fetches without cookies, so skip it.
    unoptimized: true,
    // Demo stand-in art is SVG served from /public. Sandboxed so scripts can't run.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
