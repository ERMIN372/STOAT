import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { ADMIN_COOKIE, computeAdminToken } from "@/lib/admin-auth";
import { storageConfigured, uploadImage } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

async function isAdmin(): Promise<boolean> {
  const token = await computeAdminToken();
  const cookie = cookies().get(ADMIN_COOKIE)?.value;
  return Boolean(token && cookie === token);
}

/** Upload a product image to RU object storage. Admin-only. */
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "Доступ запрещён" }, { status: 401 });
  }
  if (!storageConfigured) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Хранилище фото не настроено (S3_*). Можно вставить ссылку на фото вручную.",
      },
      { status: 503 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Некорректный запрос" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Файл не передан" }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json(
      { ok: false, error: "Только JPEG, PNG, WebP или AVIF" },
      { status: 415 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, error: "Файл больше 8 МБ" },
      { status: 413 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadImage(buffer, file.type, file.name);
    return NextResponse.json({ ok: true, url });
  } catch (err) {
    console.error("[upload] failed:", err);
    return NextResponse.json(
      { ok: false, error: "Не удалось загрузить файл" },
      { status: 500 }
    );
  }
}
