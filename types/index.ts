/**
 * Shared domain types for the STOAT storefront.
 *
 * These are intentionally framework-agnostic so the same shapes can be
 * reused once a real backend / CMS replaces the local `data/products.ts`.
 */

/** Product category slugs. Keep in sync with `data/categories.ts`. */
export type CategorySlug = "caps" | "tshirts" | "hoodies" | "accessories";

/** A selectable colour option with a swatch value for the UI. */
export interface ProductColor {
  /** Human-readable name shown to the customer, e.g. "Тёмно-синий". */
  name: string;
  /** CSS colour used to render the swatch (hex/hsl/rgb). */
  hex: string;
}

/** Stock for a single size of a product. */
export interface InventoryEntry {
  size: string;
  /** Units available. 0 = this size is sold out. */
  stock: number;
}

export interface Product {
  id: string;
  name: string;
  /** Price in minor-unit-free rubles (₽). e.g. 2490 -> "2 490 ₽". */
  price: number;
  category: CategorySlug;
  colors: ProductColor[];
  sizes: string[];
  /** Image URLs (Sanity CDN) or local paths, e.g. "/products/logo-cap-1.svg". */
  images: string[];
  description: string;
  inStock: boolean;
  /**
   * Per-size stock. When present, the product page uses it to disable
   * sold-out sizes. Undefined for local demo data (treated as all-available).
   */
  inventory?: InventoryEntry[];
  /** Optional flag used to populate the "Новинки" section on the home page. */
  isNew?: boolean;
}

export interface Category {
  slug: CategorySlug;
  /** Display label, e.g. "Кепки". */
  label: string;
  /** Short tagline shown on the category tiles. */
  tagline: string;
  /** Representative image for the category tile. */
  image: string;
}

/** A single line in the shopping cart (a product + chosen variant). */
export interface CartItem {
  /** Composite key: `${productId}:${color}:${size}` for variant uniqueness. */
  key: string;
  productId: string;
  name: string;
  price: number;
  image: string;
  color: string;
  size: string;
  quantity: number;
}
