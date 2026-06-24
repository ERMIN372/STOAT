import "server-only";
import { cache } from "react";

import { products as localProducts } from "@/data/products";
import { sanityClient } from "@/lib/sanity/client";
import { urlForImage } from "@/lib/sanity/image";
import { allProductsQuery } from "@/lib/sanity/queries";
import type { InventoryEntry, Product } from "@/types";

/**
 * Catalog data access. Reads products from Sanity when configured, and falls
 * back to the local demo catalogue (data/products.ts) if Sanity isn't set up,
 * errors, or is still empty. This keeps the storefront working before seeding
 * and during any outage. Swap nothing in the UI — it always gets `Product[]`.
 */

/** Raw shape returned by allProductsQuery (before mapping to `Product`). */
interface SanityProductDoc {
  id?: string;
  name?: string;
  price?: number;
  category?: Product["category"];
  isNew?: boolean;
  description?: string;
  colors?: { name?: string; hex?: string }[];
  inventory?: { size?: string; stock?: number }[];
  images?: unknown[];
}

function mapDoc(doc: SanityProductDoc): Product {
  const inventory: InventoryEntry[] = (doc.inventory ?? [])
    .filter((i) => i && i.size)
    .map((i) => ({ size: i.size as string, stock: i.stock ?? 0 }));

  const images = (doc.images ?? [])
    .map((img) => urlForImage(img as never))
    .filter((u): u is string => Boolean(u));

  return {
    id: doc.id ?? "",
    name: doc.name ?? "Без названия",
    price: doc.price ?? 0,
    category: doc.category ?? "accessories",
    colors: (doc.colors ?? [])
      .filter((c) => c && c.name)
      .map((c) => ({ name: c.name as string, hex: c.hex || "#888888" })),
    sizes: inventory.map((i) => i.size),
    images: images.length > 0 ? images : ["/products/placeholder.svg"],
    description: doc.description ?? "",
    inStock: inventory.some((i) => i.stock > 0),
    inventory: inventory.length > 0 ? inventory : undefined,
    isNew: Boolean(doc.isNew),
  };
}

/** Fetch + map the full catalogue once per request (React-cached). */
const fetchProducts = cache(async (): Promise<Product[]> => {
  if (!sanityClient) return localProducts;
  try {
    const docs = await sanityClient.fetch<SanityProductDoc[]>(allProductsQuery);
    const mapped = (docs ?? []).map(mapDoc).filter((p) => p.id);
    return mapped.length > 0 ? mapped : localProducts;
  } catch (err) {
    console.warn(
      "[catalog] Sanity unreachable — using local demo data:",
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
