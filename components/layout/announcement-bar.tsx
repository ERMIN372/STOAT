const MESSAGES = [
  "СДЭК и Почта России по всей РФ",
  "Доставка рассчитывается при оформлении",
  "Новая коллекция SS26 уже в продаже",
  "Возврат в течение 14 дней",
  "STOAT — сделано для города",
];

/**
 * Thin scrolling announcement bar. The track holds the messages twice so the
 * 0 → -50% marquee animation loops seamlessly. Respects reduced-motion.
 */
export function AnnouncementBar() {
  return (
    <div className="overflow-hidden border-b border-brand/20 bg-brand text-brand-foreground">
      <div className="flex w-max animate-marquee whitespace-nowrap py-1.5 motion-reduce:animate-none">
        {[0, 1].map((dup) => (
          <div key={dup} className="flex shrink-0" aria-hidden={dup === 1}>
            {MESSAGES.map((msg) => (
              <span
                key={msg}
                className="mx-6 text-xs font-semibold uppercase tracking-wide"
              >
                {msg}
                <span className="ml-12 opacity-50">✳</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
