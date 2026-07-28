// ---------------------------------------------------------------------------
// Service Worker Registration
//
// Deliberately opt-in via registerServiceWorker() rather than auto-running
// at import time, and gated to production by default — an active SW caching
// assets actively fights Next.js's dev HMR/Fast Refresh (stale content after
// a code change is a genuinely confusing bug to chase if you don't know why).
// Force-enable locally with NEXT_PUBLIC_ENABLE_SW=true if you need to test
// the SW itself in development.
// ---------------------------------------------------------------------------

export interface ServiceWorkerRegistrationResult {
  registration: ServiceWorkerRegistration | null;
  supported: boolean;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistrationResult> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return { registration: null, supported: false };
  }

  if (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_ENABLE_SW !== "true"
  ) {
    return { registration: null, supported: true };
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });

    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      if (!newWorker) return;
      newWorker.addEventListener("statechange", () => {
        if (
          newWorker.state === "installed" &&
          navigator.serviceWorker.controller
        ) {
          // A new SW finished installing while an old one still controls
          // this page. This is the manual signal; the bonus chunk-load
          // auto-healer builds on this to refresh automatically instead
          // of just logging.
          console.info(
            "[swRegister] A new version is available. Reload to update.",
          );
        }
      });
    });

    return { registration, supported: true };
  } catch (error) {
    console.error("[swRegister] Service worker registration failed:", error);
    return { registration: null, supported: true };
  }
}

export async function unregisterServiceWorker(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((r) => r.unregister()));
}
