"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { categorySchema, type CategoryInput } from "./schemas";

export type CategoryResult = { ok: true } | { ok: false; message: string };

function fail(e: unknown, where: string): CategoryResult {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
    return { ok: false, message: "Ya existe una categoría con ese nombre" };
  }
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
    return { ok: false, message: "La categoría ya no existe" };
  }
  console.error(where, e);
  return { ok: false, message: "No se pudo guardar. Intenta de nuevo." };
}

export async function createCategoryAction(input: CategoryInput): Promise<CategoryResult> {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  try {
    const last = await prisma.category.aggregate({ _max: { sortOrder: true } });
    await prisma.category.create({ data: { ...parsed.data, sortOrder: (last._max.sortOrder ?? -1) + 1 } });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e, "createCategoryAction");
  }
}

export async function updateCategoryAction(id: string, input: CategoryInput): Promise<CategoryResult> {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  try {
    await prisma.category.update({ where: { id }, data: parsed.data });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e, "updateCategoryAction");
  }
}

/** Sube o baja una categoría en el orden en que aparece en el POS */
export async function moveCategoryAction(id: string, direction: "up" | "down"): Promise<CategoryResult> {
  try {
    await prisma.$transaction(async (tx) => {
      const all = await tx.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true } });
      const i = all.findIndex((c) => c.id === id);
      const j = direction === "up" ? i - 1 : i + 1;
      if (i < 0 || j < 0 || j >= all.length) return;
      [all[i], all[j]] = [all[j], all[i]];
      // Renumera todo: corrige también órdenes repetidos
      await Promise.all(all.map((c, k) => tx.category.update({ where: { id: c.id }, data: { sortOrder: k } })));
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e, "moveCategoryAction");
  }
}

/** Los productos de la categoría quedan "Sin categoría" (onDelete: SetNull); no se borran */
export async function deleteCategoryAction(id: string): Promise<CategoryResult> {
  try {
    await prisma.category.delete({ where: { id } });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e, "deleteCategoryAction");
  }
}
