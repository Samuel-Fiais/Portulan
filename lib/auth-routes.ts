const PUBLIC_PATH_PREFIXES = ["/p/", "/api/auth", "/api/mcp", "/api/brand/"] as const;

export function isPublicAppPath(pathname: string) {
  if (pathname === "/login") return true;
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function isProtectedApiPath(pathname: string) {
  return pathname.startsWith("/api/") && !isPublicAppPath(pathname);
}
