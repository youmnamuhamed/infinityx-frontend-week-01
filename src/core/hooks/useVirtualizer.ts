"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";

export interface VirtualItem {
  index: number;
  start: number;
  size: number;
}

export interface UseVirtualizerOptions {
  rowCount: number;
  rowHeight: number;
  overscan?: number;
}

export interface UseVirtualizerResult<T extends HTMLElement> {
  scrollElementRef: RefObject<T | null>;
  virtualItems: VirtualItem[];
  totalSize: number;
}

const DEFAULT_OVERSCAN = 6;

export function useVirtualizer<T extends HTMLElement = HTMLDivElement>({
  rowCount,
  rowHeight,
  overscan = DEFAULT_OVERSCAN,
}: UseVirtualizerOptions): UseVirtualizerResult<T> {
  const scrollElementRef = useRef<T>(null);
  const [scrollTop, setScrollTop] = useState<number>(0);
  const [viewportHeight, setViewportHeight] = useState<number>(0);

  // Throttle scroll updates to one state write per animation frame,
  // so we never trigger more re-renders than the browser can paint.
  const rafIdRef = useRef<number | null>(null);

  const handleScroll = useCallback((element: T) => {
    if (rafIdRef.current !== null) return;
    rafIdRef.current = requestAnimationFrame(() => {
      setScrollTop(element.scrollTop);
      rafIdRef.current = null;
    });
  }, []);

  useEffect(() => {
    const element = scrollElementRef.current;
    if (!element) return;

    setViewportHeight(element.clientHeight);

    const onScroll = (): void => handleScroll(element);
    element.addEventListener("scroll", onScroll, { passive: true });

    // Keep viewportHeight accurate if the container is resized
    // (sidebar collapse, window resize, responsive breakpoints, etc).
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setViewportHeight(entry.contentRect.height);
    });
    resizeObserver.observe(element);

    return () => {
      element.removeEventListener("scroll", onScroll);
      resizeObserver.disconnect();
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [handleScroll]);

  const virtualItems = useMemo<VirtualItem[]>(() => {
    if (rowCount <= 0 || viewportHeight <= 0) return [];

    const rawStart = Math.floor(scrollTop / rowHeight) - overscan;
    const startIndex = Math.max(0, rawStart);

    const visibleRowCount = Math.ceil(viewportHeight / rowHeight);
    const rawEnd = startIndex + visibleRowCount + overscan * 2;
    const endIndex = Math.min(rowCount - 1, rawEnd);

    const items: VirtualItem[] = [];
    for (let index = startIndex; index <= endIndex; index += 1) {
      items.push({ index, start: index * rowHeight, size: rowHeight });
    }
    return items;
  }, [scrollTop, viewportHeight, rowCount, rowHeight, overscan]);

  const totalSize = rowCount * rowHeight;

  return { scrollElementRef, virtualItems, totalSize };
}
