import "server-only";

import { sendOrderEmail } from "@/lib/email";
import { decrementStock, type StockChange } from "@/lib/inventory";
import { sendTelegram } from "@/lib/notify";
import {
  getOrder,
  markPaid,
  setStockDecremented,
  updateStatus,
} from "@/lib/orders";
import { sanityWriteClient } from "@/lib/sanity/write-client";
import type { YooKassaPayment } from "@/lib/yookassa";

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

  // Primary idempotency guard (no PII — lives in the catalogue dataset).
  if (sanityWriteClient) {
    try {
      await sanityWriteClient.create({
        _id: `processedPayment.${payment.id}`,
        _type: "processedPayment",
        orderId: payment.metadata?.orderId ?? null,
        paidAt: new Date().toISOString(),
      });
    } catch {
      return false; // marker exists → already processed
    }
  }

  const orderId = payment.metadata?.orderId;
  const order = orderId ? await getOrder(orderId) : null;

  // Backup guard when no write client / marker is available.
  if (!sanityWriteClient && order?.paymentStatus === "succeeded") return false;

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
