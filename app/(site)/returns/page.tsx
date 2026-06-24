import Link from "next/link";
import type { Metadata } from "next";

import { seller } from "@/data/legal";

export const metadata: Metadata = {
  title: "Возврат и обмен",
  description: "Условия возврата и обмена товаров STOAT.",
};

export default function ReturnsPage() {
  return (
    <div className="container max-w-3xl py-12 sm:py-16">
      <h1 className="text-display text-4xl sm:text-5xl">Возврат и обмен</h1>
      <div className="prose prose-neutral mt-8 max-w-none dark:prose-invert prose-headings:font-semibold prose-h2:mt-10 prose-h2:text-xl prose-a:text-brand">
        <h2>Сроки</h2>
        <p>
          Вы можете отказаться от товара в любое время до его получения и в
          течение <strong>14 дней</strong> после получения (это больше
          установленного законом срока в 7 дней для дистанционной торговли).
        </p>

        <h2>Условия возврата товара надлежащего качества</h2>
        <ul>
          <li>товар не был в употреблении;</li>
          <li>
            сохранены товарный вид, потребительские свойства, фабричные ярлыки;
          </li>
          <li>есть документ, подтверждающий покупку (письмо о заказе).</li>
        </ul>
        <p>
          Возврату не подлежит товар надлежащего качества с
          индивидуально-определёнными свойствами, если он может быть использован
          только вами.
        </p>

        <h2>Товар ненадлежащего качества</h2>
        <p>
          Если товар имеет дефект, вы вправе вернуть его и получить полный
          возврат стоимости в соответствии с Законом «О защите прав
          потребителей». Напишите нам — решим вопрос быстро.
        </p>

        <h2>Как оформить возврат</h2>
        <p>
          Напишите на{" "}
          <a href={`mailto:${seller.email}`}>{seller.email}</a> с номером заказа
          и причиной возврата — мы вышлем инструкцию. Деньги возвращаются на счёт
          в течение 10 дней с момента получения товара. Подробнее — в{" "}
          <Link href="/offer#returns">оферте</Link>.
        </p>
      </div>
    </div>
  );
}
