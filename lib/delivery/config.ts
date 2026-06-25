/**
 * Central configuration for the STOAT delivery engine.
 *
 * Every tunable number lives here so the storefront, the quote API, the
 * checkout route, the admin and the emails all agree on the same rules.
 * Nothing in this file is a secret — it is safe to import on the client.
 */

import type { CategorySlug } from "@/types";

/**
 * Order preparation window, in business days. The final delivery estimate the
 * customer sees is ALWAYS `preparation + carrier delivery`. Wording is
 * deliberate ("Подготовка заказа") — we never say we produce/sew after payment.
 */
export const PREPARATION_MIN_DAYS = numEnv("DELIVERY_PREP_MIN_DAYS", 3);
export const PREPARATION_MAX_DAYS = numEnv("DELIVERY_PREP_MAX_DAYS", 7);

/** Flat packing / handling surcharge added on top of the carrier tariff (₽). */
export const PACKAGING_SURCHARGE = numEnv("DELIVERY_PACKAGING_SURCHARGE", 70);

/** Round the final delivery price UP to the nearest multiple of this (₽). */
export const PRICE_ROUNDING_STEP = numEnv("DELIVERY_PRICE_ROUNDING", 10);

/** Shared, human-friendly copy used across the storefront. */
export const PREPARATION_LABEL = `Подготовка заказа: ${PREPARATION_MIN_DAYS}–${PREPARATION_MAX_DAYS} рабочих дней`;
export const PREPARATION_NOTE =
  "Срок получения складывается из подготовки заказа и доставки выбранной службой.";

/**
 * Per-category fallback weight (grams) and packed dimensions (cm). Used when a
 * product has no explicit packaging data so the carrier calculation never
 * breaks. Tuned to the STOAT catalogue.
 */
export interface ParcelDims {
  weightGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

export const CATEGORY_PARCEL_DEFAULTS: Record<CategorySlug, ParcelDims> = {
  tshirts: { weightGrams: 300, lengthCm: 30, widthCm: 25, heightCm: 3 },
  hoodies: { weightGrams: 800, lengthCm: 35, widthCm: 30, heightCm: 8 },
  caps: { weightGrams: 250, lengthCm: 25, widthCm: 20, heightCm: 12 },
  // Bags + misc accessories.
  accessories: { weightGrams: 400, lengthCm: 35, widthCm: 30, heightCm: 5 },
};

/** Absolute fallback when a category is somehow unknown. */
export const DEFAULT_PARCEL: ParcelDims = {
  weightGrams: 400,
  lengthCm: 35,
  widthCm: 30,
  heightCm: 5,
};

/**
 * Pickup ("Самовывоз после готовности"). Off by default for the MVP because
 * there is no public pickup address yet — enable by setting
 * NEXT_PUBLIC_PICKUP_ENABLED=true once a real point exists.
 */
export const PICKUP_ENABLED =
  process.env.NEXT_PUBLIC_PICKUP_ENABLED === "true";
export const PICKUP_ADDRESS =
  process.env.NEXT_PUBLIC_PICKUP_ADDRESS || "";

/** Add the surcharge and round up to the rounding step. */
export function applyServiceMarkup(carrierPrice: number): number {
  const withSurcharge = carrierPrice + PACKAGING_SURCHARGE;
  if (PRICE_ROUNDING_STEP <= 0) return Math.ceil(withSurcharge);
  return Math.ceil(withSurcharge / PRICE_ROUNDING_STEP) * PRICE_ROUNDING_STEP;
}

/** Total receipt window = preparation + carrier delivery. */
export function totalDays(
  deliveryMin: number,
  deliveryMax: number
): { totalMinDays: number; totalMaxDays: number } {
  return {
    totalMinDays: PREPARATION_MIN_DAYS + deliveryMin,
    totalMaxDays: PREPARATION_MAX_DAYS + deliveryMax,
  };
}

/** "5–12 рабочих дней" style range, collapsing equal bounds to one number. */
export function formatDaysRange(min: number, max: number): string {
  const body = min === max ? `${min}` : `${min}–${max}`;
  return `${body} ${pluralDays(max)}`;
}

function pluralDays(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "рабочий день";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20))
    return "рабочих дня";
  return "рабочих дней";
}

function numEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw == null || raw.trim() === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}
