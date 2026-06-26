"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { ADMIN_COOKIE, computeAdminToken } from "@/lib/admin-auth";
import { deleteProduct, saveProduct } from "@/lib/catalog";
import type { Product } from "@/types";

async function assertAdmin() {
  const token = await computeAdminToken();
  const cookie = cookies().get(ADMIN_COOKIE)?.value;
  if (!token || cookie !== token) redirect("/admin/login");
}

/** Revalidate every surface that renders the catalogue. */
function revalidateCatalog(id?: string) {
  revalidatePath("/admin/products");
  revalidatePath("/");
  revalidatePath("/shop");
  if (id) revalidatePath(`/product/${id}`);
}

/**
 * Create or update a product. The client form serialises the whole product as
 * JSON into the `payload` field (nested colours/inventory/images don't map onto
 * flat form fields cleanly).
 */
export async function saveProductAction(formData: FormData) {
  await assertAdmin();

  let product: Product;
  try {
    product = JSON.parse(String(formData.get("payload") || "")) as Product;
  } catch {
    redirect("/admin/products?flash=" + encodeURIComponent("Некорректные данные формы"));
  }

  if (!product!.name?.trim()) {
    redirect("/admin/products/new?flash=" + encodeURIComponent("Укажите название"));
  }

  const saved = await saveProduct(product!);
  revalidateCatalog(saved.id);
  redirect("/admin/products?flash=" + encodeURIComponent(`Товар «${saved.name}» сохранён`));
}

export async function deleteProductAction(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") || "");
  if (id) {
    await deleteProduct(id);
    revalidateCatalog(id);
  }
  redirect("/admin/products?flash=" + encodeURIComponent("Товар удалён"));
}
