"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "./swRegister";

/**
 * Mounts once in the root layout to register the offline service worker.
 * No-ops in development unless NEXT_PUBLIC_ENABLE_SW=true — see
 * swRegister.ts for why. Renders nothing.
 */
export function ServiceWorkerInit(): null {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return null;
}
