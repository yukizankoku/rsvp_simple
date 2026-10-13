import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The QR logo is read from disk at runtime (src/lib/qr.ts), so ship it with every server function.
  outputFileTracingIncludes: { "/**": ["./src/assets/**"] },
};

export default nextConfig;
