import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { CartButton } from "@/components/cart/cart-button";
import { Logo } from "@/components/layout/logo";
import { MainNav } from "@/components/layout/main-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";

/** Sticky site header: announcement bar, logo slot, nav and actions. */
export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full">
      <AnnouncementBar />
      <div className="border-b bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
        <div className="container flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-1">
            <MobileNav />
            <Logo />
          </div>

          <MainNav />

          <div className="flex items-center gap-0.5">
            <ThemeToggle />
            <CartButton />
          </div>
        </div>
      </div>
    </header>
  );
}
