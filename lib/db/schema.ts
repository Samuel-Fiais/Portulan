import { index, integer, pgSchema, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

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

export const documents = portulanSchema.table(
  "documents",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    summary: text("summary").notNull().default(""),
    type: text("type").notNull(),
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
  },
  (table) => [
    index("idx_documents_updated_at").on(table.updatedAt),
    index("idx_documents_type").on(table.type),
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
    type: text("type").notNull(),
    author: text("author").notNull().default(""),
    team: text("team").notNull().default(""),
    tags: text("tags").notNull().default("[]"),
    content: text("content").notNull().default(""),
    publishedAt: timestamp("published_at", { withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    unique("document_releases_document_version").on(table.documentId, table.version),
    index("idx_document_releases_document").on(table.documentId, table.version),
  ],
);
