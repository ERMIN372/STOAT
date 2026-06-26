import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { AdminShell } from "@/components/admin/admin-shell";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/admin/badges";
import { listOrders, ordersConfigured } from "@/lib/orders";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const orders = await listOrders();

  return (
    <AdminShell>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Заказы</h1>
        <span className="text-sm text-muted-foreground">
          Всего: {orders.length}
        </span>
      </div>

      {!ordersConfigured && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          Хранилище заказов не настроено. Задайте <code>DATABASE_URL</code>{" "}
          (Postgres, размещённый в РФ) и выполните миграцию{" "}
          <code>npm run db:migrate</code>.
        </div>
      )}

      {orders.length === 0 ? (
        <p className="text-muted-foreground">Заказов пока нет.</p>
      ) : (
        <div className="divide-y rounded-lg border">
          {orders.map((o) => (
            <Link
              key={o.orderId}
              href={`/admin/orders/${o.orderId}`}
              className="flex items-center gap-4 p-4 transition-colors hover:bg-accent"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{o.orderId}</span>
                  <PaymentStatusBadge status={o.paymentStatus} />
                  <OrderStatusBadge status={o.status} />
                </div>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {o.customer.name} · {o.customer.phone} ·{" "}
                  {new Date(o.createdAt).toLocaleString("ru-RU", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </p>
              </div>
              <span className="shrink-0 font-semibold tabular-nums">
                {formatPrice(o.total)}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
