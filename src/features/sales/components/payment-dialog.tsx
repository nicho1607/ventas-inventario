"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Banknote, CreditCard, Delete, Landmark, CircleCheck, Printer } from "lucide-react";
import { formatMoney, toCents } from "@/lib/money";
import { paymentMethodLabels, paymentMethods } from "../schemas";
import type { CreateSaleResult } from "../actions";

type Method = (typeof paymentMethods)[number];
type Receipt = Extract<CreateSaleResult, { ok: true }>["sale"];

const methodIcons = { CASH: Banknote, TRANSFER: Landmark, CARD: CreditCard } as const;
const DENOMINATIONS = [1_000, 2_000, 5_000, 10_000, 20_000, 50_000, 100_000].map(toCents);

/** Montos sugeridos: el siguiente valor redondo por cada billete, sin repetir */
function quickAmounts(total: number): number[] {
  const set = new Set<number>();
  for (const d of DENOMINATIONS) {
    const v = Math.ceil(total / d) * d;
    if (v > total) set.add(v);
  }
  return [...set].sort((a, b) => a - b).slice(0, 4);
}

type Props = {
  open: boolean;
  total: number;
  onClose: () => void;
  onConfirm: (method: Method, amountPaid: number | undefined) => Promise<CreateSaleResult>;
  onDone: () => void;
};

export function PaymentDialog({ open, total, onClose, onConfirm, onDone }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const [method, setMethod] = useState<Method>("CASH");
  const [digits, setDigits] = useState(""); // pesos digitados
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setMethod("CASH");
      setDigits("");
      setReceipt(null);
      setError(null);
      dialog.showModal();
      // Foco en "Confirmar": Enter cierra la venta en pago exacto
      confirmRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Vacío = pago exacto: la venta más común se cierra con F8 → Enter
  const paid = digits ? toCents(Number(digits)) : total;
  const change = paid - total;
  const canConfirm = !pending && (method !== "CASH" || paid >= total);
  const suggestions = useMemo(() => quickAmounts(total), [total]);

  function confirm() {
    if (!canConfirm) return;
    setError(null);
    startTransition(async () => {
      const result = await onConfirm(method, method === "CASH" ? paid : undefined);
      if (result.ok) setReceipt(result.sale);
      else setError(result.message);
    });
  }

  function finish() {
    if (receipt) onDone();
    else onClose();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (receipt) {
      if (e.key === "Enter") {
        e.preventDefault();
        finish();
      }
      return;
    }
    if (e.target instanceof HTMLButtonElement && (e.key === "Enter" || e.key === " ")) return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const i = paymentMethods.indexOf(method);
      const next = (i + (e.key === "ArrowRight" ? 1 : -1) + paymentMethods.length) % paymentMethods.length;
      setMethod(paymentMethods[next]);
    } else if (method === "CASH" && /^\d$/.test(e.key)) {
      e.preventDefault();
      setDigits((d) => (d + e.key).replace(/^0+/, "").slice(0, 9));
    } else if (method === "CASH" && e.key === "Backspace") {
      e.preventDefault();
      setDigits((d) => d.slice(0, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      confirm();
    }
  }

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        if (!pending) finish();
      }}
      onKeyDown={onKeyDown}
      aria-labelledby="payment-title"
      className="m-auto w-[min(34rem,calc(100vw-1.5rem))] rounded-xl bg-surface p-0 text-ink shadow-2xl"
    >
      {receipt ? (
        <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
          <CircleCheck className="size-12 text-ok" aria-hidden />
          <h2 id="payment-title" className="font-display text-2xl font-bold">
            Venta #{String(receipt.folio).padStart(4, "0")} registrada
          </h2>
          <p className="text-ink-2">
            {formatMoney(receipt.total)} · {paymentMethodLabels[receipt.paymentMethod]}
          </p>
          {receipt.change !== null && (
            <div className="mt-4 w-full rounded-lg bg-brand-soft px-4 py-4">
              <p className="text-sm font-semibold text-ink-2">Cambio a entregar</p>
              <p className="figure text-5xl font-extrabold text-ink">{formatMoney(receipt.change)}</p>
            </div>
          )}
          <button
            type="button"
            autoFocus
            onClick={finish}
            className="mt-5 h-14 w-full rounded-lg bg-brand text-lg font-bold text-brand-ink"
          >
            Nueva venta
          </button>
          <a
            href={`/ventas/${receipt.id}?imprimir=1`}
            target="_blank"
            rel="noopener"
            className="mt-1 inline-flex h-11 items-center gap-2 rounded-lg px-4 font-semibold text-ink-2 hover:bg-surface-2 hover:text-ink"
          >
            <Printer className="size-4" aria-hidden />
            Imprimir tirilla
          </a>
        </div>
      ) : (
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-baseline justify-between">
            <h2 id="payment-title" className="font-display text-xl font-bold">
              Cobrar
            </h2>
            <p className="figure text-3xl font-extrabold">{formatMoney(total)}</p>
          </div>

          <div role="radiogroup" aria-label="Método de pago" className="grid grid-cols-3 gap-2">
            {paymentMethods.map((m) => {
              const Icon = methodIcons[m];
              return (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={method === m}
                  onClick={() => setMethod(m)}
                  className="flex h-20 flex-col items-center justify-center gap-1 rounded-lg border-2 [@media(max-height:760px)]:h-16 border-line text-sm font-bold text-ink-2 aria-checked:border-brand aria-checked:bg-brand-soft aria-checked:text-ink"
                >
                  <Icon className="size-6" aria-hidden />
                  {paymentMethodLabels[m]}
                </button>
              );
            })}
          </div>

          {method === "CASH" ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-line px-3 py-2">
                  <p className="text-sm text-ink-3">Recibido</p>
                  <p className="figure text-3xl font-bold" aria-live="polite">
                    {formatMoney(paid)}
                    {!digits && <span className="ml-2 align-middle text-sm font-semibold text-ink-3">exacto</span>}
                  </p>
                </div>
                <div className={`rounded-lg px-3 py-2 ${change >= 0 ? "bg-brand-soft" : "bg-danger-soft"}`}>
                  <p className="text-sm text-ink-2">{change >= 0 ? "Cambio" : "Falta"}</p>
                  <p className={`figure text-3xl font-extrabold ${change >= 0 ? "text-ink" : "text-danger"}`} aria-live="polite">
                    {formatMoney(Math.abs(change))}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <QuickButton active={!digits} onClick={() => setDigits("")}>
                  Exacto
                </QuickButton>
                {suggestions.map((v) => (
                  <QuickButton key={v} active={paid === v && !!digits} onClick={() => setDigits(String(v / 100))}>
                    {formatMoney(v)}
                  </QuickButton>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2" aria-label="Teclado numérico">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "000", "0"].map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setDigits((d) => (d + k).replace(/^0+/, "").slice(0, 9))}
                    className="figure h-14 rounded-lg bg-surface-2 text-2xl font-bold active:scale-95 [@media(max-height:760px)]:h-11"
                  >
                    {k}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setDigits((d) => d.slice(0, -1))}
                  aria-label="Borrar último dígito"
                  className="grid h-14 place-items-center rounded-lg bg-surface-2 active:scale-95 [@media(max-height:760px)]:h-11"
                >
                  <Delete className="size-6" />
                </button>
              </div>
            </>
          ) : (
            <p className="rounded-lg bg-surface-2 px-4 py-6 text-center text-ink-2">
              Confirma cuando el pago por {paymentMethodLabels[method].toLowerCase()} se haya recibido.
            </p>
          )}

          {error && (
            <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={finish}
              disabled={pending}
              className="h-14 rounded-lg px-5 font-semibold text-ink-2 hover:bg-surface-2"
            >
              Volver
            </button>
            <button
              ref={confirmRef}
              type="button"
              onClick={confirm}
              disabled={!canConfirm}
              className="h-14 flex-1 rounded-lg bg-brand text-lg font-bold text-brand-ink disabled:opacity-40"
            >
              {pending ? "Registrando…" : "Confirmar venta"}
            </button>
          </div>
          <p className="hidden text-center text-xs text-ink-3 lg:block">
            Enter confirma, ← → cambia el método, Esc vuelve
          </p>
        </div>
      )}
    </dialog>
  );
}

function QuickButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="figure h-11 rounded-full border border-line px-4 text-base font-bold text-ink-2 aria-pressed:border-mark aria-pressed:bg-mark aria-pressed:text-mark-ink"
    >
      {children}
    </button>
  );
}
