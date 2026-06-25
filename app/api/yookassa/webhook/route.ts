import { NextResponse } from "next/server";

import { sendOrderEmail } from "@/lib/email";
import { finalizePaidPayment } from "@/lib/fulfillment";
import { sendTelegram } from "@/lib/notify";
import { getOrder, markCanceled } from "@/lib/orders";
import { getPayment, yookassaConfigured } from "@/lib/yookassa";

export const runtime = "nodejs";

/**
 * ЮKassa webhook (set the URL to <site>/api/yookassa/webhook in the merchant
 * dashboard → Настройки → HTTP-уведомления). The payment is re-fetched from
 * ЮKassa to confirm its real status — we never trust the request body.
 *
 * Paid handling is shared with the payment-return page via finalizePaidPayment
 * (idempotent), so a missing/late webhook can't lose the payment. Always
 * returns 200 so ЮKassa stops retrying once accepted.
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
    await finalizePaidPayment(payment);
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
