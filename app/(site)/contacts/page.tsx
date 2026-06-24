import Link from "next/link";
import type { Metadata } from "next";

import { seller } from "@/data/legal";

export const metadata: Metadata = {
  title: "Контакты",
  description: "Связаться с магазином STOAT.",
};

export default function ContactsPage() {
  return (
    <div className="container max-w-3xl py-12 sm:py-16">
      <h1 className="text-display text-4xl sm:text-5xl">Контакты</h1>
      <div className="prose prose-neutral mt-8 max-w-none dark:prose-invert prose-headings:font-semibold prose-h2:mt-10 prose-h2:text-xl prose-a:text-brand">
        <p>
          По вопросам заказов, доставки и возврата пишите на почту — отвечаем в
          течение рабочего дня.
        </p>
        <ul>
          <li>
            E-mail: <a href={`mailto:${seller.email}`}>{seller.email}</a>
          </li>
          <li>
            Телефон: <a href={`tel:${seller.phoneHref}`}>{seller.phone}</a>
          </li>
        </ul>

        <h2>Реквизиты</h2>
        <p>
          {seller.legalName}
          <br />
          {seller.legalStatus}
          <br />
          ИНН: {seller.inn}
        </p>

        <p>
          Документы:{" "}
          <Link href="/offer">оферта</Link>,{" "}
          <Link href="/privacy">политика конфиденциальности</Link>,{" "}
          <Link href="/delivery">доставка и оплата</Link>,{" "}
          <Link href="/returns">возврат и обмен</Link>.
        </p>
      </div>
    </div>
  );
}
