import "server-only";

const SHOP_ID = process.env.YOOKASSA_SHOP_ID;
const SECRET_KEY = process.env.YOOKASSA_SECRET_KEY;
const API = "https://api.yookassa.ru/v3";

/** True once ЮKassa keys are present. Until then the store runs in
 *  "приём заявок" mode (no online payment). */
export const yookassaConfigured = Boolean(SHOP_ID && SECRET_KEY);

function authHeader(): string {
  return "Basic " + Buffer.from(`${SHOP_ID}:${SECRET_KEY}`).toString("base64");
}

export interface YooKassaReceiptItem {
  description: string;
  quantity: string;
  amount: { value: string; currency: "RUB" };
  vat_code: number;
  payment_mode?: string;
  payment_subject?: string;
}

export interface YooKassaReceipt {
  customer: { email?: string; phone?: string };
  items: YooKassaReceiptItem[];
}

export interface CreatePaymentInput {
  orderId: string;
  /** Amount in rubles (e.g. 5480). */
  amount: number;
  description: string;
  returnUrl: string;
  metadata?: Record<string, string>;
  receipt?: YooKassaReceipt;
}

export interface YooKassaPayment {
  id: string;
  status: "pending" | "waiting_for_capture" | "succeeded" | "canceled";
  paid: boolean;
  amount: { value: string; currency: string };
  confirmation?: { type: string; confirmation_url?: string };
  metadata?: Record<string, string>;
}

/**
 * Create a ЮKassa payment and return it (incl. confirmation_url to redirect to).
 * Docs: https://yookassa.ru/developers/api#create_payment
 */
export async function createPayment(
  input: CreatePaymentInput
): Promise<YooKassaPayment> {
  if (!yookassaConfigured) {
    throw new Error("ЮKassa не настроена (YOOKASSA_SHOP_ID / YOOKASSA_SECRET_KEY)");
  }

  const body: Record<string, unknown> = {
    amount: { value: input.amount.toFixed(2), currency: "RUB" },
    capture: true,
    confirmation: { type: "redirect", return_url: input.returnUrl },
    description: input.description.slice(0, 128),
    metadata: { orderId: input.orderId, ...input.metadata },
  };
  if (input.receipt) body.receipt = input.receipt;

  const res = await fetch(`${API}/payments`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      // Idempotence-Key prevents duplicate charges on retries.
      "Idempotence-Key": input.orderId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`ЮKassa create payment ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

/** Fetch a payment by id — used to verify webhook notifications. */
export async function getPayment(paymentId: string): Promise<YooKassaPayment> {
  if (!yookassaConfigured) throw new Error("ЮKassa не настроена");
  const res = await fetch(`${API}/payments/${paymentId}`, {
    headers: { Authorization: authHeader() },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`ЮKassa get payment ${res.status}`);
  return res.json();
}
