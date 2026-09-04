import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  output: "standalone",
  serverExternalPackages: ["puppeteer"],
  outputFileTracingIncludes: {
    "/": ["./portulan-skill.md"],
  },
};

export default nextConfig;
