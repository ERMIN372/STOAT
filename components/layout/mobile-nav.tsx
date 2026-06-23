"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { navLinks } from "@/components/layout/nav-config";

/** Hamburger menu shown below the `lg` breakpoint. */
export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Открыть меню"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader className="text-left">
          <SheetTitle className="text-xl font-extrabold uppercase tracking-tight">
            STOAT
          </SheetTitle>
        </SheetHeader>
        <nav aria-label="Мобильная навигация" className="mt-8 flex flex-col">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="border-b py-3 text-lg font-medium transition-colors hover:text-brand"
          >
            Главная
          </Link>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="border-b py-3 text-lg font-medium transition-colors hover:text-brand"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
