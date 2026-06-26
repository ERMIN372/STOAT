import "server-only";

import { dbConfigured, query } from "@/lib/db";
import { sendOrderEmail } from "@/lib/email";
import { decrementStock, type StockChange } from "@/lib/inventory";
import { sendTelegram } from "@/lib/notify";
import {
  getOrder,
  markPaid,
  setStockDecremented,
  updateStatus,
} from "@/lib/orders";
import type { YooKassaPayment } from "@/lib/yookassa";

/**
 * Claim a payment for processing exactly once. Inserts an idempotency marker
 * and returns true only the first time a given payment id is seen. Returns
 * false when the marker already exists (already processed) or on error.
 */
async function claimPayment(
  paymentId: string,
  orderId: string | null
): Promise<boolean> {
  try {
    const rows = await query(
      `insert into processed_payments (payment_id, order_id)
       values ($1, $2)
       on conflict (payment_id) do nothing
       returning payment_id`,
      [paymentId, orderId]
    );
    return rows.length > 0;
  } catch (err) {
    console.error(`[fulfillment] claimPayment ${paymentId} failed:`, err);
    return false;
  }
}

function parseItems(meta?: string): StockChange[] {
  return (meta ?? "")
    .split(",")
    .filter(Boolean)
    .map((part) => {
      const [productId, size, quantity] = part.split(":");
      return { productId, size, quantity: Number(quantity) || 1 };
    });
}

/**
 * Finalize a succeeded ЮKassa payment exactly once: mark the order paid,
 * decrement stock, email the customer and post to Telegram.
 *
 * Idempotent — guarded by a `processedPayment.<id>` marker (and the order's own
 * payment status as a backup). Safe to call from BOTH the webhook and the
 * payment-return page, so a missing or late webhook never loses the payment.
 *
 * Returns true if it performed the finalize, false if already done / not paid.
 */
export async function finalizePaidPayment(
  payment: YooKassaPayment
): Promise<boolean> {
  if (payment.status !== "succeeded" || !payment.paid) return false;

  const orderId = payment.metadata?.orderId;

  // Primary idempotency guard (no PII): claim the payment in Postgres.
  if (dbConfigured) {
    const claimed = await claimPayment(payment.id, orderId ?? null);
    if (!claimed) return false; // already processed
  }

  const order = orderId ? await getOrder(orderId) : null;

  // Backup guard when the database isn't configured.
  if (!dbConfigured && order?.paymentStatus === "succeeded") return false;

  if (!order) {
    console.error(
      `[fulfillment] payment ${payment.id} succeeded but order ${
        orderId ?? "—"
      } NOT found`
    );
  }

  const changes = parseItems(payment.metadata?.items);
  if (changes.length) await decrementStock(changes);

  if (order) {
    await markPaid(order.orderId, payment.id);
    await setStockDecremented(order.orderId, true);
    // After payment the order only moves to preparation ("В подготовке").
    // A carrier shipment is NEVER created here — that's a manual admin action.
    await updateStatus(
      order.orderId,
      "processing",
      "Заказ принят в подготовку"
    );
    await sendOrderEmail(
      {
        ...order,
        status: "paid",
        paymentStatus: "succeeded",
        paidAt: new Date().toISOString(),
        paymentId: payment.id,
      },
      "paid"
    );
  }

  await sendTelegram(
    `✅ <b>Заказ ${orderId ?? "—"} оплачен</b> — ${payment.amount.value} ₽`
  );
  return true;
}
