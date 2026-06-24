import "server-only";

import { sanityWriteClient } from "@/lib/sanity/write-client";

export interface StockChange {
  /** Product slug (Product.id). */
  productId: string;
  size: string;
  quantity: number;
}

/**
 * Decrement per-size stock in Sanity after a successful payment. Best-effort:
 * logs and continues on individual failures so one bad line can't break the
 * whole webhook. Requires SANITY_API_TOKEN (write access).
 */
export async function decrementStock(changes: StockChange[]): Promise<void> {
  if (!sanityWriteClient) {
    console.warn("[inventory] No write token — skipping stock update.");
    return;
  }

  for (const change of changes) {
    try {
      const doc = await sanityWriteClient.fetch<{
        _id: string;
        inventory?: { _key: string; size: string; stock: number }[];
      } | null>(
        `*[_type == "product" && slug.current == $slug][0]{ _id, inventory[]{ _key, size, stock } }`,
        { slug: change.productId }
      );

      const entry = doc?.inventory?.find((i) => i.size === change.size);
      if (!doc?._id || !entry) continue;

      const next = Math.max(0, (entry.stock ?? 0) - change.quantity);
      await sanityWriteClient
        .patch(doc._id)
        .set({ [`inventory[_key=="${entry._key}"].stock`]: next })
        .commit();
    } catch (err) {
      console.error(
        `[inventory] failed to decrement ${change.productId}/${change.size}:`,
        err
      );
    }
  }
}
