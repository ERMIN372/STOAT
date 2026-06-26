import type { Metadata, Viewport } from "next";
import { Inter, Archivo_Black } from "next/font/google";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

// Cyrillic subset is required — the storefront copy is in Russian.
const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
  display: "swap",
});

// Heavy, wide grotesque used for the big brand wordmark + strapline (Latin
// only — used for "STOAT" / the English tagline). Matches the logo reference.
const archivoBlack = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://stoat.store"),
  title: {
    default: "STOAT — премиальный streetwear",
    template: "%s · STOAT",
  },
  description:
    "STOAT — кепки, футболки, худи и аксессуары. Минимализм, чистый крой и характер. Чёрное, белое и ничего лишнего.",
  keywords: ["STOAT", "streetwear", "кепки", "худи", "футболки", "одежда"],
  openGraph: {
    title: "STOAT — премиальный streetwear",
    description: "Кепки, футболки, худи и аксессуары STOAT.",
    type: "website",
    locale: "ru_RU",
  },
  // Brand favicon set (the "Winking Stoat" head) served from /public.
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
};

/**
 * Root layout: html/body, fonts and theme only. The storefront chrome
 * (header/footer/cart/toasts) lives in app/(site)/layout.tsx so that the
 * admin section at /admin can render with its own chrome without it.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`${inter.variable} ${archivoBlack.variable} font-sans`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
