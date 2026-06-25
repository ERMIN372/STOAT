import "server-only";

import {
  DELIVERY_PROVIDER_LABELS,
  ORDER_STATUS_LABELS,
  type Order,
} from "@/lib/orders";
import { formatPrice } from "@/lib/utils";

const API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM;

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_SECURE = process.env.SMTP_SECURE;

const hasResend = Boolean(API_KEY);
const hasSmtp = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);

/**
 * Pick the active email provider.
 * - EMAIL_PROVIDER=resend → Resend
 * - EMAIL_PROVIDER=smtp   → SMTP (Nodemailer)
 * - unset → fall back to whatever is configured (Resend first, then SMTP)
 * - nothing configured → null (emails are skipped, never throw)
 */
function resolveProvider(): "resend" | "smtp" | null {
  const explicit = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  if (explicit === "resend") return hasResend ? "resend" : null;
  if (explicit === "smtp") return hasSmtp ? "smtp" : null;
  if (hasResend) return "resend";
  if (hasSmtp) return "smtp";
  return null;
}

const PROVIDER = resolveProvider();

/** Transactional email is optional — orders never break if it isn't set up. */
export const emailConfigured = Boolean(PROVIDER && FROM);

export type OrderEmailKind =
  | "created"
  | "paid"
  | "shipped"
  | "canceled"
  | "refunded";

const INTRO: Record<OrderEmailKind, string> = {
  created:
    "Спасибо за заказ! Мы приняли его в работу. Детали ниже.",
  paid: "Спасибо за заказ! Мы приняли его в работу.",
  shipped: "Ваш заказ передан в доставку.",
  canceled: "Ваш заказ отменён. Если это ошибка — просто ответьте на письмо.",
  refunded:
    "Мы оформили возврат. Деньги вернутся на счёт в течение нескольких рабочих дней.",
};

/** Day-range like "5–12", collapsing equal bounds. */
function daysRange(min?: number, max?: number): string | null {
  if (min == null) return null;
  const hi = max ?? min;
  return min === hi ? `${min}` : `${min}–${hi}`;
}

const SUBJECT: Record<OrderEmailKind, (o: Order) => string> = {
  created: (o) => `STOAT — заказ ${o.orderId} оформлен`,
  paid: (o) => `STOAT — заказ ${o.orderId} оплачен`,
  shipped: (o) => `STOAT — заказ ${o.orderId} отправлен`,
  canceled: (o) => `STOAT — заказ ${o.orderId} отменён`,
  refunded: (o) => `STOAT — возврат по заказу ${o.orderId}`,
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function body(o: Order, kind: OrderEmailKind): string {
  const rows = o.items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0">${esc(i.name)} — ${esc(i.color)}/${esc(
          i.size
        )} ×${i.quantity}</td><td align="right">${formatPrice(
          i.price * i.quantity
        )}</td></tr>`
    )
    .join("");

  const eta = daysRange(o.delivery?.totalMinDays, o.delivery?.totalMaxDays);
  const providerLabel = o.delivery?.provider
    ? DELIVERY_PROVIDER_LABELS[o.delivery.provider]
    : o.delivery?.label;

  // Preparation + estimated receipt window (shown right after payment/creation).
  const prepBlock =
    kind === "created" || kind === "paid"
      ? `<p style="background:#f5f5f0;border-radius:8px;padding:12px 14px;font-size:14px">
          Обычно подготовка занимает <b>3–7 рабочих дней</b>. После передачи
          заказа в доставку мы отправим трек-номер на e-mail.${
            eta
              ? `<br/>Ориентировочный срок получения: <b>${eta} рабочих дней</b>.`
              : ""
          }
        </p>`
      : "";

  // Shipped block: carrier + tracking.
  const shippedBlock =
    kind === "shipped"
      ? `<p style="background:#f5f5f0;border-radius:8px;padding:12px 14px;font-size:14px">
          Служба доставки: <b>${esc(providerLabel || "—")}</b><br/>
          Трек-номер: <b>${esc(o.trackingNumber || "—")}</b><br/>
          <span style="color:#666">Сохраните его для отслеживания. Срок доставки зависит от выбранной службы и города получения.</span>
        </p>`
      : "";

  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#161616">
    <h1 style="font-size:22px;letter-spacing:3px;margin:0 0 16px">STOAT</h1>
    <p>${INTRO[kind]}</p>
    ${prepBlock}
    <p style="color:#666;font-size:13px">Заказ <b>${esc(
      o.orderId
    )}</b> · статус: ${ORDER_STATUS_LABELS[o.status]}</p>
    <table width="100%" style="border-collapse:collapse;font-size:14px;margin:12px 0">
      ${rows}
      <tr><td style="padding-top:8px;border-top:1px solid #eee">Доставка (${esc(
        o.delivery.label
      )})</td><td align="right" style="padding-top:8px;border-top:1px solid #eee">${
        o.deliveryPrice ? formatPrice(o.deliveryPrice) : "бесплатно"
      }</td></tr>
      <tr><td style="font-weight:700;padding-top:6px">Итого</td><td align="right" style="font-weight:700;padding-top:6px">${formatPrice(
        o.total
      )}</td></tr>
    </table>
    ${shippedBlock}
    <p style="font-size:13px;color:#666">Доставка: ${esc(o.delivery.label)}${
      o.customer.address ? ` · ${esc(o.customer.address)}` : ""
    }</p>
    <p style="font-size:12px;color:#999;margin-top:24px">Письмо по вашему заказу на STOAT. Если вы его не оформляли — проигнорируйте это сообщение.</p>
  </div>`;
}

async function sendViaResend(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Resend ${res.status}: ${await res.text()}`);
  }
}

async function sendViaSmtp(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  // Dynamic import keeps Nodemailer out of any Edge bundle — this module is
  // only ever called from Node.js-runtime routes/actions.
  const nodemailer = (await import("nodemailer")).default;
  const port = Number(SMTP_PORT) || 465;
  // SMTP_SECURE wins if set; otherwise infer from the port (465 = implicit TLS).
  const secure =
    SMTP_SECURE != null ? SMTP_SECURE === "true" : port === 465;
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  await transporter.sendMail({ from: FROM, to, subject, html });
}

async function send(to: string, subject: string, html: string): Promise<void> {
  if (!emailConfigured || !PROVIDER) {
    console.warn(`[email] not configured — skipping "${subject}" to ${to}`);
    return;
  }
  try {
    if (PROVIDER === "smtp") {
      await sendViaSmtp(to, subject, html);
    } else {
      await sendViaResend(to, subject, html);
    }
    console.info(`[email:${PROVIDER}] sent "${subject}" to ${to}`);
  } catch (err) {
    console.error(`[email:${PROVIDER}] send error:`, err);
  }
}

/** Send a transactional order email. Best-effort: failures are logged, not thrown. */
export async function sendOrderEmail(
  order: Order,
  kind: OrderEmailKind
): Promise<void> {
  if (!order.customer?.email) return;
  await send(order.customer.email, SUBJECT[kind](order), body(order, kind));
}
