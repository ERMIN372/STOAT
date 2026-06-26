import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { AdminShell } from "@/components/admin/admin-shell";
import { ProductForm } from "@/components/admin/product-form";
import { getProductForEdit } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: { id: string };
}) {
  const product = await getProductForEdit(params.id);
  if (!product) notFound();

  return (
    <AdminShell>
      <Link
        href="/admin/products"
        className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="mr-1 h-4 w-4" /> К товарам
      </Link>
      <h1 className="mb-6 text-2xl font-bold">{product.name}</h1>
      <ProductForm product={product} />
    </AdminShell>
  );
}
