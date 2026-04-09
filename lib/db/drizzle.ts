import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is not set');
}

// Vercel runs this app in transient serverless environments, so keep the
// Postgres.js client compatible with Supabase poolers and avoid prepared
// statements that can fail in pooled modes.
export const client = postgres(process.env.POSTGRES_URL, {
  prepare: false,
  max: 1,
  idle_timeout: 20,
  connect_timeout: 30
});
export const db = drizzle(client, { schema });
