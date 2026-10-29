import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { getStoreSettings } from "@/features/settings/queries";
import { SettingsForm } from "@/features/settings/components/settings-form";

export const metadata: Metadata = { title: "Configuración" };

export default async function SettingsPage() {
  const settings = await getStoreSettings();
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 md:px-6 md:py-8">
      <PageHeader title="Configuración" description="Los datos de tu tienda." />
      <SettingsForm settings={settings} />
      <p className="text-sm text-ink-3">
        Las categorías de productos se administran en{" "}
        <Link href="/categorias" className="font-semibold text-brand underline underline-offset-4">
          Categorías
        </Link>
        .
      </p>
    </div>
  );
}
