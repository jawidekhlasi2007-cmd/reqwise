import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Document parsers run on the server only. Keeping them external means Next.js
  // does not bundle them, which keeps dev compiles fast and memory use low.
  serverExternalPackages: ["mammoth", "unpdf"],
  // ESLint is not installed, to keep the install small. Type errors still fail the build.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
