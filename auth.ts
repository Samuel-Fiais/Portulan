import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { resolveDocumentSharesForUser } from "@/lib/db/document-shares";
import { clearGitHubLinkCookie, readGitHubLinkUserId } from "@/lib/github-link-cookie";
import { verifyPassword } from "@/lib/password";
import { accountMethods, getUserByGitHubId, getUserById, getUserByIdentifier, resolveGitHubUser } from "@/lib/users";
import type { PortulanUser } from "@/lib/users";

type GitHubProfile = {
  id?: string | number;
  login?: string;
  name?: string | null;
  avatar_url?: string;
  email?: string | null;
};

function applyUserToToken(
  token: {
    userId?: string;
    login?: string;
    email?: string | null;
    name?: string | null;
    picture?: string | null;
    hasGithub?: boolean;
    hasPassword?: boolean;
  },
  user: PortulanUser,
) {
  token.userId = user.id;
  token.login = user.login;
  token.email = user.email;
  token.name = user.name ?? user.login;
  token.picture = user.avatarUrl ?? undefined;
  const methods = accountMethods(user);
  token.hasGithub = methods.hasGithub;
  token.hasPassword = methods.hasPassword;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    ...authConfig.providers,
    Credentials({
      credentials: {
        identifier: { label: "Usuário ou e-mail" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const identifier = typeof credentials?.identifier === "string" ? credentials.identifier.trim() : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";
        if (!identifier || !password) return null;

        const user = await getUserByIdentifier(identifier);
        if (!user?.passwordHash) return null;
        if (!(await verifyPassword(password, user.passwordHash))) return null;

        await resolveDocumentSharesForUser(user.id, user.email ?? null);

        return {
          id: user.id,
          name: user.name ?? user.login,
          email: user.email,
          image: user.avatarUrl,
          login: user.login,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ account, profile }) {
      if (account?.provider === "credentials") return true;
      if (account?.provider !== "github") return false;

      const github = profile as GitHubProfile | undefined;
      if (!github?.id) return false;

      const linkUserId = await readGitHubLinkUserId();
      const result = await resolveGitHubUser(
        {
          id: github.id,
          login: github.login,
          name: github.name,
          avatar_url: github.avatar_url,
          email: github.email,
        },
        linkUserId,
      );

      if (linkUserId) {
        await clearGitHubLinkCookie();
      }

      if (!result.ok) {
        return linkUserId ? "/?error=github_in_use" : "/login?error=github_in_use";
      }

      await resolveDocumentSharesForUser(result.user.id, result.user.email ?? null);
      return true;
    },
    async jwt({ token, account, user, profile, trigger, session }) {
      if (trigger === "update" && session?.user) {
        if (typeof session.user.login === "string") token.login = session.user.login;
        if (typeof session.user.name === "string") token.name = session.user.name;
        if (typeof session.user.email === "string") token.email = session.user.email;
        if (typeof session.user.image === "string") token.picture = session.user.image;
        if (typeof session.user.hasGithub === "boolean") token.hasGithub = session.user.hasGithub;
        if (typeof session.user.hasPassword === "boolean") token.hasPassword = session.user.hasPassword;
        return token;
      }

      if (account?.provider === "credentials" && user?.id) {
        const dbUser = await getUserById(user.id);
        if (dbUser) applyUserToToken(token, dbUser);
      }

      if (account?.provider === "github") {
        const github = profile as GitHubProfile | undefined;
        if (github?.id) {
          const dbUser = await getUserByGitHubId(String(github.id));
          if (dbUser) applyUserToToken(token, dbUser);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (typeof token.userId === "string") session.user.id = token.userId;
        if (typeof token.login === "string") session.user.login = token.login;
        if (typeof token.email === "string") session.user.email = token.email;
        if (typeof token.name === "string") session.user.name = token.name;
        if (typeof token.picture === "string") session.user.image = token.picture;
        else session.user.image = undefined;
        session.user.hasGithub = Boolean(token.hasGithub);
        session.user.hasPassword = Boolean(token.hasPassword);
      }
      return session;
    },
  },
});
