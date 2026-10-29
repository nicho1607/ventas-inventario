"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button, inputClass } from "@/components/ui";
import { categoryColors } from "../schemas";
import type { CategoryRow } from "../queries";
import {
  createCategoryAction,
  deleteCategoryAction,
  moveCategoryAction,
  updateCategoryAction,
  type CategoryResult,
} from "../actions";

function ColorPicker({ value, onChange, label }: { value: string; onChange: (c: string) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {categoryColors.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          aria-label={`Color ${c}`}
          onClick={() => onChange(c)}
          className="grid size-9 place-items-center rounded-full ring-offset-2 ring-offset-surface aria-checked:ring-2 aria-checked:ring-ink"
          style={{ backgroundColor: c }}
        >
          {value === c && <Check className="size-4 text-white" aria-hidden />}
        </button>
      ))}
    </div>
  );
}

export function CategoryManager({ categories }: { categories: CategoryRow[] }) {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  // Propone el primer color que ninguna categoría use, para que no se repitan
  const freeColor = () => categoryColors.find((c) => !categories.some((cat) => cat.color === c)) ?? categoryColors[0];
  const [color, setColor] = useState<string>(freeColor);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: "", color: "" });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!confirmDelete) return;
    const t = setTimeout(() => setConfirmDelete(null), 4000);
    return () => clearTimeout(t);
  }, [confirmDelete]);

  function run(action: () => Promise<CategoryResult>, success: string, after?: () => void) {
    startTransition(async () => {
      const r = await action();
      if (!r.ok) return void toast.error(r.message);
      toast.success(success);
      after?.();
    });
  }

  function create(e: React.FormEvent) {
    e.preventDefault();
    const used = color;
    run(() => createCategoryAction({ name, color }), `Categoría ${name.trim()} creada`, () => {
      setName("");
      setColor(categoryColors.find((c) => c !== used && !categories.some((cat) => cat.color === c)) ?? categoryColors[0]);
    });
  }

  return (
    <div className="space-y-8">
      <form onSubmit={create} className="space-y-3 rounded-xl border border-line bg-surface p-4 sm:p-5">
        <h2 className="font-display text-lg font-bold">Nueva categoría</h2>
        <div className="flex flex-col gap-3 sm:flex-row">
          <label htmlFor="new-category" className="sr-only">
            Nombre
          </label>
          <input
            id="new-category"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Frutas y verduras"
            className={inputClass}
          />
          <Button type="submit" disabled={pending || name.trim().length < 2} className="shrink-0">
            <Plus className="size-5" aria-hidden />
            Crear
          </Button>
        </div>
        <ColorPicker value={color} onChange={setColor} label="Color de la nueva categoría" />
      </form>

      {categories.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-6 py-10 text-center text-ink-2">
          Aún no hay categorías. Crea la primera arriba.
        </p>
      ) : (
        <section aria-labelledby="list-title">
          <h2 id="list-title" className="mb-1 font-display text-lg font-bold">
            Categorías
          </h2>
          <p className="mb-3 text-sm text-ink-2">El orden de esta lista es el orden de los botones en Vender.</p>
          <ol className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {categories.map((c, i) => {
              const isEditing = editing === c.id;
              return (
                <li key={c.id} className="px-4 py-3">
                  {isEditing ? (
                    <form
                      className="space-y-3"
                      onSubmit={(e) => {
                        e.preventDefault();
                        run(() => updateCategoryAction(c.id, draft), "Categoría actualizada", () => setEditing(null));
                      }}
                    >
                      <div className="flex gap-2">
                        <label htmlFor={`edit-${c.id}`} className="sr-only">
                          Nombre
                        </label>
                        <input
                          id={`edit-${c.id}`}
                          autoFocus
                          value={draft.name}
                          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                          onKeyDown={(e) => e.key === "Escape" && setEditing(null)}
                          className={inputClass}
                        />
                        <Button type="submit" disabled={pending} aria-label="Guardar" className="px-4">
                          <Check className="size-5" />
                        </Button>
                        <Button variant="ghost" onClick={() => setEditing(null)} aria-label="Cancelar" className="px-4">
                          <X className="size-5" />
                        </Button>
                      </div>
                      <ColorPicker value={draft.color} onChange={(color) => setDraft((d) => ({ ...d, color }))} label={`Color de ${c.name}`} />
                    </form>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span aria-hidden className="size-4 shrink-0 rounded-full" style={{ backgroundColor: c.color ?? "var(--ink-3)" }} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-ink">{c.name}</p>
                        <p className="text-sm text-ink-3">
                          {c.productCount === 0 ? (
                            "Sin productos"
                          ) : (
                            <Link href="/productos" className="hover:underline">
                              {c.productCount} {c.productCount === 1 ? "producto" : "productos"}
                            </Link>
                          )}
                        </p>
                      </div>
                      <IconButton label={`Subir ${c.name}`} disabled={pending || i === 0} onClick={() => run(() => moveCategoryAction(c.id, "up"), "Orden actualizado")}>
                        <ArrowUp className="size-4" />
                      </IconButton>
                      <IconButton
                        label={`Bajar ${c.name}`}
                        disabled={pending || i === categories.length - 1}
                        onClick={() => run(() => moveCategoryAction(c.id, "down"), "Orden actualizado")}
                      >
                        <ArrowDown className="size-4" />
                      </IconButton>
                      <IconButton
                        label={`Editar ${c.name}`}
                        disabled={pending}
                        onClick={() => {
                          setEditing(c.id);
                          setDraft({ name: c.name, color: c.color ?? categoryColors[0] });
                        }}
                      >
                        <Pencil className="size-4" />
                      </IconButton>
                      {confirmDelete === c.id ? (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => run(() => deleteCategoryAction(c.id), `Categoría ${c.name} eliminada`, () => setConfirmDelete(null))}
                          className="h-10 rounded-md bg-danger px-3 text-sm font-bold text-white"
                        >
                          {c.productCount > 0 ? `Eliminar (${c.productCount} quedan sin categoría)` : "Toca para eliminar"}
                        </button>
                      ) : (
                        <IconButton label={`Eliminar ${c.name}`} disabled={pending} onClick={() => setConfirmDelete(c.id)} danger>
                          <Trash2 className="size-4" />
                        </IconButton>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`grid size-10 shrink-0 place-items-center rounded-md text-ink-2 hover:bg-surface-2 disabled:opacity-30 ${danger ? "hover:text-danger" : "hover:text-ink"}`}
    >
      {children}
    </button>
  );
}
