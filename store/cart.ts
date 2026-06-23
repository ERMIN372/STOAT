"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, Product } from "@/types";
import { buildCartKey } from "@/lib/utils";

interface CartState {
  items: CartItem[];
  /** Whether the slide-out cart drawer is open. */
  isOpen: boolean;

  // --- mutations ---
  addItem: (
    product: Product,
    color: string,
    size: string,
    quantity?: number
  ) => void;
  removeItem: (key: string) => void;
  updateQuantity: (key: string, quantity: number) => void;
  clear: () => void;

  // --- drawer controls ---
  openCart: () => void;
  closeCart: () => void;
  setOpen: (open: boolean) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      isOpen: false,

      addItem: (product, color, size, quantity = 1) =>
        set((state) => {
          const key = buildCartKey(product.id, color, size);
          const existing = state.items.find((i) => i.key === key);

          if (existing) {
            return {
              items: state.items.map((i) =>
                i.key === key ? { ...i, quantity: i.quantity + quantity } : i
              ),
            };
          }

          const newItem: CartItem = {
            key,
            productId: product.id,
            name: product.name,
            price: product.price,
            image: product.images[0],
            color,
            size,
            quantity,
          };
          return { items: [...state.items, newItem] };
        }),

      removeItem: (key) =>
        set((state) => ({ items: state.items.filter((i) => i.key !== key) })),

      updateQuantity: (key, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.key !== key)
              : state.items.map((i) =>
                  i.key === key ? { ...i, quantity } : i
                ),
        })),

      clear: () => set({ items: [] }),

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      setOpen: (open) => set({ isOpen: open }),
    }),
    {
      name: "stoat-cart",
      // Only the line items are persisted — the drawer's open state should
      // never survive a reload.
      partialize: (state) => ({ items: state.items }),
    }
  )
);

// --- derived selectors (kept outside the store to stay reactive & cheap) ---

export const selectTotalItems = (state: CartState): number =>
  state.items.reduce((sum, i) => sum + i.quantity, 0);

export const selectTotalPrice = (state: CartState): number =>
  state.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
