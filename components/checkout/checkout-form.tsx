"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useMounted } from "@/hooks/use-mounted";
import { cn, formatPrice } from "@/lib/utils";
import {
  DELIVERY_OPTIONS,
  submitOrder,
  type DeliveryMethod,
} from "@/lib/order";
import { selectTotalPrice, useCartStore } from "@/store/cart";

export function CheckoutForm() {
  const mounted = useMounted();
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore(selectTotalPrice);
  const clear = useCartStore((s) => s.clear);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    comment: "",
  });
  const [delivery, setDelivery] = useState<DeliveryMethod>("courier");
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [consents, setConsents] = useState({
    offer: false,
    personalData: false,
    marketing: false,
  });

  const deliveryOption =
    DELIVERY_OPTIONS.find((o) => o.value === delivery) ?? DELIVERY_OPTIONS[0];
  const deliveryPrice = deliveryOption.price;
  const total = subtotal + deliveryPrice;
  const addressRequired = delivery !== "pickup";

  const update =
    (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    if (!consents.offer || !consents.personalData) {
      toast.error("Подтвердите согласие с офертой и обработкой данных");
      return;
    }

    setSubmitting(true);
    const result = await submitOrder({
      customer: { ...form, delivery },
      items: items.map((i) => ({
        productId: i.productId,
        color: i.color,
        size: i.size,
        quantity: i.quantity,
      })),
      consents,
    });

    if (!result.ok) {
      setSubmitting(false);
      toast.error("Не удалось оформить заказ", { description: result.error });
      return;
    }

    // Online payment available → go to the ЮKassa confirmation page.
    if (result.redirectUrl) {
      window.location.href = result.redirectUrl;
      return; // keep the button disabled while the browser navigates away
    }

    // No payment configured yet → order accepted as a request.
    setSubmitting(false);
    setOrderId(result.orderId);
    clear();
    toast.success("Заказ оформлен", {
      description: `Номер заявки: ${result.orderId}`,
    });
  }

  if (!mounted) {
    return (
      <div className="container flex min-h-[50vh] items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Success confirmation (cart already cleared).
  if (orderId) {
    return (
      <div className="container flex min-h-[60vh] flex-col items-center justify-center gap-5 py-16 text-center">
        <CheckCircle2 className="h-16 w-16 text-brand" />
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Спасибо за заказ!</h1>
          <p className="text-muted-foreground">
            Заявка{" "}
            <span className="font-semibold text-foreground">{orderId}</span>{" "}
            принята. Мы свяжемся с вами для подтверждения и оплаты.
          </p>
        </div>
        <Button asChild variant="brand" size="lg">
          <Link href="/shop">Продолжить покупки</Link>
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container flex min-h-[55vh] flex-col items-center justify-center gap-5 py-16 text-center">
        <h1 className="text-2xl font-bold">Корзина пуста</h1>
        <p className="text-muted-foreground">
          Добавьте товары, прежде чем оформлять заказ.
        </p>
        <Button asChild variant="brand" size="lg">
          <Link href="/shop">В каталог</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-10 sm:py-14">
      <h1 className="text-display text-5xl sm:text-6xl">Оформление</h1>

      <form
        onSubmit={handleSubmit}
        className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px]"
      >
        {/* Fields */}
        <div className="space-y-8">
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold uppercase tracking-wide">
              Контактные данные
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Имя и фамилия</Label>
                <Input
                  id="name"
                  required
                  autoComplete="name"
                  value={form.name}
                  onChange={update("name")}
                  placeholder="Иван Иванов"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Телефон</Label>
                <Input
                  id="phone"
                  type="tel"
                  required
                  autoComplete="tel"
                  value={form.phone}
                  onChange={update("phone")}
                  placeholder="+7 999 000-00-00"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={update("email")}
                placeholder="you@example.com"
              />
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold uppercase tracking-wide">
              Доставка
            </legend>
            <div
              role="radiogroup"
              aria-label="Способ доставки"
              className="grid gap-3 sm:grid-cols-3"
            >
              {DELIVERY_OPTIONS.map((opt) => {
                const active = delivery === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setDelivery(opt.value)}
                    className={cn(
                      "flex flex-col items-start rounded-lg border p-4 text-left transition-colors",
                      active
                        ? "border-brand ring-2 ring-brand"
                        : "border-input hover:border-foreground"
                    )}
                  >
                    <span className="font-medium">{opt.label}</span>
                    <span className="mt-0.5 text-xs text-muted-foreground">
                      {opt.hint}
                    </span>
                    <span className="mt-2 text-sm font-semibold">
                      {opt.price === 0 ? "Бесплатно" : formatPrice(opt.price)}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address">
                {addressRequired ? "Адрес доставки" : "Пункт выдачи (необязательно)"}
              </Label>
              <Input
                id="address"
                required={addressRequired}
                autoComplete="street-address"
                value={form.address}
                onChange={update("address")}
                placeholder={
                  addressRequired
                    ? "Город, улица, дом, квартира"
                    : "Выберем ближайший пункт выдачи"
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="comment">Комментарий к заказу</Label>
              <Textarea
                id="comment"
                value={form.comment}
                onChange={update("comment")}
                placeholder="Код домофона, удобное время — что угодно"
              />
            </div>
          </fieldset>
        </div>

        {/* Summary */}
        <aside className="lg:sticky lg:top-32 lg:self-start">
          <div className="rounded-xl border p-6">
            <h2 className="text-lg font-semibold">Ваш заказ</h2>
            <ul className="mt-4 space-y-4">
              {items.map((item) => (
                <li key={item.key} className="flex gap-3">
                  <div className="relative aspect-[4/5] w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                    <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1 text-[11px] font-bold text-background">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col">
                    <span className="text-sm font-medium leading-tight">
                      {item.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {item.color} · {item.size}
                    </span>
                  </div>
                  <span className="text-sm font-medium tabular-nums">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            <Separator className="my-4" />

            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Товары</dt>
                <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">
                  Доставка · {deliveryOption.label}
                </dt>
                <dd className="tabular-nums">
                  {deliveryPrice === 0 ? "Бесплатно" : formatPrice(deliveryPrice)}
                </dd>
              </div>
            </dl>

            <Separator className="my-4" />

            <div className="flex items-baseline justify-between">
              <span className="font-semibold">Итого</span>
              <span className="text-xl font-bold tabular-nums">
                {formatPrice(total)}
              </span>
            </div>

            {/* Legal consents — offer + personal data are required. */}
            <div className="mt-5 space-y-2.5 text-xs text-muted-foreground">
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  checked={consents.offer}
                  onChange={(e) =>
                    setConsents((c) => ({ ...c, offer: e.target.checked }))
                  }
                  className="mt-0.5 h-4 w-4 shrink-0 accent-brand"
                />
                <span>
                  Я согласен с{" "}
                  <Link
                    href="/offer"
                    target="_blank"
                    className="text-brand underline-offset-2 hover:underline"
                  >
                    публичной офертой
                  </Link>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  checked={consents.personalData}
                  onChange={(e) =>
                    setConsents((c) => ({
                      ...c,
                      personalData: e.target.checked,
                    }))
                  }
                  className="mt-0.5 h-4 w-4 shrink-0 accent-brand"
                />
                <span>
                  Я согласен на обработку{" "}
                  <Link
                    href="/privacy"
                    target="_blank"
                    className="text-brand underline-offset-2 hover:underline"
                  >
                    персональных данных
                  </Link>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  checked={consents.marketing}
                  onChange={(e) =>
                    setConsents((c) => ({ ...c, marketing: e.target.checked }))
                  }
                  className="mt-0.5 h-4 w-4 shrink-0 accent-brand"
                />
                <span>Хочу получать новости и анонсы STOAT (необязательно)</span>
              </label>
            </div>

            <Button
              type="submit"
              variant="brand"
              size="lg"
              className="mt-4 w-full"
              disabled={submitting || !consents.offer || !consents.personalData}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? "Оформляем…" : "Оформить заказ"}
            </Button>

            <p className="mt-3 text-center text-xs text-muted-foreground">
              Оплата онлайн через ЮKassa. Безопасно.
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}
