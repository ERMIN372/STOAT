import "server-only";

import { ordersClient } from "@/lib/sanity/orders-client";
import type {
  DeliveryMethodId,
  DeliveryProvider,
} from "@/lib/delivery/types";

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "processing"
  | "ready_to_ship"
  | "shipped"
  | "delivered"
  | "canceled"
  | "refunded";

export type PaymentStatus = "pending" | "succeeded" | "canceled" | "refunded";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Ожидает оплаты",
  paid: "Оплачен",
  processing: "В подготовке",
  ready_to_ship: "Готов к отправке",
  shipped: "Передан в доставку",
  delivered: "Доставлен",
  canceled: "Отменён",
  refunded: "Возврат",
};

/** Provider labels for the customer-facing copy. */
export const DELIVERY_PROVIDER_LABELS: Record<DeliveryProvider, string> = {
  cdek: "СДЭК",
  russian_post: "Почта России",
  pickup: "Самовывоз",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Ожидает оплаты",
  succeeded: "Оплачено",
  canceled: "Отменено",
  refunded: "Возвращено",
};

/** Statuses the owner can set manually in the admin. */
export const ADMIN_STATUS_OPTIONS: OrderStatus[] = [
  "paid",
  "processing",
  "ready_to_ship",
  "shipped",
  "delivered",
  "canceled",
  "refunded",
];

export interface OrderItem {
  productId: string;
  name: string;
  color: string;
  size: string;
  quantity: number;
  price: number;
}

/**
 * Full delivery record saved on the order. Carries everything the engine
 * computed (provider, tariff, price, day windows, address/PVZ, parcel) plus
 * fulfilment fields filled in later from the admin (shipment id, status).
 */
export interface OrderDelivery {
  provider: DeliveryProvider;
  method: DeliveryMethodId;
  label: string;
  price: number;
  /** Carrier delivery window (business days). */
  deliveryMinDays?: number;
  deliveryMaxDays?: number;
  /** Preparation window (business days). */
  productionMinDays?: number;
  productionMaxDays?: number;
  /** Total receipt window = preparation + delivery. */
  totalMinDays?: number;
  totalMaxDays?: number;
  /** Destination. */
  city?: string;
  address?: string;
  postalCode?: string;
  /** CDEK pickup point. */
  pvzCode?: string;
  pvzAddress?: string;
  /** Carrier tariff code. */
  tariffCode?: string;
  /** Parcel used for the calculation. */
  weightGrams?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  /** Fulfilment (set later, from the admin). */
  shipmentId?: string;
  shipmentStatus?: string;
}

export interface OrderConsents {
  offer: boolean;
  personalData: boolean;
  marketing: boolean;
  acceptedAt: string;
  docVersion: string;
}

export interface StatusHistoryEntry {
  status: OrderStatus;
  at: string;
  note?: string;
}

export interface Order {
  orderId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  customer: {
    name: string;
    phone: string;
    email: string;
    address: string;
    comment?: string;
  };
  delivery: OrderDelivery;
  items: OrderItem[];
  subtotal: number;
  deliveryPrice: number;
  total: number;
  paymentId?: string;
  trackingNumber?: string;
  internalNote?: string;
  consents?: OrderConsents;
  statusHistory: StatusHistoryEntry[];
  stockDecremented?: boolean;
  createdAt: string;
  paidAt?: string;
}

const docId = (orderId: string) => `order.${orderId}`;
const key = () => Math.random().toString(36).slice(2, 12);

export interface CreateOrderInput {
  orderId: string;
  customer: Order["customer"];
  delivery: OrderDelivery;
  items: OrderItem[];
  subtotal: number;
  deliveryPrice: number;
  total: number;
  consents?: OrderConsents;
}

/**
 * Persist a new order in "pending_payment". Returns whether it was actually
 * saved — the checkout route refuses to create a payment when `persisted` is
 * false, so we never charge a customer without an order record. In "заявка"
 * mode (no online payment) the order is still returned so Telegram can capture
 * it even if storage isn't configured.
 */
export async function createOrder(
  input: CreateOrderInput
): Promise<{ order: Order; persisted: boolean }> {
  const now = new Date().toISOString();
  const order: Order = {
    orderId: input.orderId,
    status: "pending_payment",
    paymentStatus: "pending",
    customer: input.customer,
    delivery: input.delivery,
    items: input.items,
    subtotal: input.subtotal,
    deliveryPrice: input.deliveryPrice,
    total: input.total,
    consents: input.consents,
    statusHistory: [{ status: "pending_payment", at: now }],
    stockDecremented: false,
    createdAt: now,
  };

  if (!ordersClient) {
    console.error(
      "[orders] orders dataset/token not configured — order NOT persisted. " +
        "Set SANITY_API_TOKEN and create a private dataset (SANITY_ORDERS_DATASET)."
    );
    return { order, persisted: false };
  }

  try {
    await ordersClient.createIfNotExists({
      _id: docId(input.orderId),
      _type: "order",
      ...order,
      items: input.items.map((i) => ({ _key: key(), ...i })),
      statusHistory: order.statusHistory.map((h) => ({ _key: key(), ...h })),
    });
    console.info(`[orders] created ${input.orderId} (${input.total} ₽)`);
    return { order, persisted: true };
  } catch (err) {
    console.error(`[orders] failed to create ${input.orderId}:`, err);
    return { order, persisted: false };
  }
}

export async function getOrder(orderId: string): Promise<Order | null> {
  if (!ordersClient) return null;
  try {
    return await ordersClient.fetch<Order | null>(
      `*[_type=="order" && orderId==$orderId][0]`,
      { orderId }
    );
  } catch (err) {
    console.error(`[orders] fetch ${orderId} failed:`, err);
    return null;
  }
}

export async function listOrders(limit = 100): Promise<Order[]> {
  if (!ordersClient) return [];
  try {
    return await ordersClient.fetch<Order[]>(
      `*[_type=="order"] | order(createdAt desc)[0...$limit]`,
      { limit }
    );
  } catch (err) {
    console.error("[orders] list failed:", err);
    return [];
  }
}

export async function setPaymentId(orderId: string, paymentId: string) {
  if (!ordersClient) return;
  try {
    await ordersClient.patch(docId(orderId)).set({ paymentId }).commit();
  } catch (err) {
    console.error(`[orders] setPaymentId ${orderId}:`, err);
  }
}

/** Append a status-history entry and apply field changes in one mutation. */
async function transition(
  orderId: string,
  entry: StatusHistoryEntry,
  set: Record<string, unknown>
) {
  if (!ordersClient) return;
  await ordersClient
    .patch(docId(orderId))
    .setIfMissing({ statusHistory: [] })
    .insert("after", "statusHistory[-1]", [{ _key: key(), ...entry }])
    .set(set)
    .commit();
}

export async function markPaid(orderId: string, paymentId: string) {
  const now = new Date().toISOString();
  try {
    await transition(
      orderId,
      { status: "paid", at: now, note: "Оплата подтверждена ЮKassa" },
      { status: "paid", paymentStatus: "succeeded", paidAt: now, paymentId }
    );
    console.info(`[orders] ${orderId} → paid`);
  } catch (err) {
    console.error(`[orders] markPaid ${orderId}:`, err);
  }
}

export async function markCanceled(orderId: string, note = "Оплата отменена") {
  const now = new Date().toISOString();
  try {
    await transition(
      orderId,
      { status: "canceled", at: now, note },
      { status: "canceled", paymentStatus: "canceled" }
    );
    console.info(`[orders] ${orderId} → canceled`);
  } catch (err) {
    console.error(`[orders] markCanceled ${orderId}:`, err);
  }
}

export async function updateStatus(
  orderId: string,
  status: OrderStatus,
  note?: string
) {
  const now = new Date().toISOString();
  const set: Record<string, unknown> = { status };
  if (status === "refunded") set.paymentStatus = "refunded";
  try {
    await transition(orderId, { status, at: now, note }, set);
    console.info(`[orders] ${orderId} → ${status} (admin)`);
  } catch (err) {
    console.error(`[orders] updateStatus ${orderId}:`, err);
  }
}

export async function setTracking(orderId: string, trackingNumber: string) {
  if (!ordersClient) return;
  try {
    await ordersClient.patch(docId(orderId)).set({ trackingNumber }).commit();
  } catch (err) {
    console.error(`[orders] setTracking ${orderId}:`, err);
  }
}

export async function setInternalNote(orderId: string, internalNote: string) {
  if (!ordersClient) return;
  try {
    await ordersClient.patch(docId(orderId)).set({ internalNote }).commit();
  } catch (err) {
    console.error(`[orders] setInternalNote ${orderId}:`, err);
  }
}

export async function setStockDecremented(orderId: string, value: boolean) {
  if (!ordersClient) return;
  try {
    await ordersClient
      .patch(docId(orderId))
      .set({ stockDecremented: value })
      .commit();
  } catch (err) {
    console.error(`[orders] setStockDecremented ${orderId}:`, err);
  }
}

/** Persist carrier shipment data on the order's delivery record. */
export async function setShipment(
  orderId: string,
  data: { shipmentId?: string; shipmentStatus?: string; trackingNumber?: string }
) {
  if (!ordersClient) return;
  const set: Record<string, unknown> = {};
  if (data.shipmentId != null) set["delivery.shipmentId"] = data.shipmentId;
  if (data.shipmentStatus != null)
    set["delivery.shipmentStatus"] = data.shipmentStatus;
  if (data.trackingNumber != null) set.trackingNumber = data.trackingNumber;
  if (Object.keys(set).length === 0) return;
  try {
    await ordersClient.patch(docId(orderId)).set(set).commit();
  } catch (err) {
    console.error(`[orders] setShipment ${orderId}:`, err);
  }
}
