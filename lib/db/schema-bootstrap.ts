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
    WHERE table_schema = ${PORTULAN_PG_SCHEMA}
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

export async function applyPortulanSchema(db: Db): Promise<void> {
  if (await isPortulanSchemaReady(db)) {
    return;
  }

  await db.execute(sql.raw(`CREATE SCHEMA IF NOT EXISTS ${PORTULAN_PG_SCHEMA}`));

  const schemaPath = path.join(process.cwd(), "schema.sql");
  const ddl = readFileSync(schemaPath, "utf8");
  const statements = parseSchemaStatements(ddl);

  for (const statement of statements) {
    await executeSchemaStatement(db, statement);
  }

  if (!(await isPortulanSchemaReady(db))) {
    throw new PortulanSchemaConflictError(
      `Schema bootstrap finished but the Portulan tables in "${PORTULAN_PG_SCHEMA}" are still incomplete. Check database permissions and existing objects in the Portulan schema.`,
    );
  }
}
