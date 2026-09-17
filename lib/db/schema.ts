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

export const agentIdentities = portulanSchema.table(
  "agent_identities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    workMode: text("work_mode").notNull(),
    allowedMcpTools: text("allowed_mcp_tools").notNull().default("[]"),
    status: text("status").notNull().default("active"),
    deactivatedAt: timestamp("deactivated_at", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_agent_identities_workspace_id").on(table.workspaceId),
    index("idx_agent_identities_owner_user_id").on(table.ownerUserId),
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
    agentIdentityId: uuid("agent_identity_id").references(() => agentIdentities.id, { onDelete: "set null" }),
    name: text("name").notNull().default("Token MCP"),
    tokenHash: text("token_hash").notNull().unique(),
    tokenPrefix: text("token_prefix").notNull(),
    scopes: text("scopes").notNull().default("[]"),
    lastClientInfo: text("last_client_info"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true, mode: "string" }),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    index("idx_mcp_tokens_user_id").on(table.userId),
    index("idx_mcp_tokens_agent_identity_id").on(table.agentIdentityId),
  ],
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

export const projects = portulanSchema.table(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    objective: text("objective").notNull().default(""),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [index("idx_projects_workspace_id").on(table.workspaceId)],
);

export const repositories = portulanSchema.table(
  "repositories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    kind: text("kind").notNull().default("git"),
    remoteUrl: text("remote_url"),
    notes: text("notes").notNull().default(""),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_repositories_workspace_id").on(table.workspaceId),
  ],
);

export const projectRepositories = portulanSchema.table(
  "project_repositories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    repositoryId: uuid("repository_id")
      .notNull()
      .references(() => repositories.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("primary"),
    pathScopes: text("path_scopes").notNull().default("[]"),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    unique("project_repositories_project_repo").on(table.projectId, table.repositoryId),
    index("idx_project_repositories_project_id").on(table.projectId),
    index("idx_project_repositories_repository_id").on(table.repositoryId),
  ],
);

export const contextPacks = portulanSchema.table(
  "context_packs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    objective: text("objective").notNull().default(""),
    expectedOutcome: text("expected_outcome").notNull().default(""),
    scope: text("scope").notNull().default(""),
    outOfScope: text("out_of_scope").notNull().default(""),
    status: text("status").notNull().default("draft"),
    validity: text("validity").notNull().default("current"),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    currentRevisionId: uuid("current_revision_id"),
    boardNumber: integer("board_number").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_context_packs_workspace_id").on(table.workspaceId),
    index("idx_context_packs_project_id").on(table.projectId),
  ],
);

export const contextPackRevisions = portulanSchema.table(
  "context_pack_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    packId: uuid("pack_id")
      .notNull()
      .references(() => contextPacks.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    revisionNumber: integer("revision_number").notNull(),
    snapshot: text("snapshot").notNull().default("{}"),
    approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "set null" }),
    approvedAt: timestamp("approved_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    unique("context_pack_revisions_pack_number").on(table.packId, table.revisionNumber),
    index("idx_context_pack_revisions_pack_id").on(table.packId),
  ],
);

export const contextPackItems = portulanSchema.table(
  "context_pack_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    packId: uuid("pack_id")
      .notNull()
      .references(() => contextPacks.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    revisionId: uuid("revision_id").references(() => contextPackRevisions.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    strength: text("strength").notNull().default("required"),
    body: text("body").notNull(),
    blocking: boolean("blocking").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    boardNumber: integer("board_number").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_context_pack_items_pack_id").on(table.packId),
    index("idx_context_pack_items_revision_id").on(table.revisionId),
  ],
);

export const contextPackSources = portulanSchema.table(
  "context_pack_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    packId: uuid("pack_id")
      .notNull()
      .references(() => contextPacks.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    revisionId: uuid("revision_id").references(() => contextPackRevisions.id, { onDelete: "cascade" }),
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    releaseId: text("release_id").references(() => documentReleases.id, { onDelete: "set null" }),
    sourceRole: text("source_role").notNull().default("spec"),
    section: text("section"),
    reason: text("reason").notNull().default(""),
    required: boolean("required").notNull().default(true),
    boardNumber: integer("board_number").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_context_pack_sources_pack_id").on(table.packId),
    index("idx_context_pack_sources_document_id").on(table.documentId),
  ],
);

export const acceptanceCriteria = portulanSchema.table(
  "acceptance_criteria",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    packId: uuid("pack_id")
      .notNull()
      .references(() => contextPacks.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    revisionId: uuid("revision_id").references(() => contextPackRevisions.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    boardNumber: integer("board_number").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [index("idx_acceptance_criteria_pack_id").on(table.packId)],
);

export const implementationPlans = portulanSchema.table(
  "implementation_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    packId: uuid("pack_id")
      .notNull()
      .references(() => contextPacks.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    revisionId: uuid("revision_id").references(() => contextPackRevisions.id, { onDelete: "cascade" }),
    summary: text("summary").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [index("idx_implementation_plans_pack_id").on(table.packId)],
);

export const implementationTasks = portulanSchema.table(
  "implementation_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    packId: uuid("pack_id")
      .notNull()
      .references(() => contextPacks.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    planId: uuid("plan_id").references(() => implementationPlans.id, { onDelete: "set null" }),
    packRevisionId: uuid("pack_revision_id").references(() => contextPackRevisions.id, { onDelete: "set null" }),
    parentTaskId: uuid("parent_task_id"),
    objective: text("objective").notNull(),
    repositoryId: uuid("repository_id").references(() => repositories.id, { onDelete: "set null" }),
    pathScopes: text("path_scopes").notNull().default("[]"),
    requiredItemIds: text("required_item_ids").notNull().default("[]"),
    criterionIds: text("criterion_ids").notNull().default("[]"),
    dependsOnTaskIds: text("depends_on_task_ids").notNull().default("[]"),
    status: text("status").notNull().default("available"),
    assigneeUserId: uuid("assignee_user_id").references(() => users.id, { onDelete: "set null" }),
    assigneeAgentIdentityId: uuid("assignee_agent_identity_id").references(() => agentIdentities.id, {
      onDelete: "set null",
    }),
    leaseHolderTokenId: uuid("lease_holder_token_id").references(() => mcpTokens.id, { onDelete: "set null" }),
    leaseHolderIdentityId: uuid("lease_holder_identity_id").references(() => agentIdentities.id, {
      onDelete: "set null",
    }),
    leaseHolderUserId: uuid("lease_holder_user_id").references(() => users.id, { onDelete: "set null" }),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true, mode: "string" }),
    sortOrder: integer("sort_order").notNull().default(0),
    boardNumber: integer("board_number").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_implementation_tasks_pack_id").on(table.packId),
    index("idx_implementation_tasks_status").on(table.status),
    index("idx_implementation_tasks_parent_task_id").on(table.parentTaskId),
    foreignKey({
      columns: [table.parentTaskId],
      foreignColumns: [table.id],
      name: "implementation_tasks_parent_task_id_fkey",
    }).onDelete("cascade"),
  ],
);

export const implementationTaskSources = portulanSchema.table(
  "implementation_task_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => implementationTasks.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    releaseId: text("release_id").references(() => documentReleases.id, { onDelete: "set null" }),
    sourceRole: text("source_role").notNull().default("spec"),
    section: text("section"),
    reason: text("reason").notNull().default(""),
    required: boolean("required").notNull().default(false),
    boardNumber: integer("board_number").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_implementation_task_sources_task_id").on(table.taskId),
    index("idx_implementation_task_sources_document_id").on(table.documentId),
  ],
);

export const progressReports = portulanSchema.table(
  "progress_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => implementationTasks.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    packRevisionId: uuid("pack_revision_id").references(() => contextPackRevisions.id, { onDelete: "set null" }),
    kind: text("kind").notNull().default("progress"),
    summary: text("summary").notNull(),
    changedScopes: text("changed_scopes").notNull().default("[]"),
    evidence: text("evidence").notNull().default(""),
    commitRef: text("commit_ref"),
    pullRequestRef: text("pull_request_ref"),
    coveredCriterionIds: text("covered_criterion_ids").notNull().default("[]"),
    gaps: text("gaps").notNull().default(""),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    agentIdentityId: uuid("agent_identity_id").references(() => agentIdentities.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [index("idx_progress_reports_task_id").on(table.taskId)],
);

export const coordinationThreads = portulanSchema.table(
  "coordination_threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    subjectType: text("subject_type").notNull(),
    subjectId: text("subject_id").notNull(),
    isBlocker: boolean("is_blocker").notNull().default(false),
    resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: "string" }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    boardNumber: integer("board_number").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_coordination_threads_workspace_id").on(table.workspaceId),
    index("idx_coordination_threads_subject").on(table.subjectType, table.subjectId),
  ],
);

export const coordinationMessages = portulanSchema.table(
  "coordination_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => coordinationThreads.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    agentIdentityId: uuid("agent_identity_id").references(() => agentIdentities.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    parentId: uuid("parent_id"),
    mentionedUserIds: text("mentioned_user_ids").notNull().default("[]"),
    mentionedAgentIdentityIds: text("mentioned_agent_identity_ids").notNull().default("[]"),
    boardNumber: integer("board_number").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_coordination_messages_thread_id").on(table.threadId),
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: "coordination_messages_parent_id_fk",
    }).onDelete("cascade"),
  ],
);

export const auditEvents = portulanSchema.table(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    agentIdentityId: uuid("agent_identity_id").references(() => agentIdentities.id, { onDelete: "set null" }),
    mcpTokenId: uuid("mcp_token_id").references(() => mcpTokens.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    correlationId: text("correlation_id"),
    clientInfo: text("client_info"),
    payload: text("payload"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_audit_events_workspace_id").on(table.workspaceId),
    index("idx_audit_events_created_at").on(table.createdAt),
  ],
);

export const collabRooms = portulanSchema.table(
  "collab_rooms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    subjectType: text("subject_type").notNull(),
    subjectId: text("subject_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    unique("collab_rooms_subject").on(table.workspaceId, table.subjectType, table.subjectId),
    index("idx_collab_rooms_workspace_id").on(table.workspaceId),
    index("idx_collab_rooms_subject").on(table.subjectType, table.subjectId),
  ],
);

export const collabEvents = portulanSchema.table(
  "collab_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => collabRooms.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    type: text("type").notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    agentIdentityId: uuid("agent_identity_id").references(() => agentIdentities.id, { onDelete: "set null" }),
    mcpTokenId: uuid("mcp_token_id").references(() => mcpTokens.id, { onDelete: "set null" }),
    intention: text("intention"),
    baseVersion: integer("base_version"),
    payload: text("payload"),
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    unique("collab_events_room_seq").on(table.roomId, table.seq),
    unique("collab_events_room_idempotency_key").on(table.roomId, table.idempotencyKey),
    index("idx_collab_events_room_seq").on(table.roomId, table.seq),
    index("idx_collab_events_workspace_id").on(table.workspaceId),
  ],
);

export const presenceSessions = portulanSchema.table(
  "presence_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => collabRooms.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    agentIdentityId: uuid("agent_identity_id").references(() => agentIdentities.id, { onDelete: "set null" }),
    mcpTokenId: uuid("mcp_token_id").references(() => mcpTokens.id, { onDelete: "set null" }),
    intention: text("intention").notNull().default("viewing"),
    clientInfo: text("client_info"),
    joinedAt: timestamp("joined_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    index("idx_presence_sessions_room_id").on(table.roomId),
    index("idx_presence_sessions_last_seen_at").on(table.lastSeenAt),
  ],
);

export const workspaceBoardCounters = portulanSchema.table("workspace_board_counters", {
  workspaceId: uuid("workspace_id")
    .primaryKey()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  nextValue: integer("next_value").notNull().default(1),
});

export const workspaceBoardRefs = portulanSchema.table(
  "workspace_board_refs",
  {
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    boardNumber: integer("board_number").notNull(),
    kind: text("kind").notNull(),
    targetId: text("target_id").notNull(),
  },
  (table) => [
    unique("workspace_board_refs_number").on(table.workspaceId, table.boardNumber),
    index("idx_workspace_board_refs_target").on(table.workspaceId, table.kind, table.targetId),
  ],
);
