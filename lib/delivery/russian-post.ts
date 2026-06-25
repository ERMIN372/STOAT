import "server-only";

/**
 * Russian Post (Почта России) — Otpravka API client.
 *
 * Docs: https://otpravka.pochta.ru/specification
 * - Tariff calculation: POST https://otpravka-api.pochta.ru/1.0/tariff
 *   Auth: header `Authorization: AccessToken <token>` +
 *         header `X-User-Authorization: Basic <base64(login:password)>`.
 * - Shipment creation is prepared from the admin (manually), never on payment.
 *
 * Degrades gracefully: missing keys or API errors → null, logged, checkout
 * unaffected.
 */

const TOKEN = process.env.RUSSIAN_POST_TOKEN;
const AUTH_LOGIN = process.env.RUSSIAN_POST_LOGIN;
const AUTH_PASSWORD = process.env.RUSSIAN_POST_PASSWORD;
/** Pre-encoded Basic value (base64 of login:password) — alternative to login/pass. */
const AUTH_KEY = process.env.RUSSIAN_POST_AUTH_KEY;

export const RUSSIAN_POST_FROM_POSTAL =
  process.env.RUSSIAN_POST_FROM_POSTAL_CODE || "";
export const RUSSIAN_POST_FROM_CITY =
  process.env.RUSSIAN_POST_FROM_CITY || "Москва";

/** Default mail type/category. POSTAL_PARCEL + ORDINARY are sane MVP defaults. */
const MAIL_TYPE = process.env.RUSSIAN_POST_MAIL_TYPE || "POSTAL_PARCEL";
const MAIL_CATEGORY = process.env.RUSSIAN_POST_MAIL_CATEGORY || "ORDINARY";

const BASE = "https://otpravka-api.pochta.ru";

function userAuth(): string | null {
  if (AUTH_KEY) return `Basic ${AUTH_KEY}`;
  if (AUTH_LOGIN && AUTH_PASSWORD) {
    return (
      "Basic " +
      Buffer.from(`${AUTH_LOGIN}:${AUTH_PASSWORD}`).toString("base64")
    );
  }
  return null;
}

export const russianPostConfigured = Boolean(
  TOKEN && RUSSIAN_POST_FROM_POSTAL && userAuth()
);

export interface RussianPostTariff {
  /** Final price in rubles (converted from API kopecks). */
  price: number;
  deliveryMinDays: number;
  deliveryMaxDays: number;
  mailType: string;
}

/**
 * Calculate a parcel tariff to a destination postcode. Russian Post needs a
 * valid index for an accurate result — without one we cannot quote.
 */
export async function calculateRussianPostTariff(params: {
  toPostalCode: string;
  weightGrams: number;
  declaredValueRub?: number;
  dimensions?: { lengthCm: number; widthCm: number; heightCm: number };
}): Promise<RussianPostTariff | null> {
  const auth = userAuth();
  if (!TOKEN || !auth || !RUSSIAN_POST_FROM_POSTAL) return null;
  if (!/^\d{6}$/.test(params.toPostalCode)) return null;

  const body: Record<string, unknown> = {
    "index-from": Number(RUSSIAN_POST_FROM_POSTAL),
    "index-to": Number(params.toPostalCode),
    "mail-category": MAIL_CATEGORY,
    "mail-type": MAIL_TYPE,
    mass: Math.max(1, Math.round(params.weightGrams)),
  };
  if (params.declaredValueRub != null) {
    body["declared-value"] = Math.round(params.declaredValueRub * 100);
  }
  if (params.dimensions) {
    body.dimension = {
      height: Math.round(params.dimensions.heightCm),
      length: Math.round(params.dimensions.lengthCm),
      width: Math.round(params.dimensions.widthCm),
    };
  }

  try {
    const res = await fetch(`${BASE}/1.0/tariff`, {
      method: "POST",
      headers: {
        Authorization: `AccessToken ${TOKEN}`,
        "X-User-Authorization": auth,
        "Content-Type": "application/json;charset=UTF-8",
        Accept: "application/json;charset=UTF-8",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`[pochta] tariff ${res.status}: ${await res.text()}`);
      return null;
    }
    const data = (await res.json()) as {
      "total-rate"?: number;
      "total-vat"?: number;
      "delivery-time"?: { "min-days"?: number; "max-days"?: number };
    };
    const rateKopecks = (data["total-rate"] ?? 0) + (data["total-vat"] ?? 0);
    if (!rateKopecks) return null;
    const dt = data["delivery-time"] ?? {};
    const min = dt["min-days"] ?? 0;
    const max = dt["max-days"] ?? min;
    return {
      price: Math.round(rateKopecks / 100),
      deliveryMinDays: min,
      deliveryMaxDays: max || min,
      mailType: MAIL_TYPE,
    };
  } catch (err) {
    console.error("[pochta] tariff error:", err);
    return null;
  }
}

/**
 * Prepare shipment order data for Russian Post (Otpravka "backlog" order).
 * Called manually from the admin. Returns the created order id (barcode is
 * assigned later in the Otpravka cabinet), or null on failure.
 */
export async function createRussianPostShipment(input: {
  orderId: string;
  recipient: { name: string; phone: string };
  toPostalCode: string;
  toAddress: string;
  weightGrams: number;
  declaredValueRub: number;
}): Promise<{ shipmentId: string; barcode?: string } | null> {
  const auth = userAuth();
  if (!TOKEN || !auth) return null;

  const [givenName, ...rest] = input.recipient.name.trim().split(/\s+/);
  const body = [
    {
      "address-type-to": "DEFAULT",
      "given-name": givenName || input.recipient.name,
      surname: rest.join(" ") || "—",
      "index-to": Number(input.toPostalCode),
      "mail-category": MAIL_CATEGORY,
      "mail-type": MAIL_TYPE,
      "mass": Math.max(1, Math.round(input.weightGrams)),
      "order-num": input.orderId,
      "place-to": input.toAddress,
      "tel-address": Number(input.recipient.phone.replace(/\D/g, "")) || undefined,
      "insr-value": Math.round(input.declaredValueRub * 100),
    },
  ];

  try {
    const res = await fetch(`${BASE}/1.0/user/backlog`, {
      method: "PUT",
      headers: {
        Authorization: `AccessToken ${TOKEN}`,
        "X-User-Authorization": auth,
        "Content-Type": "application/json;charset=UTF-8",
        Accept: "application/json;charset=UTF-8",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`[pochta] backlog ${res.status}: ${await res.text()}`);
      return null;
    }
    const data = (await res.json()) as {
      "result-ids"?: number[];
      errors?: unknown[];
    };
    const id = data["result-ids"]?.[0];
    if (id == null) return null;
    return { shipmentId: String(id) };
  } catch (err) {
    console.error("[pochta] backlog error:", err);
    return null;
  }
}
