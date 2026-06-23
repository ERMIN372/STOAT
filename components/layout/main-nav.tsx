"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { navLinks } from "@/components/layout/nav-config";

/** Desktop horizontal navigation with an active-route underline. */
export function MainNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Основная навигация"
      className="hidden items-center gap-7 lg:flex"
    >
      {navLinks.map((link) => {
        // Links with a query string never equal the bare pathname, so only the
        // plain "Каталог" link lights up on /shop — exactly what we want.
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "relative text-sm font-medium transition-colors hover:text-foreground",
              isActive ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {link.label}
            {isActive && (
              <span className="absolute -bottom-1.5 left-0 h-0.5 w-full bg-brand" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
