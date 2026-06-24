/**
 * Seed the Sanity `production` dataset with the 8 demo products (incl. images,
 * colours and per-size stock). Run once after creating the project:
 *
 *   1) put your write token in .env.local:  SANITY_API_TOKEN=sk...
 *   2) npm run sanity:seed
 *
 * Re-runnable: documents use deterministic ids (createOrReplace), so running it
 * again updates the same products instead of duplicating them. Replace the
 * placeholder SVGs with real photos in the Studio afterwards.
 */
import { createClient } from "@sanity/client";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Minimal .env.local loader (so `npm run sanity:seed` just works).
function loadEnv() {
  const file = join(ROOT, ".env.local");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#") && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}
loadEnv();

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2024-10-01";
const token = process.env.SANITY_API_TOKEN;

if (!projectId || !token) {
  console.error(
    "\n✗ Нужны NEXT_PUBLIC_SANITY_PROJECT_ID и SANITY_API_TOKEN в .env.local.\n" +
      "  Токен создаётся в sanity.io → API → Tokens (права Editor).\n"
  );
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  apiVersion,
  token,
  useCdn: false,
});

const C = {
  black: { name: "Чёрный", hex: "#141414" },
  navy: { name: "Тёмно-синий", hex: "#1d2b45" },
  sage: { name: "Бежево-зелёный", hex: "#8a8d6f" },
  sky: { name: "Голубой", hex: "#9ec3d8" },
  white: { name: "Белый", hex: "#f4f3ee" },
  charcoal: { name: "Графит", hex: "#2c2c2c" },
  milk: { name: "Молочный", hex: "#ece6da" },
  grey: { name: "Серый меланж", hex: "#9b9b9b" },
  cream: { name: "Кремовый", hex: "#e7dfcf" },
  natural: { name: "Натуральный", hex: "#d8cfba" },
};

const apparel = (s, m, l, xl) => [
  { size: "S", stock: s },
  { size: "M", stock: m },
  { size: "L", stock: l },
  { size: "XL", stock: xl },
];

const products = [
  {
    id: "core-logo-cap",
    name: "Кепка Core Logo",
    price: 2490,
    category: "caps",
    isNew: true,
    colors: [C.black, C.navy, C.sage, C.sky],
    images: ["core-logo-cap-1.svg", "core-logo-cap-2.svg", "core-logo-cap-3.svg"],
    inventory: [{ size: "One Size", stock: 30 }],
    description:
      "Классическая шестипанельная кепка с низким профилем и вышитым логотипом STOAT. Структурированная тулья, изогнутый козырёк и металлическая застёжка с гравировкой.",
  },
  {
    id: "field-cap",
    name: "Кепка Field",
    price: 2790,
    category: "caps",
    isNew: false,
    colors: [C.sage, C.black],
    images: ["field-cap-1.svg", "field-cap-2.svg", "field-cap-3.svg"],
    inventory: [{ size: "One Size", stock: 18 }],
    description:
      "Кепка в духе рабочей эстетики: мягкая неструктурированная тулья, удлинённый козырёк и хлопковая саржа с лёгким эффектом стирки.",
  },
  {
    id: "box-logo-tee",
    name: "Футболка Box Logo",
    price: 3490,
    category: "tshirts",
    isNew: true,
    colors: [C.white, C.black],
    images: ["box-logo-tee-1.svg", "box-logo-tee-2.svg", "box-logo-tee-3.svg"],
    inventory: apparel(12, 20, 15, 8),
    description:
      "Футболка прямого кроя из плотного хлопка 220 г/м² с фирменным box-логотипом на груди. Усиленный воротник и слегка удлинённый силуэт.",
  },
  {
    id: "heavyweight-tee",
    name: "Футболка Heavyweight",
    price: 3990,
    category: "tshirts",
    isNew: false,
    colors: [C.milk, C.charcoal],
    images: ["heavyweight-tee-1.svg", "heavyweight-tee-2.svg", "heavyweight-tee-3.svg"],
    inventory: apparel(10, 14, 10, 0),
    description:
      "Тяжёлая футболка 260 г/м² из чёсаного хлопка с плотной структурой, которая держит форму. Минималистичный тональный принт на спине. Oversize-посадка.",
  },
  {
    id: "essential-hoodie",
    name: "Худи Essential",
    price: 7490,
    category: "hoodies",
    isNew: true,
    colors: [C.black, C.grey, C.sage],
    images: ["essential-hoodie-1.svg", "essential-hoodie-2.svg", "essential-hoodie-3.svg"],
    inventory: apparel(6, 12, 9, 5),
    description:
      "Базовое худи из французского футера 400 г/м² с двухслойным капюшоном и карманом-кенгуру. Мягкий начёс изнутри, рёбра с эластаном на манжетах.",
  },
  {
    id: "tonal-hoodie",
    name: "Худи Tonal",
    price: 7990,
    category: "hoodies",
    isNew: false,
    colors: [C.cream, C.navy],
    images: ["tonal-hoodie-1.svg", "tonal-hoodie-2.svg", "tonal-hoodie-3.svg"],
    inventory: apparel(0, 0, 0, 0),
    description:
      "Худи с тональной вышивкой логотипа тон-в-тон и потайной молнией на кармане. Плотный петлевой футер, объёмный крой. Спокойная роскошь без логомании.",
  },
  {
    id: "logo-socks",
    name: "Носки Logo (2 пары)",
    price: 990,
    category: "accessories",
    isNew: true,
    colors: [C.white, C.black],
    images: ["logo-socks-1.svg", "logo-socks-2.svg"],
    inventory: [
      { size: "39–42", stock: 25 },
      { size: "43–46", stock: 25 },
    ],
    description:
      "Набор из двух пар высоких носков из чёсаного хлопка с жаккардовым логотипом и усиленным мыском и пяткой.",
  },
  {
    id: "canvas-tote",
    name: "Сумка-шопер Canvas",
    price: 1990,
    category: "accessories",
    isNew: false,
    colors: [C.natural, C.black],
    images: ["canvas-tote-1.svg", "canvas-tote-2.svg"],
    inventory: [{ size: "One Size", stock: 40 }],
    description:
      "Плотная сумка-шопер из хлопкового канваса 380 г/м² с трафаретным логотипом, внутренним карманом и усиленными ручками.",
  },
];

async function uploadImages(p) {
  const refs = [];
  for (let i = 0; i < p.images.length; i++) {
    const filename = p.images[i];
    const path = join(ROOT, "public", "products", filename);
    try {
      const buffer = readFileSync(path);
      const asset = await client.assets.upload("image", buffer, {
        filename,
        contentType: "image/svg+xml",
      });
      refs.push({
        _type: "image",
        _key: `${p.id}-img-${i}`,
        asset: { _type: "reference", _ref: asset._id },
      });
    } catch (err) {
      console.warn(`  ! не удалось загрузить ${filename}: ${err.message}`);
    }
  }
  return refs;
}

async function main() {
  console.log(`Сидирую ${products.length} товаров в ${projectId}/${dataset}…`);
  for (const p of products) {
    const images = await uploadImages(p);
    const doc = {
      _id: `product.${p.id}`,
      _type: "product",
      name: p.name,
      slug: { _type: "slug", current: p.id },
      price: p.price,
      category: p.category,
      isNew: p.isNew,
      description: p.description,
      colors: p.colors.map((c, i) => ({ _key: `${p.id}-c-${i}`, ...c })),
      images,
      inventory: p.inventory.map((inv, i) => ({
        _key: `${p.id}-inv-${i}`,
        ...inv,
      })),
    };
    await client.createOrReplace(doc);
    console.log(`  ✓ ${p.name} (${images.length} фото)`);
  }
  console.log("\nГотово. Открой /studio — товары на месте.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
