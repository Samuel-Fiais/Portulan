import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  output: "standalone",
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],
  outputFileTracingIncludes: {
    "/": ["./portulan-skill.md"],
    "/api/documents/[id]/pdf": ["./node_modules/@sparticuz/chromium/**"],
  },
};

export default nextConfig;
