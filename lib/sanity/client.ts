import { createClient } from "next-sanity";

export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
export const apiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2024-10-01";

/** True once the project env vars are present (otherwise we use local data). */
export const sanityConfigured = Boolean(projectId && dataset);

/**
 * Read-only client for the storefront. The dataset is public, so no token is
 * needed for reads. `useCdn` serves cached, published content fast.
 */
export const sanityClient = sanityConfigured
  ? createClient({
      projectId: projectId!,
      dataset: dataset!,
      apiVersion,
      useCdn: true,
      perspective: "published",
    })
  : null;
