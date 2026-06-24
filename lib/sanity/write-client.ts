import "server-only";
import { createClient } from "next-sanity";

import { apiVersion, dataset, projectId } from "./client";

const token = process.env.SANITY_API_TOKEN;

/** True when a server-side write token is available (orders/stock updates). */
export const sanityWriteConfigured = Boolean(projectId && dataset && token);

/**
 * Server-only Sanity client with write access. Used by the payment webhook to
 * decrement stock and record processed payments. NEVER import into client code.
 */
export const sanityWriteClient = sanityWriteConfigured
  ? createClient({
      projectId: projectId!,
      dataset: dataset!,
      apiVersion,
      token,
      useCdn: false,
    })
  : null;
