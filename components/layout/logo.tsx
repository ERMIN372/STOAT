import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * STOAT brand lockup: a reserved icon slot + the text wordmark.
 *
 * The empty <div> below is the placeholder for the future ermine (горностай)
 * mark — drop an <svg>/<Image> in there once the logo is designed. It sits to
 * the LEFT of the wordmark and is sized to match the cap height of the text.
 */
export function Logo({
  className,
  wordmarkClassName,
}: {
  className?: string;
  wordmarkClassName?: string;
}) {
  return (
    <Link
      href="/"
      aria-label="STOAT — на главную"
      className={cn("group inline-flex items-center gap-2", className)}
    >
      {/* TODO(logo): ermine icon goes here. Keep the box square (h-7 w-7) and
          aligned with the wordmark. Example:
          <Image src="/brand/ermine.svg" alt="" width={28} height={28} /> */}
      <div
        aria-hidden="true"
        className="h-7 w-7 shrink-0 rounded-[6px] border border-dashed border-foreground/25 transition-colors group-hover:border-brand"
      />
      <span
        className={cn(
          "text-2xl font-extrabold uppercase leading-none tracking-tight",
          wordmarkClassName
        )}
      >
        STOAT
      </span>
    </Link>
  );
}
