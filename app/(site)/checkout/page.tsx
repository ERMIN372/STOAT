import type { Metadata } from "next";

import { CheckoutForm } from "@/components/checkout/checkout-form";

export const metadata: Metadata = {
  title: "Оформление заказа",
};

export default function CheckoutPage() {
  return <CheckoutForm />;
}
