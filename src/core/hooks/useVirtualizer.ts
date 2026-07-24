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
  /**
   * Fixed row height when `enableDynamicSize` is false (default).
   * When `enableDynamicSize` is true, this is used only as the initial
   * *estimate* for rows that haven't been measured yet — their real
   * height (from `measureElement`) takes over once known.
   */
  rowHeight: number;
  overscan?: number;
  /**
   * Opt-in to per-row measured heights via ResizeObserver instead of a
   * single fixed rowHeight. Defaults to false — fixed-height mode is
   * unchanged from before and stays on the cheap O(1)-per-row math path,
   * so existing callers (and the 100k-row benchmark) are unaffected.
   */
  enableDynamicSize?: boolean;
}

export interface UseVirtualizerResult<T extends HTMLElement> {
  scrollElementRef: RefObject<T | null>;
  virtualItems: VirtualItem[];
  totalSize: number;
  /**
   * Ref callback for the root element of each rendered row. Wire it up
   * unconditionally in DataGridBody — it's a no-op when enableDynamicSize
   * is false, and starts measuring real row heights when it's true.
   */
  measureElement: (element: HTMLElement | null, index: number) => void;
  /** Start offset of a given row index, valid in both fixed and dynamic
   *  mode — use this instead of `index * rowHeight` for scroll-to-row math. */
  getItemOffset: (index: number) => number;
  /** Rendered/estimated size of a given row index. */
  getItemSize: (index: number) => number;
}

const DEFAULT_OVERSCAN = 6;

export function useVirtualizer<T extends HTMLElement = HTMLDivElement>({
  rowCount,
  rowHeight,
  overscan = DEFAULT_OVERSCAN,
  enableDynamicSize = false,
}: UseVirtualizerOptions): UseVirtualizerResult<T> {
  const scrollElementRef = useRef<T>(null);
  const [scrollTop, setScrollTop] = useState<number>(0);
  const [viewportHeight, setViewportHeight] = useState<number>(0);

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

  // ---- Dynamic-size measurement (only active when enableDynamicSize) --
  // measuredSizes[index] = a row's real rendered height, once known.
  const measuredSizesRef = useRef<Map<number, number>>(new Map());
  // One ResizeObserver per currently-mounted row, so we can disconnect
  // the old one if a DOM node gets recycled to a different index
  // (which is exactly what virtualization does while scrolling).
  const rowObserversRef = useRef<Map<number, ResizeObserver>>(new Map());

  // offsetsCache[i] = cumulative start offset of row i. Only built/used
  // in dynamic mode. A measurement change truncates the cache from that
  // index forward, so one resize only recomputes the stale suffix, not
  // the whole table.
  const offsetsCacheRef = useRef<number[]>([0]);
  const [dynamicOffsetsVersion, setDynamicOffsetsVersion] = useState(0);

  const dynamicOffsets = useMemo(() => {
    if (!enableDynamicSize) return null;
    const cache = offsetsCacheRef.current;
    for (let i = cache.length - 1; i < rowCount; i += 1) {
      const size = measuredSizesRef.current.get(i) ?? rowHeight;
      cache[i + 1] = cache[i] + size;
    }
    if (cache.length > rowCount + 1) cache.length = Math.max(1, rowCount + 1);
    return cache;
    // dynamicOffsetsVersion is a manual invalidation trigger — the body
    // reads mutable refs directly rather than depending on it by value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableDynamicSize, rowCount, rowHeight, dynamicOffsetsVersion]);

  const invalidateFrom = useCallback((index: number) => {
    if (offsetsCacheRef.current.length > index + 1) {
      offsetsCacheRef.current.length = index + 1;
    }
    setDynamicOffsetsVersion((v) => v + 1);
  }, []);

  const measureElement = useCallback(
    (element: HTMLElement | null, index: number) => {
      const existingObserver = rowObserversRef.current.get(index);
      if (existingObserver) {
        existingObserver.disconnect();
        rowObserversRef.current.delete(index);
      }
      if (!enableDynamicSize || !element) return;

      // Measure synchronously once so a newly revealed row's very first
      // paint already has the right size, then keep watching for
      // content-driven changes (text reflow, async images, etc).
      const initialHeight = element.getBoundingClientRect().height;
      if (
        initialHeight > 0 &&
        measuredSizesRef.current.get(index) !== initialHeight
      ) {
        measuredSizesRef.current.set(index, initialHeight);
        invalidateFrom(index);
      }

      const observer = new ResizeObserver(([entry]) => {
        if (!entry) return;
        const measured = entry.contentRect.height;
        if (measured <= 0 || measuredSizesRef.current.get(index) === measured) {
          return;
        }
        measuredSizesRef.current.set(index, measured);
        invalidateFrom(index);
      });
      observer.observe(element);
      rowObserversRef.current.set(index, observer);
    },
    [enableDynamicSize, invalidateFrom],
  );

  // Disconnect any lingering row observers on unmount.
  useEffect(() => {
    return () => {
      rowObserversRef.current.forEach((observer) => observer.disconnect());
      rowObserversRef.current.clear();
    };
  }, []);

  const virtualItems = useMemo<VirtualItem[]>(() => {
    if (rowCount <= 0 || viewportHeight <= 0) return [];

    if (!enableDynamicSize) {
      // Fixed-height fast path: pure arithmetic, no array allocation,
      // O(1) regardless of rowCount. This is the original behavior and
      // what the 100k-row performance benchmarks were measured against.
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
    }

    // Dynamic-height path: offsets aren't evenly spaced, so binary
    // search the cumulative-offset cache instead of dividing by a
    // constant row height.
    const offsets = dynamicOffsets ?? [0];
    let low = 0;
    let high = rowCount - 1;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (offsets[mid + 1] <= scrollTop) low = mid + 1;
      else high = mid;
    }
    const startIndex = Math.max(0, low - overscan);

    const viewportBottom = scrollTop + viewportHeight;
    let endIndex = startIndex;
    while (endIndex < rowCount - 1 && offsets[endIndex + 1] < viewportBottom) {
      endIndex += 1;
    }
    endIndex = Math.min(rowCount - 1, endIndex + overscan);

    const items: VirtualItem[] = [];
    for (let index = startIndex; index <= endIndex; index += 1) {
      items.push({
        index,
        start: offsets[index],
        size: offsets[index + 1] - offsets[index],
      });
    }
    return items;
  }, [
    scrollTop,
    viewportHeight,
    rowCount,
    rowHeight,
    overscan,
    enableDynamicSize,
    dynamicOffsets,
  ]);

  const totalSize = enableDynamicSize
    ? (dynamicOffsets?.[rowCount] ?? 0)
    : rowCount * rowHeight;
  const getItemOffset = useCallback(
    (index: number): number => {
      if (!enableDynamicSize) return index * rowHeight;
      return dynamicOffsets?.[index] ?? index * rowHeight;
    },
    [enableDynamicSize, rowHeight, dynamicOffsets],
  );

  const getItemSize = useCallback(
    (index: number): number => {
      if (!enableDynamicSize) return rowHeight;
      const offsets = dynamicOffsets;
      if (!offsets) return rowHeight;
      return (
        (offsets[index + 1] ?? offsets[index] + rowHeight) - offsets[index]
      );
    },
    [enableDynamicSize, rowHeight, dynamicOffsets],
  );

  return {
    scrollElementRef,
    virtualItems,
    totalSize,
    measureElement,
    getItemOffset,
    getItemSize,
  };
}
