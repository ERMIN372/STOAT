import Link from "next/link";

import { Button } from "@/components/ui/button";
import { logoutAction } from "@/app/admin/actions";

/** Chrome for the authenticated admin pages (header + logout). */
export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex h-14 items-center justify-between">
          <Link
            href="/admin"
            className="font-bold uppercase tracking-tight"
          >
            STOAT · Заказы
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/" target="_blank">
                На сайт
              </Link>
            </Button>
            <form action={logoutAction}>
              <Button type="submit" variant="ghost" size="sm">
                Выйти
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="container py-8">{children}</main>
    </div>
  );
}
