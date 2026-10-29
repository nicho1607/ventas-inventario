import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/lib/db";

export const SETTINGS_TAG = "store-settings";

export type StoreSettings = {
  name: string;
  legalId: string | null;
  address: string | null;
  phone: string | null;
  receiptFooter: string | null;
};

const defaults: StoreSettings = {
  name: "Mi Tienda",
  legalId: null,
  address: null,
  phone: null,
  receiptFooter: "¡Gracias por su compra!",
};

/**
 * Datos de la tienda. Cambian muy poco: se cachean (y entran en el shell estático de las páginas)
 * y se invalidan con updateTag(SETTINGS_TAG) al guardar la configuración.
 */
export async function getStoreSettings(): Promise<StoreSettings> {
  "use cache";
  cacheTag(SETTINGS_TAG);
  cacheLife("hours");

  const row = await prisma.storeSettings.findUnique({
    where: { id: 1 },
    select: { name: true, legalId: true, address: true, phone: true, receiptFooter: true },
  });
  return row ?? defaults;
}
