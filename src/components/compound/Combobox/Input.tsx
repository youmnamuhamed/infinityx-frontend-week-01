// src/components/compound/Combobox/Input.tsx
"use client";

import {
  forwardRef,
  useEffect,
  type ChangeEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
} from "react";
import { cn } from "@/core/utils/cn";
import { useComboboxContext } from "./context";
import styles from "./Combobox.module.css";

// Only options actually available for keyboard selection — mirrors
// useFocusTrap's disabled-exclusion approach for the same reason: a
// visually-present-but-disabled option shouldn't eat an Arrow keypress.
const OPTION_SELECTOR = '[data-ix-combobox-item]:not([data-disabled="true"])';

function getOptionElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLElement>(OPTION_SELECTOR));
}

export interface ComboboxInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value"
> {}

export const ComboboxInput = forwardRef<HTMLInputElement, ComboboxInputProps>(
  function ComboboxInput(
    { className, onChange, onKeyDown, onFocus, onBlur, ...props },
    forwardedRef,
  ) {
    const {
      inputValue,
      setInputValue,
      open,
      setOpen,
      activeId,
      setActiveId,
      listboxId,
      inputId,
      listRef,
    } = useComboboxContext("Input");

    const moveActive = (direction: 1 | -1) => {
      const options = getOptionElements(listRef.current);
      if (options.length === 0) return;

      const currentIndex = options.findIndex((el) => el.id === activeId);
      let nextIndex = currentIndex + direction;
      if (nextIndex < 0) nextIndex = options.length - 1;
      if (nextIndex >= options.length) nextIndex = 0;

      const next = options[nextIndex];
      setActiveId(next.id);
      next.scrollIntoView({ block: "nearest" });
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
      onKeyDown?.(event);

      switch (event.key) {
        case "ArrowDown": {
          event.preventDefault();
          if (!open) {
            setOpen(true);
            // Deferred a frame so the listbox has mounted (Combobox.List
            // is conditionally rendered, same reasoning as Modal.Portal)
            // before we try to query its options.
            requestAnimationFrame(() => moveActive(1));
          } else {
            moveActive(1);
          }
          break;
        }
        case "ArrowUp": {
          event.preventDefault();
          if (!open) {
            setOpen(true);
            requestAnimationFrame(() => moveActive(-1));
          } else {
            moveActive(-1);
          }
          break;
        }
        case "Home": {
          if (!open) return;
          event.preventDefault();
          const [first] = getOptionElements(listRef.current);
          if (first) {
            setActiveId(first.id);
            first.scrollIntoView({ block: "nearest" });
          }
          break;
        }
        case "End": {
          if (!open) return;
          event.preventDefault();
          const options = getOptionElements(listRef.current);
          const last = options[options.length - 1];
          if (last) {
            setActiveId(last.id);
            last.scrollIntoView({ block: "nearest" });
          }
          break;
        }
        case "Enter": {
          if (!open || !activeId) return;
          event.preventDefault();
          // Routes through the option's own click handler (selectItem)
          // rather than duplicating selection logic here.
          document.getElementById(activeId)?.click();
          break;
        }
        case "Escape": {
          if (!open) return;
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          setActiveId(null);
          break;
        }
        default:
          break;
      }
    };

    // If typing narrows the filtered results and the active option no
    // longer exists, drop it — otherwise aria-activedescendant would
    // point at an id that's no longer in the DOM.
    useEffect(() => {
      if (!open || !activeId) return;
      const stillPresent = getOptionElements(listRef.current).some(
        (el) => el.id === activeId,
      );
      if (!stillPresent) setActiveId(null);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inputValue, open]);

    return (
      <input
        ref={forwardedRef}
        id={inputId}
        type="text"
        role="combobox"
        autoComplete="off"
        spellCheck={false}
        value={inputValue}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          setInputValue(event.target.value);
          setOpen(true);
          setActiveId(null);
          onChange?.(event);
        }}
        onFocus={(event) => {
          onFocus?.(event);
          setOpen(true);
        }}
        onBlur={(event) => {
          onBlur?.(event);
          // Deferred so a mousedown-click on an option (which blurs the
          // input first) still lands before the listbox unmounts.
          setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={handleKeyDown}
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={activeId ?? undefined}
        aria-autocomplete="list"
        className={cn(styles.input, className)}
        {...props}
      />
    );
  },
);

export default ComboboxInput;
