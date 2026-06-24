import imageUrlBuilder from "@sanity/image-url";
import type { SanityImageSource } from "@sanity/image-url/lib/types/types";

import { dataset, projectId } from "./client";

const builder =
  projectId && dataset ? imageUrlBuilder({ projectId, dataset }) : null;

/**
 * Build a CDN URL for a Sanity image (portrait-friendly defaults).
 * Returns null when Sanity isn't configured or the source has no asset.
 */
export function urlForImage(source: SanityImageSource | undefined): string | null {
  if (!builder || !source) return null;
  try {
    return builder.image(source).width(1200).fit("max").auto("format").url();
  } catch {
    return null;
  }
}
