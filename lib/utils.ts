import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import type { Product } from "@/types";

/** Merge Tailwind class names with conflict resolution (shadcn standard). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as Russian rubles, e.g. 2490 -> "2 490 ₽".
 * Uses a non-breaking narrow space as the thousands separator (ru-RU).
 */
export function formatPrice(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);
}

const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

/**
 * Turn a product name into a URL-safe slug, transliterating Cyrillic so the
 * address looks like `/product/kepka-core-logo`. Used as the product id.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .split("")
    .map((ch) => TRANSLIT[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

/** Build the stable composite key that identifies a cart line (variant). */
export function buildCartKey(
  productId: string,
  color: string,
  size: string
): string {
  return `${productId}:${color}:${size}`;
}

/**
 * Whether a given size can be added to cart. Products without per-size
 * `inventory` (e.g. local demo data) are treated as fully available.
 */
export function isSizeInStock(
  product: Pick<Product, "inventory">,
  size: string
): boolean {
  if (!product.inventory) return true;
  const entry = product.inventory.find((i) => i.size === size);
  return entry ? entry.stock > 0 : false;
}

/**
 * Available units for a size. Returns null when stock is unknown/unlimited
 * (local demo data without inventory) — callers should skip the cap then.
 */
export function getSizeStock(
  product: Pick<Product, "inventory">,
  size: string
): number | null {
  if (!product.inventory) return null;
  const entry = product.inventory.find((i) => i.size === size);
  return entry ? entry.stock : 0;
}
