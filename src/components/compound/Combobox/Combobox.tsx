// src/components/compound/Combobox/Combobox.tsx
"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { ComboboxContext } from "./context";
import styles from "./Combobox.module.css";

export interface ComboboxRootProps {
  /** Uncontrolled default text, e.g. when editing an existing selection. */
  defaultInputValue?: string;
  onInputValueChange?: (value: string) => void;

  /**
   * Controlled selected-option id. Omit both this and onValueChange to let
   * Combobox track selection internally (the common case) — pass both
   * when an outer form (react-hook-form, etc.) needs to own the value,
   * same controlled/uncontrolled split Modal uses for `open`.
   */
  value?: string | null;
  onValueChange?: (id: string, label: string) => void;

  children: ReactNode;
}

/**
 * The bare <Combobox> tag acts as root/provider — sub-components (Input,
 * List, Item, Group) attach as static properties in ./index.tsx.
 *
 * Deliberately headless: Combobox does NOT own your item list or filter
 * it for you. You filter your own array by context's inputValue and
 * render <Combobox.Item> for whatever matches — that's what gives you
 * free-form custom item templates and grouped sections instead of a
 * rigid `items` + `renderItem` API.
 */
export function ComboboxRoot({
  defaultInputValue = "",
  onInputValueChange,
  value: controlledValue,
  onValueChange,
  children,
}: ComboboxRootProps) {
  const listboxId = useId();
  const inputId = useId();
  const listRef = useRef<HTMLElement | null>(null);

  const [inputValue, setInputValueState] = useState(defaultInputValue);
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [uncontrolledSelectedId, setUncontrolledSelectedId] = useState<
    string | null
  >(null);
  const [selectedLabel, setSelectedLabel] = useState("");

  const isControlled = controlledValue !== undefined;
  const selectedId = isControlled ? controlledValue : uncontrolledSelectedId;

  const setInputValue = (next: string) => {
    setInputValueState(next);
    onInputValueChange?.(next);
  };

  const selectItem = (id: string, label: string) => {
    if (!isControlled) setUncontrolledSelectedId(id);
    setSelectedLabel(label);
    setInputValue(label);
    setOpen(false);
    setActiveId(null);
    onValueChange?.(id, label);
  };

  return (
    <ComboboxContext.Provider
      value={{
        inputValue,
        setInputValue,
        open,
        setOpen,
        activeId,
        setActiveId,
        selectedId: selectedId ?? null,
        selectedLabel,
        selectItem,
        listboxId,
        inputId,
        listRef,
      }}
    >
      {/* position:relative anchor so Combobox.List can position itself
          absolutely against Input, without every consumer having to
          remember to wrap the two in a positioned container. */}
      <div className={styles.root}>{children}</div>
    </ComboboxContext.Provider>
  );
}

export default ComboboxRoot;
