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

/** Admin timezone — order timestamps are always shown in Moscow time (МСК). */
const MSK_TZ = "Europe/Moscow";

/** Format a date/time in Moscow time (МСК) for the admin panel. */
export function formatMskDateTime(
  date: string | number | Date,
  options: Intl.DateTimeFormatOptions = { dateStyle: "short", timeStyle: "short" }
): string {
  return new Date(date).toLocaleString("ru-RU", {
    timeZone: MSK_TZ,
    ...options,
  });
}

/** Format a date (no time) in Moscow time (МСК) for the admin panel. */
export function formatMskDate(date: string | number | Date): string {
  return new Date(date).toLocaleDateString("ru-RU", { timeZone: MSK_TZ });
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
