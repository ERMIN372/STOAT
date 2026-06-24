import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ClearCartOnMount } from "@/components/cart/clear-cart-on-mount";

export const metadata: Metadata = {
  title: "Заказ оформлен",
  robots: { index: false },
};

/**
 * Where ЮKassa returns the customer after the payment page. Real payment
 * status is confirmed server-side via the webhook; this page just confirms
 * receipt and clears the cart.
 */
export default function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: { order?: string };
}) {
  const order = searchParams.order;

  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center gap-5 py-16 text-center">
      <ClearCartOnMount />
      <CheckCircle2 className="h-16 w-16 text-brand" />
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Спасибо за заказ!</h1>
        <p className="max-w-md text-muted-foreground">
          {order ? (
            <>
              Заказ{" "}
              <span className="font-semibold text-foreground">{order}</span>{" "}
              принят. Как только оплата подтвердится, мы свяжемся с вами и
              отправим заказ.
            </>
          ) : (
            "Заказ принят. Мы свяжемся с вами для подтверждения и отправки."
          )}
        </p>
      </div>
      <Button asChild variant="brand" size="lg">
        <Link href="/shop">Продолжить покупки</Link>
      </Button>
    </div>
  );
}
