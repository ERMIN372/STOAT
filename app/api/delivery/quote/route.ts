import { NextResponse } from "next/server";

import { getAllProducts } from "@/lib/catalog";
import { getDeliveryQuotes } from "@/lib/delivery/engine";
import { buildParcel, type ParcelLine } from "@/lib/delivery/parcel";
import type { CheckoutItemInput } from "@/lib/order";

export const runtime = "nodejs";

interface QuoteBody {
  city?: string;
  address?: string;
  postalCode?: string;
  items?: CheckoutItemInput[];
}

/**
 * Compute delivery quotes for the cart. The parcel (weight/dimensions) and the
 * declared value are recomputed SERVER-SIDE from the live catalogue — the
 * client only sends what's in the cart, never prices or weights.
 */
export async function POST(req: Request) {
  let body: QuoteBody;
  try {
    body = (await req.json()) as QuoteBody;
  } catch {
    return NextResponse.json(
      { ok: false, quotes: [], error: "Некорректный запрос" },
      { status: 400 }
    );
  }

  const city = body.city?.trim() || "";
  const postalCode = body.postalCode?.trim() || "";
  if (!city && !postalCode) {
    return NextResponse.json(
      { ok: false, quotes: [], error: "Укажите город или индекс" },
      { status: 400 }
    );
  }
  if (!body.items?.length) {
    return NextResponse.json(
      { ok: false, quotes: [], error: "Корзина пуста" },
      { status: 400 }
    );
  }

  const catalog = await getAllProducts();
  const lines: ParcelLine[] = [];
  let declaredValue = 0;
  for (const it of body.items) {
    const product = catalog.find((p) => p.id === it.productId);
    if (!product) continue;
    const qty = Math.max(1, Math.min(99, Math.floor(it.quantity)));
    lines.push({ product, quantity: qty });
    declaredValue += product.price * qty;
  }
  if (!lines.length) {
    return NextResponse.json(
      { ok: false, quotes: [], error: "Товары не найдены" },
      { status: 400 }
    );
  }

  const parcel = buildParcel(lines);
  const result = await getDeliveryQuotes(
    { city, address: body.address?.trim(), postalCode },
    parcel,
    declaredValue
  );

  return NextResponse.json(result);
}
