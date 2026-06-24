import Link from "next/link";
import type { Metadata } from "next";

import { DELIVERY_OPTIONS } from "@/lib/order";
import { formatPrice } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Доставка и оплата",
  description: "Способы доставки и оплаты заказов STOAT.",
};

export default function DeliveryPage() {
  return (
    <div className="container max-w-3xl py-12 sm:py-16">
      <h1 className="text-display text-4xl sm:text-5xl">Доставка и оплата</h1>
      <div className="prose prose-neutral mt-8 max-w-none dark:prose-invert prose-headings:font-semibold prose-h2:mt-10 prose-h2:text-xl prose-a:text-brand">
        <h2>Доставка</h2>
        <ul>
          {DELIVERY_OPTIONS.map((o) => (
            <li key={o.value}>
              <strong>{o.label}</strong> —{" "}
              {o.price ? formatPrice(o.price) : "бесплатно"}. {o.hint}.
            </li>
          ))}
        </ul>
        <p>
          Заказы собираем и передаём в службу доставки в течение 1–2 рабочих
          дней после оплаты. Итоговые сроки зависят от выбранного способа и
          региона. Когда заказ отправлен, мы пришлём письмо с трек-номером для
          отслеживания.
        </p>

        <h2>Оплата</h2>
        <p>
          Оплата онлайн банковской картой через <strong>ЮKassa</strong> на
          защищённой странице платёжного сервиса. Данные карты вводятся на
          стороне ЮKassa — мы их не получаем и не храним.
        </p>
        <p>
          После успешной оплаты на ваш e-mail придёт подтверждение заказа.
          Полные условия — в{" "}
          <Link href="/offer">публичной оферте</Link>.
        </p>
      </div>
    </div>
  );
}
