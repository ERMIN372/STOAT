import "server-only";

import { dbConfigured, query } from "@/lib/db";
import type {
  CreateOrderInput,
  Order,
  OrderStatus,
  StatusHistoryEntry,
} from "@/lib/orders/types";

// Re-export the shared order types/constants so existing imports from
// "@/lib/orders" keep working unchanged.
export type {
  OrderStatus,
  PaymentStatus,
  OrderItem,
  OrderDelivery,
  OrderConsents,
  StatusHistoryEntry,
  Order,
  CreateOrderInput,
} from "@/lib/orders/types";
export {
  ORDER_STATUS_LABELS,
  DELIVERY_PROVIDER_LABELS,
  PAYMENT_STATUS_LABELS,
  ADMIN_STATUS_OPTIONS,
} from "@/lib/orders/types";

/**
 * Orders persistence. Customer PII lives in Postgres (DATABASE_URL) — host it
 * in the Russian Federation to satisfy 152-ФЗ data localisation. No external
 * SaaS is involved.
 */

/** True when the orders database is configured (admin shows a warning if not). */
export const ordersConfigured = dbConfigured;

interface OrderRow {
  data: Order;
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

  if (!dbConfigured) {
    console.error(
      "[orders] DATABASE_URL not configured — order NOT persisted. " +
        "Point it at a Postgres instance hosted in the Russian Federation."
    );
    return { order, persisted: false };
  }

  try {
    await query(
      `insert into orders (order_id, status, payment_status, total, created_at, data)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (order_id) do nothing`,
      [
        order.orderId,
        order.status,
        order.paymentStatus,
        order.total,
        now,
        JSON.stringify(order),
      ]
    );
    console.info(`[orders] created ${input.orderId} (${input.total} ₽)`);
    return { order, persisted: true };
  } catch (err) {
    console.error(`[orders] failed to create ${input.orderId}:`, err);
    return { order, persisted: false };
  }
}

export async function getOrder(orderId: string): Promise<Order | null> {
  if (!dbConfigured) return null;
  try {
    const rows = await query<OrderRow>(
      `select data from orders where order_id = $1`,
      [orderId]
    );
    return rows[0]?.data ?? null;
  } catch (err) {
    console.error(`[orders] fetch ${orderId} failed:`, err);
    return null;
  }
}

export async function listOrders(limit = 100): Promise<Order[]> {
  if (!dbConfigured) return [];
  try {
    const rows = await query<OrderRow>(
      `select data from orders order by created_at desc limit $1`,
      [limit]
    );
    return rows.map((r) => r.data);
  } catch (err) {
    console.error("[orders] list failed:", err);
    return [];
  }
}

/**
 * Read-modify-write a single order. Loads the row, applies `mutate` to the
 * stored order, and persists it back along with the queryable columns. No-op
 * when the order is missing or the database isn't configured.
 */
async function updateOrder(
  orderId: string,
  mutate: (order: Order) => void
): Promise<void> {
  if (!dbConfigured) return;
  try {
    const order = await getOrder(orderId);
    if (!order) return;
    mutate(order);
    await query(
      `update orders
         set status = $2, payment_status = $3, data = $4
       where order_id = $1`,
      [orderId, order.status, order.paymentStatus, JSON.stringify(order)]
    );
  } catch (err) {
    console.error(`[orders] update ${orderId} failed:`, err);
  }
}

export async function setPaymentId(orderId: string, paymentId: string) {
  await updateOrder(orderId, (o) => {
    o.paymentId = paymentId;
  });
}

/** Append a status-history entry and apply field changes in one write. */
async function transition(
  orderId: string,
  entry: StatusHistoryEntry,
  apply: (order: Order) => void
) {
  await updateOrder(orderId, (o) => {
    o.statusHistory = [...(o.statusHistory ?? []), entry];
    apply(o);
  });
}

export async function markPaid(orderId: string, paymentId: string) {
  const now = new Date().toISOString();
  await transition(
    orderId,
    { status: "paid", at: now, note: "Оплата подтверждена ЮKassa" },
    (o) => {
      o.status = "paid";
      o.paymentStatus = "succeeded";
      o.paidAt = now;
      o.paymentId = paymentId;
    }
  );
  console.info(`[orders] ${orderId} → paid`);
}

export async function markCanceled(orderId: string, note = "Оплата отменена") {
  const now = new Date().toISOString();
  await transition(orderId, { status: "canceled", at: now, note }, (o) => {
    o.status = "canceled";
    o.paymentStatus = "canceled";
  });
  console.info(`[orders] ${orderId} → canceled`);
}

export async function updateStatus(
  orderId: string,
  status: OrderStatus,
  note?: string
) {
  const now = new Date().toISOString();
  await transition(orderId, { status, at: now, note }, (o) => {
    o.status = status;
    if (status === "refunded") o.paymentStatus = "refunded";
  });
  console.info(`[orders] ${orderId} → ${status} (admin)`);
}

export async function setTracking(orderId: string, trackingNumber: string) {
  await updateOrder(orderId, (o) => {
    o.trackingNumber = trackingNumber;
  });
}

export async function setInternalNote(orderId: string, internalNote: string) {
  await updateOrder(orderId, (o) => {
    o.internalNote = internalNote;
  });
}

export async function setStockDecremented(orderId: string, value: boolean) {
  await updateOrder(orderId, (o) => {
    o.stockDecremented = value;
  });
}

/** Persist carrier shipment data on the order's delivery record. */
export async function setShipment(
  orderId: string,
  data: { shipmentId?: string; shipmentStatus?: string; trackingNumber?: string }
) {
  await updateOrder(orderId, (o) => {
    if (data.shipmentId != null) o.delivery.shipmentId = data.shipmentId;
    if (data.shipmentStatus != null)
      o.delivery.shipmentStatus = data.shipmentStatus;
    if (data.trackingNumber != null) o.trackingNumber = data.trackingNumber;
  });
}
