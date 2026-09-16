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
      { source: "/rumos/:id/manobras/:taskId", destination: "/context-packs/:id/tasks/:taskId", permanent: true },
      { source: "/rumos/:id", destination: "/context-packs/:id", permanent: true },
      { source: "/rumos", destination: "/context-packs", permanent: true },
      { source: "/expedicoes/:id", destination: "/projects/:id", permanent: true },
      { source: "/expedicoes", destination: "/projects", permanent: true },
      { source: "/embarcacoes/:id", destination: "/repositories/:id", permanent: true },
      { source: "/embarcacoes", destination: "/repositories", permanent: true },
      { source: "/biblioteca", destination: "/library", permanent: true },
      { source: "/porto", destination: "/workspace", permanent: true },
      { source: "/convite/:token", destination: "/invite/:token", permanent: true },
    ];
  },
};

export default nextConfig;
