import type { CartItem } from "@/types";

export type DeliveryMethod = "courier" | "pickup" | "post";

export const DELIVERY_OPTIONS: {
  value: DeliveryMethod;
  label: string;
  price: number;
  hint: string;
}[] = [
  { value: "courier", label: "Курьер", price: 390, hint: "1–2 дня по городу" },
  { value: "pickup", label: "Самовывоз", price: 0, hint: "Пункт выдачи STOAT" },
  { value: "post", label: "Почта / СДЭК", price: 290, hint: "3–7 дней по России" },
];

/** Customer-entered checkout details. */
export interface CustomerDetails {
  name: string;
  phone: string;
  email: string;
  address: string;
  delivery: DeliveryMethod;
  comment?: string;
}

/** Everything needed to fulfil an order. */
export interface OrderPayload {
  customer: CustomerDetails;
  items: CartItem[];
  /** Goods subtotal (without delivery). */
  subtotal: number;
  deliveryPrice: number;
  /** subtotal + deliveryPrice. */
  total: number;
}

export type OrderResult =
  | { ok: true; orderId: string }
  | { ok: false; error: string };

/**
 * Submit an order.
 *
 * ⚠️ Payment is intentionally NOT wired up at launch. This is a stub that
 * "sends" the order somewhere a human can pick it up (email / Telegram) and
 * returns a fake order id. It is the single seam for going live:
 *
 *  1) Real notification — POST the payload to a Next.js Route Handler
 *     (e.g. `app/api/order/route.ts`) that forwards it to:
 *       • email   — Resend / Nodemailer / a transactional provider, or
 *       • Telegram — `https://api.telegram.org/bot<token>/sendMessage`
 *                    (read token + chat id from server-side env vars).
 *
 *  2) Real payment — instead of returning here, create a ЮKassa payment and
 *     redirect the customer to its confirmation URL:
 *
 *       // const payment = await yooKassa.createPayment({
 *       //   amount: { value: total.toFixed(2), currency: "RUB" },
 *       //   confirmation: { type: "redirect", return_url: "<order-status>" },
 *       //   capture: true,
 *       //   description: `STOAT заказ ${orderId}`,
 *       //   metadata: { orderId },
 *       // });
 *       // return { ok: true, orderId, redirectUrl: payment.confirmation.confirmation_url };
 *
 *     Keep secrets server-side only — never ship the ЮKassa secret key to the
 *     client. This function would then call the Route Handler from the browser.
 */
export async function submitOrder(payload: OrderPayload): Promise<OrderResult> {
  try {
    // Human-readable order id; replace with one from your backend / ЮKassa.
    const orderId = `STOAT-${Date.now().toString(36).toUpperCase()}`;

    // Simulate the network round-trip to the notification channel.
    await new Promise((resolve) => setTimeout(resolve, 900));

    // Until a backend exists, surface the payload in the console so it's
    // verifiable during development. Remove once a Route Handler is in place.
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.info("[submitOrder] (stub) order received:", { orderId, ...payload });
    }

    return { ok: true, orderId };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Не удалось оформить заказ",
    };
  }
}
