import "server-only";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/**
 * Product image storage on an S3-compatible object store hosted in the Russian
 * Federation (Yandex Object Storage / VK Cloud / Selectel). Product photos are
 * NOT personal data, but with Sanity removed this is where the admin uploads
 * them; the catalogue stores only the resulting public URL.
 *
 * Configure with:
 *   S3_ENDPOINT           e.g. https://storage.yandexcloud.net
 *   S3_REGION             e.g. ru-central1 (default)
 *   S3_BUCKET             bucket name
 *   S3_ACCESS_KEY_ID      access key
 *   S3_SECRET_ACCESS_KEY  secret key
 *   S3_PUBLIC_URL         (optional) public base URL / CDN for objects
 */
const endpoint = process.env.S3_ENDPOINT;
const region = process.env.S3_REGION || "ru-central1";
const bucket = process.env.S3_BUCKET;
const accessKeyId = process.env.S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

/** True when uploads can be performed (otherwise the admin pastes URLs). */
export const storageConfigured = Boolean(
  endpoint && bucket && accessKeyId && secretAccessKey
);

const client = storageConfigured
  ? new S3Client({
      endpoint,
      region,
      credentials: { accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey! },
      forcePathStyle: true,
    })
  : null;

/** Public URL base for stored objects. */
function publicBase(): string {
  if (process.env.S3_PUBLIC_URL) return process.env.S3_PUBLIC_URL.replace(/\/$/, "");
  // Path-style fallback against the configured endpoint.
  return `${endpoint!.replace(/\/$/, "")}/${bucket}`;
}

function safeName(name: string): string {
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot).toLowerCase().replace(/[^.a-z0-9]/g, "") : "";
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext || ".bin"}`;
}

/**
 * Upload an image and return its public URL. Throws when storage isn't
 * configured — callers should check `storageConfigured` first.
 */
export async function uploadImage(
  body: Buffer,
  contentType: string,
  originalName: string
): Promise<string> {
  if (!client || !bucket) throw new Error("S3 storage is not configured");
  const key = `products/${safeName(originalName)}`;
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType || "application/octet-stream",
      ACL: "public-read",
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
  return `${publicBase()}/${key}`;
}
