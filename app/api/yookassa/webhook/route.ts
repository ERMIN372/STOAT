import { NextResponse } from "next/server";

import { decrementStock, type StockChange } from "@/lib/inventory";
import { sendTelegram } from "@/lib/notify";
import { sanityWriteClient } from "@/lib/sanity/write-client";
import { getPayment, yookassaConfigured } from "@/lib/yookassa";

export const runtime = "nodejs";

/**
 * ЮKassa webhook (set the URL to <site>/api/yookassa/webhook in the merchant
 * dashboard → Settings → Notifications). We don't trust the request body: the
 * payment is re-fetched from ЮKassa to confirm its real status.
 *
 * Idempotent: a `processedPayment.<id>` marker is created with `create()`,
 * which throws if it already exists — so retries never double-decrement stock.
 * Always returns 200 so ЮKassa stops retrying once we've accepted it.
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
    // 200 + log: avoid retry storms; transient issues are picked up later.
    return NextResponse.json({ ok: false, verified: false });
  }

  const orderId = payment.metadata?.orderId ?? "—";

  if (payment.status === "succeeded" && payment.paid) {
    // Idempotency guard.
    if (sanityWriteClient) {
      try {
        await sanityWriteClient.create({
          _id: `processedPayment.${payment.id}`,
          _type: "processedPayment",
          orderId,
          paidAt: new Date().toISOString(),
        });
      } catch {
        // Marker exists → already handled.
        return NextResponse.json({ ok: true, duplicate: true });
      }
    }

    const changes: StockChange[] = (payment.metadata?.items ?? "")
      .split(",")
      .filter(Boolean)
      .map((part) => {
        const [productId, size, quantity] = part.split(":");
        return { productId, size, quantity: Number(quantity) || 1 };
      });
    if (changes.length) await decrementStock(changes);

    await sendTelegram(
      `✅ <b>Заказ ${orderId} оплачен</b> — ${payment.amount.value} ₽`
    );
  } else if (payment.status === "canceled") {
    await sendTelegram(`❌ Заказ ${orderId} — оплата отменена`);
  }

  return NextResponse.json({ ok: true });
}
