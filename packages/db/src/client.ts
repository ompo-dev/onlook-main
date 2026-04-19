import * as schema from '@onlook/db/src/schema';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

/**
 * Cache the database connection in development. This avoids creating a new connection on every HMR
 * update.
 */
const globalForDb = globalThis as unknown as {
    conn: postgres.Sql | undefined;
};

const dbUrl = process.env.SUPABASE_DATABASE_URL;
const conn = globalForDb.conn ?? (dbUrl ? postgres(dbUrl, { prepare: false }) : null);
if (process.env.NODE_ENV !== 'production') globalForDb.conn = conn ?? undefined;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = conn ? drizzle(conn, { schema }) : (null as any);
export type DrizzleDb = typeof db;