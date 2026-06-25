import type {
  DeliveryMethodId,
  DeliveryProvider,
  DeliveryQuote,
} from "@/lib/delivery/types";

/** Customer-entered contact details (delivery lives in its own object now). */
export interface CustomerDetails {
  name: string;
  phone: string;
  email: string;
  comment?: string;
}

/**
 * The delivery option chosen in checkout. The server NEVER trusts `price`/days
 * from here — it recomputes the quote from `provider`/`method` + destination.
 */
export interface DeliverySelectionInput {
  provider: DeliveryProvider;
  method: DeliveryMethodId;
  label: string;
  city: string;
  address?: string;
  postalCode?: string;
  /** CDEK pickup point (required for the "cdek_pvz" method). */
  pvzCode?: string;
  pvzAddress?: string;
  /** Price the client saw — for comparison/logging only. */
  price?: number;
}

/** One requested variant. Prices/stock are recomputed server-side. */
export interface CheckoutItemInput {
  productId: string;
  color: string;
  size: string;
  quantity: number;
}

/** Legal consents captured at checkout. */
export interface CheckoutConsents {
  /** Agreement with the public offer (required). */
  offer: boolean;
  /** Agreement to process personal data (required). */
  personalData: boolean;
  /** Opt-in to news/updates (optional). */
  marketing: boolean;
}

export interface CheckoutRequest {
  customer: CustomerDetails;
  delivery: DeliverySelectionInput;
  items: CheckoutItemInput[];
  consents: CheckoutConsents;
}

export type OrderResult =
  | { ok: true; orderId: string; redirectUrl?: string | null }
  | { ok: false; error: string };

/** Fetch delivery quotes for the current destination + cart. */
export async function fetchDeliveryQuotes(input: {
  city: string;
  address?: string;
  postalCode?: string;
  items: CheckoutItemInput[];
}): Promise<{ quotes: DeliveryQuote[]; notices?: string[]; error?: string }> {
  try {
    const res = await fetch("/api/delivery/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      return {
        quotes: data?.quotes ?? [],
        notices: data?.notices,
        error: data?.error ?? "Не удалось рассчитать доставку",
      };
    }
    return { quotes: data.quotes ?? [], notices: data.notices };
  } catch (err) {
    return {
      quotes: [],
      error: err instanceof Error ? err.message : "Сеть недоступна",
    };
  }
}

/**
 * Submit an order to the server (`app/api/checkout`).
 *
 * The route revalidates the cart and the delivery quote, persists the order,
 * and — when ЮKassa keys are configured — creates a payment and returns
 * `redirectUrl`. Without keys it returns `redirectUrl: null` (order accepted as
 * a request). Secrets live only on the server.
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
