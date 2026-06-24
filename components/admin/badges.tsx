import { Badge } from "@/components/ui/badge";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/orders";

type Variant = "default" | "secondary" | "destructive" | "outline" | "brand";

const ORDER_VARIANT: Record<OrderStatus, Variant> = {
  pending_payment: "secondary",
  paid: "brand",
  processing: "default",
  shipped: "default",
  delivered: "outline",
  canceled: "destructive",
  refunded: "outline",
};

const PAYMENT_VARIANT: Record<PaymentStatus, Variant> = {
  pending: "secondary",
  succeeded: "brand",
  canceled: "destructive",
  refunded: "outline",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge variant={ORDER_VARIANT[status]}>{ORDER_STATUS_LABELS[status]}</Badge>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <Badge variant={PAYMENT_VARIANT[status]}>
      {PAYMENT_STATUS_LABELS[status]}
    </Badge>
  );
}
