"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, LayoutDashboard, Package, ReceiptText, Settings, ShoppingBasket } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const links = [
  { href: "/", label: "Resumen", icon: LayoutDashboard },
  { href: "/pos", label: "Vender", icon: ShoppingBasket },
  { href: "/ventas", label: "Ventas", icon: ReceiptText },
  { href: "/productos", label: "Productos", icon: Package },
  { href: "/inventario", label: "Inventario", icon: Boxes },
] as const;

type Variant = "top" | "bottom";

const linkClass: Record<Variant, string> = {
  top: "flex items-center gap-2 border-b-[3px] border-transparent px-3 pt-[3px] text-sm font-semibold text-ink-2 hover:text-ink aria-[current=page]:border-mark aria-[current=page]:text-ink",
  bottom: "flex flex-col items-center justify-center gap-0.5 text-xs font-semibold text-ink-3 aria-[current=page]:text-brand",
};

function Links({ variant, pathname }: { variant: Variant; pathname: string | null }) {
  const isActive = (href: string) => pathname !== null && (href === "/" ? pathname === "/" : pathname.startsWith(href));
  return links.map(({ href, label, icon: Icon }) => (
    <Link key={href} href={href} aria-current={isActive(href) ? "page" : undefined} className={linkClass[variant]}>
      <Icon className={variant === "top" ? "size-4" : "size-6"} aria-hidden />
      {label}
    </Link>
  ));
}

function ActiveLinks({ variant }: { variant: Variant }) {
  return <Links variant={variant} pathname={usePathname()} />;
}

/** usePathname en rutas dinámicas necesita Suspense (cacheComponents); el respaldo es la misma barra sin marca activa */
function NavLinks({ variant }: { variant: Variant }) {
  return (
    <Suspense fallback={<Links variant={variant} pathname={null} />}>
      <ActiveLinks variant={variant} />
    </Suspense>
  );
}

export function TopBar({ storeName }: { storeName: string }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-6 border-b border-line bg-bg/90 px-4 backdrop-blur md:px-6">
      <Link href="/" className="font-display text-lg font-bold tracking-tight text-ink">
        {storeName}
      </Link>
      <nav className="hidden h-full items-stretch gap-1 md:flex" aria-label="Principal">
        <NavLinks variant="top" />
      </nav>
      <div className="ml-auto flex items-center gap-1">
        <Link
          href="/configuracion"
          aria-label="Configuración"
          title="Configuración"
          className="grid size-10 place-items-center rounded-full text-ink-2 hover:bg-surface-2 hover:text-ink"
        >
          <Settings className="size-5" />
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}

export function BottomNav() {
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-30 grid h-16 grid-cols-5 border-t border-line bg-surface md:hidden"
    >
      <NavLinks variant="bottom" />
    </nav>
  );
}
