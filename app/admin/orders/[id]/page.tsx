import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { AdminShell } from "@/components/admin/admin-shell";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/admin/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  changeStatusAction,
  setNoteAction,
  shipAction,
} from "@/app/admin/actions";
import {
  ADMIN_STATUS_OPTIONS,
  ORDER_STATUS_LABELS,
  getOrder,
} from "@/lib/orders";
import { formatMskDate, formatMskDateTime, formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

export default async function AdminOrderPage({
  params,
}: {
  params: { id: string };
}) {
  const order = await getOrder(params.id);
  if (!order) notFound();

  return (
    <AdminShell>
      <Link
        href="/admin"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Все заказы
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{order.orderId}</h1>
        <PaymentStatusBadge status={order.paymentStatus} />
        <OrderStatusBadge status={order.status} />
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Создан: {formatMskDateTime(order.createdAt, { dateStyle: "medium", timeStyle: "short" })}
        {order.paidAt &&
          ` · Оплачен: ${formatMskDateTime(order.paidAt, { dateStyle: "medium", timeStyle: "short" })}`}
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Left: order data */}
        <div className="space-y-6">
          <section className="rounded-lg border p-5">
            <h2 className="mb-2 font-semibold">Клиент</h2>
            <Row label="Имя">{order.customer.name}</Row>
            <Row label="Телефон">
              <a className="hover:text-brand" href={`tel:${order.customer.phone}`}>
                {order.customer.phone}
              </a>
            </Row>
            <Row label="E-mail">
              <a
                className="hover:text-brand"
                href={`mailto:${order.customer.email}`}
              >
                {order.customer.email}
              </a>
            </Row>
            <Row label="Доставка">
              {order.delivery.label}
              {order.deliveryPrice
                ? ` · ${formatPrice(order.deliveryPrice)}`
                : " · бесплатно"}
            </Row>
            {order.customer.address && (
              <Row label="Адрес">{order.customer.address}</Row>
            )}
            {order.customer.comment && (
              <Row label="Комментарий">{order.customer.comment}</Row>
            )}
          </section>

          <section className="rounded-lg border p-5">
            <h2 className="mb-3 font-semibold">Состав</h2>
            <ul className="space-y-2">
              {order.items.map((i, idx) => (
                <li key={idx} className="flex justify-between gap-4 text-sm">
                  <span>
                    {i.name} · {i.color}/{i.size} × {i.quantity}
                  </span>
                  <span className="tabular-nums">
                    {formatPrice(i.price * i.quantity)}
                  </span>
                </li>
              ))}
            </ul>
            <Separator className="my-3" />
            <Row label="Товары">{formatPrice(order.subtotal)}</Row>
            <Row label="Доставка">
              {order.deliveryPrice ? formatPrice(order.deliveryPrice) : "бесплатно"}
            </Row>
            <div className="flex justify-between pt-2 font-bold">
              <span>Итого</span>
              <span className="tabular-nums">{formatPrice(order.total)}</span>
            </div>
          </section>

          <section className="rounded-lg border p-5 text-sm">
            <h2 className="mb-2 font-semibold">Оплата и доставка</h2>
            <Row label="Payment ID">{order.paymentId || "—"}</Row>
            <Row label="Трек-номер">{order.trackingNumber || "—"}</Row>
            {order.consents && (
              <Row label="Согласия">
                оферта {order.consents.offer ? "✓" : "✗"}, ПДн{" "}
                {order.consents.personalData ? "✓" : "✗"}, новости{" "}
                {order.consents.marketing ? "✓" : "✗"} (
                {formatMskDate(order.consents.acceptedAt)})
              </Row>
            )}
          </section>

          <section className="rounded-lg border p-5">
            <h2 className="mb-3 font-semibold">История статусов</h2>
            <ol className="space-y-2 text-sm">
              {[...order.statusHistory].reverse().map((h, idx) => (
                <li key={idx} className="flex gap-3">
                  <span className="text-muted-foreground">
                    {formatMskDateTime(h.at)}
                  </span>
                  <span className="font-medium">
                    {ORDER_STATUS_LABELS[h.status]}
                  </span>
                  {h.note && (
                    <span className="text-muted-foreground">— {h.note}</span>
                  )}
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* Right: actions */}
        <aside className="space-y-5">
          <form
            action={shipAction}
            className="space-y-3 rounded-lg border p-5"
          >
            <h2 className="font-semibold">Отправить заказ</h2>
            <input type="hidden" name="orderId" value={order.orderId} />
            <div className="space-y-1.5">
              <Label htmlFor="tracking">Трек-номер</Label>
              <Input
                id="tracking"
                name="tracking"
                defaultValue={order.trackingNumber || ""}
                placeholder="например, RA123456789RU"
              />
            </div>
            <Button type="submit" variant="brand" className="w-full">
              Отметить отправленным
            </Button>
            <p className="text-xs text-muted-foreground">
              Сохранит трек, поставит статус «Отправлен» и отправит письмо
              клиенту.
            </p>
          </form>

          <form
            action={changeStatusAction}
            className="space-y-3 rounded-lg border p-5"
          >
            <h2 className="font-semibold">Сменить статус</h2>
            <input type="hidden" name="orderId" value={order.orderId} />
            <select
              name="status"
              defaultValue={order.status}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {ADMIN_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {ORDER_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <Input name="note" placeholder="Комментарий (необязательно)" />
            <Button type="submit" variant="outline" className="w-full">
              Применить
            </Button>
            <p className="text-xs text-muted-foreground">
              «Отменён» / «Возврат» отправят письмо клиенту; возврат вернёт
              остаток на склад.
            </p>
          </form>

          <form
            action={setNoteAction}
            className="space-y-3 rounded-lg border p-5"
          >
            <h2 className="font-semibold">Внутренняя заметка</h2>
            <input type="hidden" name="orderId" value={order.orderId} />
            <Textarea
              name="note"
              defaultValue={order.internalNote || ""}
              placeholder="Видно только в админке"
            />
            <Button type="submit" variant="outline" className="w-full">
              Сохранить
            </Button>
          </form>
        </aside>
      </div>
    </AdminShell>
  );
}
