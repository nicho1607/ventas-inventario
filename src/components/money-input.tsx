"use client";

import type { ComponentProps } from "react";
import { inputClass } from "./ui";

type Props = Omit<ComponentProps<"input">, "value" | "onChange"> & {
  /** pesos enteros (no centavos); null = vacío */
  value: number | null;
  onChange: (pesos: number | null) => void;
};

/** Campo de pesos con separador de miles mientras se escribe: 13900 → "13.900" */
export function MoneyInput({ value, onChange, className = "", ...props }: Props) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-lg text-ink-3">$</span>
      <input
        {...props}
        inputMode="numeric"
        autoComplete="off"
        value={value === null ? "" : value.toLocaleString("es-CO")}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
          onChange(digits ? Number(digits) : null);
        }}
        className={`${inputClass} figure pl-7 ${className}`}
      />
    </div>
  );
}
