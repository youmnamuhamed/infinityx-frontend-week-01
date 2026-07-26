// src/components/layout/MobileNavigationDrawer.tsx
"use client";

import { useEffect, useRef } from "react";

import { useMobileNav } from "@/core/state/mobile-nav-context";

export function MobileNavigationDrawer() {
  const { isOpen, close } = useMobileNav();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    panelRef.current?.querySelector("a")?.focus();

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, close]);

  return (
    <>
      <div
        className="mobile-nav-backdrop"
        data-open={isOpen}
        onClick={close}
        aria-hidden="true"
      />
      <div
        id="mobile-navigation-drawer"
        className="mobile-nav-drawer"
        data-open={isOpen}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
        ref={panelRef}
      >
        <nav>
          <ul>
            <li>
              <a href="#" onClick={close}>
                Analytics
              </a>
            </li>
            <li>
              <a href="#" onClick={close}>
                Settings
              </a>
            </li>
            <li>
              <a href="#" onClick={close}>
                Resources
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </>
  );
}
