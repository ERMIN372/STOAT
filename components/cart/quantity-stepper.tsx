"use client";

import { Minus, Plus } from "lucide-react";

import { cn } from "@/lib/utils";

interface QuantityStepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  size?: "sm" | "md";
  className?: string;
}

/** Accessible +/- quantity control used in the cart drawer and cart page. */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  size = "md",
  className,
}: QuantityStepperProps) {
  const btn =
    size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const text = size === "sm" ? "w-7 text-sm" : "w-9 text-base";

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border border-input",
        className
      )}
      role="group"
      aria-label="Количество"
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Уменьшить количество"
        className={cn(
          "inline-flex items-center justify-center rounded-l-md text-foreground transition-colors hover:bg-accent disabled:opacity-40 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          btn
        )}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span
        className={cn("text-center font-medium tabular-nums", text)}
        aria-live="polite"
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Увеличить количество"
        className={cn(
          "inline-flex items-center justify-center rounded-r-md text-foreground transition-colors hover:bg-accent disabled:opacity-40 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          btn
        )}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
