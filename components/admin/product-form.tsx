"use client";

import { useState } from "react";
import Image from "next/image";
import { Loader2, Plus, Trash2, Upload, X } from "lucide-react";

import { saveProductAction } from "@/app/admin/products/actions";
import { categories } from "@/data/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/lib/utils";
import type { CategorySlug, Product, ProductColor } from "@/types";

interface InvRow {
  size: string;
  stock: number;
}

/** Create / edit form for a single product. Saves via a server action. */
export function ProductForm({ product }: { product?: Product }) {
  const isEdit = Boolean(product);

  const [name, setName] = useState(product?.name ?? "");
  const [id, setId] = useState(product?.id ?? "");
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [price, setPrice] = useState(String(product?.price ?? ""));
  const [category, setCategory] = useState<CategorySlug>(
    product?.category ?? "caps"
  );
  const [isNew, setIsNew] = useState(Boolean(product?.isNew));
  const [description, setDescription] = useState(product?.description ?? "");
  const [colors, setColors] = useState<ProductColor[]>(
    product?.colors?.length ? product.colors : [{ name: "", hex: "#141414" }]
  );
  const [inventory, setInventory] = useState<InvRow[]>(
    product?.inventory?.length
      ? product.inventory.map((i) => ({ size: i.size, stock: i.stock }))
      : [{ size: "", stock: 0 }]
  );
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [pkgWeight, setPkgWeight] = useState(
    String(product?.packaging?.weightGrams ?? "")
  );
  const [pkgLen, setPkgLen] = useState(String(product?.packaging?.lengthCm ?? ""));
  const [pkgWid, setPkgWid] = useState(String(product?.packaging?.widthCm ?? ""));
  const [pkgHei, setPkgHei] = useState(String(product?.packaging?.heightCm ?? ""));

  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const effectiveId = (slugTouched ? id : slugify(name)) || slugify(name);

  function num(v: string): number | undefined {
    const n = Number(v);
    return v.trim() === "" || Number.isNaN(n) ? undefined : n;
  }

  const payload: Product = {
    id: effectiveId,
    name: name.trim(),
    price: num(price) ?? 0,
    category,
    isNew,
    description: description.trim(),
    colors: colors.filter((c) => c.name.trim()),
    sizes: inventory.filter((i) => i.size.trim()).map((i) => i.size.trim()),
    images: images.filter(Boolean),
    inStock: true, // recomputed server-side from inventory
    inventory: inventory
      .filter((i) => i.size.trim())
      .map((i) => ({ size: i.size.trim(), stock: Math.max(0, Number(i.stock) || 0) })),
    packaging:
      num(pkgWeight) || num(pkgLen) || num(pkgWid) || num(pkgHei)
        ? {
            weightGrams: num(pkgWeight),
            lengthCm: num(pkgLen),
            widthCm: num(pkgWid),
            heightCm: num(pkgHei),
          }
        : undefined,
  };

  async function handleUpload(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setUploadError(data?.error ?? "Не удалось загрузить файл");
        return;
      }
      setImages((prev) => [...prev, data.url as string]);
    } catch {
      setUploadError("Сеть недоступна");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={saveProductAction} className="space-y-8">
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />

      {/* Basics */}
      <section className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Название</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Кепка Core Logo"
            required
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="slug">ID (адрес в URL)</Label>
          <Input
            id="slug"
            value={effectiveId}
            onChange={(e) => {
              setSlugTouched(true);
              setId(e.target.value);
            }}
            disabled={isEdit}
            placeholder="kepka-core-logo"
          />
          <p className="text-xs text-muted-foreground">
            {isEdit
              ? "ID нельзя изменить после создания."
              : "Подставляется из названия. Используется в адресе /product/<id>."}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="price">Цена, ₽</Label>
            <Input
              id="price"
              type="number"
              min={0}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="category">Категория</Label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as CategorySlug)}
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isNew}
            onChange={(e) => setIsNew(e.target.checked)}
            className="h-4 w-4"
          />
          Показывать в блоке «Новинки»
        </label>

        <div className="grid gap-2">
          <Label htmlFor="description">Описание</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
          />
        </div>
      </section>

      {/* Images */}
      <section className="space-y-3">
        <Label>Фото</Label>
        {images.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {images.map((url, i) => (
              <div
                key={url + i}
                className="relative h-24 w-24 overflow-hidden rounded-md border bg-muted"
              >
                <Image
                  src={url}
                  alt=""
                  fill
                  sizes="96px"
                  className="object-cover"
                  unoptimized
                />
                <button
                  type="button"
                  onClick={() => setImages((p) => p.filter((_, idx) => idx !== i))}
                  className="absolute right-1 top-1 rounded-full bg-background/80 p-0.5 text-foreground hover:bg-background"
                  aria-label="Удалить фото"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                {i === 0 && (
                  <span className="absolute bottom-0 left-0 right-0 bg-background/80 px-1 py-0.5 text-center text-[10px]">
                    Главное
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm" disabled={uploading}>
            <label className="cursor-pointer">
              {uploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Загрузить файл
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                  e.target.value = "";
                }}
              />
            </label>
          </Button>
          <span className="text-xs text-muted-foreground">или вставьте ссылку:</span>
          <Input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://…/photo.jpg"
            className="h-9 max-w-xs"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              const u = imageUrl.trim();
              if (u) {
                setImages((p) => [...p, u]);
                setImageUrl("");
              }
            }}
          >
            Добавить
          </Button>
        </div>
        {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
      </section>

      {/* Colors */}
      <section className="space-y-3">
        <Label>Цвета</Label>
        <div className="space-y-2">
          {colors.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={c.name}
                onChange={(e) =>
                  setColors((p) =>
                    p.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x))
                  )
                }
                placeholder="Чёрный"
                className="max-w-xs"
              />
              <input
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(c.hex) ? c.hex : "#141414"}
                onChange={(e) =>
                  setColors((p) =>
                    p.map((x, idx) => (idx === i ? { ...x, hex: e.target.value } : x))
                  )
                }
                className="h-10 w-12 rounded-md border border-input bg-transparent"
                aria-label="Цвет"
              />
              <Input
                value={c.hex}
                onChange={(e) =>
                  setColors((p) =>
                    p.map((x, idx) => (idx === i ? { ...x, hex: e.target.value } : x))
                  )
                }
                className="max-w-[7rem]"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setColors((p) => p.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setColors((p) => [...p, { name: "", hex: "#141414" }])}
        >
          <Plus className="mr-2 h-4 w-4" /> Цвет
        </Button>
      </section>

      {/* Inventory */}
      <section className="space-y-3">
        <Label>Наличие по размерам</Label>
        <p className="text-xs text-muted-foreground">
          Размер с остатком 0 показывается как «нет в наличии». Для кепок укажите
          размер «One Size».
        </p>
        <div className="space-y-2">
          {inventory.map((row, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={row.size}
                onChange={(e) =>
                  setInventory((p) =>
                    p.map((x, idx) => (idx === i ? { ...x, size: e.target.value } : x))
                  )
                }
                placeholder="M / One Size"
                className="max-w-xs"
              />
              <Input
                type="number"
                min={0}
                value={row.stock}
                onChange={(e) =>
                  setInventory((p) =>
                    p.map((x, idx) =>
                      idx === i ? { ...x, stock: Number(e.target.value) } : x
                    )
                  )
                }
                placeholder="шт."
                className="max-w-[7rem]"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setInventory((p) => p.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setInventory((p) => [...p, { size: "", stock: 0 }])}
        >
          <Plus className="mr-2 h-4 w-4" /> Размер
        </Button>
      </section>

      {/* Packaging */}
      <section className="space-y-3">
        <Label>Вес и габариты упаковки (для расчёта доставки)</Label>
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="grid gap-2">
            <Label htmlFor="w" className="text-xs text-muted-foreground">
              Вес, г
            </Label>
            <Input id="w" type="number" min={0} value={pkgWeight} onChange={(e) => setPkgWeight(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="l" className="text-xs text-muted-foreground">
              Длина, см
            </Label>
            <Input id="l" type="number" min={0} value={pkgLen} onChange={(e) => setPkgLen(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="wd" className="text-xs text-muted-foreground">
              Ширина, см
            </Label>
            <Input id="wd" type="number" min={0} value={pkgWid} onChange={(e) => setPkgWid(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="h" className="text-xs text-muted-foreground">
              Высота, см
            </Label>
            <Input id="h" type="number" min={0} value={pkgHei} onChange={(e) => setPkgHei(e.target.value)} />
          </div>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={uploading}>
          {isEdit ? "Сохранить" : "Создать товар"}
        </Button>
      </div>
    </form>
  );
}
