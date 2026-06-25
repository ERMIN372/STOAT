/**
 * Shared delivery types — safe to import from both client and server.
 */

export type DeliveryProvider = "cdek" | "russian_post" | "pickup";

/**
 * A delivery method id. These travel between the quote API, the checkout form
 * and the order record, so keep them stable.
 *
 * Legacy orders may still carry "courier" | "post" — kept in the union so old
 * records keep type-checking.
 */
export type DeliveryMethodId =
  | "cdek_pvz"
  | "cdek_courier"
  | "russian_post"
  | "pickup"
  // legacy (pre-engine orders)
  | "courier"
  | "post";

/** Destination entered by the customer. */
export interface DeliveryDestination {
  city: string;
  address?: string;
  postalCode?: string;
}

/** Packed parcel computed from the cart, server-side. */
export interface Parcel {
  weightGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

/**
 * One quoted delivery option shown to the customer. Prices are final (carrier
 * tariff + service markup, rounded). Day ranges are carrier-only; the totals
 * already include the preparation window.
 */
export interface DeliveryQuote {
  provider: DeliveryProvider;
  method: DeliveryMethodId;
  label: string;
  /** Final price in rubles (markup applied, rounded). 0 for pickup. */
  price: number;
  /** Carrier delivery window, business days. */
  deliveryMinDays: number;
  deliveryMaxDays: number;
  /** Preparation window, business days. */
  productionMinDays: number;
  productionMaxDays: number;
  /** preparation + delivery. */
  totalMinDays: number;
  totalMaxDays: number;
  /** Short explanation shown under the card. */
  hint: string;
  /** Carrier tariff code (CDEK numeric / Pochta mail type), if any. */
  tariffCode?: string;
  /** True when the customer must still pick a CDEK pickup point. */
  requiresPvz?: boolean;
}

/** Result of a quote request. `quotes` may be empty (no carrier available). */
export interface QuoteResponse {
  ok: boolean;
  quotes: DeliveryQuote[];
  /** Provider-level notices, e.g. "СДЭК временно недоступен". */
  notices?: string[];
  error?: string;
}

/** A CDEK pickup point (subset of the API shape we surface to the client). */
export interface CdekPvz {
  code: string;
  name: string;
  address: string;
  city?: string;
  workTime?: string;
  /** [lat, lon] when available. */
  location?: { latitude: number; longitude: number };
}
