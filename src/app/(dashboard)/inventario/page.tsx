import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { PackagePlus } from "lucide-react";
import { ButtonLink, PageHeader } from "@/components/ui";
import { getMovements } from "@/features/inventory/queries";
import { movementTypeLabels, movementTypes } from "@/features/inventory/constants";
import { MovementTable } from "@/features/inventory/components/movement-table";
import type { InventoryMovementType } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Inventario" };

type SearchParams = PageProps<"/inventario">["searchParams"];

function href(type: string | undefined, page: number) {
  const q = new URLSearchParams();
  if (type) q.set("tipo", type);
  if (page > 1) q.set("pagina", String(page));
  const s = q.toString();
  return s ? `/inventario?${s}` : "/inventario";
}

async function Movements({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const rawType = typeof sp.tipo === "string" ? sp.tipo : undefined;
  const type = movementTypes.includes(rawType as InventoryMovementType) ? (rawType as InventoryMovementType) : undefined;
  const page = Math.max(1, Math.floor(Number(sp.pagina)) || 1);
  const { rows, total, pages } = await getMovements({ type, page });

  return (
    <div className="space-y-4">
      <nav aria-label="Filtrar por tipo" className="-mx-4 flex gap-2 scroll-row overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
        {[undefined, ...movementTypes].map((t) => (
          <Link
            key={t ?? "all"}
            href={href(t, 1)}
            aria-current={t === type ? "page" : undefined}
            className="flex h-10 shrink-0 items-center rounded-full border border-line bg-surface px-4 text-sm font-semibold text-ink-2 aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-bg"
          >
            {t ? movementTypeLabels[t] : "Todos"}
          </Link>
        ))}
      </nav>

      <MovementTable rows={rows} />

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-ink-2">
        <p>
          {total.toLocaleString("es-CO")} movimientos, página {page} de {pages}
        </p>
        <div className="flex gap-2">
          {page > 1 && (
            <ButtonLink variant="secondary" href={href(type, page - 1)} className="h-10">
              Más recientes
            </ButtonLink>
          )}
          {page < pages && (
            <ButtonLink variant="secondary" href={href(type, page + 1)} className="h-10">
              Más antiguos
            </ButtonLink>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InventoryPage({ searchParams }: PageProps<"/inventario">) {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-6 md:py-8">
      <PageHeader
        title="Inventario"
        description="Cada entrada y salida de mercancía, con el stock antes y después."
        actions={
          <ButtonLink href="/inventario/entrada">
            <PackagePlus className="size-5" aria-hidden />
            Registrar movimiento
          </ButtonLink>
        }
      />
      <Suspense fallback={<div aria-hidden className="h-[36rem] animate-pulse rounded-xl bg-surface-2" />}>
        <Movements searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
