import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "@/lib/db/schema";
import { applyPortulanSchema } from "@/lib/db/schema-bootstrap";

type Db = NeonHttpDatabase<typeof schema>;

let dbInstance: Db | null = null;
let bootstrapPromise: Promise<void> | null = null;

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

async function bootstrap() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!dbInstance) {
    const sqlClient = neon(process.env.DATABASE_URL);
    dbInstance = drizzle(sqlClient, { schema });
  }

  await applyPortulanSchema(dbInstance);
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
