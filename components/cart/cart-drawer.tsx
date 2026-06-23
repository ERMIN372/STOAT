"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBag, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { QuantityStepper } from "@/components/cart/quantity-stepper";
import { formatPrice } from "@/lib/utils";
import {
  selectTotalItems,
  selectTotalPrice,
  useCartStore,
} from "@/store/cart";

/**
 * Slide-out cart. Mounted once in the root layout; visibility is driven by the
 * Zustand store so any "add to cart" action can pop it open.
 */
export function CartDrawer() {
  const isOpen = useCartStore((s) => s.isOpen);
  const setOpen = useCartStore((s) => s.setOpen);
  const closeCart = useCartStore((s) => s.closeCart);
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const totalItems = useCartStore(selectTotalItems);
  const totalPrice = useCartStore(selectTotalPrice);

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="space-y-0 border-b px-5 py-4 text-left">
          <SheetTitle className="flex items-center gap-2 text-base">
            <ShoppingBag className="h-4 w-4" />
            Корзина
            {totalItems > 0 && (
              <span className="text-muted-foreground">
                · {totalItems}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <ShoppingBag className="h-7 w-7 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">Корзина пуста</p>
              <p className="text-sm text-muted-foreground">
                Самое время выбрать что-нибудь из новой коллекции.
              </p>
            </div>
            <Button asChild variant="brand" onClick={closeCart}>
              <Link href="/shop">В каталог</Link>
            </Button>
          </div>
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto px-5 py-4">
              <AnimatePresence initial={false}>
                {items.map((item) => (
                  <motion.li
                    key={item.key}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex gap-4 py-4 first:pt-0"
                  >
                    <Link
                      href={`/product/${item.productId}`}
                      onClick={closeCart}
                      className="relative aspect-[4/5] h-24 shrink-0 overflow-hidden rounded-md bg-muted"
                    >
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    </Link>

                    <div className="flex flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/product/${item.productId}`}
                          onClick={closeCart}
                          className="font-medium leading-tight hover:text-brand"
                        >
                          {item.name}
                        </Link>
                        <button
                          type="button"
                          onClick={() => removeItem(item.key)}
                          aria-label={`Удалить ${item.name} из корзины`}
                          className="text-muted-foreground transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {item.color} · {item.size}
                      </p>
                      <div className="mt-auto flex items-center justify-between pt-3">
                        <QuantityStepper
                          size="sm"
                          value={item.quantity}
                          onChange={(q) => updateQuantity(item.key, q)}
                        />
                        <span className="font-semibold tabular-nums">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>

            <div className="border-t px-5 py-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Подытог</span>
                <span className="tabular-nums">{formatPrice(totalPrice)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Доставка рассчитывается при оформлении.
              </p>
              <Separator className="my-4" />
              <div className="flex flex-col gap-2">
                <Button asChild variant="brand" size="lg" onClick={closeCart}>
                  <Link href="/checkout">Оформить заказ</Link>
                </Button>
                <Button asChild variant="outline" onClick={closeCart}>
                  <Link href="/cart">Перейти в корзину</Link>
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
