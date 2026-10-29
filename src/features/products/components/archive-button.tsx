"use client";

import { useEffect, useState, useTransition } from "react";
import { Archive, ArchiveRestore } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import { setProductActiveAction } from "../actions";

export function ArchiveButton({ id, name, isActive }: { id: string; name: string; isActive: boolean }) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 3000);
    return () => clearTimeout(t);
  }, [confirming]);

  function run() {
    // Archivar pide un segundo toque; reactivar es inmediato
    if (isActive && !confirming) return setConfirming(true);
    setConfirming(false);
    startTransition(async () => {
      const r = await setProductActiveAction(id, !isActive);
      if (r.ok) toast.success(isActive ? `${name} archivado: ya no aparece en Vender` : `${name} está activo otra vez`);
      else toast.error(r.message);
    });
  }

  return (
    <Button variant={isActive ? "danger" : "secondary"} onClick={run} disabled={pending}>
      {isActive ? <Archive className="size-4" aria-hidden /> : <ArchiveRestore className="size-4" aria-hidden />}
      {isActive ? (confirming ? "Toca otra vez para archivar" : "Archivar") : "Reactivar"}
    </Button>
  );
}
