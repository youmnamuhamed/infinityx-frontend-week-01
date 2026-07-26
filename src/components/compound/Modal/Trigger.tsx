"use client";

import { forwardRef, type ButtonHTMLAttributes, type MouseEvent, type ReactNode } from "react";
import { Slot } from "@/components/utility/Slot";
import { mergeRefs } from "@/core/utils/mergeRefs";
import { useModalContext } from "./context";

export interface ModalTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  children?: ReactNode;
}

export const ModalTrigger = forwardRef<HTMLButtonElement, ModalTriggerProps>(
  function ModalTrigger({ asChild = false, onClick, children, ...props }, forwardedRef) {
    const { onOpenChange, triggerRef } = useModalContext("Trigger");
    const Component = asChild ? Slot : "button";

    const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);
      onOpenChange(true);
    };

    return (
      <Component
        ref={mergeRefs(forwardedRef, triggerRef as never)}
        aria-haspopup="dialog"
        type={asChild ? undefined : "button"}
        onClick={handleClick as never}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

export default ModalTrigger;
