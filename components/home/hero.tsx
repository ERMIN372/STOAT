"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

const ease = [0.22, 1, 0.36, 1] as const;

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b">
      {/* Oversized backdrop wordmark for editorial depth */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-6 bottom-[-8%] select-none text-[34vw] font-extrabold leading-none tracking-tighter text-foreground/[0.035] sm:bottom-[-12%]"
      >
        STOAT
      </span>

      <div className="container relative flex min-h-[86vh] flex-col justify-center py-24">
        <motion.span
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
          className="inline-flex items-center gap-2 text-sm font-medium uppercase tracking-widest text-muted-foreground"
        >
          <span className="h-2 w-2 rounded-full bg-brand" />
          Коллекция SS26 — сделано для города
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease, delay: 0.05 }}
          className="text-display mt-5 text-[clamp(3.5rem,17vw,15rem)]"
        >
          STOAT
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease, delay: 0.15 }}
          className="mt-6 max-w-xl text-lg text-muted-foreground sm:text-xl"
        >
          Премиальный streetwear без лишнего. Кепки, футболки и худи в чистом
          крое — чёрное, белое и один точный акцент.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease, delay: 0.25 }}
          className="mt-9 flex flex-wrap items-center gap-3"
        >
          <Button asChild variant="brand" size="xl">
            <Link href="/shop">
              Смотреть коллекцию
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="xl">
            <Link href="/shop?category=caps">Кепки сезона</Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
