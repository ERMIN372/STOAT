import { NextResponse } from "next/server";

import { seller } from "@/data/legal";
import { getAllProducts } from "@/lib/catalog";
import { recomputeQuote } from "@/lib/delivery/engine";
import { buildParcel, type ParcelLine } from "@/lib/delivery/parcel";
import { sendOrderEmail } from "@/lib/email";
import { escapeHtml, sendTelegram } from "@/lib/notify";
import { formatDaysRange } from "@/lib/delivery/config";
import type { CheckoutRequest } from "@/lib/order";
import {
  createOrder,
  setPaymentId,
  type OrderConsents,
  type OrderDelivery,
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
 * Checkout. Validates everything server-side (contact, stock, consents AND the
 * delivery quote — never trusting the client's price), PERSISTS the order before
 * payment, then — when ЮKassa is configured — creates a payment and returns its
 * confirmation URL. Notifications (Telegram/email) are best-effort.
 */
export async function POST(req: Request) {
  let body: CheckoutRequest;
  try {
    body = (await req.json()) as CheckoutRequest;
  } catch {
    return bad("Некорректный запрос");
  }

  const { customer, delivery, items, consents } = body ?? {};

  // --- contact + consent validation ---
  if (!customer?.name?.trim()) return bad("Укажите имя");
  if (!customer.phone || phoneDigits(customer.phone).length < 10)
    return bad("Укажите корректный телефон");
  if (!customer.email || !isEmail(customer.email))
    return bad("Укажите корректный e-mail");
  if (!items?.length) return bad("Корзина пуста");
  if (!consents?.offer || !consents?.personalData)
    return bad("Подтвердите согласие с офертой и обработкой данных");

  // --- delivery selection validation ---
  if (!delivery?.method || !delivery.provider)
    return bad("Выберите способ доставки");
  if (delivery.provider !== "pickup") {
    if (!delivery.city?.trim()) return bad("Укажите город доставки");
    if (delivery.method === "cdek_pvz" && !delivery.pvzCode)
      return bad("Выберите пункт выдачи СДЭК");
    if (delivery.method === "cdek_courier" && !delivery.address?.trim())
      return bad("Укажите адрес для курьерской доставки");
    if (
      delivery.method === "russian_post" &&
      !/^\d{6}$/.test(delivery.postalCode?.trim() ?? "")
    )
      return bad("Укажите индекс (6 цифр) для Почты России");
  }

  // --- re-price + stock check from the live catalogue ---
  const catalog = await getAllProducts();
  const lineItems: OrderItem[] = [];
  const parcelLines: ParcelLine[] = [];

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
    parcelLines.push({ product, quantity: qty });
  }

  const subtotal = lineItems.reduce((s, i) => s + i.price * i.quantity, 0);

  // --- recompute the delivery quote server-side (do NOT trust client price) ---
  const parcel = buildParcel(parcelLines);
  const quote = await recomputeQuote(
    delivery.method,
    {
      city: delivery.city?.trim() ?? "",
      address: delivery.address?.trim(),
      postalCode: delivery.postalCode?.trim(),
    },
    parcel,
    subtotal
  );

  if (!quote) {
    return bad(
      "Не удалось подтвердить стоимость доставки. Обновите расчёт и попробуйте снова.",
      409
    );
  }

  const deliveryPrice = quote.price;
  const total = subtotal + deliveryPrice;
  const orderId = generateOrderId();

  const orderDelivery: OrderDelivery = {
    provider: quote.provider,
    method: quote.method,
    label: quote.label,
    price: quote.price,
    deliveryMinDays: quote.deliveryMinDays,
    deliveryMaxDays: quote.deliveryMaxDays,
    productionMinDays: quote.productionMinDays,
    productionMaxDays: quote.productionMaxDays,
    totalMinDays: quote.totalMinDays,
    totalMaxDays: quote.totalMaxDays,
    city: delivery.city?.trim() || undefined,
    address: delivery.address?.trim() || undefined,
    postalCode: delivery.postalCode?.trim() || undefined,
    pvzCode: delivery.pvzCode || undefined,
    pvzAddress: delivery.pvzAddress || undefined,
    tariffCode: quote.tariffCode,
    weightGrams: parcel.weightGrams,
    lengthCm: parcel.lengthCm,
    widthCm: parcel.widthCm,
    heightCm: parcel.heightCm,
  };

  // A readable single-line address for the order record / notifications.
  const addressLine =
    orderDelivery.pvzAddress ||
    [orderDelivery.postalCode, orderDelivery.city, orderDelivery.address]
      .filter(Boolean)
      .join(", ");

  const orderConsents: OrderConsents = {
    offer: Boolean(consents.offer),
    personalData: Boolean(consents.personalData),
    marketing: Boolean(consents.marketing),
    acceptedAt: new Date().toISOString(),
    docVersion: seller.updatedAt,
  };

  // --- persist the order BEFORE creating the payment (never lose it) ---
  const { order, persisted } = await createOrder({
    orderId,
    customer: {
      name: customer.name.trim(),
      phone: customer.phone.trim(),
      email: customer.email.trim(),
      address: addressLine,
      comment: customer.comment?.trim() || undefined,
    },
    delivery: orderDelivery,
    items: lineItems,
    subtotal,
    deliveryPrice,
    total,
    consents: orderConsents,
  });

  // A payment must NEVER be created without a saved order.
  if (yookassaConfigured && !persisted) {
    console.error(
      `[checkout] order ${orderId} NOT persisted — refusing to create payment`
    );
    await sendTelegram(
      `⚠️ Заказ ${orderId} НЕ сохранён в БД — платёж не создан. ` +
        `Проверьте DATABASE_URL (Postgres в РФ) и выполните миграцию.`
    );
    return bad(
      "Не удалось оформить заказ. Попробуйте позже или свяжитесь с нами.",
      503
    );
  }

  // Notify the owner of the new order (best-effort).
  const itemsText = lineItems
    .map(
      (i) =>
        `• ${escapeHtml(i.name)} — ${escapeHtml(i.color)}/${escapeHtml(
          i.size
        )} ×${i.quantity} — ${formatPrice(i.price * i.quantity)}`
    )
    .join("\n");
  const etaText =
    orderDelivery.totalMinDays != null
      ? `\n🕒 Срок получения: ${formatDaysRange(
          orderDelivery.totalMinDays,
          orderDelivery.totalMaxDays ?? orderDelivery.totalMinDays
        )}`
      : "";
  await sendTelegram(
    `🆕 <b>Новый заказ ${orderId}</b>\n${itemsText}\n` +
      `Доставка: ${escapeHtml(quote.label)} — ${
        deliveryPrice ? formatPrice(deliveryPrice) : "бесплатно"
      }${etaText}\n<b>Итого: ${formatPrice(total)}</b>\n\n` +
      `👤 ${escapeHtml(customer.name)}\n📞 ${escapeHtml(customer.phone)}\n` +
      `✉️ ${escapeHtml(customer.email)}\n📦 ${escapeHtml(addressLine || "—")}\n` +
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
        ...(deliveryPrice > 0
          ? [
              {
                description: `Доставка (${quote.label})`,
                quantity: "1.000",
                amount: {
                  value: deliveryPrice.toFixed(2),
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
