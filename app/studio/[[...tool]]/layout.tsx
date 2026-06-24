import type { Metadata, Viewport } from "next";

// Metadata/viewport are defined here (a Server Component) rather than in the
// "use client" Studio page, where route-segment exports aren't allowed.
export const metadata: Metadata = {
  title: "STOAT — админка",
  // Keep the admin out of search engines.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
