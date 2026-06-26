import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";

import { ProductGallery } from "@/components/product/product-gallery";
import { ProductDetail } from "@/components/product/product-detail";
import { ProductGrid } from "@/components/product/product-grid";
import { SectionHeading } from "@/components/section-heading";
import { categoryBySlug } from "@/data/categories";
import {
  getAllProducts,
  getProductById,
  getRelatedProducts,
} from "@/lib/catalog";

// Refresh product pages from the database at most once a minute (ISR).
export const revalidate = 60;

/** Pre-render the known product pages at build time (SSG). New products added
 *  later render on-demand and are then cached. */
export async function generateStaticParams() {
  const products = await getAllProducts();
  return products.map((p) => ({ id: p.id }));
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const product = await getProductById(params.id);
  if (!product) return { title: "Товар не найден" };
  return {
    title: product.name,
    description: product.description.slice(0, 160),
  };
}

export default async function ProductPage({
  params,
}: {
  params: { id: string };
}) {
  const product = await getProductById(params.id);
  if (!product) notFound();

  const related = await getRelatedProducts(product);
  const category = categoryBySlug[product.category];

  return (
    <div className="container py-8 sm:py-12">
      {/* Breadcrumb */}
      <nav
        aria-label="Хлебные крошки"
        className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground"
      >
        <Link href="/" className="hover:text-foreground">
          Главная
        </Link>
        <ChevronRight className="h-4 w-4" aria-hidden />
        <Link href="/shop" className="hover:text-foreground">
          Каталог
        </Link>
        <ChevronRight className="h-4 w-4" aria-hidden />
        <Link
          href={`/shop?category=${product.category}`}
          className="hover:text-foreground"
        >
          {category.label}
        </Link>
        <ChevronRight className="h-4 w-4" aria-hidden />
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <ProductGallery images={product.images} name={product.name} />
        </div>
        <ProductDetail product={product} />
      </div>

      {related.length > 0 && (
        <section className="mt-20 sm:mt-28">
          <SectionHeading
            eyebrow="Похожие товары"
            title="С этим носят"
            action={{
              href: `/shop?category=${product.category}`,
              label: `Все ${category.label.toLowerCase()}`,
            }}
          />
          <div className="mt-10">
            <ProductGrid products={related} />
          </div>
        </section>
      )}
    </div>
  );
}
