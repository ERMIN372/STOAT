/**
 * Turn a set of cart line items into a single packed parcel (weight + box) for
 * carrier calculations. Uses per-product packaging when present, and
 * falls back to sensible per-category defaults so a quote never fails for lack
 * of data.
 */

import {
  CATEGORY_PARCEL_DEFAULTS,
  DEFAULT_PARCEL,
  type ParcelDims,
} from "@/lib/delivery/config";
import type { Parcel } from "@/lib/delivery/types";
import type { CategorySlug, Product } from "@/types";

export interface ParcelLine {
  product: Pick<Product, "category" | "packaging">;
  quantity: number;
}

/** Resolve a single unit's weight + dimensions (explicit → category → default). */
export function unitDims(
  product: Pick<Product, "category" | "packaging">
): ParcelDims {
  const base =
    CATEGORY_PARCEL_DEFAULTS[product.category as CategorySlug] ?? DEFAULT_PARCEL;
  const p = product.packaging;
  if (!p) return base;
  return {
    weightGrams: p.weightGrams && p.weightGrams > 0 ? p.weightGrams : base.weightGrams,
    lengthCm: p.lengthCm && p.lengthCm > 0 ? p.lengthCm : base.lengthCm,
    widthCm: p.widthCm && p.widthCm > 0 ? p.widthCm : base.widthCm,
    heightCm: p.heightCm && p.heightCm > 0 ? p.heightCm : base.heightCm,
  };
}

/**
 * Combine all lines into one parcel:
 * - weight is summed across every unit;
 * - the box footprint takes the largest length/width of any item;
 * - the box height is the summed heights (items stacked), so multiple items
 *   produce a taller, heavier — but still realistic — package.
 */
export function buildParcel(lines: ParcelLine[]): Parcel {
  let weightGrams = 0;
  let lengthCm = 0;
  let widthCm = 0;
  let heightCm = 0;

  for (const { product, quantity } of lines) {
    const qty = Math.max(1, Math.floor(quantity));
    const d = unitDims(product);
    weightGrams += d.weightGrams * qty;
    lengthCm = Math.max(lengthCm, d.lengthCm);
    widthCm = Math.max(widthCm, d.widthCm);
    heightCm += d.heightCm * qty;
  }

  // Guard against an empty cart producing a degenerate box.
  return {
    weightGrams: Math.max(weightGrams, DEFAULT_PARCEL.weightGrams),
    lengthCm: Math.max(lengthCm, DEFAULT_PARCEL.lengthCm),
    widthCm: Math.max(widthCm, DEFAULT_PARCEL.widthCm),
    heightCm: Math.max(heightCm, 1),
  };
}
