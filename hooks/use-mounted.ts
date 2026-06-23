"use client";

import { useEffect, useState } from "react";

/**
 * Returns true only after the component has mounted on the client.
 *
 * Used to gate rendering of values that differ between server and client
 * (persisted cart state, resolved theme) so we never hit a hydration mismatch.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
