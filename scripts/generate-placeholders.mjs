/**
 * Generates branded SVG placeholder "product plates" into /public/products.
 *
 * These stand in for real product photography until it's shot. They are
 * intentionally minimal/editorial (big type, lots of air) so the layout reads
 * correctly with realistic aspect ratios (4:5 portrait). Re-run any time:
 *
 *   npm run generate:placeholders
 *
 * The manifest below mirrors data/products.ts + data/categories.ts. When you
 * add a product there, add it here too (or replace the SVGs with real photos).
 */
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "products");

const ACCENT = "#ff5a29"; // keep in sync with --brand in app/globals.css
const VIEW_LABELS = ["FRONT", "BACK", "DETAIL", "ANGLE"];
const BACKGROUNDS = ["#ECEAE3", "#E3DFD5", "#D8D3C6", "#EeEbE4"];

// category slug -> short latin code shown big on product plates
const CATEGORY_CODE = {
  caps: "CAP",
  tshirts: "TEE",
  hoodies: "HOODIE",
  accessories: "ACC",
};

const products = [
  { id: "core-logo-cap", name: "Core Logo Cap", category: "caps", count: 3 },
  { id: "field-cap", name: "Field Cap", category: "caps", count: 3 },
  { id: "box-logo-tee", name: "Box Logo Tee", category: "tshirts", count: 3 },
  { id: "heavyweight-tee", name: "Heavyweight Tee", category: "tshirts", count: 3 },
  { id: "essential-hoodie", name: "Essential Hoodie", category: "hoodies", count: 3 },
  { id: "tonal-hoodie", name: "Tonal Hoodie", category: "hoodies", count: 3 },
  { id: "logo-socks", name: "Logo Socks", category: "accessories", count: 2 },
  { id: "canvas-tote", name: "Canvas Tote", category: "accessories", count: 2 },
];

const categories = [
  { slug: "caps", label: "Кепки", code: "CAPS" },
  { slug: "tshirts", label: "Футболки", code: "TEES" },
  { slug: "hoodies", label: "Худи", code: "HOODIES" },
  { slug: "accessories", label: "Аксессуары", code: "GOODS" },
];

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** A single 4:5 editorial product plate. */
function productPlate({ bigCode, title, viewLabel, index, total, bg }) {
  const W = 1000;
  const H = 1250;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)} — placeholder">
  <rect width="${W}" height="${H}" fill="${bg}"/>
  <rect x="40" y="40" width="${W - 80}" height="${H - 80}" fill="none" stroke="#000000" stroke-opacity="0.10" stroke-width="2"/>
  <g font-family="Helvetica, Arial, sans-serif">
    <text x="72" y="118" font-size="34" font-weight="700" letter-spacing="6" fill="#1a1a1a">STOAT</text>
    <rect x="200" y="92" width="22" height="22" fill="${ACCENT}"/>
    <text x="${W - 72}" y="118" font-size="26" font-weight="500" letter-spacing="2" text-anchor="end" fill="#1a1a1a" fill-opacity="0.55">${String(index).padStart(2, "0")} / ${String(total).padStart(2, "0")}</text>
    <text x="${W / 2}" y="${H / 2 + 30}" font-size="200" font-weight="800" letter-spacing="-6" text-anchor="middle" fill="#000000" fill-opacity="0.07">${esc(bigCode)}</text>
    <text x="72" y="${H - 150}" font-size="44" font-weight="700" letter-spacing="-1" fill="#161616">${esc(title)}</text>
    <rect x="72" y="${H - 128}" width="120" height="6" fill="${ACCENT}"/>
    <text x="72" y="${H - 72}" font-size="24" font-weight="600" letter-spacing="3" fill="#1a1a1a" fill-opacity="0.6">${esc(viewLabel)}</text>
    <text x="${W - 72}" y="${H - 72}" font-size="22" font-weight="500" letter-spacing="3" text-anchor="end" fill="#1a1a1a" fill-opacity="0.4">PLACEHOLDER</text>
  </g>
</svg>`;
}

/** A category tile (also 4:5) with the Russian label set large. */
function categoryTile({ label, code, bg }) {
  const W = 1000;
  const H = 1250;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">
  <rect width="${W}" height="${H}" fill="${bg}"/>
  <text x="${W / 2}" y="${H / 2 + 40}" font-family="Helvetica, Arial, sans-serif" font-size="150" font-weight="800" letter-spacing="-4" text-anchor="middle" fill="#000000" fill-opacity="0.06">${esc(code)}</text>
  <g font-family="Helvetica, Arial, sans-serif">
    <text x="72" y="118" font-size="30" font-weight="700" letter-spacing="6" fill="#1a1a1a">STOAT</text>
    <rect x="72" y="${H - 168}" width="90" height="6" fill="${ACCENT}"/>
    <text x="72" y="${H - 90}" font-size="72" font-weight="800" letter-spacing="-2" fill="#161616">${esc(label)}</text>
  </g>
</svg>`;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  let written = 0;

  for (const p of products) {
    for (let i = 1; i <= p.count; i++) {
      const svg = productPlate({
        bigCode: CATEGORY_CODE[p.category],
        title: p.name,
        viewLabel: VIEW_LABELS[(i - 1) % VIEW_LABELS.length],
        index: i,
        total: p.count,
        bg: BACKGROUNDS[(i - 1) % BACKGROUNDS.length],
      });
      await writeFile(join(OUT_DIR, `${p.id}-${i}.svg`), svg, "utf8");
      written++;
    }
  }

  for (let c = 0; c < categories.length; c++) {
    const { slug, label, code } = categories[c];
    const svg = categoryTile({ label, code, bg: BACKGROUNDS[c % BACKGROUNDS.length] });
    await writeFile(join(OUT_DIR, `category-${slug}.svg`), svg, "utf8");
    written++;
  }

  console.log(`Generated ${written} placeholder SVGs in public/products/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
