import type { NextConfig } from "next";

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
