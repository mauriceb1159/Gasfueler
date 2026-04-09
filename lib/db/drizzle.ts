import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is not set');
}

const connectionString = process.env.POSTGRES_URL;
const shouldUseSsl = !/localhost|127\.0\.0\.1/i.test(connectionString);

// Vercel runs this app in transient serverless environments, so keep the
// Postgres.js client compatible with Supabase poolers and avoid prepared
// statements that can fail in pooled modes.
export const client = postgres(connectionString, {
  prepare: false,
  max: 1,
  idle_timeout: 20,
  connect_timeout: 30,
  ssl: shouldUseSsl ? 'require' : undefined
});
export const db = drizzle(client, { schema });
