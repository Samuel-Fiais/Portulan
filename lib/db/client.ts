import "server-only";

import { neon } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { readFileSync } from "node:fs";
import path from "node:path";
import * as schema from "@/lib/db/schema";
import { seedDatabaseIfEmpty } from "@/lib/db/seed";

type Db = NeonHttpDatabase<typeof schema>;

let dbInstance: Db | null = null;
let bootstrapPromise: Promise<void> | null = null;

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

async function runSchemaSql(db: Db) {
  const schemaPath = path.join(process.cwd(), "schema.sql");
  const ddl = readFileSync(schemaPath, "utf8");
  const statements = ddl
    .split(";")
    .map((statement) => statement.replace(/--[^\n]*/g, "").trim())
    .filter(Boolean);

  for (const statement of statements) {
    await db.execute(sql.raw(statement));
  }
}

async function bootstrap() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!dbInstance) {
    const sqlClient = neon(process.env.DATABASE_URL);
    dbInstance = drizzle(sqlClient, { schema });
  }

  await runSchemaSql(dbInstance);
  await seedDatabaseIfEmpty(dbInstance);
}

export async function getDb(): Promise<Db> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!bootstrapPromise) {
    bootstrapPromise = bootstrap();
  }

  await bootstrapPromise;
  return dbInstance!;
}
