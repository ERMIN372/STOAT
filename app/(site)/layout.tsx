import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { Toaster } from "@/components/ui/sonner";

/**
 * Storefront chrome. Lives in the (site) route group so it wraps every public
 * page but NOT /admin (the admin section renders with its own chrome).
 */
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>

      {/* Global overlays for the storefront only */}
      <CartDrawer />
      <Toaster />
    </>
  );
}
