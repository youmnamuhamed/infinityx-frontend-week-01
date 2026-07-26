"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Slot } from "../utility/Slot";
import { cn } from "@/core/utils/cn";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner and marks the button aria-busy; disables interaction. */
  loading?: boolean;
  /**
   * Merges this button's props/behavior onto its single child element
   * instead of rendering a <button> — e.g. to render an <a> that looks
   * and behaves like a button. See <Slot> for the mechanism.
   */
  asChild?: boolean;
  children?: ReactNode;
}

const variantClass: Record<ButtonVariant, string> = {
  primary: styles.primary,
  secondary: styles.secondary,
  danger: styles.danger,
  ghost: styles.ghost,
};

const sizeClass: Record<ButtonSize, string> = {
  sm: styles.sm,
  md: styles.md,
  lg: styles.lg,
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      loading = false,
      asChild = false,
      disabled,
      className,
      children,
      ...props
    },
    ref,
  ) {
    const Component = asChild ? Slot : "button";
    const isDisabled = Boolean(disabled) || loading;

    return (
      <Component
        ref={ref}
        className={cn(
          styles.btn,
          variantClass[variant],
          sizeClass[size],
          loading && styles.loading,
          className,
        )}
        // A child like <a> has no `disabled` attribute — aria-disabled
        // communicates the same state without producing invalid HTML.
        disabled={asChild ? undefined : isDisabled}
        aria-disabled={isDisabled || undefined}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && <span className={styles.spinner} aria-hidden="true" />}
        <span className={cn(loading && styles.labelLoading)}>{children}</span>
      </Component>
    );
  },
);

export default Button;
