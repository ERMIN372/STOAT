"use client";

import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { categories } from "@/data/categories";
import { cn } from "@/lib/utils";
import type { CategorySlug, ProductColor } from "@/types";

export interface ShopFiltersProps {
  colorOptions: ProductColor[];
  sizeOptions: string[];
  category: CategorySlug | "all";
  colors: string[];
  sizes: string[];
  onCategoryChange: (category: CategorySlug | "all") => void;
  onToggleColor: (name: string) => void;
  onToggleSize: (size: string) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export function ShopFilters({
  colorOptions,
  sizeOptions,
  category,
  colors,
  sizes,
  onCategoryChange,
  onToggleColor,
  onToggleSize,
  onReset,
  hasActiveFilters,
}: ShopFiltersProps) {
  const categoryOptions: { value: CategorySlug | "all"; label: string }[] = [
    { value: "all", label: "Все товары" },
    ...categories.map((c) => ({ value: c.slug, label: c.label })),
  ];

  return (
    <div className="flex flex-col gap-7">
      <FilterGroup title="Категория">
        <ul className="flex flex-col gap-1">
          {categoryOptions.map((opt) => {
            const active = category === opt.value;
            return (
              <li key={opt.value}>
                <button
                  type="button"
                  onClick={() => onCategoryChange(opt.value)}
                  aria-pressed={active}
                  className={cn(
                    "w-full rounded-md px-3 py-2 text-left text-sm transition-colors",
                    active
                      ? "bg-foreground font-medium text-background"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              </li>
            );
          })}
        </ul>
      </FilterGroup>

      <Separator />

      <FilterGroup title="Цвет">
        <ul className="flex flex-col gap-1.5">
          {colorOptions.map((color) => {
            const active = colors.includes(color.name);
            return (
              <li key={color.name}>
                <button
                  type="button"
                  onClick={() => onToggleColor(color.name)}
                  aria-pressed={active}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent",
                    active ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full border border-black/10 ring-offset-2 ring-offset-background dark:border-white/15",
                      active && "ring-2 ring-brand"
                    )}
                    style={{ backgroundColor: color.hex }}
                  >
                    {active && (
                      <Check className="h-3 w-3 text-white mix-blend-difference" />
                    )}
                  </span>
                  {color.name}
                </button>
              </li>
            );
          })}
        </ul>
      </FilterGroup>

      <Separator />

      <FilterGroup title="Размер">
        <div className="flex flex-wrap gap-2">
          {sizeOptions.map((size) => {
            const active = sizes.includes(size);
            return (
              <button
                key={size}
                type="button"
                onClick={() => onToggleSize(size)}
                aria-pressed={active}
                className={cn(
                  "min-w-9 rounded-md border px-2.5 py-1.5 text-sm transition-colors",
                  active
                    ? "border-foreground bg-foreground font-medium text-background"
                    : "border-input text-foreground hover:border-foreground"
                )}
              >
                {size}
              </button>
            );
          })}
        </div>
      </FilterGroup>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onReset} className="self-start">
          Сбросить фильтры
        </Button>
      )}
    </div>
  );
}
