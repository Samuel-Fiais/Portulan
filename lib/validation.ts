import { z } from "zod";
import { documentStatuses } from "@/lib/documents";
import {
  documentVisibilities,
  workspaceInviteRoles,
  workspaceRoles,
  WORKSPACE_NAME_MAX,
  WORKSPACE_NAME_MIN,
} from "@/lib/workspaces";
export const documentInputSchema = z.object({
  title: z.string().trim().min(3).max(180),
  summary: z.string().trim().max(500).default(""),
  templateId: z.string().trim().min(1).max(80),
  status: z.enum(documentStatuses).default("draft"),
  author: z.string().trim().max(100).default(""),
  team: z.string().trim().max(100).default(""),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  content: z.string().max(250_000).default(""),
});

export const documentUpdateSchema = documentInputSchema.partial();

export const templateInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  primaryColor: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/),
  secondaryColor: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/),
  logoUrl: z
    .union([
      z.string().trim().url().max(2048),
      z.string().trim().regex(/^\/api\/blob\/asset\?pathname=/).max(2048),
      z.literal(""),
      z.null(),
    ])
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      if (value === "" || value === null) return null;
      return value;
    }),
  content: z.string().max(250_000).default(""),
});

export const mcpTokenExpirationPresets = ["30d", "60d", "1y", "never"] as const;

export type McpTokenExpirationPreset = (typeof mcpTokenExpirationPresets)[number];

export const DEFAULT_MCP_TOKEN_EXPIRATION: McpTokenExpirationPreset = "60d";

export function mcpTokenExpiresAtFromPreset(
  preset: McpTokenExpirationPreset,
  now = new Date(),
): string | null {
  if (preset === "never") return null;

  const expires = new Date(now);
  if (preset === "30d") expires.setDate(expires.getDate() + 30);
  else if (preset === "60d") expires.setDate(expires.getDate() + 60);
  else expires.setFullYear(expires.getFullYear() + 1);

  return expires.toISOString();
}

export const mcpTokenInputSchema = z.object({
  name: z.string().trim().min(1).max(80).default("Token MCP"),
  expiration: z.enum(mcpTokenExpirationPresets).default(DEFAULT_MCP_TOKEN_EXPIRATION),
});

export const documentShareRoleSchema = z.enum(["viewer", "editor"]);

export const documentShareInputSchema = z.object({
  email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
  role: documentShareRoleSchema.default("viewer"),
});

export const documentShareUpdateSchema = z.object({
  role: documentShareRoleSchema,
});

export const documentCommentInputSchema = z.object({
  body: z.string().trim().min(1).max(2_000),
  sectionAnchor: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .optional()
    .nullable()
    .transform((value) => value ?? null),
  quotedText: z
    .string()
    .trim()
    .max(280)
    .optional()
    .nullable()
    .transform((value) => value ?? null),
  parentId: z
    .string()
    .uuid()
    .optional()
    .nullable()
    .transform((value) => value ?? null),
});

export const documentCommentResolveInputSchema = z.object({
  resolved: z.boolean(),
});

export const workspaceNameSchema = z.string().trim().min(WORKSPACE_NAME_MIN).max(WORKSPACE_NAME_MAX);

export const workspaceInputSchema = z.object({
  name: workspaceNameSchema,
});

export const workspaceIdentitySchema = z.object({
  name: workspaceNameSchema.optional(),
});

export const workspaceRoleSchema = z.enum(workspaceRoles);

export const workspaceInviteRoleSchema = z.enum(workspaceInviteRoles);

export const workspaceInviteInputSchema = z.object({
  role: workspaceInviteRoleSchema.default("member"),
  expiration: z.enum(["1d", "7d", "30d", "never"]).default("7d"),
  maxUses: z.number().int().min(1).max(500).nullable().default(null),
});

export function workspaceInviteExpiresAt(
  preset: "1d" | "7d" | "30d" | "never",
  now = new Date(),
): string | null {
  if (preset === "never") return null;
  const expires = new Date(now);
  if (preset === "1d") expires.setDate(expires.getDate() + 1);
  else if (preset === "7d") expires.setDate(expires.getDate() + 7);
  else expires.setDate(expires.getDate() + 30);
  return expires.toISOString();
}

export const documentVisibilitySchema = z.enum(documentVisibilities);

export const accountHandleSchema = z
  .string()
  .trim()
  .min(3)
  .max(30)
  .regex(/^[a-zA-Z0-9](?:[a-zA-Z0-9._-]*[a-zA-Z0-9])?$/)
  .transform((value) => value.toLowerCase());

export const accountPasswordSchema = z.string().min(8).max(128);

export const accountRegisterSchema = z.object({
  name: z.string().trim().min(2).max(100),
  login: accountHandleSchema,
  email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
  password: accountPasswordSchema,
});

export const accountProfileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  login: accountHandleSchema,
});

export const accountSetPasswordSchema = z.object({
  currentPassword: z.string().max(128).optional(),
  password: accountPasswordSchema,
});

