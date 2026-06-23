import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { Toaster } from "@/components/ui/sonner";

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
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>

          {/* Global overlays: slide-out cart + toast notifications. */}
          <CartDrawer />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
