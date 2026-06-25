import "server-only";

/**
 * CDEK API v2 client.
 *
 * Docs: https://api-docs.cdek.ru/33828739.html
 * - OAuth2 client_credentials for auth (token cached in-memory ~1h).
 * - /calculator/tarifflist for price + delivery period.
 * - /deliverypoints for PVZ (pickup point) search.
 * - /orders to create a shipment (called manually from the admin, never on pay).
 *
 * Everything degrades gracefully: when keys are missing or the API errors, the
 * caller gets null / [] and logs — checkout never throws.
 */

const CLIENT_ID = process.env.CDEK_CLIENT_ID;
const CLIENT_SECRET = process.env.CDEK_CLIENT_SECRET;

/** test = sandbox (api.edu.cdek.ru), anything else = production. */
const MODE = (process.env.CDEK_MODE || "production").toLowerCase();
const BASE =
  MODE === "test"
    ? "https://api.edu.cdek.ru/v2"
    : "https://api.cdek.ru/v2";

/** Sender location. City code is CDEK's numeric location code (e.g. Москва=44). */
export const CDEK_FROM_CITY_CODE = process.env.CDEK_FROM_CITY_CODE || "";
export const CDEK_FROM_CITY = process.env.CDEK_FROM_CITY || "Москва";
export const CDEK_FROM_POSTAL = process.env.CDEK_FROM_POSTAL_CODE || "";
/** Sender's CDEK shipment point / warehouse code (needed to create orders). */
export const CDEK_FROM_SHIPMENT_POINT =
  process.env.CDEK_FROM_SHIPMENT_POINT || "";

/** Tariff codes — defaults: 136 склад-склад (to PVZ), 137 склад-дверь (courier). */
export const CDEK_TARIFF_PVZ = Number(process.env.CDEK_TARIFF_PVZ || "136");
export const CDEK_TARIFF_COURIER = Number(
  process.env.CDEK_TARIFF_COURIER || "137"
);

export const cdekConfigured = Boolean(CLIENT_ID && CLIENT_SECRET);

let cachedToken: { value: string; expiresAt: number } | null = null;

/** Get (and cache) an OAuth access token. Returns null on failure. */
async function getToken(): Promise<string | null> {
  if (!cdekConfigured) return null;
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }
  try {
    const res = await fetch(`${BASE}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: CLIENT_ID as string,
        client_secret: CLIENT_SECRET as string,
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`[cdek] auth ${res.status}: ${await res.text()}`);
      return null;
    }
    const data = (await res.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!data.access_token) return null;
    cachedToken = {
      value: data.access_token,
      expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
    };
    return cachedToken.value;
  } catch (err) {
    console.error("[cdek] auth error:", err);
    return null;
  }
}

async function cdekFetch<T>(
  path: string,
  init: RequestInit & { query?: Record<string, string> } = {}
): Promise<T | null> {
  const token = await getToken();
  if (!token) return null;
  const { query, ...rest } = init;
  const url = new URL(`${BASE}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v != null && v !== "") url.searchParams.set(k, v);
    }
  }
  try {
    const res = await fetch(url, {
      ...rest,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(rest.headers || {}),
      },
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`[cdek] ${path} ${res.status}: ${await res.text()}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error(`[cdek] ${path} error:`, err);
    return null;
  }
}

export interface CdekParcel {
  weightGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

export interface CdekTariffResult {
  tariffCode: number;
  deliverySum: number;
  periodMin: number;
  periodMax: number;
}

interface ToLocation {
  city?: string;
  postalCode?: string;
  address?: string;
  cityCode?: number;
}

function fromLocation() {
  if (CDEK_FROM_CITY_CODE) return { code: Number(CDEK_FROM_CITY_CODE) };
  if (CDEK_FROM_POSTAL) return { postal_code: CDEK_FROM_POSTAL };
  return { address: CDEK_FROM_CITY };
}

function toLocationBody(to: ToLocation) {
  if (to.cityCode) return { code: to.cityCode };
  const body: Record<string, unknown> = {};
  if (to.postalCode) body.postal_code = to.postalCode;
  if (to.city) body.city = to.city;
  if (to.address) body.address = to.address;
  return body;
}

function packagesBody(parcel: CdekParcel) {
  return [
    {
      weight: Math.max(1, Math.round(parcel.weightGrams)),
      length: Math.max(1, Math.round(parcel.lengthCm)),
      width: Math.max(1, Math.round(parcel.widthCm)),
      height: Math.max(1, Math.round(parcel.heightCm)),
    },
  ];
}

/**
 * Calculate a single tariff. Returns null when unavailable so the engine can
 * simply skip that option.
 */
export async function calculateTariff(
  tariffCode: number,
  to: ToLocation,
  parcel: CdekParcel
): Promise<CdekTariffResult | null> {
  const data = await cdekFetch<{
    delivery_sum?: number;
    total_sum?: number;
    period_min?: number;
    period_max?: number;
    errors?: { code: string; message: string }[];
  }>("/calculator/tariff", {
    method: "POST",
    body: JSON.stringify({
      tariff_code: tariffCode,
      from_location: fromLocation(),
      to_location: toLocationBody(to),
      packages: packagesBody(parcel),
    }),
  });
  if (!data || data.errors?.length) {
    if (data?.errors?.length)
      console.warn(`[cdek] tariff ${tariffCode}:`, data.errors[0]?.message);
    return null;
  }
  const sum = data.delivery_sum ?? data.total_sum;
  if (sum == null) return null;
  return {
    tariffCode,
    deliverySum: sum,
    periodMin: data.period_min ?? 0,
    periodMax: data.period_max ?? data.period_min ?? 0,
  };
}

/** Search pickup points (PVZ) by city code / postal code. */
export async function searchPvz(params: {
  cityCode?: number;
  postalCode?: string;
  city?: string;
}): Promise<
  {
    code: string;
    name: string;
    location: {
      address?: string;
      address_full?: string;
      city?: string;
      latitude?: number;
      longitude?: number;
    };
    work_time?: string;
  }[]
> {
  const query: Record<string, string> = { type: "PVZ" };
  if (params.cityCode) query.city_code = String(params.cityCode);
  if (params.postalCode) query.postal_code = params.postalCode;
  const data = await cdekFetch<
    {
      code: string;
      name: string;
      location: {
        address?: string;
        address_full?: string;
        city?: string;
        latitude?: number;
        longitude?: number;
      };
      work_time?: string;
    }[]
  >("/deliverypoints", { method: "GET", query });
  return data ?? [];
}

/** Resolve a city to its CDEK numeric code (first match). */
export async function resolveCityCode(params: {
  city?: string;
  postalCode?: string;
}): Promise<number | null> {
  const query: Record<string, string> = {};
  if (params.postalCode) query.postal_code = params.postalCode;
  if (params.city) query.city = params.city;
  if (!query.city && !query.postal_code) return null;
  const data = await cdekFetch<{ code: number }[]>("/location/cities", {
    method: "GET",
    query: { ...query, size: "1" },
  });
  return data?.[0]?.code ?? null;
}

export interface CreateCdekOrderInput {
  orderId: string;
  tariffCode: number;
  recipient: { name: string; phone: string; email?: string };
  to: ToLocation;
  /** PVZ code for warehouse delivery; omit for courier. */
  pvzCode?: string;
  parcel: CdekParcel;
  /** Declared value of goods (₽) for the package items. */
  declaredValue: number;
}

export interface CdekOrderResult {
  uuid: string;
  cdekNumber?: string;
}

/**
 * Create a CDEK shipment order. Called MANUALLY from the admin when the order
 * is ready — never automatically on payment. Returns the CDEK uuid (and number
 * once assigned). On failure returns null with the error logged.
 */
export async function createCdekOrder(
  input: CreateCdekOrderInput
): Promise<CdekOrderResult | null> {
  const phone = input.recipient.phone.replace(/(?!^\+)\D/g, "");
  const body: Record<string, unknown> = {
    type: 1,
    tariff_code: input.tariffCode,
    number: input.orderId,
    from_location: fromLocation(),
    recipient: {
      name: input.recipient.name,
      phones: [{ number: phone }],
      ...(input.recipient.email ? { email: input.recipient.email } : {}),
    },
    packages: [
      {
        number: `${input.orderId}-1`,
        weight: Math.max(1, Math.round(input.parcel.weightGrams)),
        length: Math.max(1, Math.round(input.parcel.lengthCm)),
        width: Math.max(1, Math.round(input.parcel.widthCm)),
        height: Math.max(1, Math.round(input.parcel.heightCm)),
        items: [
          {
            name: "STOAT order",
            ware_key: input.orderId,
            payment: { value: 0 },
            cost: input.declaredValue,
            weight: Math.max(1, Math.round(input.parcel.weightGrams)),
            amount: 1,
          },
        ],
      },
    ],
  };
  if (CDEK_FROM_SHIPMENT_POINT) body.shipment_point = CDEK_FROM_SHIPMENT_POINT;
  if (input.pvzCode) {
    body.delivery_point = input.pvzCode;
  } else {
    body.to_location = toLocationBody(input.to);
  }

  const data = await cdekFetch<{
    entity?: { uuid?: string };
    requests?: { state?: string; errors?: { message: string }[] }[];
  }>("/orders", { method: "POST", body: JSON.stringify(body) });

  const uuid = data?.entity?.uuid;
  if (!uuid) {
    const err = data?.requests?.[0]?.errors?.[0]?.message;
    if (err) console.error("[cdek] create order rejected:", err);
    return null;
  }
  return { uuid };
}

/** Look up a created order's CDEK tracking number by uuid. */
export async function getCdekOrderInfo(
  uuid: string
): Promise<{ cdekNumber?: string; status?: string } | null> {
  const data = await cdekFetch<{
    entity?: {
      cdek_number?: string;
      statuses?: { name?: string; code?: string }[];
    };
  }>(`/orders/${uuid}`, { method: "GET" });
  if (!data?.entity) return null;
  const statuses = data.entity.statuses ?? [];
  return {
    cdekNumber: data.entity.cdek_number,
    status: statuses[0]?.name,
  };
}
