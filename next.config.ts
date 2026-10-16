import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The QR logo is read from disk at runtime (src/lib/qr.ts), so ship it with every server function.
  outputFileTracingIncludes: { "/**": ["./src/assets/**"] },
  // Room for the Excel file of the guest import (default 1 MB). Vercel caps request bodies at 4.5 MB.
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
};

export default nextConfig;
