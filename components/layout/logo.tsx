import Link from "next/link";

import { ErmineMark } from "@/components/brand/ermine-mark";
import { cn } from "@/lib/utils";

/**
 * STOAT brand lockup: the ermine head mark + the STOAT wordmark.
 *
 * Compact by default for the site header (icon + wordmark). Pass `tagline`
 * to render the brand strapline beneath the lockup for large brand zones
 * (footer, login, etc.). `markClassName` / `wordmarkClassName` let callers
 * size the lockup without touching the layout.
 */
export function Logo({
  className,
  markClassName,
  wordmarkClassName,
  tagline = false,
  href = "/",
}: {
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
  tagline?: boolean;
  href?: string | null;
}) {
  const lockup = (
    <span className="inline-flex items-center gap-2">
      <ErmineMark className={cn("h-7 w-7 shrink-0", markClassName)} />
      <span
        className={cn(
          "text-2xl font-extrabold uppercase leading-none tracking-tight",
          wordmarkClassName
        )}
      >
        STOAT
      </span>
    </span>
  );

  const content = tagline ? (
    <span className="inline-flex flex-col gap-1.5">
      {lockup}
      <span className="text-[0.6rem] font-semibold uppercase tracking-[0.28em] text-brand">
        Streetwear. Clean. Confident.
      </span>
    </span>
  ) : (
    lockup
  );

  if (href === null) {
    return <span className={cn("inline-flex", className)}>{content}</span>;
  }

  return (
    <Link
      href={href}
      aria-label="STOAT — на главную"
      className={cn("group inline-flex", className)}
    >
      {content}
    </Link>
  );
}
