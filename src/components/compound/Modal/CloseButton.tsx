"use client";

import { forwardRef, type ButtonHTMLAttributes, type MouseEvent, type ReactNode } from "react";
import { Slot } from "@/components/utility/Slot";
import { cn } from "@/core/utils/cn";
import { useModalContext } from "./context";
import styles from "./Modal.module.css";

export interface ModalCloseButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  children?: ReactNode;
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M4 4L12 12M12 4L4 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export const ModalCloseButton = forwardRef<HTMLButtonElement, ModalCloseButtonProps>(
  function ModalCloseButton({ asChild = false, onClick, children, className, ...props }, ref) {
    const { onOpenChange } = useModalContext("CloseButton");
    const Component = asChild ? Slot : "button";

    const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);
      onOpenChange(false);
    };

    return (
      <Component
        ref={ref}
        type={asChild ? undefined : "button"}
        aria-label={children ? undefined : "Close dialog"}
        className={cn(styles.closeButton, className)}
        onClick={handleClick as never}
        {...props}
      >
        {children ?? <XIcon />}
      </Component>
    );
  }
);

export default ModalCloseButton;
