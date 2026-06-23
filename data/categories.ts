import type { Category } from "@/types";

/**
 * Storefront categories. The `slug` values are the single source of truth
 * for `Product.category` and the `/shop?category=` filter.
 */
export const categories: Category[] = [
  {
    slug: "caps",
    label: "Кепки",
    tagline: "Шесть панелей. Ноль компромиссов.",
    image: "/products/category-caps.svg",
  },
  {
    slug: "tshirts",
    label: "Футболки",
    tagline: "Плотный хлопок, чистый крой.",
    image: "/products/category-tshirts.svg",
  },
  {
    slug: "hoodies",
    label: "Худи",
    tagline: "Тепло, которое носят годами.",
    image: "/products/category-hoodies.svg",
  },
  {
    slug: "accessories",
    label: "Аксессуары",
    tagline: "Детали, которые решают всё.",
    image: "/products/category-accessories.svg",
  },
];

/** Lookup helper used across pages to resolve a slug to its display label. */
export const categoryBySlug = Object.fromEntries(
  categories.map((c) => [c.slug, c])
) as Record<Category["slug"], Category>;
