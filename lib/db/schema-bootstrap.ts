import "server-only";

import { readFileSync } from "node:fs";
import path from "node:path";
import { sql } from "drizzle-orm";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "@/lib/db/schema";
import { PORTULAN_PG_SCHEMA } from "@/lib/db/schema";

type Db = NeonHttpDatabase<typeof schema>;

/** Required Portulan tables and columns inside the dedicated Postgres schema. */
export const PORTULAN_TABLE_COLUMNS = {
  users: ["id", "github_id", "login", "name", "avatar_url", "email", "password_hash", "created_at"],
  workspaces: [
    "id",
    "slug",
    "name",
    "theme_paper",
    "theme_mode",
    "theme_ink",
    "is_personal",
    "created_by",
    "created_at",
  ],
  workspace_members: ["id", "workspace_id", "user_id", "role", "created_at"],
  workspace_invites: [
    "id",
    "workspace_id",
    "token_hash",
    "token_prefix",
    "role",
    "created_by",
    "expires_at",
    "max_uses",
    "uses",
    "revoked_at",
    "created_at",
  ],
  templates: [
    "id",
    "user_id",
    "workspace_id",
    "name",
    "primary_color",
    "secondary_color",
    "logo_url",
    "content",
    "draft_version",
    "is_builtin",
    "created_at",
  ],
  agent_identities: [
    "id",
    "workspace_id",
    "owner_user_id",
    "name",
    "work_mode",
    "allowed_mcp_tools",
    "status",
    "deactivated_at",
    "created_at",
    "updated_at",
  ],
  mcp_tokens: [
    "id",
    "user_id",
    "workspace_id",
    "agent_identity_id",
    "name",
    "token_hash",
    "token_prefix",
    "scopes",
    "last_client_info",
    "created_at",
    "last_used_at",
    "expires_at",
  ],
  documents: [
    "id",
    "slug",
    "title",
    "summary",
    "template_id",
    "status",
    "author",
    "team",
    "tags",
    "content",
    "draft_version",
    "version",
    "user_id",
    "workspace_id",
    "created_at",
    "updated_at",
    "published_at",
    "disabled",
    "is_public",
    "visibility",
  ],
  document_releases: [
    "id",
    "document_id",
    "version",
    "title",
    "summary",
    "template_id",
    "template_name",
    "primary_color",
    "secondary_color",
    "logo_url",
    "author",
    "team",
    "tags",
    "content",
    "published_at",
    "disabled",
    "published_by_user_id",
  ],
  document_shares: ["id", "document_id", "email", "role", "invited_by", "user_id", "created_at"],
  document_comments: ["id", "document_id", "user_id", "body", "section_anchor", "quoted_text", "parent_id", "resolved_at", "created_at"],
  collab_rooms: ["id", "workspace_id", "subject_type", "subject_id", "policy_version", "created_at"],
  collab_events: [
    "id",
    "room_id",
    "workspace_id",
    "seq",
    "type",
    "user_id",
    "agent_identity_id",
    "mcp_token_id",
    "intention",
    "base_version",
    "payload",
    "idempotency_key",
    "created_at",
  ],
  presence_sessions: [
    "id",
    "room_id",
    "workspace_id",
    "user_id",
    "agent_identity_id",
    "mcp_token_id",
    "intention",
    "client_info",
    "joined_at",
    "last_seen_at",
    "revoked_at",
  ],
  audit_events: [
    "id",
    "workspace_id",
    "user_id",
    "agent_identity_id",
    "mcp_token_id",
    "action",
    "target_type",
    "target_id",
    "correlation_id",
    "client_info",
    "payload",
    "created_at",
  ],
} as const;

type PortulanTable = keyof typeof PORTULAN_TABLE_COLUMNS;

function getPgErrorCode(error: unknown): string | undefined {
  let current: unknown = error;
  while (current instanceof Error) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string") {
      return code;
    }
    current = current.cause;
  }
  return undefined;
}

function collectErrorText(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  while (current instanceof Error) {
    parts.push(current.message);
    current = current.cause;
  }
  if (parts.length === 0 && error != null) {
    parts.push(String(error));
  }
  return parts.join("\n");
}

/** Postgres errors that mean the object already exists from a concurrent or prior bootstrap. */
export function isIdempotentSchemaError(error: unknown): boolean {
  const code = getPgErrorCode(error);
  if (code === "23505" || code === "42P07") {
    return true;
  }

  const text = collectErrorText(error);
  return (
    /duplicate_(table|object)/i.test(text) ||
    /pg_type_typname_nsp_index/i.test(text) ||
    /already exists/i.test(text)
  );
}

async function loadTableColumns(db: Db): Promise<Map<string, Set<string>>> {
  const tableNames = Object.keys(PORTULAN_TABLE_COLUMNS);
  const inList = sql.raw(tableNames.map((name) => `'${name.replace(/'/g, "''")}'`).join(", "));
  const rows = await db.execute<{ table_name: string; column_name: string }>(sql`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = ${PORTULAN_PG_SCHEMA}
      AND table_name IN (${inList})
  `);

  const byTable = new Map<string, Set<string>>();
  for (const row of rows.rows) {
    const columns = byTable.get(row.table_name) ?? new Set<string>();
    columns.add(row.column_name);
    byTable.set(row.table_name, columns);
  }
  return byTable;
}

function tableHasExpectedColumns(table: PortulanTable, columns: Set<string> | undefined): boolean {
  if (!columns) {
    return false;
  }
  return PORTULAN_TABLE_COLUMNS[table].every((column) => columns.has(column));
}

export async function listMissingPortulanColumns(db: Db): Promise<string[]> {
  const columnsByTable = await loadTableColumns(db);
  const missing: string[] = [];
  for (const table of Object.keys(PORTULAN_TABLE_COLUMNS) as PortulanTable[]) {
    const columns = columnsByTable.get(table) ?? new Set<string>();
    for (const column of PORTULAN_TABLE_COLUMNS[table]) {
      if (!columns.has(column)) {
        missing.push(`${table}.${column}`);
      }
    }
  }
  return missing;
}

export async function isPortulanSchemaReady(db: Db): Promise<boolean> {
  const missing = await listMissingPortulanColumns(db);
  return missing.length === 0;
}

async function portulanTableSchemaConflict(db: Db, table: PortulanTable): Promise<string | null> {
  const result = await db.execute<{ table_exists: boolean }>(sql`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = ${PORTULAN_PG_SCHEMA}
        AND table_name = ${table}
    ) AS table_exists
  `);

  const tableExists = result.rows[0]?.table_exists ?? false;
  if (!tableExists) {
    return null;
  }

  const columnsByTable = await loadTableColumns(db);
  const columns = columnsByTable.get(table);
  if (columns && !tableHasExpectedColumns(table, columns)) {
    const expected = PORTULAN_TABLE_COLUMNS[table].join(", ");
    const found = columns.size > 0 ? [...columns].sort().join(", ") : "(none)";
    return (
      `A table named "${PORTULAN_PG_SCHEMA}.${table}" exists but does not match the Portulan schema. ` +
      `Expected columns: ${expected}. Found: ${found}.`
    );
  }

  return null;
}

export class PortulanSchemaConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PortulanSchemaConflictError";
  }
}

function parseSchemaStatements(ddl: string): string[] {
  return ddl
    .split(";")
    .map((statement) => statement.replace(/--[^\n]*/g, "").trim())
    .filter(Boolean);
}

function statementTargetsTable(statement: string, table: PortulanTable): boolean {
  const pattern = new RegExp(`\\b${PORTULAN_PG_SCHEMA}\\.${table}\\b`, "i");
  return /\bCREATE\s+TABLE\b/i.test(statement) && pattern.test(statement);
}

async function verifyStatementOutcome(db: Db, statement: string): Promise<void> {
  for (const table of Object.keys(PORTULAN_TABLE_COLUMNS) as PortulanTable[]) {
    if (!statementTargetsTable(statement, table)) {
      continue;
    }

    const conflict = await portulanTableSchemaConflict(db, table);
    if (conflict) {
      throw new PortulanSchemaConflictError(conflict);
    }

    if (!(await tableExistsWithColumns(db, table))) {
      throw new PortulanSchemaConflictError(
        `Schema bootstrap failed while creating "${PORTULAN_PG_SCHEMA}.${table}": duplicate-object error occurred but the Portulan table is still missing.`,
      );
    }
    return;
  }
}

async function tableExistsWithColumns(db: Db, table: PortulanTable): Promise<boolean> {
  const columnsByTable = await loadTableColumns(db);
  return tableHasExpectedColumns(table, columnsByTable.get(table));
}

async function executeSchemaStatement(db: Db, statement: string): Promise<void> {
  try {
    await db.execute(sql.raw(statement));
  } catch (error) {
    if (!isIdempotentSchemaError(error)) {
      throw error;
    }
    await verifyStatementOutcome(db, statement);
  }
}

const DEFAULT_TEMPLATE_ID = "portulan-default";

const DEFAULT_TEMPLATE_CONTENT =
  "## Visão geral\n\nDescreva o contexto, objetivo e público deste documento.\n\n## Conteúdo principal\n\nDesenvolva o assunto com clareza e evidências.\n\n:::callout{title=\"Destaque\"}\nInformação relevante para o leitor.\n:::\n\n## Próximos passos\n\n- Ação ou decisão pendente\n- Responsável e prazo";

async function portulanTableExists(db: Db, table: string): Promise<boolean> {
  const result = await db.execute<{ table_exists: boolean }>(sql`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = ${PORTULAN_PG_SCHEMA}
        AND table_name = ${table}
    ) AS table_exists
  `);
  return result.rows[0]?.table_exists ?? false;
}

/**
 * Ensures templates/mcp_tokens exist and migrates legacy documents tables
 * (pre-template `type` column) before index creation from schema.sql.
 */
export async function migrateLegacyPortulanTables(db: Db): Promise<void> {
  await db.execute(sql.raw(`CREATE SCHEMA IF NOT EXISTS ${PORTULAN_PG_SCHEMA}`));

  await executeSchemaStatement(
    db,
    `CREATE TABLE IF NOT EXISTS ${PORTULAN_PG_SCHEMA}.users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      github_id TEXT UNIQUE,
      login TEXT NOT NULL,
      name TEXT,
      avatar_url TEXT,
      email TEXT,
      password_hash TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
  );

  if (await portulanTableExists(db, "users")) {
    const columns = (await loadTableColumns(db)).get("users") ?? new Set<string>();
    if (!columns.has("email")) {
      await executeSchemaStatement(
        db,
        `ALTER TABLE ${PORTULAN_PG_SCHEMA}.users ADD COLUMN IF NOT EXISTS email TEXT`,
      );
    }
    await executeSchemaStatement(
      db,
      `ALTER TABLE ${PORTULAN_PG_SCHEMA}.users ADD COLUMN IF NOT EXISTS password_hash TEXT`,
    );
    await executeSchemaStatement(
      db,
      `ALTER TABLE ${PORTULAN_PG_SCHEMA}.users ALTER COLUMN github_id DROP NOT NULL`,
    );
    await executeSchemaStatement(
      db,
      `CREATE UNIQUE INDEX IF NOT EXISTS users_login_lower_uidx ON ${PORTULAN_PG_SCHEMA}.users (LOWER(login))`,
    );
    await executeSchemaStatement(
      db,
      `CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_uidx ON ${PORTULAN_PG_SCHEMA}.users (LOWER(email)) WHERE email IS NOT NULL`,
    );
  }

  await executeSchemaStatement(
    db,
    `CREATE TABLE IF NOT EXISTS ${PORTULAN_PG_SCHEMA}.workspaces (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      theme_paper TEXT NOT NULL DEFAULT 'carta',
      theme_mode TEXT NOT NULL DEFAULT 'light',
      theme_ink TEXT NOT NULL DEFAULT '#1a2847',
      is_personal BOOLEAN NOT NULL DEFAULT FALSE,
      created_by UUID REFERENCES ${PORTULAN_PG_SCHEMA}.users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
  );

  await executeSchemaStatement(
    db,
    `CREATE TABLE IF NOT EXISTS ${PORTULAN_PG_SCHEMA}.workspace_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES ${PORTULAN_PG_SCHEMA}.workspaces(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES ${PORTULAN_PG_SCHEMA}.users(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (workspace_id, user_id)
    )`,
  );

  await executeSchemaStatement(
    db,
    `CREATE TABLE IF NOT EXISTS ${PORTULAN_PG_SCHEMA}.workspace_invites (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES ${PORTULAN_PG_SCHEMA}.workspaces(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      token_prefix TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
      created_by UUID NOT NULL REFERENCES ${PORTULAN_PG_SCHEMA}.users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ,
      max_uses INTEGER,
      uses INTEGER NOT NULL DEFAULT 0,
      revoked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
  );

  await executeSchemaStatement(
    db,
    `CREATE TABLE IF NOT EXISTS ${PORTULAN_PG_SCHEMA}.templates (
      id TEXT PRIMARY KEY,
      user_id UUID REFERENCES ${PORTULAN_PG_SCHEMA}.users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      primary_color TEXT NOT NULL,
      secondary_color TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      is_builtin BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
  );

  await executeSchemaStatement(
    db,
    `CREATE TABLE IF NOT EXISTS ${PORTULAN_PG_SCHEMA}.mcp_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES ${PORTULAN_PG_SCHEMA}.users(id) ON DELETE CASCADE,
      name TEXT NOT NULL DEFAULT 'Token MCP',
      token_hash TEXT NOT NULL UNIQUE,
      token_prefix TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_used_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ
    )`,
  );

  await executeSchemaStatement(
    db,
    `CREATE TABLE IF NOT EXISTS ${PORTULAN_PG_SCHEMA}.agent_identities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES ${PORTULAN_PG_SCHEMA}.workspaces(id) ON DELETE CASCADE,
      owner_user_id UUID NOT NULL REFERENCES ${PORTULAN_PG_SCHEMA}.users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      work_mode TEXT NOT NULL CHECK (work_mode IN ('context_and_coordination', 'local_implementation', 'review')),
      allowed_mcp_tools TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
      deactivated_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
  );

  if (await portulanTableExists(db, "mcp_tokens")) {
    const columns = (await loadTableColumns(db)).get("mcp_tokens") ?? new Set<string>();

    if (!columns.has("expires_at")) {
      await executeSchemaStatement(
        db,
        `ALTER TABLE ${PORTULAN_PG_SCHEMA}.mcp_tokens ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ`,
      );
    }
    if (!columns.has("last_client_info")) {
      await executeSchemaStatement(
        db,
        `ALTER TABLE ${PORTULAN_PG_SCHEMA}.mcp_tokens ADD COLUMN IF NOT EXISTS last_client_info TEXT`,
      );
    }
    if (!columns.has("workspace_id")) {
      await executeSchemaStatement(
        db,
        `ALTER TABLE ${PORTULAN_PG_SCHEMA}.mcp_tokens ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES ${PORTULAN_PG_SCHEMA}.workspaces(id) ON DELETE SET NULL`,
      );
    }
    if (!columns.has("agent_identity_id")) {
      await executeSchemaStatement(
        db,
        `ALTER TABLE ${PORTULAN_PG_SCHEMA}.mcp_tokens ADD COLUMN IF NOT EXISTS agent_identity_id UUID REFERENCES ${PORTULAN_PG_SCHEMA}.agent_identities(id) ON DELETE SET NULL`,
      );
    }
    if (!columns.has("scopes")) {
      await executeSchemaStatement(
        db,
        `ALTER TABLE ${PORTULAN_PG_SCHEMA}.mcp_tokens ADD COLUMN IF NOT EXISTS scopes TEXT NOT NULL DEFAULT '[]'`,
      );
    }

    if (await portulanTableExists(db, "agent_identities")) {
      await executeSchemaStatement(
        db,
        `UPDATE ${PORTULAN_PG_SCHEMA}.mcp_tokens AS t
         SET workspace_id = ai.workspace_id
         FROM ${PORTULAN_PG_SCHEMA}.agent_identities AS ai
         WHERE t.agent_identity_id = ai.id
           AND t.workspace_id IS NULL`,
      );
    }
  }

  if (await portulanTableExists(db, "agent_identities")) {
    const identityColumns = (await loadTableColumns(db)).get("agent_identities") ?? new Set<string>();
    if (!identityColumns.has("allowed_mcp_tools")) {
      await executeSchemaStatement(
        db,
        `ALTER TABLE ${PORTULAN_PG_SCHEMA}.agent_identities ADD COLUMN IF NOT EXISTS allowed_mcp_tools TEXT NOT NULL DEFAULT '[]'`,
      );
    }
    if (!identityColumns.has("status")) {
      await executeSchemaStatement(
        db,
        `ALTER TABLE ${PORTULAN_PG_SCHEMA}.agent_identities ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'`,
      );
    }
    if (!identityColumns.has("deactivated_at")) {
      await executeSchemaStatement(
        db,
        `ALTER TABLE ${PORTULAN_PG_SCHEMA}.agent_identities ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ`,
      );
    }
  }

  if (await portulanTableExists(db, "templates")) {
    const columns = (await loadTableColumns(db)).get("templates") ?? new Set<string>();

    if (!columns.has("logo_url")) {
      await executeSchemaStatement(
        db,
        `ALTER TABLE ${PORTULAN_PG_SCHEMA}.templates ADD COLUMN IF NOT EXISTS logo_url TEXT`,
      );
    }
    if (!columns.has("draft_version")) {
      await executeSchemaStatement(
        db,
        `ALTER TABLE ${PORTULAN_PG_SCHEMA}.templates ADD COLUMN IF NOT EXISTS draft_version INTEGER NOT NULL DEFAULT 0`,
      );
    }
  }

  await db.execute(sql`
    INSERT INTO ${sql.raw(`${PORTULAN_PG_SCHEMA}.templates`)} (
      id, user_id, name, primary_color, secondary_color, content, is_builtin
    )
    VALUES (
      ${DEFAULT_TEMPLATE_ID},
      NULL,
      'Default',
      '#1a2847',
      '#8b2735',
      ${DEFAULT_TEMPLATE_CONTENT},
      TRUE
    )
    ON CONFLICT (id) DO NOTHING
  `);

  if (await portulanTableExists(db, "documents")) {
    const columns = (await loadTableColumns(db)).get("documents") ?? new Set<string>();

    if (!columns.has("draft_version")) {
      await executeSchemaStatement(
        db,
        `ALTER TABLE ${PORTULAN_PG_SCHEMA}.documents ADD COLUMN IF NOT EXISTS draft_version INTEGER NOT NULL DEFAULT 0`,
      );
    }

    if (!columns.has("template_id")) {
      await executeSchemaStatement(
        db,
        `ALTER TABLE ${PORTULAN_PG_SCHEMA}.documents ADD COLUMN IF NOT EXISTS template_id TEXT`,
      );
    }

    await executeSchemaStatement(
      db,
      `UPDATE ${PORTULAN_PG_SCHEMA}.documents SET template_id = '${DEFAULT_TEMPLATE_ID}' WHERE template_id IS NULL`,
    );

    await executeSchemaStatement(
      db,
      `DROP INDEX IF EXISTS ${PORTULAN_PG_SCHEMA}.idx_documents_type`,
    );

    await executeSchemaStatement(
      db,
      `ALTER TABLE ${PORTULAN_PG_SCHEMA}.documents DROP COLUMN IF EXISTS type`,
    );
  }

  if (await portulanTableExists(db, "document_releases")) {
    const columns = (await loadTableColumns(db)).get("document_releases") ?? new Set<string>();

    if (!columns.has("template_id")) {
      await executeSchemaStatement(
        db,
        `ALTER TABLE ${PORTULAN_PG_SCHEMA}.document_releases ADD COLUMN IF NOT EXISTS template_id TEXT`,
      );
    }
    if (!columns.has("template_name")) {
      await executeSchemaStatement(
        db,
        `ALTER TABLE ${PORTULAN_PG_SCHEMA}.document_releases ADD COLUMN IF NOT EXISTS template_name TEXT`,
      );
    }
    if (!columns.has("primary_color")) {
      await executeSchemaStatement(
        db,
        `ALTER TABLE ${PORTULAN_PG_SCHEMA}.document_releases ADD COLUMN IF NOT EXISTS primary_color TEXT`,
      );
    }
    if (!columns.has("secondary_color")) {
      await executeSchemaStatement(
        db,
        `ALTER TABLE ${PORTULAN_PG_SCHEMA}.document_releases ADD COLUMN IF NOT EXISTS secondary_color TEXT`,
      );
    }
    if (!columns.has("logo_url")) {
      await executeSchemaStatement(
        db,
        `ALTER TABLE ${PORTULAN_PG_SCHEMA}.document_releases ADD COLUMN IF NOT EXISTS logo_url TEXT`,
      );
    }

    await executeSchemaStatement(
      db,
      `UPDATE ${PORTULAN_PG_SCHEMA}.document_releases AS r
       SET
         template_id = COALESCE(r.template_id, '${DEFAULT_TEMPLATE_ID}'),
         template_name = COALESCE(r.template_name, 'Default'),
         primary_color = COALESCE(r.primary_color, '#1a2847'),
         secondary_color = COALESCE(r.secondary_color, '#8b2735')
       WHERE r.template_id IS NULL
          OR r.template_name IS NULL
          OR r.primary_color IS NULL
          OR r.secondary_color IS NULL`,
    );

    await executeSchemaStatement(
      db,
      `ALTER TABLE ${PORTULAN_PG_SCHEMA}.document_releases DROP COLUMN IF EXISTS type`,
    );
  }

  if (await portulanTableExists(db, "documents")) {
    const columns = (await loadTableColumns(db)).get("documents") ?? new Set<string>();
    if (!columns.has("disabled")) {
      await executeSchemaStatement(
        db,
        `ALTER TABLE ${PORTULAN_PG_SCHEMA}.documents ADD COLUMN IF NOT EXISTS disabled BOOLEAN NOT NULL DEFAULT FALSE`,
      );
    }
    if (!columns.has("is_public")) {
      await executeSchemaStatement(
        db,
        `ALTER TABLE ${PORTULAN_PG_SCHEMA}.documents ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE`,
      );
    }
  }

  if (await portulanTableExists(db, "document_releases")) {
    const columns = (await loadTableColumns(db)).get("document_releases") ?? new Set<string>();
    if (!columns.has("disabled")) {
      await executeSchemaStatement(
        db,
        `ALTER TABLE ${PORTULAN_PG_SCHEMA}.document_releases ADD COLUMN IF NOT EXISTS disabled BOOLEAN NOT NULL DEFAULT FALSE`,
      );
    }
    if (!columns.has("published_by_user_id")) {
      await executeSchemaStatement(
        db,
        `ALTER TABLE ${PORTULAN_PG_SCHEMA}.document_releases ADD COLUMN IF NOT EXISTS published_by_user_id UUID REFERENCES ${PORTULAN_PG_SCHEMA}.users(id) ON DELETE SET NULL`,
      );
    }
  }

  // Tabelas filhas de documents só entram aqui em banco legado. Em banco vazio,
  // documents ainda não existe e a FK falharia — schema.sql cria tudo na ordem certa depois.
  if (await portulanTableExists(db, "documents")) {
    await executeSchemaStatement(
      db,
      `CREATE TABLE IF NOT EXISTS ${PORTULAN_PG_SCHEMA}.document_shares (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id TEXT NOT NULL REFERENCES ${PORTULAN_PG_SCHEMA}.documents(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('viewer', 'editor')),
        invited_by UUID NOT NULL REFERENCES ${PORTULAN_PG_SCHEMA}.users(id) ON DELETE CASCADE,
        user_id UUID REFERENCES ${PORTULAN_PG_SCHEMA}.users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (document_id, email)
      )`,
    );
  }

  if (await portulanTableExists(db, "document_shares")) {
    await executeSchemaStatement(
      db,
      `CREATE INDEX IF NOT EXISTS idx_document_shares_document_id ON ${PORTULAN_PG_SCHEMA}.document_shares (document_id)`,
    );
    await executeSchemaStatement(
      db,
      `CREATE INDEX IF NOT EXISTS idx_document_shares_user_id ON ${PORTULAN_PG_SCHEMA}.document_shares (user_id)`,
    );
    await executeSchemaStatement(
      db,
      `CREATE INDEX IF NOT EXISTS idx_document_shares_email ON ${PORTULAN_PG_SCHEMA}.document_shares (email)`,
    );
  }

  if (await portulanTableExists(db, "document_comments")) {
    const commentColumns = (await loadTableColumns(db)).get("document_comments") ?? new Set<string>();
    if (!commentColumns.has("quoted_text")) {
      await executeSchemaStatement(
        db,
        `ALTER TABLE ${PORTULAN_PG_SCHEMA}.document_comments ADD COLUMN IF NOT EXISTS quoted_text TEXT`,
      );
    }
    if (!commentColumns.has("parent_id")) {
      await executeSchemaStatement(
        db,
        `ALTER TABLE ${PORTULAN_PG_SCHEMA}.document_comments ADD COLUMN IF NOT EXISTS parent_id UUID`,
      );
      await executeSchemaStatement(
        db,
        `ALTER TABLE ${PORTULAN_PG_SCHEMA}.document_comments DROP CONSTRAINT IF EXISTS document_comments_parent_id_fkey`,
      );
      await executeSchemaStatement(
        db,
        `ALTER TABLE ${PORTULAN_PG_SCHEMA}.document_comments ADD CONSTRAINT document_comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES ${PORTULAN_PG_SCHEMA}.document_comments(id) ON DELETE CASCADE`,
      );
    }
    if (!commentColumns.has("resolved_at")) {
      await executeSchemaStatement(
        db,
        `ALTER TABLE ${PORTULAN_PG_SCHEMA}.document_comments ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ`,
      );
    }
  }

  if (await portulanTableExists(db, "documents")) {
    await executeSchemaStatement(
      db,
      `CREATE TABLE IF NOT EXISTS ${PORTULAN_PG_SCHEMA}.document_comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id TEXT NOT NULL REFERENCES ${PORTULAN_PG_SCHEMA}.documents(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES ${PORTULAN_PG_SCHEMA}.users(id) ON DELETE CASCADE,
        body TEXT NOT NULL,
        section_anchor TEXT,
        quoted_text TEXT,
        parent_id UUID REFERENCES ${PORTULAN_PG_SCHEMA}.document_comments(id) ON DELETE CASCADE,
        resolved_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
    );
  }

  if (await portulanTableExists(db, "document_comments")) {
    await executeSchemaStatement(
      db,
      `CREATE INDEX IF NOT EXISTS idx_document_comments_document_id ON ${PORTULAN_PG_SCHEMA}.document_comments (document_id)`,
    );
    await executeSchemaStatement(
      db,
      `CREATE INDEX IF NOT EXISTS idx_document_comments_user_id ON ${PORTULAN_PG_SCHEMA}.document_comments (user_id)`,
    );
    await executeSchemaStatement(
      db,
      `CREATE INDEX IF NOT EXISTS idx_document_comments_created_at ON ${PORTULAN_PG_SCHEMA}.document_comments (created_at)`,
    );
    await executeSchemaStatement(
      db,
      `CREATE INDEX IF NOT EXISTS idx_document_comments_parent_id ON ${PORTULAN_PG_SCHEMA}.document_comments (parent_id)`,
    );
  }

  if (await portulanTableExists(db, "documents")) {
    await executeSchemaStatement(
      db,
      `CREATE TABLE IF NOT EXISTS ${PORTULAN_PG_SCHEMA}.document_slug_aliases (
        slug TEXT PRIMARY KEY,
        document_id TEXT NOT NULL REFERENCES ${PORTULAN_PG_SCHEMA}.documents(id) ON DELETE CASCADE
      )`,
    );
  }

  if (await portulanTableExists(db, "document_slug_aliases")) {
    await executeSchemaStatement(
      db,
      `CREATE INDEX IF NOT EXISTS idx_document_slug_aliases_document_id ON ${PORTULAN_PG_SCHEMA}.document_slug_aliases (document_id)`,
    );
  }

  if (await portulanTableExists(db, "documents")) {
    await executeSchemaStatement(
      db,
      `INSERT INTO ${PORTULAN_PG_SCHEMA}.document_slug_aliases (slug, document_id)
       SELECT d.slug, d.id
       FROM ${PORTULAN_PG_SCHEMA}.documents AS d
       WHERE d.slug <> d.id
       ON CONFLICT (slug) DO NOTHING`,
    );

    await executeSchemaStatement(
      db,
      `UPDATE ${PORTULAN_PG_SCHEMA}.documents SET slug = id WHERE slug <> id`,
    );
  }

  if (await portulanTableExists(db, "collab_rooms")) {
    await executeSchemaStatement(
      db,
      `ALTER TABLE ${PORTULAN_PG_SCHEMA}.collab_rooms DROP CONSTRAINT IF EXISTS collab_rooms_subject_type_check`,
    );
    await executeSchemaStatement(
      db,
      `ALTER TABLE ${PORTULAN_PG_SCHEMA}.collab_rooms ADD CONSTRAINT collab_rooms_subject_type_check CHECK (subject_type IN ('document', 'template', 'context_pack', 'implementation_plan', 'implementation_task', 'project', 'repository', 'workspace'))`,
    );
  }
}

export async function applyPortulanSchema(db: Db): Promise<void> {
  await migrateLegacyPortulanTables(db);

  if (await isPortulanSchemaReady(db)) {
    return;
  }

  const schemaPath = path.join(process.cwd(), "schema.sql");
  const ddl = readFileSync(schemaPath, "utf8");
  const statements = parseSchemaStatements(ddl);

  for (const statement of statements) {
    await executeSchemaStatement(db, statement);
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const missing = await listMissingPortulanColumns(db);
    if (missing.length === 0) return;
    if (attempt < 4) {
      await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
    } else {
      throw new PortulanSchemaConflictError(
        `Schema bootstrap finished but the Portulan tables in "${PORTULAN_PG_SCHEMA}" are still incomplete (${missing.join(", ")}). Check database permissions and existing objects in the Portulan schema.`,
      );
    }
  }
}
