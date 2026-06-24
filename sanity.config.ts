import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";

import { schemaTypes } from "./sanity/schemas";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET!;

/**
 * Sanity Studio config. Mounted in-app at /studio (see
 * app/studio/[[...tool]]/page.tsx) so the admin panel ships with the site.
 */
export default defineConfig({
  name: "stoat",
  title: "STOAT — админка",
  projectId,
  dataset,
  basePath: "/studio",
  plugins: [structureTool(), visionTool()],
  schema: { types: schemaTypes },
});
