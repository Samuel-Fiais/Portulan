import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  output: "standalone",
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],
  outputFileTracingIncludes: {
    "/": ["./portulan-skill.md"],
    "/api/documents/[id]/pdf": ["./node_modules/@sparticuz/chromium/**"],
  },
  async redirects() {
    return [
      { source: "/biblioteca", destination: "/library", permanent: true },
      { source: "/porto", destination: "/workspace", permanent: true },
      { source: "/convite/:token", destination: "/invite/:token", permanent: true },
    ];
  },
};

export default nextConfig;
