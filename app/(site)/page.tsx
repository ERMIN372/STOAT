import Link from "next/link";

import { Hero } from "@/components/home/hero";
import { CategoryTiles } from "@/components/home/category-tiles";
import { ProductGrid } from "@/components/product/product-grid";
import { SectionHeading } from "@/components/section-heading";
import { Button } from "@/components/ui/button";
import { getNewArrivals } from "@/lib/catalog";

// Re-fetch from Sanity at most once a minute so edits в Studio appear live.
export const revalidate = 60;

export default async function HomePage() {
  const newArrivals = await getNewArrivals();

  return (
    <>
      <Hero />

      {/* New arrivals */}
      <section className="container py-20 sm:py-28">
        <SectionHeading
          eyebrow="Новинки"
          title="Только что завезли"
          action={{ href: "/shop", label: "Весь каталог" }}
        />
        <div className="mt-10">
          <ProductGrid products={newArrivals} priorityCount={4} />
        </div>
        <div className="mt-10 flex justify-center sm:hidden">
          <Button asChild variant="outline" size="lg">
            <Link href="/shop">Весь каталог</Link>
          </Button>
        </div>
      </section>

      {/* Categories */}
      <section className="border-t bg-muted/30">
        <div className="container py-20 sm:py-28">
          <SectionHeading eyebrow="Категории" title="Выбирай своё" />
          <div className="mt-10">
            <CategoryTiles />
          </div>
        </div>
      </section>

      {/* Brand statement */}
      <section className="container py-20 sm:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-2xl font-medium leading-snug sm:text-3xl">
            STOAT — это{" "}
            <span className="text-brand">точность</span> уличного гардероба.
            Плотные ткани, выверенный крой и детали, которые служат годами.
            Никакой логомании — только характер.
          </p>
          <Button asChild variant="brand" size="lg" className="mt-8">
            <Link href="/shop">Собрать образ</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
