import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "@/lib/db/schema";
import { applyPortulanSchema } from "@/lib/db/schema-bootstrap";

type Db = NeonHttpDatabase<typeof schema>;

let dbInstance: Db | null = null;
let bootstrapPromise: Promise<void> | null = null;

const BOOTSTRAP_MAX_ATTEMPTS = 3;
const BOOTSTRAP_RETRY_DELAY_MS = 150;

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

/** Clears cached bootstrap state so the next getDb() attempt re-runs schema setup. */
export function resetDbBootstrap(): void {
  bootstrapPromise = null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function bootstrap(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!dbInstance) {
    const sqlClient = neon(process.env.DATABASE_URL);
    dbInstance = drizzle(sqlClient, { schema });
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= BOOTSTRAP_MAX_ATTEMPTS; attempt++) {
    try {
      await applyPortulanSchema(dbInstance);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < BOOTSTRAP_MAX_ATTEMPTS) {
        await sleep(BOOTSTRAP_RETRY_DELAY_MS * attempt);
      }
    }
  }

  throw lastError;
}

export async function getDb(): Promise<Db> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!bootstrapPromise) {
    bootstrapPromise = bootstrap().catch((error) => {
      resetDbBootstrap();
      throw error;
    });
  }

  await bootstrapPromise;
  return dbInstance!;
}
