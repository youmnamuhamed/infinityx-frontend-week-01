// src/components/compound/Combobox/context.ts
"use client";

import { createContext, useContext, type RefObject } from "react";

export interface ComboboxContextValue {
  /** Current text in the input. Combobox owns this unless a consumer wants full control later — headless by design, so filtering is the consumer's job, not ours. */
  inputValue: string;
  setInputValue: (value: string) => void;

  /** Whether the listbox popover is visible. */
  open: boolean;
  setOpen: (open: boolean) => void;

  /** id of the currently-active (highlighted) option, or null if none. Drives aria-activedescendant on the input — focus never actually leaves the input, per the ARIA 1.2 combobox pattern. */
  activeId: string | null;
  setActiveId: (id: string | null) => void;

  /** Currently selected option's id + label, so <Combobox.Item> can render its own aria-selected and Input can show the picked label. */
  selectedId: string | null;
  selectedLabel: string;
  selectItem: (id: string, label: string) => void;

  /** Stable ids so Input <-> List can link via aria-controls / aria-labelledby without prop drilling. */
  listboxId: string;
  inputId: string;

  /** Root node of the popover list, used to live-query rendered `[data-ix-combobox-item]` elements for Arrow/Home/End navigation — same approach as useFocusTrap's getFocusableElements, rather than keeping a separate item registry in sync. */
  listRef: RefObject<HTMLElement | null>;
}

export const ComboboxContext = createContext<ComboboxContextValue | null>(null);

/**
 * All Combobox.* sub-components call this instead of useContext directly,
 * so rendering e.g. <Combobox.Item> outside a <Combobox> fails loudly
 * instead of crashing on `null.selectItem`.
 */
export function useComboboxContext(
  componentName: string,
): ComboboxContextValue {
  const ctx = useContext(ComboboxContext);
  if (!ctx) {
    throw new Error(
      `Combobox.${componentName} must be rendered within a <Combobox> root component.`,
    );
  }
  return ctx;
}
