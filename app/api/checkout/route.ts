import { NextResponse } from "next/server";

import { getAllProducts } from "@/lib/catalog";
import { DELIVERY_OPTIONS, type CheckoutRequest } from "@/lib/order";
import { escapeHtml, sendTelegram } from "@/lib/notify";
import { formatPrice, isSizeInStock } from "@/lib/utils";
import {
  createPayment,
  yookassaConfigured,
  type YooKassaReceipt,
} from "@/lib/yookassa";

export const runtime = "nodejs";

function generateOrderId(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `STOAT-${stamp}-${rand}`;
}

/**
 * Checkout: validates the cart server-side (never trusts client prices),
 * notifies the owner, and — if ЮKassa is configured — creates a payment and
 * returns its confirmation URL. Without keys it accepts the order as a request.
 */
export async function POST(req: Request) {
  let body: CheckoutRequest;
  try {
    body = (await req.json()) as CheckoutRequest;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Некорректный запрос" },
      { status: 400 }
    );
  }

  const { customer, items } = body ?? {};
  if (!customer?.name || !customer?.phone || !customer?.email || !items?.length) {
    return NextResponse.json(
      { ok: false, error: "Заполните контактные данные и добавьте товары" },
      { status: 400 }
    );
  }

  // Re-price everything from the live catalogue.
  const catalog = await getAllProducts();
  const lineItems: {
    productId: string;
    name: string;
    color: string;
    size: string;
    quantity: number;
    price: number;
  }[] = [];

  for (const it of items) {
    const product = catalog.find((p) => p.id === it.productId);
    if (!product) {
      return NextResponse.json(
        { ok: false, error: `Товар не найден: ${it.productId}` },
        { status: 400 }
      );
    }
    if (!product.inStock || !isSizeInStock(product, it.size)) {
      return NextResponse.json(
        { ok: false, error: `Нет в наличии: ${product.name} (${it.size})` },
        { status: 409 }
      );
    }
    lineItems.push({
      productId: product.id,
      name: product.name,
      color: it.color,
      size: it.size,
      quantity: Math.max(1, Math.min(99, Math.floor(it.quantity))),
      price: product.price,
    });
  }

  const subtotal = lineItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const delivery =
    DELIVERY_OPTIONS.find((d) => d.value === customer.delivery) ??
    DELIVERY_OPTIONS[0];
  const total = subtotal + delivery.price;
  const orderId = generateOrderId();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;

  // Notify the owner immediately — works even before payment is wired up.
  const itemsText = lineItems
    .map(
      (i) =>
        `• ${escapeHtml(i.name)} — ${escapeHtml(i.color)}/${escapeHtml(
          i.size
        )} ×${i.quantity} — ${formatPrice(i.price * i.quantity)}`
    )
    .join("\n");
  await sendTelegram(
    `🆕 <b>Новый заказ ${orderId}</b>\n${itemsText}\n` +
      `Доставка: ${delivery.label} — ${
        delivery.price ? formatPrice(delivery.price) : "бесплатно"
      }\n<b>Итого: ${formatPrice(total)}</b>\n\n` +
      `👤 ${escapeHtml(customer.name)}\n📞 ${escapeHtml(customer.phone)}\n` +
      `✉️ ${escapeHtml(customer.email)}\n📦 ${escapeHtml(
        customer.address || "—"
      )}\n` +
      (customer.comment ? `📝 ${escapeHtml(customer.comment)}\n` : "") +
      (yookassaConfigured
        ? "\n⏳ Ожидает оплаты"
        : "\n⚠️ Оплата при подтверждении (ЮKassa не подключена)")
  );

  // No keys yet → accept as a request ("заявка").
  if (!yookassaConfigured) {
    return NextResponse.json({ ok: true, orderId, redirectUrl: null });
  }

  // Optional fiscal receipt (54-ФЗ). Enable with YOOKASSA_SEND_RECEIPT=true.
  // vat_code 1 = без НДС (typical for самозанятый / УСН). Adjust per your taxes.
  let receipt: YooKassaReceipt | undefined;
  if (process.env.YOOKASSA_SEND_RECEIPT === "true") {
    const vat = Number(process.env.YOOKASSA_VAT_CODE || "1");
    receipt = {
      customer: { email: customer.email, phone: customer.phone },
      items: [
        ...lineItems.map((i) => ({
          description: `${i.name} (${i.color}/${i.size})`.slice(0, 128),
          quantity: i.quantity.toFixed(3),
          amount: { value: i.price.toFixed(2), currency: "RUB" as const },
          vat_code: vat,
          payment_mode: "full_payment",
          payment_subject: "commodity",
        })),
        ...(delivery.price > 0
          ? [
              {
                description: `Доставка (${delivery.label})`,
                quantity: "1.000",
                amount: {
                  value: delivery.price.toFixed(2),
                  currency: "RUB" as const,
                },
                vat_code: vat,
                payment_mode: "full_payment",
                payment_subject: "service",
              },
            ]
          : []),
      ],
    };
  }

  try {
    const payment = await createPayment({
      orderId,
      amount: total,
      description: `STOAT заказ ${orderId}`,
      returnUrl: `${siteUrl}/checkout/success?order=${orderId}`,
      // Compact, PII-light metadata the webhook uses to decrement stock.
      metadata: {
        customer_name: customer.name.slice(0, 100),
        customer_phone: customer.phone.slice(0, 32),
        delivery: delivery.label,
        items: lineItems
          .map((i) => `${i.productId}:${i.size}:${i.quantity}`)
          .join(","),
      },
      receipt,
    });

    const url = payment.confirmation?.confirmation_url;
    if (!url) {
      return NextResponse.json(
        { ok: false, error: "ЮKassa не вернула ссылку на оплату" },
        { status: 502 }
      );
    }
    return NextResponse.json({ ok: true, orderId, redirectUrl: url });
  } catch (err) {
    console.error("[checkout] payment error:", err);
    return NextResponse.json(
      { ok: false, error: "Не удалось создать платёж. Попробуйте позже." },
      { status: 502 }
    );
  }
}
