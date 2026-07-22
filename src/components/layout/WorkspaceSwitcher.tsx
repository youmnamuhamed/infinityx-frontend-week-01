// src/components/layout/WorkspaceSwitcher.tsx
"use client";

import { useState, useRef, useId } from "react";

interface WorkspaceSwitcherProps {
  currentWorkspaceName: string;
}

export function WorkspaceSwitcher({
  currentWorkspaceName,
}: WorkspaceSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonId = useId();
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      setIsOpen(false);
      containerRef.current?.querySelector("button")?.focus();
    }
  }

  return (
    <div
      className="workspace-switcher"
      ref={containerRef}
      onKeyDown={handleKeyDown}
    >
      <button
        id={buttonId}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listId}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        {currentWorkspaceName}
      </button>

      {isOpen && (
        <ul id={listId} role="listbox" aria-labelledby={buttonId}>
          <li role="option" aria-selected="true">
            {currentWorkspaceName}
          </li>
        </ul>
      )}
    </div>
  );
}
