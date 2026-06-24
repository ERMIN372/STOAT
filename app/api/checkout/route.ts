import { NextResponse } from "next/server";

import { seller } from "@/data/legal";
import { getAllProducts } from "@/lib/catalog";
import { sendOrderEmail } from "@/lib/email";
import { escapeHtml, sendTelegram } from "@/lib/notify";
import { DELIVERY_OPTIONS, type CheckoutRequest } from "@/lib/order";
import {
  createOrder,
  setPaymentId,
  type OrderConsents,
  type OrderItem,
} from "@/lib/orders";
import { formatPrice, getSizeStock, isSizeInStock } from "@/lib/utils";
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

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const phoneDigits = (s: string) => s.replace(/\D/g, "");

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

/**
 * Checkout. Validates everything server-side (prices, stock, consents),
 * PERSISTS the order before payment, then — when ЮKassa is configured — creates
 * a payment and returns its confirmation URL. Without keys the order is accepted
 * as a request. Notifications (Telegram/email) are best-effort and never block.
 */
export async function POST(req: Request) {
  let body: CheckoutRequest;
  try {
    body = (await req.json()) as CheckoutRequest;
  } catch {
    return bad("Некорректный запрос");
  }

  const { customer, items, consents } = body ?? {};

  // --- contact + consent validation ---
  if (!customer?.name?.trim()) return bad("Укажите имя");
  if (!customer.phone || phoneDigits(customer.phone).length < 10)
    return bad("Укажите корректный телефон");
  if (!customer.email || !isEmail(customer.email))
    return bad("Укажите корректный e-mail");
  if (!items?.length) return bad("Корзина пуста");
  if (!consents?.offer || !consents?.personalData)
    return bad("Подтвердите согласие с офертой и обработкой данных");

  const delivery =
    DELIVERY_OPTIONS.find((d) => d.value === customer.delivery) ??
    DELIVERY_OPTIONS[0];
  if (delivery.value !== "pickup" && !customer.address?.trim())
    return bad("Укажите адрес доставки");

  // --- re-price + stock check from the live catalogue ---
  const catalog = await getAllProducts();
  const lineItems: OrderItem[] = [];

  for (const it of items) {
    const product = catalog.find((p) => p.id === it.productId);
    if (!product) return bad(`Товар не найден: ${it.productId}`);
    if (!product.inStock || !isSizeInStock(product, it.size))
      return bad(`Нет в наличии: ${product.name} (${it.size})`, 409);

    const qty = Math.max(1, Math.min(99, Math.floor(it.quantity)));
    const available = getSizeStock(product, it.size);
    if (available !== null && qty > available)
      return bad(
        `Недостаточно на складе: ${product.name} (${it.size}) — доступно ${available}`,
        409
      );

    lineItems.push({
      productId: product.id,
      name: product.name,
      color: it.color,
      size: it.size,
      quantity: qty,
      price: product.price,
    });
  }

  const subtotal = lineItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const total = subtotal + delivery.price;
  const orderId = generateOrderId();

  const orderConsents: OrderConsents = {
    offer: Boolean(consents.offer),
    personalData: Boolean(consents.personalData),
    marketing: Boolean(consents.marketing),
    acceptedAt: new Date().toISOString(),
    docVersion: seller.updatedAt,
  };

  // --- persist the order BEFORE creating the payment (never lose it) ---
  const order = await createOrder({
    orderId,
    customer: {
      name: customer.name.trim(),
      phone: customer.phone.trim(),
      email: customer.email.trim(),
      address: customer.address?.trim() ?? "",
      comment: customer.comment?.trim() || undefined,
    },
    delivery: { method: delivery.value, label: delivery.label, price: delivery.price },
    items: lineItems,
    subtotal,
    deliveryPrice: delivery.price,
    total,
    consents: orderConsents,
  });

  // Notify the owner immediately (best-effort).
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

  // No keys yet → accept as a request and email the customer.
  if (!yookassaConfigured) {
    await sendOrderEmail(order, "created");
    return NextResponse.json({ ok: true, orderId, redirectUrl: null });
  }

  // Optional fiscal receipt (54-ФЗ). Enable with YOOKASSA_SEND_RECEIPT=true.
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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;

  try {
    const payment = await createPayment({
      orderId,
      amount: total,
      description: `STOAT заказ ${orderId}`,
      returnUrl: `${siteUrl}/checkout/success?order=${orderId}`,
      // Compact metadata the webhook uses to find the order + decrement stock.
      metadata: {
        items: lineItems
          .map((i) => `${i.productId}:${i.size}:${i.quantity}`)
          .join(","),
      },
      receipt,
    });

    await setPaymentId(orderId, payment.id);
    console.info(`[checkout] order ${orderId} → payment ${payment.id}`);

    const url = payment.confirmation?.confirmation_url;
    if (!url) return bad("ЮKassa не вернула ссылку на оплату", 502);
    return NextResponse.json({ ok: true, orderId, redirectUrl: url });
  } catch (err) {
    console.error("[checkout] payment error:", err);
    return bad("Не удалось создать платёж. Попробуйте позже.", 502);
  }
}
