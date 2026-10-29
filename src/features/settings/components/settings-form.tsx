"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button, Field, inputClass } from "@/components/ui";
import type { StoreSettings } from "../queries";
import { saveSettingsAction } from "../actions";

export function SettingsForm({ settings }: { settings: StoreSettings }) {
  const [values, setValues] = useState({
    name: settings.name,
    legalId: settings.legalId ?? "",
    address: settings.address ?? "",
    phone: settings.phone ?? "",
    receiptFooter: settings.receiptFooter ?? "",
  });
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const set = (k: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => setValues((v) => ({ ...v, [k]: e.target.value }));
  const err = (k: string) => (error?.field === k ? error.message : undefined);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await saveSettingsAction(values);
      if (!r.ok) {
        setError({ field: r.field, message: r.message });
        toast.error(r.message);
        return;
      }
      setError(null);
      toast.success("Configuración guardada");
    });
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <form onSubmit={submit} noValidate className="space-y-5">
        <Field label="Nombre de la tienda" htmlFor="name" error={err("name")} hint="Aparece en la barra superior y en la tirilla.">
          <input id="name" value={values.name} onChange={set("name")} aria-invalid={!!err("name") || undefined} className={inputClass} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="NIT o cédula" htmlFor="legalId" error={err("legalId")} hint="Opcional.">
            <input id="legalId" value={values.legalId} onChange={set("legalId")} className={`${inputClass} figure`} />
          </Field>
          <Field label="Teléfono" htmlFor="phone" error={err("phone")} hint="Opcional.">
            <input id="phone" type="tel" value={values.phone} onChange={set("phone")} className={`${inputClass} figure`} />
          </Field>
        </div>
        <Field label="Dirección" htmlFor="address" error={err("address")} hint="Opcional.">
          <input id="address" value={values.address} onChange={set("address")} className={inputClass} />
        </Field>
        <Field label="Mensaje al final de la tirilla" htmlFor="receiptFooter" error={err("receiptFooter")}>
          <input id="receiptFooter" value={values.receiptFooter} onChange={set("receiptFooter")} className={inputClass} />
        </Field>
        <Button type="submit" disabled={pending} className="min-w-44">
          {pending ? "Guardando…" : "Guardar configuración"}
        </Button>
      </form>

      <aside aria-label="Vista previa de la tirilla">
        <p className="mb-2 text-sm font-semibold text-ink-2">Así se ve en la tirilla</p>
        <div className="receipt-edge bg-receipt px-5 pt-5 pb-8 text-center shadow-[0_1px_0_var(--line),0_8px_24px_-12px_rgb(0_0_0/0.25)]">
          <p className="font-display text-lg font-bold">{values.name.trim() || "Nombre de la tienda"}</p>
          {values.legalId.trim() && <p className="text-sm text-ink-2">NIT {values.legalId.trim()}</p>}
          {values.address.trim() && <p className="text-sm text-ink-2">{values.address.trim()}</p>}
          {values.phone.trim() && <p className="text-sm text-ink-2">Tel. {values.phone.trim()}</p>}
          <div className="my-3 border-t border-dashed border-line" />
          <p className="text-sm text-ink-3">Productos de la venta…</p>
          <div className="my-3 border-t border-dashed border-line" />
          <p className="text-sm text-ink-2">{values.receiptFooter.trim()}</p>
        </div>
      </aside>
    </div>
  );
}
