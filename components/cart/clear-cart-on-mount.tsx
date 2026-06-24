"use client";

import { useEffect } from "react";

import { useCartStore } from "@/store/cart";

/** Clears the cart on mount — used on the payment-return page. */
export function ClearCartOnMount() {
  const clear = useCartStore((s) => s.clear);
  useEffect(() => {
    clear();
  }, [clear]);
  return null;
}
