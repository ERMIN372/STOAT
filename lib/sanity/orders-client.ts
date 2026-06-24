import "server-only";
import { createClient } from "next-sanity";

import { apiVersion, projectId } from "./client";

/**
 * Orders are stored in a SEPARATE, PRIVATE dataset so customer PII is never
 * exposed via the public `production` dataset used by the catalogue.
 *
 * One-time setup: in the Sanity dashboard create a dataset (default name
 * `orders`) with visibility = Private. The existing Editor token works for it.
 */
export const ordersDataset = process.env.SANITY_ORDERS_DATASET || "orders";

const token = process.env.SANITY_API_TOKEN;

export const ordersConfigured = Boolean(projectId && token);

/** Server-only read/write client for the private orders dataset. */
export const ordersClient =
  projectId && token
    ? createClient({
        projectId,
        dataset: ordersDataset,
        apiVersion,
        token,
        useCdn: false,
      })
    : null;
