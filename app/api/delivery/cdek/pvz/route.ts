import { NextResponse } from "next/server";

import { cdekConfigured, resolveCityCode, searchPvz } from "@/lib/delivery/cdek";
import type { CdekPvz } from "@/lib/delivery/types";

export const runtime = "nodejs";

interface PvzBody {
  city?: string;
  postalCode?: string;
}

/** Search CDEK pickup points (PVZ) for a city/index. */
export async function POST(req: Request) {
  if (!cdekConfigured) {
    return NextResponse.json({ ok: false, points: [], error: "СДЭК недоступен" });
  }

  let body: PvzBody;
  try {
    body = (await req.json()) as PvzBody;
  } catch {
    return NextResponse.json(
      { ok: false, points: [], error: "Некорректный запрос" },
      { status: 400 }
    );
  }

  const city = body.city?.trim();
  const postalCode = body.postalCode?.trim();
  if (!city && !postalCode) {
    return NextResponse.json(
      { ok: false, points: [], error: "Укажите город или индекс" },
      { status: 400 }
    );
  }

  try {
    const cityCode = (await resolveCityCode({ city, postalCode })) ?? undefined;
    const raw = await searchPvz({ cityCode, postalCode, city });
    const points: CdekPvz[] = raw.slice(0, 100).map((p) => ({
      code: p.code,
      name: p.name,
      address: p.location.address_full || p.location.address || p.name,
      city: p.location.city,
      workTime: p.work_time,
      location:
        p.location.latitude != null && p.location.longitude != null
          ? { latitude: p.location.latitude, longitude: p.location.longitude }
          : undefined,
    }));
    return NextResponse.json({ ok: true, points });
  } catch (err) {
    console.error("[delivery] PVZ search error:", err);
    return NextResponse.json(
      { ok: false, points: [], error: "Не удалось загрузить пункты выдачи" },
      { status: 502 }
    );
  }
}
