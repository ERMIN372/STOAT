import "server-only";

import { getProductForEdit, saveProduct } from "@/lib/catalog";
import { dbConfigured } from "@/lib/db";

export interface StockChange {
  /** Product slug (Product.id). */
  productId: string;
  size: string;
  quantity: number;
}

/**
 * Apply a stock delta per size in Postgres. Best-effort: logs and continues on
 * individual failures so one bad line can't break the whole webhook/action.
 * Re-derives the product's `inStock` flag (saveProduct does this).
 */
async function applyStockDelta(
  changes: StockChange[],
  sign: 1 | -1
): Promise<void> {
  if (!dbConfigured) {
    console.warn("[inventory] DATABASE_URL not set — skipping stock update.");
    return;
  }

  for (const change of changes) {
    try {
      const product = await getProductForEdit(change.productId);
      const entry = product?.inventory?.find((i) => i.size === change.size);
      if (!product || !entry) continue;

      entry.stock = Math.max(0, (entry.stock ?? 0) + sign * change.quantity);
      await saveProduct(product);
      console.info(
        `[inventory] ${change.productId}/${change.size} ${
          sign > 0 ? "+" : "-"
        }${change.quantity} → ${entry.stock}`
      );
    } catch (err) {
      console.error(
        `[inventory] failed to update ${change.productId}/${change.size}:`,
        err
      );
    }
  }
}

/** Reduce stock (after a successful payment). */
export async function decrementStock(changes: StockChange[]): Promise<void> {
  return applyStockDelta(changes, -1);
}

/** Return stock (after a refund / cancellation of a paid order). */
export async function incrementStock(changes: StockChange[]): Promise<void> {
  return applyStockDelta(changes, 1);
}
