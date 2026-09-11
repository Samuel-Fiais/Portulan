import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const GITHUB_LINK_COOKIE = "portulan_link_github";
const TTL_MS = 10 * 60 * 1000;

function authSecret() {
  const value = process.env.AUTH_SECRET;
  if (!value) {
    throw new Error("AUTH_SECRET is required");
  }
  return value;
}

function signPayload(payload: string) {
  return createHmac("sha256", authSecret()).update(payload).digest("hex");
}

export function createGitHubLinkToken(userId: string) {
  const exp = Date.now() + TTL_MS;
  const payload = `${userId}.${exp}`;
  return `${payload}.${signPayload(payload)}`;
}

export function parseGitHubLinkToken(token: string | undefined): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, exp, sig] = parts;
  if (!userId || !exp || !sig) return null;
  if (Number(exp) <= Date.now()) return null;

  const expected = signPayload(`${userId}.${exp}`);
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  return userId;
}

export async function setGitHubLinkCookie(userId: string) {
  const jar = await cookies();
  jar.set(GITHUB_LINK_COOKIE, createGitHubLinkToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TTL_MS / 1000,
  });
}

export async function readGitHubLinkUserId() {
  const jar = await cookies();
  return parseGitHubLinkToken(jar.get(GITHUB_LINK_COOKIE)?.value);
}

export async function clearGitHubLinkCookie() {
  const jar = await cookies();
  jar.delete(GITHUB_LINK_COOKIE);
}
