import "server-only";
import { readFileSync } from "node:fs";
import { Pool, type PoolConfig, type QueryResultRow } from "pg";

/**
 * Postgres connection for STOAT.
 *
 * ALL customer data (orders) and the catalogue (products) live here. Point
 * DATABASE_URL at a Postgres instance physically hosted in the Russian
 * Federation (Yandex Cloud / VK Cloud / Selectel / Timeweb) to satisfy the
 * data-localisation requirement of 152-ФЗ (ст. 18 ч. 5).
 *
 * Managed RU providers require TLS. Set DATABASE_SSL=true and, ideally, point
 * DATABASE_CA_CERT at the provider's root certificate so the connection is
 * verified rather than blindly trusted.
 */
const connectionString = process.env.DATABASE_URL;

/** True once a connection string is present. Reads/writes are no-ops without it. */
export const dbConfigured = Boolean(connectionString);

function buildSsl(): PoolConfig["ssl"] {
  // Enable TLS when asked, or implicitly when the URL requests it.
  const wants =
    process.env.DATABASE_SSL === "true" ||
    /[?&]sslmode=(require|verify-ca|verify-full)/.test(connectionString ?? "");
  if (!wants) return undefined;

  const ca = readCert(process.env.DATABASE_CA_CERT);
  // Verify against the provider CA when available; otherwise allow opting out
  // explicitly (DATABASE_SSL_REJECT_UNAUTHORIZED=false) for first-run setups.
  const rejectUnauthorized =
    process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" && Boolean(ca);
  return { ca, rejectUnauthorized };
}

/**
 * Resolve the provider CA certificate. Accepts either the PEM text directly
 * (handy on hosts like Vercel where you can't drop a file — paste it into the
 * env var) or a path to a .crt file (handy locally).
 */
function readCert(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (value.includes("-----BEGIN")) return value;
  try {
    return readFileSync(value, "utf8");
  } catch (err) {
    console.warn(`[db] could not read DATABASE_CA_CERT at ${value}:`, err);
    return undefined;
  }
}

// Reuse one pool across hot reloads in dev (Next re-imports modules).
const globalForDb = globalThis as unknown as { __stoatPool?: Pool };

export const pool: Pool | null = connectionString
  ? globalForDb.__stoatPool ??
    (globalForDb.__stoatPool = new Pool({
      connectionString,
      ssl: buildSsl(),
      max: Number(process.env.DATABASE_POOL_MAX || 5),
    }))
  : null;

/**
 * Run a parameterised query. Throws if the database isn't configured — callers
 * that must degrade gracefully should check `dbConfigured` first.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  if (!pool) throw new Error("DATABASE_URL is not configured");
  const res = await pool.query<T>(text, params as never);
  return res.rows;
}
