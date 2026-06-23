"use client";

import { motion } from "framer-motion";

import { ProductCard } from "@/components/product/product-card";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

interface ProductGridProps {
  products: Product[];
  className?: string;
  /** How many cards load with image priority (above the fold). */
  priorityCount?: number;
}

/**
 * Responsive product grid with a staggered reveal as it scrolls into view.
 * Remount it (via a `key` that encodes the active filters) to replay the
 * animation when the catalogue is filtered.
 */
export function ProductGrid({
  products,
  className,
  priorityCount = 0,
}: ProductGridProps) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      className={cn(
        "grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4",
        className
      )}
    >
      {products.map((product, i) => (
        <motion.div key={product.id} variants={item}>
          <ProductCard product={product} priority={i < priorityCount} />
        </motion.div>
      ))}
    </motion.div>
  );
}
