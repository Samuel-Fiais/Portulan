import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  output: "standalone",
  serverExternalPackages: ["puppeteer"],
  outputFileTracingIncludes: {
    "/": ["./portulan-skill.md"],
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.md$/i,
      type: "asset/source",
    });
    return config;
  },
};

export default nextConfig;
