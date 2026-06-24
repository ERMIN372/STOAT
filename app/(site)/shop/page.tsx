import type { Metadata } from "next";

import { ShopClient } from "@/components/shop/shop-client";
import { categories } from "@/data/categories";
import { getAllProducts } from "@/lib/catalog";
import type { CategorySlug } from "@/types";

export const metadata: Metadata = {
  title: "Каталог",
  description: "Все товары STOAT: кепки, футболки, худи и аксессуары.",
};

const validSlugs = new Set(categories.map((c) => c.slug));

export default async function ShopPage({
  searchParams,
}: {
  searchParams: { category?: string };
}) {
  const products = await getAllProducts();

  const raw = searchParams.category;
  const initialCategory: CategorySlug | "all" =
    raw && validSlugs.has(raw as CategorySlug)
      ? (raw as CategorySlug)
      : "all";

  // `key` remounts the client (resetting filters) when the URL category
  // changes via the header / footer category links.
  return (
    <ShopClient
      key={initialCategory}
      initialCategory={initialCategory}
      products={products}
    />
  );
}
