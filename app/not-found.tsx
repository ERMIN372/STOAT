import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container flex min-h-[70vh] flex-col items-center justify-center gap-6 py-20 text-center">
      <p className="text-display text-[clamp(5rem,22vw,16rem)] leading-none text-foreground/10">
        404
      </p>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Страница не найдена</h1>
        <p className="text-muted-foreground">
          Возможно, товар распродан или ссылка устарела.
        </p>
      </div>
      <div className="flex gap-3">
        <Button asChild variant="brand">
          <Link href="/">На главную</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/shop">В каталог</Link>
        </Button>
      </div>
    </div>
  );
}
