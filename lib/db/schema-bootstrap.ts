import "server-only";

import { readFileSync } from "node:fs";
import path from "node:path";
import { sql } from "drizzle-orm";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "@/lib/db/schema";

type Db = NeonHttpDatabase<typeof schema>;

/** Required public tables and columns for a healthy Portulan schema. */
export const PORTULAN_TABLE_COLUMNS = {
  users: ["id", "github_id", "login", "name", "avatar_url", "created_at"],
  documents: [
    "id",
    "slug",
    "title",
    "summary",
    "type",
    "status",
    "author",
    "team",
    "tags",
    "content",
    "version",
    "user_id",
    "created_at",
    "updated_at",
    "published_at",
  ],
  document_releases: [
    "id",
    "document_id",
    "version",
    "title",
    "summary",
    "type",
    "author",
    "team",
    "tags",
    "content",
    "published_at",
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
  const rows = await db.execute<{ table_name: string; column_name: string }>(sql`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('users', 'documents', 'document_releases')
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

export async function isPortulanSchemaReady(db: Db): Promise<boolean> {
  const columnsByTable = await loadTableColumns(db);
  return (Object.keys(PORTULAN_TABLE_COLUMNS) as PortulanTable[]).every((table) =>
    tableHasExpectedColumns(table, columnsByTable.get(table)),
  );
}

async function documentsNameConflict(db: Db): Promise<string | null> {
  const result = await db.execute<{
    type_exists: boolean;
    table_exists: boolean;
  }>(sql`
    SELECT
      EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public'
          AND t.typname = 'documents'
          AND t.typtype = 'c'
      ) AS type_exists,
      EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'documents'
      ) AS table_exists
  `);

  const { type_exists: typeExists, table_exists: tableExists } = result.rows[0] ?? {
    type_exists: false,
    table_exists: false,
  };

  if (typeExists && !tableExists) {
    return (
      'A PostgreSQL composite type named "documents" already exists in the public schema, but it is not the Portulan documents table. ' +
      "Another application may own this Neon database. Use a dedicated database or rename the conflicting type before deploying Portulan."
    );
  }

  if (tableExists) {
    const columnsByTable = await loadTableColumns(db);
    const documentsColumns = columnsByTable.get("documents");
    if (documentsColumns && !tableHasExpectedColumns("documents", documentsColumns)) {
      const expected = PORTULAN_TABLE_COLUMNS.documents.join(", ");
      const found = documentsColumns.size > 0 ? [...documentsColumns].sort().join(", ") : "(none)";
      return (
        'A table named "documents" exists but does not match the Portulan schema. ' +
        `Expected columns: ${expected}. Found: ${found}. ` +
        "Use a dedicated database or migrate/rename the existing table before deploying Portulan."
      );
    }
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
  const pattern = new RegExp(`\\b${table}\\b`, "i");
  return /\bCREATE\s+TABLE\b/i.test(statement) && pattern.test(statement);
}

async function verifyStatementOutcome(db: Db, statement: string): Promise<void> {
  if (statementTargetsTable(statement, "users")) {
    if (!(await tableExistsWithColumns(db, "users"))) {
      throw new PortulanSchemaConflictError(
        'Schema bootstrap failed while creating the "users" table: duplicate-object error occurred but the Portulan users table is still missing.',
      );
    }
    return;
  }

  if (statementTargetsTable(statement, "documents")) {
    const conflict = await documentsNameConflict(db);
    if (conflict) {
      throw new PortulanSchemaConflictError(conflict);
    }
    if (!(await tableExistsWithColumns(db, "documents"))) {
      throw new PortulanSchemaConflictError(
        'Schema bootstrap failed while creating the "documents" table: duplicate-object error occurred but the Portulan documents table is still missing.',
      );
    }
    return;
  }

  if (statementTargetsTable(statement, "document_releases")) {
    if (!(await tableExistsWithColumns(db, "document_releases"))) {
      throw new PortulanSchemaConflictError(
        'Schema bootstrap failed while creating the "document_releases" table: duplicate-object error occurred but the Portulan document_releases table is still missing.',
      );
    }
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

export async function applyPortulanSchema(db: Db): Promise<void> {
  if (await isPortulanSchemaReady(db)) {
    return;
  }

  const conflict = await documentsNameConflict(db);
  if (conflict) {
    throw new PortulanSchemaConflictError(conflict);
  }

  const schemaPath = path.join(process.cwd(), "schema.sql");
  const ddl = readFileSync(schemaPath, "utf8");
  const statements = parseSchemaStatements(ddl);

  for (const statement of statements) {
    await executeSchemaStatement(db, statement);
  }

  if (!(await isPortulanSchemaReady(db))) {
    throw new PortulanSchemaConflictError(
      "Schema bootstrap finished but the Portulan tables are still incomplete. Check database permissions and existing objects in the public schema.",
    );
  }
}
