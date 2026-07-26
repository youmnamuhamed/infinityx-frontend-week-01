"use client";

import { forwardRef, useEffect, type HTMLAttributes, type KeyboardEvent } from "react";
import { useFocusTrap } from "@/core/hooks/useFocusTrap";
import { mergeRefs } from "@/core/utils/mergeRefs";
import { cn } from "@/core/utils/cn";
import { useModalContext } from "./context";
import styles from "./Modal.module.css";

export type ModalContentSize = "sm" | "md" | "lg" | "xl";

export interface ModalContentProps extends HTMLAttributes<HTMLDivElement> {
  size?: ModalContentSize;
}

const sizeClass: Record<ModalContentSize, string> = {
  sm: styles.sizeSm,
  md: styles.sizeMd,
  lg: styles.sizeLg,
  xl: styles.sizeXl,
};

export const ModalContent = forwardRef<HTMLDivElement, ModalContentProps>(
  function ModalContent(
    { size = "md", className, children, onKeyDown, "aria-labelledby": ariaLabelledBy, ...props },
    forwardedRef
  ) {
    const { open, onOpenChange, titleId } = useModalContext("Content");
    const trapRef = useFocusTrap<HTMLDivElement>({ active: open });

    // Body scroll lock while the dialog is open, restored exactly on close.
    useEffect(() => {
      if (!open) return;
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }, [open]);

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event);
      if (event.key === "Escape") {
        event.stopPropagation();
        onOpenChange(false);
      }
    };

    return (
      <div
        ref={mergeRefs(forwardedRef, trapRef)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy ?? titleId}
        className={cn(styles.content, sizeClass[size], className)}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {children}
      </div>
    );
  }
);

export default ModalContent;
