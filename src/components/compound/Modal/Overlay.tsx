"use client";

import type { HTMLAttributes } from "react";
import { cn } from "@/core/utils/cn";
import { useModalContext } from "./context";
import styles from "./Modal.module.css";

export interface ModalOverlayProps extends HTMLAttributes<HTMLDivElement> {}

export function ModalOverlay({ className, onClick, ...props }: ModalOverlayProps) {
  const { onOpenChange } = useModalContext("Overlay");

  return (
    <div
      className={cn(styles.overlay, className)}
      aria-hidden="true"
      onClick={(event) => {
        onClick?.(event);
        onOpenChange(false);
      }}
      {...props}
    />
  );
}

export default ModalOverlay;
