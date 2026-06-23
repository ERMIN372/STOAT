import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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

/** Build the stable composite key that identifies a cart line (variant). */
export function buildCartKey(
  productId: string,
  color: string,
  size: string
): string {
  return `${productId}:${color}:${size}`;
}
