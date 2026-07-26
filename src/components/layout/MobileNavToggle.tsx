// src/components/layout/MobileNavToggle.tsx
"use client";

import { useMobileNav } from "@/core/state/mobile-nav-context";

export function MobileNavToggle() {
  const { isOpen, toggle } = useMobileNav();

  return (
    <button
      type="button"
      className="mobile-nav-toggle"
      onClick={toggle}
      aria-expanded={isOpen}
      aria-controls="mobile-navigation-drawer"
      aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
    >
      <span className="mobile-nav-toggle__bar" />
      <span className="mobile-nav-toggle__bar" />
      <span className="mobile-nav-toggle__bar" />
    </button>
  );
}
