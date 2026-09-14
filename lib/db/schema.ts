import { boolean, foreignKey, index, integer, pgSchema, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

export const PORTULAN_PG_SCHEMA = "portulan";

export const portulanSchema = pgSchema(PORTULAN_PG_SCHEMA);

export const users = portulanSchema.table("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  githubId: text("github_id").unique(),
  login: text("login").notNull(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  email: text("email"),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

export const workspaces = portulanSchema.table(
  "workspaces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    themePaper: text("theme_paper").notNull().default("carta"),
    themeMode: text("theme_mode").notNull().default("light"),
    themeInk: text("theme_ink").notNull().default("#1a2847"),
    isPersonal: boolean("is_personal").notNull().default(false),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [index("idx_workspaces_created_by").on(table.createdBy)],
);

export const workspaceMembers = portulanSchema.table(
  "workspace_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    unique("workspace_members_workspace_user").on(table.workspaceId, table.userId),
    index("idx_workspace_members_workspace_id").on(table.workspaceId),
    index("idx_workspace_members_user_id").on(table.userId),
  ],
);

export const workspaceInvites = portulanSchema.table(
  "workspace_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    tokenPrefix: text("token_prefix").notNull(),
    role: text("role").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }),
    maxUses: integer("max_uses"),
    uses: integer("uses").notNull().default(0),
    revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [index("idx_workspace_invites_workspace_id").on(table.workspaceId)],
);

export const templates = portulanSchema.table(
  "templates",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    primaryColor: text("primary_color").notNull(),
    secondaryColor: text("secondary_color").notNull(),
    logoUrl: text("logo_url"),
    content: text("content").notNull().default(""),
    isBuiltin: boolean("is_builtin").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_templates_user_id").on(table.userId),
    index("idx_templates_workspace_id").on(table.workspaceId),
  ],
);

export const mcpTokens = portulanSchema.table(
  "mcp_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "set null" }),
    name: text("name").notNull().default("Token MCP"),
    tokenHash: text("token_hash").notNull().unique(),
    tokenPrefix: text("token_prefix").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true, mode: "string" }),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [index("idx_mcp_tokens_user_id").on(table.userId)],
);

export const documents = portulanSchema.table(
  "documents",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    summary: text("summary").notNull().default(""),
    templateId: text("template_id")
      .notNull()
      .references(() => templates.id),
    status: text("status").notNull(),
    author: text("author").notNull().default(""),
    team: text("team").notNull().default(""),
    tags: text("tags").notNull().default("[]"),
    content: text("content").notNull().default(""),
    version: integer("version").notNull().default(1),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true, mode: "string" }),
    disabled: boolean("disabled").notNull().default(false),
    isPublic: boolean("is_public").notNull().default(false),
    visibility: text("visibility").notNull().default("private"),
  },
  (table) => [
    index("idx_documents_updated_at").on(table.updatedAt),
    index("idx_documents_template_id").on(table.templateId),
    index("idx_documents_status").on(table.status),
    index("idx_documents_user_id").on(table.userId),
    index("idx_documents_workspace_id").on(table.workspaceId),
  ],
);

export const documentReleases = portulanSchema.table(
  "document_releases",
  {
    id: text("id").primaryKey(),
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull().default(""),
    templateId: text("template_id").notNull(),
    templateName: text("template_name").notNull(),
    primaryColor: text("primary_color").notNull(),
    secondaryColor: text("secondary_color").notNull(),
    logoUrl: text("logo_url"),
    author: text("author").notNull().default(""),
    team: text("team").notNull().default(""),
    tags: text("tags").notNull().default("[]"),
    content: text("content").notNull().default(""),
    publishedAt: timestamp("published_at", { withTimezone: true, mode: "string" }).notNull(),
    disabled: boolean("disabled").notNull().default(false),
    publishedByUserId: uuid("published_by_user_id").references(() => users.id, { onDelete: "set null" }),
  },
  (table) => [
    unique("document_releases_document_version").on(table.documentId, table.version),
    index("idx_document_releases_document").on(table.documentId, table.version),
  ],
);

export const documentSlugAliases = portulanSchema.table(
  "document_slug_aliases",
  {
    slug: text("slug").primaryKey(),
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
  },
  (table) => [index("idx_document_slug_aliases_document_id").on(table.documentId)],
);

export const documentShares = portulanSchema.table(
  "document_shares",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role").notNull(),
    invitedBy: uuid("invited_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    unique("document_shares_document_email").on(table.documentId, table.email),
    index("idx_document_shares_document_id").on(table.documentId),
    index("idx_document_shares_user_id").on(table.userId),
    index("idx_document_shares_email").on(table.email),
  ],
);

export const documentComments = portulanSchema.table(
  "document_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    sectionAnchor: text("section_anchor"),
    quotedText: text("quoted_text"),
    parentId: uuid("parent_id"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_document_comments_document_id").on(table.documentId),
    index("idx_document_comments_user_id").on(table.userId),
    index("idx_document_comments_created_at").on(table.createdAt),
    index("idx_document_comments_parent_id").on(table.parentId),
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: "document_comments_parent_id_fk",
    }).onDelete("cascade"),
  ],
);
