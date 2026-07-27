// src/components/compound/Combobox/Item.tsx
"use client";

import { useId, type HTMLAttributes, type MouseEvent } from "react";
import { cn } from "@/core/utils/cn";
import { useComboboxContext } from "./context";
import styles from "./Combobox.module.css";

export interface ComboboxItemProps extends Omit<
  HTMLAttributes<HTMLLIElement>,
  "id"
> {
  /**
   * Stable id for this option (e.g. a record id). Falls back to a
   * generated one if omitted, but pass your own whenever the option
   * represents real data — a generated id can drift across re-filters.
   */
  id?: string;
  /**
   * Plain-text label used to fill Input's value on selection. Keep this
   * in sync with whatever's visually rendered as `children`, even when
   * children is a richer custom template (icon + name + description).
   */
  label: string;
  disabled?: boolean;
}

export function ComboboxItem({
  id: idProp,
  label,
  disabled = false,
  className,
  onClick,
  onMouseEnter,
  children,
  ...props
}: ComboboxItemProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const { activeId, selectedId, setActiveId, selectItem } =
    useComboboxContext("Item");

  const isActive = activeId === id;
  const isSelected = selectedId === id;

  return (
    <li
      id={id}
      role="option"
      data-ix-combobox-item=""
      data-disabled={disabled || undefined}
      aria-selected={isSelected}
      aria-disabled={disabled || undefined}
      className={cn(
        styles.item,
        isActive && styles.itemActive,
        isSelected && styles.itemSelected,
        disabled && styles.itemDisabled,
        className,
      )}
      onMouseEnter={(event) => {
        onMouseEnter?.(event);
        if (!disabled) setActiveId(id);
      }}
      onClick={(event: MouseEvent<HTMLLIElement>) => {
        onClick?.(event);
        if (disabled) return;
        selectItem(id, label);
      }}
      {...props}
    >
      {children ?? label}
    </li>
  );
}

export default ComboboxItem;
