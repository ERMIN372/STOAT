import { NextResponse } from "next/server";

import { sendOrderEmail } from "@/lib/email";
import { decrementStock, type StockChange } from "@/lib/inventory";
import { sendTelegram } from "@/lib/notify";
import {
  getOrder,
  markCanceled,
  markPaid,
  setStockDecremented,
} from "@/lib/orders";
import { sanityWriteClient } from "@/lib/sanity/write-client";
import { getPayment, yookassaConfigured } from "@/lib/yookassa";

export const runtime = "nodejs";

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
 * ЮKassa webhook (set the URL to <site>/api/yookassa/webhook in the merchant
 * dashboard → Settings → Notifications). The payment is re-fetched from ЮKassa
 * to confirm its real status — we never trust the request body.
 *
 * Idempotent: a `processedPayment.<id>` marker is created with create(), which
 * throws if it already exists, so retries never double-decrement stock or
 * re-email. Always returns 200 so ЮKassa stops retrying once accepted.
 */
export async function POST(req: Request) {
  if (!yookassaConfigured) return NextResponse.json({ ok: true });

  let event: { event?: string; object?: { id?: string } };
  try {
    event = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const paymentId = event?.object?.id;
  if (!paymentId) return NextResponse.json({ ok: true });

  let payment;
  try {
    payment = await getPayment(paymentId);
  } catch (err) {
    console.error("[webhook] could not verify payment:", err);
    return NextResponse.json({ ok: false, verified: false });
  }

  const orderId = payment.metadata?.orderId;
  console.info(
    `[webhook] payment ${payment.id} status=${payment.status} order=${
      orderId ?? "—"
    }`
  );

  if (payment.status === "succeeded" && payment.paid) {
    // Idempotency guard.
    if (sanityWriteClient) {
      try {
        await sanityWriteClient.create({
          _id: `processedPayment.${payment.id}`,
          _type: "processedPayment",
          orderId: orderId ?? null,
          paidAt: new Date().toISOString(),
        });
      } catch {
        return NextResponse.json({ ok: true, duplicate: true });
      }
    }

    const order = orderId ? await getOrder(orderId) : null;
    if (!order) {
      console.error(
        `[webhook] payment ${payment.id} succeeded but order ${
          orderId ?? "—"
        } NOT found`
      );
    }

    const changes = parseItems(payment.metadata?.items);
    if (changes.length) await decrementStock(changes);

    if (order) {
      await markPaid(order.orderId, payment.id);
      await setStockDecremented(order.orderId, true);
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
  } else if (payment.status === "canceled") {
    const order = orderId ? await getOrder(orderId) : null;
    if (order) {
      await markCanceled(order.orderId);
      await sendOrderEmail({ ...order, status: "canceled" }, "canceled");
    }
    await sendTelegram(`❌ Заказ ${orderId ?? "—"} — оплата отменена`);
  }

  return NextResponse.json({ ok: true });
}
