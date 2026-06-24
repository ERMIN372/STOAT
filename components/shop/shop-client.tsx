"use client";

import { useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ProductGrid } from "@/components/product/product-grid";
import { ShopFilters } from "@/components/shop/shop-filters";
import type { CategorySlug, Product } from "@/types";

type SortOption = "featured" | "price-asc" | "price-desc";

const SORT_LABELS: Record<SortOption, string> = {
  featured: "Рекомендуемые",
  "price-asc": "Сначала дешевле",
  "price-desc": "Сначала дороже",
};

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "One Size"];

/** Russian plural: pluralize(2, ["товар","товара","товаров"]). */
function pluralize(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

export function ShopClient({
  initialCategory,
  products,
}: {
  initialCategory: CategorySlug | "all";
  products: Product[];
}) {
  const [category, setCategory] = useState<CategorySlug | "all">(
    initialCategory
  );
  const [colors, setColors] = useState<string[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [sort, setSort] = useState<SortOption>("featured");

  // Filter options are derived from the live catalogue passed in by the server.
  const colorOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const p of products)
      for (const c of p.colors) if (!seen.has(c.name)) seen.set(c.name, c.hex);
    return Array.from(seen, ([name, hex]) => ({ name, hex }));
  }, [products]);

  const sizeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) for (const s of p.sizes) set.add(s);
    return Array.from(set).sort((a, b) => {
      const ia = SIZE_ORDER.indexOf(a);
      const ib = SIZE_ORDER.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b, "ru");
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }, [products]);

  const filtered = useMemo(() => {
    const list = products.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (colors.length && !p.colors.some((c) => colors.includes(c.name)))
        return false;
      if (sizes.length && !p.sizes.some((s) => sizes.includes(s))) return false;
      return true;
    });

    switch (sort) {
      case "price-asc":
        return [...list].sort((a, b) => a.price - b.price);
      case "price-desc":
        return [...list].sort((a, b) => b.price - a.price);
      default:
        // Featured: new arrivals first, otherwise keep catalogue order.
        return [...list].sort(
          (a, b) => Number(b.isNew ?? false) - Number(a.isNew ?? false)
        );
    }
  }, [products, category, colors, sizes, sort]);

  const toggleColor = (name: string) =>
    setColors((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );

  const toggleSize = (size: string) =>
    setSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );

  const reset = () => {
    setCategory("all");
    setColors([]);
    setSizes([]);
  };

  const activeCount =
    colors.length + sizes.length + (category !== "all" ? 1 : 0);

  const filterProps = {
    colorOptions,
    sizeOptions,
    category,
    colors,
    sizes,
    onCategoryChange: setCategory,
    onToggleColor: toggleColor,
    onToggleSize: toggleSize,
    onReset: reset,
    hasActiveFilters: activeCount > 0,
  };

  return (
    <div className="container py-10 sm:py-14">
      <header className="mb-8">
        <h1 className="text-display text-5xl sm:text-6xl">Каталог</h1>
        <p className="mt-3 text-muted-foreground">
          {filtered.length}{" "}
          {pluralize(filtered.length, ["товар", "товара", "товаров"])}
        </p>
      </header>

      {/* Controls row */}
      <div className="mb-6 flex items-center gap-3">
        {/* Mobile filter trigger */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="lg:hidden">
              <SlidersHorizontal className="h-4 w-4" />
              Фильтры
              {activeCount > 0 && (
                <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-xs font-bold text-brand-foreground">
                  {activeCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 overflow-y-auto">
            <SheetHeader className="mb-6 text-left">
              <SheetTitle>Фильтры</SheetTitle>
            </SheetHeader>
            <ShopFilters {...filterProps} />
          </SheetContent>
        </Sheet>

        <div className="ml-auto w-48">
          <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
            <SelectTrigger aria-label="Сортировка">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {SORT_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-32">
            <ShopFilters {...filterProps} />
          </div>
        </aside>

        {/* Results */}
        <div>
          {filtered.length > 0 ? (
            <ProductGrid
              key={`${category}-${colors.join()}-${sizes.join()}-${sort}`}
              products={filtered}
              className="sm:grid-cols-2 xl:grid-cols-3"
              priorityCount={3}
            />
          ) : (
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-lg border border-dashed text-center">
              <p className="text-lg font-medium">Ничего не найдено</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Попробуйте изменить или сбросить фильтры — мы регулярно
                пополняем коллекцию.
              </p>
              <Button variant="outline" onClick={reset}>
                Сбросить фильтры
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
