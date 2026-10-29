"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { uuid } from "@/lib/uuid";

export type CartLine = { productId: string; quantity: number };

type CartState = {
  lines: CartLine[];
  discount: number; // centavos
  /** id de idempotencia: se renueva solo cuando la venta se completa o el carrito se vacía */
  requestId: string;
  add: (productId: string, max: number) => boolean;
  setQty: (productId: string, quantity: number, max: number) => void;
  remove: (productId: string) => void;
  setDiscount: (cents: number) => void;
  clear: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      discount: 0,
      requestId: uuid(),

      add: (productId, max) => {
        const line = get().lines.find((l) => l.productId === productId);
        const next = (line?.quantity ?? 0) + 1;
        if (next > max) return false;
        set((s) => ({
          lines: line
            ? s.lines.map((l) => (l.productId === productId ? { ...l, quantity: next } : l))
            : [...s.lines, { productId, quantity: 1 }],
        }));
        return true;
      },

      setQty: (productId, quantity, max) => {
        const q = Math.min(Math.max(0, Math.floor(quantity)), max);
        set((s) => ({
          lines:
            q === 0
              ? s.lines.filter((l) => l.productId !== productId)
              : s.lines.map((l) => (l.productId === productId ? { ...l, quantity: q } : l)),
        }));
      },

      remove: (productId) => set((s) => ({ lines: s.lines.filter((l) => l.productId !== productId) })),

      setDiscount: (cents) => set({ discount: Math.max(0, Math.round(cents)) }),

      clear: () => set({ lines: [], discount: 0, requestId: uuid() }),
    }),
    {
      name: "pos-cart",
      storage: createJSONStorage(() => sessionStorage),
      skipHydration: true, // se rehidrata en useEffect para no romper el SSR
    },
  ),
);
