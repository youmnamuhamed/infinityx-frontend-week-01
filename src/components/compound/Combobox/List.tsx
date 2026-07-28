// src/components/compound/Combobox/List.tsx
"use client";

import {
  Children,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { mergeRefs } from "@/core/utils/mergeRefs";
import { cn } from "@/core/utils/cn";
import { useComboboxContext } from "./context";
import styles from "./Combobox.module.css";

export interface ComboboxListProps extends HTMLAttributes<HTMLUListElement> {
  /**
   * Rendered when there are zero <Combobox.Item> children. Combobox is
   * headless and doesn't know your data, so it can't detect "no results"
   * on its own — pass this alongside whatever filtered array produced
   * zero matches.
   */
  emptyState?: ReactNode;
}

/**
 * The popover surface. Unmounts entirely when closed (same reasoning as
 * Modal.Portal) — keeps a closed listbox out of the a11y tree and lets
 * Input's live DOM-query for options return an honest empty result
 * rather than stale hidden nodes.
 */
export const ComboboxList = forwardRef<HTMLUListElement, ComboboxListProps>(
  function ComboboxList(
    { className, children, emptyState, ...props },
    forwardedRef,
  ) {
    const { open, listboxId, listRef } = useComboboxContext("List");

    if (!open) return null;

    const hasChildren = Children.count(children) > 0;

    return (
      <ul
        ref={mergeRefs(forwardedRef, listRef)}
        id={listboxId}
        role="listbox"
        className={cn(styles.list, className)}
        {...props}
      >
        {hasChildren ? (
          children
        ) : (
          <li className={styles.emptyState}>{emptyState ?? "No results"}</li>
        )}
      </ul>
    );
  },
);

export default ComboboxList;
