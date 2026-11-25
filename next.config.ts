import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    const noIndex = { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" };
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Embedded players (YouTube in particular) need the origin as referrer.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      // Private areas are never indexed. /admin is deliberately absent from robots.txt
      // so that its existence is not advertised.
      { source: "/admin/:path*", headers: [noIndex] },
      { source: "/admin", headers: [noIndex] },
      { source: "/portal/:path*", headers: [noIndex] },
      { source: "/portal", headers: [noIndex] },
      { source: "/api/:path*", headers: [noIndex] },
    ];
  },
};

export default nextConfig;
