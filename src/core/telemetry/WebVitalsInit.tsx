"use client";

import { useEffect } from "react";
import { initWebVitals } from "./webVitals";

/**
 * Mounts once in the root layout to start Core Web Vitals observation.
 * Kept as its own client component so RootLayout can stay a Server
 * Component. Renders nothing.
 */
export function WebVitalsInit(): null {
  useEffect(() => {
    initWebVitals();
  }, []);

  return null;
}
