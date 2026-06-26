#!/usr/bin/env node
/**
 * Apply lib/db/schema.sql to the database in DATABASE_URL.
 *
 * Usage: DATABASE_URL=postgres://... npm run db:migrate
 *
 * Idempotent — the schema uses CREATE TABLE/INDEX IF NOT EXISTS, so it's safe
 * to run on every deploy. Point DATABASE_URL at your RU-hosted Postgres.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set. Aborting.");
  process.exit(1);
}

const wantsSsl =
  process.env.DATABASE_SSL === "true" ||
  /[?&]sslmode=(require|verify-ca|verify-full)/.test(connectionString);
const caValue = process.env.DATABASE_CA_CERT;
const ca = caValue
  ? caValue.includes("-----BEGIN")
    ? caValue
    : readFileSync(caValue, "utf8")
  : undefined;
const ssl = wantsSsl
  ? {
      ca,
      rejectUnauthorized:
        process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" && Boolean(ca),
    }
  : undefined;

const sql = readFileSync(join(__dirname, "../lib/db/schema.sql"), "utf8");

const client = new pg.Client({ connectionString, ssl });

try {
  await client.connect();
  await client.query(sql);
  console.log("✅ Schema applied.");
} catch (err) {
  console.error("❌ Migration failed:", err);
  process.exitCode = 1;
} finally {
  await client.end();
}
