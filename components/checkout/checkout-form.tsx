"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useMounted } from "@/hooks/use-mounted";
import { cn, formatPrice } from "@/lib/utils";
import { PREPARATION_NOTE } from "@/lib/delivery/config";
import { fetchDeliveryQuotes, submitOrder } from "@/lib/order";
import type { CdekPvz, DeliveryQuote } from "@/lib/delivery/types";
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
    comment: "",
  });
  const [dest, setDest] = useState({ city: "", address: "", postalCode: "" });

  const [quotes, setQuotes] = useState<DeliveryQuote[] | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [notices, setNotices] = useState<string[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  const [pvzList, setPvzList] = useState<CdekPvz[] | null>(null);
  const [pvzLoading, setPvzLoading] = useState(false);
  const [pvz, setPvz] = useState<CdekPvz | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [consents, setConsents] = useState({
    offer: false,
    personalData: false,
    marketing: false,
  });

  const selectedQuote =
    quotes?.find((q) => q.method === selectedMethod) ?? null;
  const deliveryPrice = selectedQuote?.price ?? 0;
  const total = subtotal + deliveryPrice;

  const update =
    (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const updateDest =
    (field: keyof typeof dest) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setDest((d) => ({ ...d, [field]: e.target.value }));
      // Destination changed → previous quotes are stale.
      setQuotes(null);
      setSelectedMethod(null);
      setPvz(null);
      setPvzList(null);
    };

  const calculate = useCallback(async () => {
    if (quoting) return;
    if (!dest.city.trim() && !dest.postalCode.trim()) {
      setQuoteError("Укажите город или индекс");
      return;
    }
    setQuoting(true);
    setQuoteError(null);
    setNotices([]);
    setQuotes(null);
    setSelectedMethod(null);
    setPvz(null);
    setPvzList(null);

    const res = await fetchDeliveryQuotes({
      city: dest.city.trim(),
      address: dest.address.trim() || undefined,
      postalCode: dest.postalCode.trim() || undefined,
      items: items.map((i) => ({
        productId: i.productId,
        color: i.color,
        size: i.size,
        quantity: i.quantity,
      })),
    });

    setQuoting(false);
    setNotices(res.notices ?? []);
    if (res.error && (!res.quotes || res.quotes.length === 0)) {
      setQuoteError(res.error);
      return;
    }
    if (!res.quotes.length) {
      setQuoteError(
        "Доступных способов доставки не найдено. Свяжитесь с нами — поможем оформить."
      );
      return;
    }
    setQuotes(res.quotes);
    setSelectedMethod(res.quotes[0].method);
  }, [dest, items, quoting]);

  const loadPvz = useCallback(async () => {
    setPvzLoading(true);
    try {
      const res = await fetch("/api/delivery/cdek/pvz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: dest.city.trim() || undefined,
          postalCode: dest.postalCode.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      setPvzList(data?.points ?? []);
    } catch {
      setPvzList([]);
    } finally {
      setPvzLoading(false);
    }
  }, [dest]);

  function selectMethod(method: string) {
    setSelectedMethod(method);
    if (method === "cdek_pvz" && !pvzList) void loadPvz();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    if (!consents.offer || !consents.personalData) {
      toast.error("Подтвердите согласие с офертой и обработкой данных");
      return;
    }
    if (!selectedQuote) {
      toast.error("Рассчитайте и выберите способ доставки");
      return;
    }
    if (selectedQuote.method === "cdek_pvz" && !pvz) {
      toast.error("Выберите пункт выдачи СДЭК");
      return;
    }
    if (selectedQuote.method === "cdek_courier" && !dest.address.trim()) {
      toast.error("Укажите адрес для курьерской доставки");
      return;
    }

    setSubmitting(true);
    const result = await submitOrder({
      customer: { ...form },
      delivery: {
        provider: selectedQuote.provider,
        method: selectedQuote.method,
        label: selectedQuote.label,
        city: dest.city.trim(),
        address: dest.address.trim() || undefined,
        postalCode: dest.postalCode.trim() || undefined,
        pvzCode: pvz?.code,
        pvzAddress: pvz?.address,
        price: selectedQuote.price,
      },
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

    if (result.redirectUrl) {
      window.location.href = result.redirectUrl;
      return;
    }

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

  if (orderId) {
    return (
      <div className="container flex min-h-[60vh] flex-col items-center justify-center gap-5 py-16 text-center">
        <CheckCircle2 className="h-16 w-16 text-brand" />
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Спасибо за заказ!</h1>
          <p className="text-muted-foreground">
            Заявка{" "}
            <span className="font-semibold text-foreground">{orderId}</span>{" "}
            принята. Обычно подготовка занимает 3–7 рабочих дней. Когда заказ
            будет передан в доставку, мы отправим трек-номер на e-mail.
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

  const canSubmit =
    !submitting &&
    consents.offer &&
    consents.personalData &&
    Boolean(selectedQuote) &&
    (selectedQuote?.method !== "cdek_pvz" || Boolean(pvz));

  return (
    <div className="container py-10 sm:py-14">
      <h1 className="text-display text-5xl sm:text-6xl">Оформление</h1>

      <form
        onSubmit={handleSubmit}
        className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px]"
      >
        <div className="space-y-8">
          {/* Contacts */}
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

          {/* Delivery */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold uppercase tracking-wide">
              Доставка
            </legend>
            <p className="text-sm text-muted-foreground">{PREPARATION_NOTE}</p>

            <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
              <div className="space-y-1.5">
                <Label htmlFor="city">Город</Label>
                <Input
                  id="city"
                  value={dest.city}
                  onChange={updateDest("city")}
                  placeholder="Москва"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="postalCode">Индекс</Label>
                <Input
                  id="postalCode"
                  inputMode="numeric"
                  value={dest.postalCode}
                  onChange={updateDest("postalCode")}
                  placeholder="101000"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address">Адрес (для курьера / Почты)</Label>
              <Input
                id="address"
                autoComplete="street-address"
                value={dest.address}
                onChange={updateDest("address")}
                placeholder="Улица, дом, квартира"
              />
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={calculate}
              disabled={quoting}
              className="w-full sm:w-auto"
            >
              {quoting && <Loader2 className="h-4 w-4 animate-spin" />}
              {quoting ? "Рассчитываем…" : "Рассчитать доставку"}
            </Button>

            {quoteError && (
              <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                {quoteError}{" "}
                <Link href="/contacts" className="underline">
                  Связаться с менеджером
                </Link>
              </p>
            )}

            {notices.length > 0 && (
              <ul className="space-y-1 text-xs text-muted-foreground">
                {notices.map((n) => (
                  <li key={n}>• {n}</li>
                ))}
              </ul>
            )}

            {/* Quote cards */}
            {quotes && quotes.length > 0 && (
              <div
                role="radiogroup"
                aria-label="Способ доставки"
                className="grid gap-3"
              >
                {quotes.map((q) => {
                  const active = selectedMethod === q.method;
                  return (
                    <div key={q.method}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => selectMethod(q.method)}
                        className={cn(
                          "flex w-full flex-col items-start rounded-lg border p-4 text-left transition-colors",
                          active
                            ? "border-brand ring-2 ring-brand"
                            : "border-input hover:border-foreground"
                        )}
                      >
                        <div className="flex w-full items-baseline justify-between gap-3">
                          <span className="font-medium">{q.label}</span>
                          <span className="font-semibold tabular-nums">
                            {q.price === 0
                              ? "Бесплатно"
                              : formatPrice(q.price)}
                          </span>
                        </div>
                        <span className="mt-1 text-xs text-muted-foreground">
                          {q.hint}
                        </span>
                      </button>

                      {/* PVZ picker for "СДЭК до ПВЗ" */}
                      {active && q.method === "cdek_pvz" && (
                        <div className="mt-2 rounded-lg border bg-muted/20 p-3">
                          {pvzLoading ? (
                            <p className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Загружаем пункты выдачи…
                            </p>
                          ) : pvzList && pvzList.length > 0 ? (
                            <div className="space-y-1.5">
                              <Label htmlFor="pvz">Пункт выдачи</Label>
                              <select
                                id="pvz"
                                value={pvz?.code ?? ""}
                                onChange={(e) =>
                                  setPvz(
                                    pvzList.find(
                                      (p) => p.code === e.target.value
                                    ) ?? null
                                  )
                                }
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                <option value="">
                                  Выберите пункт выдачи…
                                </option>
                                {pvzList.map((p) => (
                                  <option key={p.code} value={p.code}>
                                    {p.address}
                                  </option>
                                ))}
                              </select>
                              {pvz && (
                                <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                  {pvz.address}
                                  {pvz.workTime ? ` · ${pvz.workTime}` : ""}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              Пункты выдачи не найдены для этого города.
                              Попробуйте уточнить город или индекс.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

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
                  Доставка
                  {selectedQuote ? ` · ${selectedQuote.label}` : ""}
                </dt>
                <dd className="tabular-nums">
                  {!selectedQuote
                    ? "—"
                    : deliveryPrice === 0
                      ? "Бесплатно"
                      : formatPrice(deliveryPrice)}
                </dd>
              </div>
            </dl>

            {selectedQuote && selectedQuote.totalMinDays != null && (
              <p className="mt-2 text-xs text-muted-foreground">
                Ориентировочный срок получения:{" "}
                {selectedQuote.totalMinDays}–{selectedQuote.totalMaxDays}{" "}
                рабочих дней.
              </p>
            )}

            <Separator className="my-4" />

            <div className="flex items-baseline justify-between">
              <span className="font-semibold">Итого</span>
              <span className="text-xl font-bold tabular-nums">
                {formatPrice(total)}
              </span>
            </div>

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
              disabled={!canSubmit}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? "Оформляем…" : "Оформить заказ"}
            </Button>

            {!selectedQuote && (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Рассчитайте доставку, чтобы продолжить.
              </p>
            )}
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Оплата онлайн через ЮKassa. Безопасно.
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}
