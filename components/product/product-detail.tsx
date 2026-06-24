"use client";

import { useState } from "react";
import { Check, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { QuantityStepper } from "@/components/cart/quantity-stepper";
import { categoryBySlug } from "@/data/categories";
import { cn, formatPrice, isSizeInStock } from "@/lib/utils";
import { useCartStore } from "@/store/cart";
import type { Product } from "@/types";

const TRUST = [
  { icon: Truck, label: "Доставка 1–2 дня" },
  { icon: RotateCcw, label: "Возврат 14 дней" },
  { icon: ShieldCheck, label: "Гарантия качества" },
];

export function ProductDetail({ product }: { product: Product }) {
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);

  const [color, setColor] = useState(product.colors[0]?.name ?? "");
  // Default to the first size that's actually in stock.
  const [size, setSize] = useState(
    product.sizes.find((s) => isSizeInStock(product, s)) ??
      product.sizes[0] ??
      ""
  );
  const [quantity, setQuantity] = useState(1);

  const sizeAvailable = isSizeInStock(product, size);
  const canAdd = product.inStock && sizeAvailable;

  function handleAdd() {
    if (!canAdd) return;
    addItem(product, color, size, quantity);
    toast.success("Добавлено в корзину", {
      description: `${product.name} · ${color} · ${size}`,
      action: { label: "Открыть", onClick: openCart },
    });
  }

  return (
    <div>
      <p className="text-sm uppercase tracking-wide text-muted-foreground">
        {categoryBySlug[product.category].label}
      </p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
        {product.name}
      </h1>

      <div className="mt-4 flex items-center gap-3">
        <span className="text-2xl font-semibold tabular-nums">
          {formatPrice(product.price)}
        </span>
        {product.isNew && product.inStock && (
          <Badge variant="brand">Новинка</Badge>
        )}
        {!product.inStock && <Badge variant="secondary">Нет в наличии</Badge>}
      </div>

      <Separator className="my-6" />

      {/* Colour */}
      <div>
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium">Цвет</span>
          <span className="text-sm text-muted-foreground">{color}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2.5">
          {product.colors.map((c) => {
            const active = c.name === color;
            return (
              <button
                key={c.name}
                type="button"
                onClick={() => setColor(c.name)}
                aria-pressed={active}
                aria-label={c.name}
                title={c.name}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full border border-black/10 ring-offset-2 ring-offset-background transition dark:border-white/15",
                  active && "ring-2 ring-brand"
                )}
                style={{ backgroundColor: c.hex }}
              >
                {active && (
                  <Check className="h-4 w-4 text-white mix-blend-difference" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Size */}
      <div className="mt-6">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium">Размер</span>
          {/* TODO(sizes): link to a real size guide modal. */}
          <button className="text-sm text-muted-foreground underline-offset-4 hover:underline">
            Таблица размеров
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {product.sizes.map((s) => {
            const active = s === size;
            const available = isSizeInStock(product, s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => available && setSize(s)}
                disabled={!available}
                aria-pressed={active}
                title={available ? undefined : "Нет в наличии"}
                className={cn(
                  "min-w-11 rounded-md border px-3 py-2 text-sm transition-colors",
                  !available &&
                    "cursor-not-allowed border-dashed text-muted-foreground line-through opacity-50",
                  available &&
                    (active
                      ? "border-foreground bg-foreground font-medium text-background"
                      : "border-input hover:border-foreground")
                )}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quantity + add */}
      <div className="mt-7 flex items-center gap-3">
        <QuantityStepper value={quantity} onChange={setQuantity} />
        <Button
          variant="brand"
          size="xl"
          className="flex-1"
          onClick={handleAdd}
          disabled={!canAdd}
        >
          {!product.inStock
            ? "Нет в наличии"
            : !sizeAvailable
              ? "Размер недоступен"
              : "В корзину"}
        </Button>
      </div>

      {/* Trust badges */}
      <ul className="mt-6 grid grid-cols-3 gap-2">
        {TRUST.map(({ icon: Icon, label }) => (
          <li
            key={label}
            className="flex flex-col items-center gap-1.5 rounded-lg border bg-muted/30 p-3 text-center text-xs text-muted-foreground"
          >
            <Icon className="h-4 w-4" />
            {label}
          </li>
        ))}
      </ul>

      <Separator className="my-6" />

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide">
          Описание
        </h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          {product.description}
        </p>
      </div>
    </div>
  );
}
