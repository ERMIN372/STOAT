"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBag, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { QuantityStepper } from "@/components/cart/quantity-stepper";
import { useMounted } from "@/hooks/use-mounted";
import { formatPrice } from "@/lib/utils";
import {
  selectTotalItems,
  selectTotalPrice,
  useCartStore,
} from "@/store/cart";

export function CartView() {
  const mounted = useMounted();
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clear = useCartStore((s) => s.clear);
  const totalItems = useCartStore(selectTotalItems);
  const totalPrice = useCartStore(selectTotalPrice);

  // The cart lives in localStorage; render nothing meaningful until mounted to
  // keep server and client markup identical (no hydration mismatch).
  if (!mounted) {
    return (
      <div className="container flex min-h-[50vh] items-center justify-center py-16">
        <p className="text-muted-foreground">Загружаем корзину…</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container flex min-h-[55vh] flex-col items-center justify-center gap-5 py-16 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
          <ShoppingBag className="h-9 w-9 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">В корзине пусто</h1>
          <p className="text-muted-foreground">
            Добавьте что-нибудь из коллекции — она вас ждёт.
          </p>
        </div>
        <Button asChild variant="brand" size="lg">
          <Link href="/shop">Перейти в каталог</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-10 sm:py-14">
      <h1 className="text-display text-5xl sm:text-6xl">Корзина</h1>
      <p className="mt-3 text-muted-foreground">{totalItems} шт.</p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px]">
        {/* Items */}
        <ul className="divide-y border-y">
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <motion.li
                key={item.key}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, height: 0 }}
                className="flex gap-4 py-5 sm:gap-6"
              >
                <Link
                  href={`/product/${item.productId}`}
                  className="relative aspect-[4/5] w-24 shrink-0 overflow-hidden rounded-md bg-muted sm:w-28"
                >
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    sizes="112px"
                    className="object-cover"
                  />
                </Link>

                <div className="flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link
                        href={`/product/${item.productId}`}
                        className="font-medium hover:text-brand"
                      >
                        {item.name}
                      </Link>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {item.color} · {item.size}
                      </p>
                    </div>
                    <span className="font-semibold tabular-nums">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-4">
                    <QuantityStepper
                      value={item.quantity}
                      onChange={(q) => updateQuantity(item.key, q)}
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(item.key)}
                      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`Удалить ${item.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="hidden sm:inline">Удалить</span>
                    </button>
                  </div>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        {/* Summary */}
        <aside className="lg:sticky lg:top-32 lg:self-start">
          <div className="rounded-xl border p-6">
            <h2 className="text-lg font-semibold">Итог заказа</h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Товары ({totalItems})</dt>
                <dd className="tabular-nums">{formatPrice(totalPrice)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Доставка</dt>
                <dd className="text-muted-foreground">при оформлении</dd>
              </div>
            </dl>
            <Separator className="my-4" />
            <div className="flex items-baseline justify-between">
              <span className="font-semibold">Итого</span>
              <span className="text-xl font-bold tabular-nums">
                {formatPrice(totalPrice)}
              </span>
            </div>
            <Button asChild variant="brand" size="lg" className="mt-5 w-full">
              <Link href="/checkout">Оформить заказ</Link>
            </Button>
            <div className="mt-3 flex items-center justify-between">
              <Button asChild variant="link" className="px-0">
                <Link href="/shop">Продолжить покупки</Link>
              </Button>
              <button
                type="button"
                onClick={clear}
                className="text-sm text-muted-foreground hover:text-destructive"
              >
                Очистить
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
