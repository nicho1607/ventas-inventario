"use client";

import { useRef, useState, useTransition } from "react";
import { Ban } from "lucide-react";
import { toast } from "sonner";
import { Button, inputClass } from "@/components/ui";
import { voidSaleAction } from "../actions";

const presets = ["Error al cobrar", "El cliente devolvió todo", "Venta registrada dos veces", "Cambio de método de pago"];

export function VoidSaleButton({ saleId, folioLabel }: { saleId: string; folioLabel: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function open() {
    setReason("");
    setError(null);
    ref.current?.showModal();
  }

  function confirm() {
    startTransition(async () => {
      const r = await voidSaleAction(saleId, reason);
      if (!r.ok) {
        setError(r.message);
        return;
      }
      ref.current?.close();
      toast.success(`Venta ${folioLabel} anulada. El stock se devolvió al inventario.`);
    });
  }

  return (
    <>
      <Button variant="danger" onClick={open}>
        <Ban className="size-4" aria-hidden />
        Anular venta
      </Button>
      <dialog
        ref={ref}
        aria-labelledby="void-title"
        onCancel={(e) => pending && e.preventDefault()}
        className="m-auto w-[min(30rem,calc(100vw-1.5rem))] rounded-xl bg-surface p-0 text-ink shadow-2xl"
      >
        <div className="space-y-4 p-5">
          <div>
            <h2 id="void-title" className="font-display text-xl font-bold">
              Anular la venta {folioLabel}
            </h2>
            <p className="mt-1 text-ink-2">
              Los productos vuelven al inventario y la venta deja de contar en los ingresos. No se puede deshacer.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="void-reason" className="font-semibold">
              Motivo
            </label>
            <input
              id="void-reason"
              autoFocus
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (reason.trim()) confirm();
                }
              }}
              className={inputClass}
            />
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={reason === p}
                  onClick={() => setReason(p)}
                  className="h-9 rounded-full border border-line px-3 text-sm font-semibold text-ink-2 aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-bg"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => ref.current?.close()} disabled={pending}>
              Volver
            </Button>
            <button
              type="button"
              onClick={confirm}
              disabled={pending || !reason.trim()}
              className="h-12 flex-1 rounded-lg bg-danger px-5 font-bold text-white disabled:opacity-50"
            >
              {pending ? "Anulando…" : "Anular y devolver stock"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
