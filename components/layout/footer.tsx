import Link from "next/link";

import { categories } from "@/data/categories";
import { seller } from "@/data/legal";
import { Logo } from "@/components/layout/logo";
import { NewsletterForm } from "@/components/layout/newsletter-form";

const helpLinks = [
  { href: "/delivery", label: "Доставка и оплата" },
  { href: "/returns", label: "Возврат и обмен" },
  { href: "/size-guide", label: "Таблица размеров" },
  { href: "/contacts", label: "Контакты" },
];

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container py-14">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4 lg:grid-cols-5">
          {/* Brand + newsletter */}
          <div className="col-span-2 lg:col-span-2">
            <Logo
              tagline
              markClassName="h-9 w-9"
              wordmarkClassName="text-3xl"
            />
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              Премиальный streetwear для тех, кто двигается быстро. Чёрное,
              белое и ничего лишнего.
            </p>
            <p className="mt-6 text-sm font-medium">
              Подпишитесь на рассылку STOAT
            </p>
            <div className="mt-2">
              <NewsletterForm />
            </div>
          </div>

          {/* Shop */}
          <nav aria-label="Категории">
            <h3 className="text-sm font-semibold uppercase tracking-wide">
              Магазин
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/shop?category=${c.slug}`}
                    className="transition-colors hover:text-foreground"
                  >
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Help */}
          <nav aria-label="Помощь">
            <h3 className="text-sm font-semibold uppercase tracking-wide">
              Помощь
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              {helpLinks.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="transition-colors hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Contacts */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide">
              Контакты
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              <li>
                <a
                  href={`mailto:${seller.email}`}
                  className="transition-colors hover:text-foreground"
                >
                  {seller.email}
                </a>
              </li>
              <li>
                <a
                  href={`tel:${seller.phoneHref}`}
                  className="transition-colors hover:text-foreground"
                >
                  {seller.phone}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} STOAT. Все права защищены.</p>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-foreground">
              Политика конфиденциальности
            </Link>
            <Link href="/offer" className="hover:text-foreground">
              Оферта
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
