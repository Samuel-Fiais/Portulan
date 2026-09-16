// MCP and CLI requests carry their own Bearer credentials and validate them in
// their Route Handlers. Let them reach those checks without requiring a browser
// session at the NextAuth proxy.
const PUBLIC_PATH_PREFIXES = ["/p/", "/d/", "/api/auth", "/api/mcp", "/api/cli", "/api/brand/"] as const;

export function isPublicAppPath(pathname: string) {
  if (pathname === "/login") return true;
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function isProtectedApiPath(pathname: string) {
  return pathname.startsWith("/api/") && !isPublicAppPath(pathname);
}
