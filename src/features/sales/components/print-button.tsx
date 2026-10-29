"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui";

/** Imprime la tirilla. Con `auto`, abre el diálogo de impresión al cargar (ej. desde el POS). */
export function PrintButton({ auto = false }: { auto?: boolean }) {
  useEffect(() => {
    if (!auto) return;
    const t = setTimeout(() => window.print(), 300); // deja cargar las fuentes
    return () => clearTimeout(t);
  }, [auto]);

  return (
    <Button variant="secondary" onClick={() => window.print()}>
      <Printer className="size-4" aria-hidden />
      Imprimir tirilla
    </Button>
  );
}
