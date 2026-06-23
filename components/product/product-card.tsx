import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { categoryBySlug } from "@/data/categories";
import { cn, formatPrice } from "@/lib/utils";
import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;
  /** Set on above-the-fold cards so Next prioritises the image. */
  priority?: boolean;
  className?: string;
}

export function ProductCard({ product, priority, className }: ProductCardProps) {
  const { images, name, price, colors, category, inStock, isNew } = product;
  const hasHoverImage = images.length > 1;

  return (
    <Link
      href={`/product/${product.id}`}
      className={cn(
        "group flex flex-col focus-visible:outline-none",
        className
      )}
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-muted ring-offset-background transition-shadow group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2">
        {/* Primary image */}
        <Image
          src={images[0]}
          alt={name}
          fill
          priority={priority}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          className={cn(
            "object-cover transition-all duration-500 ease-out group-hover:scale-[1.03]",
            hasHoverImage && "group-hover:opacity-0"
          )}
        />
        {/* Secondary image revealed on hover */}
        {hasHoverImage && (
          <Image
            src={images[1]}
            alt=""
            aria-hidden
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100"
          />
        )}

        {/* Status badges */}
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {isNew && inStock && <Badge variant="brand">Новинка</Badge>}
          {!inStock && <Badge variant="secondary">Нет в наличии</Badge>}
        </div>

        {/* Hover affordance */}
        <div className="absolute bottom-3 right-3 flex h-9 w-9 translate-y-2 items-center justify-center rounded-full bg-background/90 text-foreground opacity-0 shadow-sm backdrop-blur transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <ArrowUpRight className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-1">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          {categoryBySlug[category].label}
        </span>
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-medium leading-tight transition-colors group-hover:text-brand">
            {name}
          </h3>
          <span className="shrink-0 font-semibold tabular-nums">
            {formatPrice(price)}
          </span>
        </div>

        {/* Colour dots */}
        <div className="mt-1 flex items-center gap-1.5">
          {colors.slice(0, 5).map((c) => (
            <span
              key={c.name}
              title={c.name}
              className="h-3.5 w-3.5 rounded-full border border-black/10 dark:border-white/15"
              style={{ backgroundColor: c.hex }}
            />
          ))}
          {colors.length > 5 && (
            <span className="text-xs text-muted-foreground">
              +{colors.length - 5}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
