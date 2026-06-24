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

/** One requested variant. Prices/stock are recomputed server-side. */
export interface CheckoutItemInput {
  productId: string;
  color: string;
  size: string;
  quantity: number;
}

export interface CheckoutRequest {
  customer: CustomerDetails;
  items: CheckoutItemInput[];
}

export type OrderResult =
  | { ok: true; orderId: string; redirectUrl?: string | null }
  | { ok: false; error: string };

/**
 * Submit an order to the server (`app/api/checkout`).
 *
 * The route validates the cart, notifies the owner, and — when ЮKassa keys are
 * configured — creates a payment and returns `redirectUrl` (the ЮKassa
 * confirmation page). Without keys it returns `redirectUrl: null` and the order
 * is accepted as a request ("заявка"). Secrets live only on the server.
 */
export async function submitOrder(
  request: CheckoutRequest
): Promise<OrderResult> {
  try {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      return {
        ok: false,
        error: data?.error ?? "Не удалось оформить заказ",
      };
    }
    return {
      ok: true,
      orderId: data.orderId,
      redirectUrl: data.redirectUrl ?? null,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Сеть недоступна",
    };
  }
}
