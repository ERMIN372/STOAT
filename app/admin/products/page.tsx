import Link from "next/link";
import Image from "next/image";
import { Plus, Trash2 } from "lucide-react";

import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { deleteProductAction } from "@/app/admin/products/actions";
import { listProductsForAdmin } from "@/lib/catalog";
import { dbConfigured } from "@/lib/db";
import { categoryBySlug } from "@/data/categories";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: { flash?: string };
}) {
  const products = await listProductsForAdmin();
  const flash = searchParams.flash;

  return (
    <AdminShell>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Товары</h1>
        <Button asChild size="sm">
          <Link href="/admin/products/new">
            <Plus className="mr-2 h-4 w-4" /> Добавить товар
          </Link>
        </Button>
      </div>

      {flash && (
        <div className="mb-6 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
          {flash}
        </div>
      )}

      {!dbConfigured && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          База данных не настроена. Задайте <code>DATABASE_URL</code> (Postgres в
          РФ) и выполните <code>npm run db:migrate</code>.
        </div>
      )}

      {products.length === 0 ? (
        <p className="text-muted-foreground">
          Товаров пока нет. Нажмите «Добавить товар».
        </p>
      ) : (
        <div className="divide-y rounded-lg border">
          {products.map((p) => {
            const totalStock = p.inventory?.reduce((s, i) => s + i.stock, 0);
            return (
              <div key={p.id} className="flex items-center gap-4 p-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border bg-muted">
                  {p.images[0] && (
                    <Image
                      src={p.images[0]}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-cover"
                      unoptimized
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{p.name}</span>
                    {p.isNew && (
                      <span className="rounded bg-brand/10 px-1.5 py-0.5 text-[10px] uppercase text-brand">
                        Новинка
                      </span>
                    )}
                    {!p.inStock && (
                      <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] uppercase text-destructive">
                        Нет в наличии
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    {categoryBySlug[p.category]?.label ?? p.category}
                    {totalStock != null ? ` · ${totalStock} шт.` : ""} · {p.id}
                  </p>
                </div>
                <span className="shrink-0 font-semibold tabular-nums">
                  {formatPrice(p.price)}
                </span>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/products/${p.id}`}>Изменить</Link>
                </Button>
                <form action={deleteProductAction}>
                  <input type="hidden" name="id" value={p.id} />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="icon"
                    aria-label="Удалить"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}
