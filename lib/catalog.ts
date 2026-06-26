import "server-only";
import { cache } from "react";

import { products as localProducts } from "@/data/products";
import { dbConfigured, query } from "@/lib/db";
import { slugify } from "@/lib/utils";
import type { Product } from "@/types";

/**
 * Catalog data access. Reads products from Postgres (DATABASE_URL) when
 * configured, and falls back to the local demo catalogue (data/products.ts) if
 * the database isn't set up, errors, or is still empty. This keeps the
 * storefront working before the first product is added and during any outage.
 * The UI always gets `Product[]`.
 *
 * The catalogue is NOT personal data, but it lives in the same RU-hosted
 * Postgres as orders so the whole app needs a single backend (no Sanity).
 */

interface ProductRow {
  data: Product;
}

/** Derive the "in stock" flag from per-size inventory (no inventory ⇒ available). */
function computeInStock(product: Product): boolean {
  if (!product.inventory || product.inventory.length === 0) return true;
  return product.inventory.some((i) => i.stock > 0);
}

/** Normalise a product before saving (id/slug, derived inStock, sizes). */
function normalize(product: Product): Product {
  const id = product.id?.trim() || slugify(product.name) || `product-${Date.now()}`;
  const inventory = product.inventory?.filter((i) => i.size?.trim());
  const sizes = inventory?.length
    ? inventory.map((i) => i.size)
    : product.sizes?.filter(Boolean) ?? [];
  const next: Product = {
    ...product,
    id,
    inventory: inventory?.length ? inventory : undefined,
    sizes,
    images: product.images?.filter(Boolean) ?? [],
    colors: product.colors?.filter((c) => c.name?.trim()) ?? [],
  };
  next.inStock = computeInStock(next);
  return next;
}

/** Fetch + map the full catalogue once per request (React-cached). */
const fetchProducts = cache(async (): Promise<Product[]> => {
  if (!dbConfigured) return localProducts;
  try {
    const rows = await query<ProductRow>(
      `select data from products order by is_new desc, created_at desc`
    );
    const mapped = rows.map((r) => r.data).filter((p) => p.id);
    return mapped.length > 0 ? mapped : localProducts;
  } catch (err) {
    console.warn(
      "[catalog] database unreachable — using local demo data:",
      err instanceof Error ? err.message : err
    );
    return localProducts;
  }
});

export async function getAllProducts(): Promise<Product[]> {
  return fetchProducts();
}

export async function getProductById(id: string): Promise<Product | null> {
  const all = await fetchProducts();
  return all.find((p) => p.id === id) ?? null;
}

export async function getNewArrivals(): Promise<Product[]> {
  const all = await fetchProducts();
  const flagged = all.filter((p) => p.isNew);
  return flagged.length > 0 ? flagged : all.slice(0, 4);
}

export async function getRelatedProducts(
  product: Product,
  limit = 4
): Promise<Product[]> {
  const all = await fetchProducts();
  return all
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, limit);
}

// --- Admin writes -----------------------------------------------------------

/** All products for the admin list (no fallback, raw from the database). */
export async function listProductsForAdmin(): Promise<Product[]> {
  if (!dbConfigured) return [];
  try {
    const rows = await query<ProductRow>(
      `select data from products order by is_new desc, created_at desc`
    );
    return rows.map((r) => r.data).filter((p) => p.id);
  } catch (err) {
    console.error("[catalog] admin list failed:", err);
    return [];
  }
}

/** Read a single product straight from the database (for the edit form). */
export async function getProductForEdit(id: string): Promise<Product | null> {
  if (!dbConfigured) return null;
  try {
    const rows = await query<ProductRow>(
      `select data from products where id = $1`,
      [id]
    );
    return rows[0]?.data ?? null;
  } catch (err) {
    console.error(`[catalog] getProductForEdit ${id} failed:`, err);
    return null;
  }
}

/**
 * Create or replace a product. Upserts by id (slug) so editing keeps the same
 * row. Returns the saved product (with its normalised id).
 */
export async function saveProduct(input: Product): Promise<Product> {
  if (!dbConfigured) throw new Error("DATABASE_URL is not configured");
  const product = normalize(input);
  await query(
    `insert into products (id, name, price, category, is_new, in_stock, data, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, now())
     on conflict (id) do update set
       name = excluded.name,
       price = excluded.price,
       category = excluded.category,
       is_new = excluded.is_new,
       in_stock = excluded.in_stock,
       data = excluded.data,
       updated_at = now()`,
    [
      product.id,
      product.name,
      product.price,
      product.category,
      Boolean(product.isNew),
      product.inStock,
      JSON.stringify(product),
    ]
  );
  console.info(`[catalog] saved product ${product.id}`);
  return product;
}

export async function deleteProduct(id: string): Promise<void> {
  if (!dbConfigured) return;
  try {
    await query(`delete from products where id = $1`, [id]);
    console.info(`[catalog] deleted product ${id}`);
  } catch (err) {
    console.error(`[catalog] delete ${id} failed:`, err);
  }
}
