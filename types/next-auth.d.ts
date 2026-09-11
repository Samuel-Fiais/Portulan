import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    login?: string;
  }

  interface Session {
    user: DefaultSession["user"] & {
      id?: string;
      login?: string;
      email?: string | null;
      hasGithub?: boolean;
      hasPassword?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    login?: string;
    email?: string | null;
    hasGithub?: boolean;
    hasPassword?: boolean;
  }
}
