// src/core/hooks/useHoverPrefetch.ts
"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef } from "react";

const HOVER_INTENT_DELAY_MS = 100;

/**
 * Returns an onMouseEnter/onMouseLeave pair that prefetches a route after
 * a short hover-intent delay, avoiding wasted prefetches on fast mouse-throughs.
 */
export function useHoverPrefetch(href: string) {
  const router = useRouter();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onMouseEnter = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      router.prefetch(href);
    }, HOVER_INTENT_DELAY_MS);
  }, [href, router]);

  const onMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return { onMouseEnter, onMouseLeave };
}
