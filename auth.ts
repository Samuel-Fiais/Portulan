import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { getUserByGitHubId, upsertUserFromGitHub } from "@/lib/users";

type GitHubProfile = {
  id?: string | number;
  login?: string;
  name?: string | null;
  avatar_url?: string;
};

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ profile }) {
      const github = profile as GitHubProfile | undefined;
      if (!github?.id) return false;
      await upsertUserFromGitHub({
        id: github.id,
        login: github.login,
        name: github.name,
        avatar_url: github.avatar_url,
      });
      return true;
    },
    async jwt({ token, profile }) {
      const github = profile as GitHubProfile | undefined;
      if (github?.id) {
        const user = await getUserByGitHubId(String(github.id));
        token.userId = user?.id;
        token.login = github.login ?? user?.login;
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
        if (typeof token.picture === "string") {
          session.user.image = token.picture;
        }
      }
      return session;
    },
  },
});
