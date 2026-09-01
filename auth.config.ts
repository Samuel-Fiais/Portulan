import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import { isProtectedApiPath, isPublicAppPath } from "@/lib/auth-routes";

export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const pathname = nextUrl.pathname;
      if (isPublicAppPath(pathname)) return true;

      const isLoggedIn = Boolean(auth?.user);
      if (isLoggedIn) return true;

      if (isProtectedApiPath(pathname)) {
        return Response.json({ error: "Não autorizado" }, { status: 401 });
      }

      return false;
    },
  },
} satisfies NextAuthConfig;
