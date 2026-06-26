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
