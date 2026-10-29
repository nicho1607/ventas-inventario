"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { SETTINGS_TAG } from "./queries";

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .transform((s) => s || null);

const settingsSchema = z.object({
  name: z.string().trim().min(2, "Escribe el nombre de la tienda").max(40, "Máximo 40 caracteres"),
  legalId: optional(30),
  address: optional(120),
  phone: optional(30),
  receiptFooter: optional(120),
});

export type SettingsInput = z.input<typeof settingsSchema>;
export type SettingsResult = { ok: true } | { ok: false; message: string; field?: string };

export async function saveSettingsAction(input: SettingsInput): Promise<SettingsResult> {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, message: issue.message, field: String(issue.path[0]) };
  }
  try {
    await prisma.storeSettings.upsert({ where: { id: 1 }, create: { id: 1, ...parsed.data }, update: parsed.data });
    updateTag(SETTINGS_TAG);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    console.error("saveSettingsAction", e);
    return { ok: false, message: "No se pudo guardar la configuración. Intenta de nuevo." };
  }
}
