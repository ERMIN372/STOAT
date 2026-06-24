import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ClearCartOnMount } from "@/components/cart/clear-cart-on-mount";
import { seller } from "@/data/legal";
import { emailConfigured } from "@/lib/email";
import { getOrder } from "@/lib/orders";

export const metadata: Metadata = {
  title: "Статус заказа",
  robots: { index: false },
};

/**
 * Where ЮKassa returns the customer after the payment page. The real status is
 * confirmed by the webhook, so we read the order and show the right state:
 * paid, still processing, or failed/canceled.
 */
export default async function CheckoutReturnPage({
  searchParams,
}: {
  searchParams: { order?: string };
}) {
  const orderId = searchParams.order;
  const order = orderId ? await getOrder(orderId) : null;
  const paymentStatus = order?.paymentStatus ?? "pending";

  // --- payment failed / canceled: keep the cart, offer a retry ---
  if (paymentStatus === "canceled") {
    return (
      <div className="container flex min-h-[60vh] flex-col items-center justify-center gap-5 py-16 text-center">
        <XCircle className="h-16 w-16 text-destructive" />
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Оплата не прошла</h1>
          <p className="max-w-md text-muted-foreground">
            Заказ{" "}
            <span className="font-semibold text-foreground">{orderId}</span> не
            оплачен или оплата отменена. Корзина сохранена — можно попробовать
            снова.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild variant="brand" size="lg">
            <Link href="/checkout">Оформить снова</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/cart">Вернуться в корзину</Link>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Что-то не так?{" "}
          <a
            href={`mailto:${seller.email}`}
            className="text-brand underline-offset-2 hover:underline"
          >
            Напишите нам
          </a>
        </p>
      </div>
    );
  }

  // --- paid or still processing: clear the cart, confirm ---
  const paid = paymentStatus === "succeeded";

  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center gap-5 py-16 text-center">
      <ClearCartOnMount />
      {paid ? (
        <CheckCircle2 className="h-16 w-16 text-brand" />
      ) : (
        <Clock className="h-16 w-16 text-muted-foreground" />
      )}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">
          {paid ? "Оплачено! Спасибо за заказ" : "Заказ оформлен"}
        </h1>
        <p className="max-w-md text-muted-foreground">
          {orderId && (
            <>
              Номер заказа:{" "}
              <span className="font-semibold text-foreground">{orderId}</span>.{" "}
            </>
          )}
          {paid
            ? "Оплата получена — мы начали сборку и сообщим, когда отправим."
            : "Ожидаем подтверждение оплаты. Если оплата прошла, заказ уже у нас."}
          {emailConfigured && " Подтверждение отправлено на ваш e-mail."}
        </p>
      </div>
      <Button asChild variant="brand" size="lg">
        <Link href="/shop">Продолжить покупки</Link>
      </Button>
    </div>
  );
}
