"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { ADMIN_COOKIE, computeAdminToken } from "@/lib/admin-auth";
import { sendOrderEmail } from "@/lib/email";
import { incrementStock, type StockChange } from "@/lib/inventory";
import {
  getOrder,
  setInternalNote,
  setStockDecremented,
  setTracking,
  updateStatus,
  type OrderStatus,
} from "@/lib/orders";

async function assertAdmin() {
  const token = await computeAdminToken();
  const cookie = cookies().get(ADMIN_COOKIE)?.value;
  if (!token || cookie !== token) redirect("/admin/login");
}

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") || "");
  const token = await computeAdminToken();
  if (!token || password !== process.env.ADMIN_PASSWORD) {
    redirect("/admin/login?error=1");
  }
  cookies().set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/admin");
}

export async function logoutAction() {
  cookies().delete(ADMIN_COOKIE);
  redirect("/admin/login");
}

/** Generic status change (processing / delivered / canceled / refunded). */
export async function changeStatusAction(formData: FormData) {
  await assertAdmin();
  const orderId = String(formData.get("orderId"));
  const status = String(formData.get("status")) as OrderStatus;
  const note = String(formData.get("note") || "").trim() || undefined;

  const order = await getOrder(orderId);
  if (!order) return;

  // Refund → return stock if it had been decremented on payment.
  if (status === "refunded" && order.stockDecremented) {
    const changes: StockChange[] = order.items.map((i) => ({
      productId: i.productId,
      size: i.size,
      quantity: i.quantity,
    }));
    await incrementStock(changes);
    await setStockDecremented(orderId, false);
  }

  await updateStatus(orderId, status, note);

  const updated = await getOrder(orderId);
  if (updated) {
    if (status === "canceled") await sendOrderEmail(updated, "canceled");
    else if (status === "refunded") await sendOrderEmail(updated, "refunded");
  }

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin");
}

/** Mark shipped: save tracking, set status, email the customer. */
export async function shipAction(formData: FormData) {
  await assertAdmin();
  const orderId = String(formData.get("orderId"));
  const tracking = String(formData.get("tracking") || "").trim();

  if (tracking) await setTracking(orderId, tracking);
  await updateStatus(orderId, "shipped", tracking ? `Трек: ${tracking}` : undefined);

  const updated = await getOrder(orderId);
  if (updated) await sendOrderEmail(updated, "shipped");

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin");
}

export async function setNoteAction(formData: FormData) {
  await assertAdmin();
  const orderId = String(formData.get("orderId"));
  const note = String(formData.get("note") || "");
  await setInternalNote(orderId, note);
  revalidatePath(`/admin/orders/${orderId}`);
}
