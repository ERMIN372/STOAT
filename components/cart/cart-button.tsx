"use client";

import { ShoppingBag } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { useMounted } from "@/hooks/use-mounted";
import { selectTotalItems, useCartStore } from "@/store/cart";

/** Header cart trigger with an animated item-count badge. Opens the drawer. */
export function CartButton() {
  const openCart = useCartStore((s) => s.openCart);
  const totalItems = useCartStore(selectTotalItems);
  const mounted = useMounted();

  // Avoid hydration mismatch: the persisted count is only known on the client.
  const count = mounted ? totalItems : 0;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      onClick={openCart}
      aria-label={`Корзина${count > 0 ? `, товаров: ${count}` : ", пусто"}`}
    >
      <ShoppingBag className="h-5 w-5" />
      <AnimatePresence>
        {count > 0 && (
          <motion.span
            key={count}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
            className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold tabular-nums text-brand-foreground"
          >
            {count}
          </motion.span>
        )}
      </AnimatePresence>
    </Button>
  );
}
