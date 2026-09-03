import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { resolveDocumentSharesForUser } from "@/lib/db/document-shares";
import { getUserByGitHubId, upsertUserFromGitHub } from "@/lib/users";

type GitHubProfile = {
  id?: string | number;
  login?: string;
  name?: string | null;
  avatar_url?: string;
  email?: string | null;
};

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ profile }) {
      const github = profile as GitHubProfile | undefined;
      if (!github?.id) return false;
      const user = await upsertUserFromGitHub({
        id: github.id,
        login: github.login,
        name: github.name,
        avatar_url: github.avatar_url,
        email: github.email,
      });
      await resolveDocumentSharesForUser(user.id, user.email ?? null);
      return true;
    },
    async jwt({ token, profile }) {
      const github = profile as GitHubProfile | undefined;
      if (github?.id) {
        const user = await getUserByGitHubId(String(github.id));
        token.userId = user?.id;
        token.login = github.login ?? user?.login;
        token.email = user?.email ?? github.email ?? null;
        if (github.avatar_url) {
          token.picture = github.avatar_url;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (typeof token.userId === "string") {
          session.user.id = token.userId;
        }
        if (typeof token.login === "string") {
          session.user.login = token.login;
        }
        if (typeof token.email === "string") {
          session.user.email = token.email;
        }
        if (typeof token.picture === "string") {
          session.user.image = token.picture;
        }
      }
      return session;
    },
  },
});
