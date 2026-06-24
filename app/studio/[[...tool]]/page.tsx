"use client";

import { NextStudio } from "next-sanity/studio";

import config from "@/sanity.config";

/**
 * Embedded Sanity Studio at /studio.
 *
 * Must be a Client Component: the Studio relies on React context, which isn't
 * available in the React Server Components graph. It also lives OUTSIDE the
 * (site) route group, so it renders full-screen without the storefront chrome.
 *
 * Remember to add the deployed domain under API → CORS origins in the Sanity
 * dashboard so the production Studio can reach the project.
 */
export default function StudioPage() {
  return <NextStudio config={config} />;
}
