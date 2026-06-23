import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { categories } from "@/data/categories";

/** Four category entry points, each linking into the filtered catalogue. */
export function CategoryTiles() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {categories.map((category) => (
        <Link
          key={category.slug}
          href={`/shop?category=${category.slug}`}
          className="group relative aspect-[4/5] overflow-hidden rounded-lg bg-muted ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Image
            src={category.image}
            alt={category.label}
            fill
            sizes="(min-width: 1024px) 25vw, 50vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-end p-4 text-white">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold tracking-tight">
                {category.label}
              </h3>
              <ArrowUpRight className="h-5 w-5 -translate-x-1 translate-y-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100" />
            </div>
            <p className="mt-1 text-sm text-white/75">{category.tagline}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
