import { boolean, index, integer, pgSchema, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

export const PORTULAN_PG_SCHEMA = "portulan";

export const portulanSchema = pgSchema(PORTULAN_PG_SCHEMA);

export const users = portulanSchema.table("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  githubId: text("github_id").notNull().unique(),
  login: text("login").notNull(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

export const templates = portulanSchema.table(
  "templates",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    primaryColor: text("primary_color").notNull(),
    secondaryColor: text("secondary_color").notNull(),
    logoUrl: text("logo_url"),
    content: text("content").notNull().default(""),
    isBuiltin: boolean("is_builtin").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [index("idx_templates_user_id").on(table.userId)],
);

export const mcpTokens = portulanSchema.table(
  "mcp_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
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
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true, mode: "string" }),
    disabled: boolean("disabled").notNull().default(false),
  },
  (table) => [
    index("idx_documents_updated_at").on(table.updatedAt),
    index("idx_documents_template_id").on(table.templateId),
    index("idx_documents_status").on(table.status),
    index("idx_documents_user_id").on(table.userId),
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
  },
  (table) => [
    unique("document_releases_document_version").on(table.documentId, table.version),
    index("idx_document_releases_document").on(table.documentId, table.version),
  ],
);
