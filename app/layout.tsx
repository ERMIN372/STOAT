import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

// Cyrillic subset is required — the storefront copy is in Russian.
const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
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
};

/**
 * Root layout: html/body, fonts and theme only. The storefront chrome
 * (header/footer/cart/toasts) lives in app/(site)/layout.tsx so that the
 * embedded Sanity Studio at /studio can render full-screen without it.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
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
