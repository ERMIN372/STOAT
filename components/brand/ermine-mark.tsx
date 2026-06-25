import { cn } from "@/lib/utils";

/**
 * STOAT ermine (горностай) head mark — the "Winking Stoat".
 *
 * A super-minimal, streetwear emblem: a white ermine head with one open eye
 * and one winking eye carrying the orange brand accent.
 *
 * Theme-aware by design — the silhouette uses `fill-foreground` and the
 * knocked-out details use `fill-background`, so the mark reads correctly on
 * both the dark and light storefront themes. The wink always stays brand
 * orange. Size it via `className` (e.g. `h-7 w-7`).
 */
export function ErmineMark({
  className,
  title,
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("h-7 w-7", className)}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}

      {/* Head silhouette (ears + face) */}
      <path
        className="fill-foreground"
        d="M32 21C29.5 17.5 25.5 16.5 21.5 17.8L12.5 8.5C10.3 13.5 9.5 18.5 9.8 24C7.6 30 7.8 36.5 11.5 42.5C15.5 49.5 23.5 54 32 54C40.5 54 48.5 49.5 52.5 42.5C56.2 36.5 56.4 30 54.2 24C54.5 18.5 53.7 13.5 51.5 8.5L42.5 17.8C38.5 16.5 34.5 17.5 32 21Z"
      />

      {/* Inner-ear notches */}
      <path
        className="fill-background"
        d="M16.5 13L21 18.5L14.5 19.5Z"
      />
      <path
        className="fill-background"
        d="M47.5 13L49.5 19.5L43 18.5Z"
      />

      {/* Open eye */}
      <ellipse className="fill-background" cx="24" cy="32.5" rx="3" ry="3.9" />

      {/* Nose */}
      <path className="fill-background" d="M28.5 38.5H35.5L32 43Z" />

      {/* Subtle mouth */}
      <path
        className="fill-none stroke-background"
        strokeWidth="1.6"
        strokeLinecap="round"
        d="M32 43V45.5M32 45.5C30 47.6 27.6 47.1 26.6 45M32 45.5C34 47.6 36.4 47.1 37.4 45"
      />

      {/* Winking eye — orange brand accent */}
      <path
        className="stroke-brand"
        strokeWidth="3.4"
        strokeLinecap="round"
        d="M37 30.8L42.4 35"
      />
    </svg>
  );
}
