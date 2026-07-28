// src/components/compound/Combobox/Group.tsx
"use client";

import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/core/utils/cn";
import styles from "./Combobox.module.css";

export interface ComboboxGroupProps extends HTMLAttributes<HTMLUListElement> {
  /** Visible + accessible group heading, e.g. "Recent", "Team members". */
  label: string;
  children: ReactNode;
}

/**
 * Groups a run of <Combobox.Item>s under a heading. Uses role="group"
 * rather than a second role="listbox" — a listbox can only ever have one
 * accessible "selected" set, so nesting listboxes would break aria
 * semantics. The visible label doubles as aria-label on the group so
 * screen readers announce "Recent, group" once, not per-item.
 */
export function ComboboxGroup({
  label,
  className,
  children,
  ...props
}: ComboboxGroupProps) {
  return (
    <li role="presentation" className={styles.groupWrapper}>
      <div className={styles.groupLabel} aria-hidden="true">
        {label}
      </div>
      <ul
        role="group"
        aria-label={label}
        className={cn(styles.groupList, className)}
        {...props}
      >
        {children}
      </ul>
    </li>
  );
}

export default ComboboxGroup;
