/**
 * Minimal admin auth: a single password (ADMIN_PASSWORD) gates the /admin
 * section. The session cookie stores a SHA-256 token derived from the password,
 * so the raw password is never kept in the cookie. Used by both the Edge
 * middleware and the server actions, so it must stay free of Node-only APIs
 * (Web Crypto works in both runtimes).
 */
export const ADMIN_COOKIE = "stoat_admin";

/** Derive the session token from ADMIN_PASSWORD, or null if it isn't set. */
export async function computeAdminToken(): Promise<string | null> {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return null;
  const data = new TextEncoder().encode("stoat-admin::" + pw);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
