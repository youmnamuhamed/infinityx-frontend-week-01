import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/core/utils/cn";
import styles from "./Badge.module.css";

export type BadgeVariant =
  | "neutral"
  | "accent"
  | "success"
  | "warning"
  | "danger";
export type BadgeSize = "sm" | "md";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  /** Shows a small status dot before the label (e.g. for connection/health state). */
  withDot?: boolean;
  children?: ReactNode;
}

const variantClass: Record<BadgeVariant, string> = {
  neutral: styles.neutral,
  accent: styles.accent,
  success: styles.success,
  warning: styles.warning,
  danger: styles.danger,
};

const sizeClass: Record<BadgeSize, string> = {
  sm: styles.sm,
  md: styles.md,
};

export function Badge({
  variant = "neutral",
  size = "md",
  withDot = false,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        styles.badge,
        variantClass[variant],
        sizeClass[size],
        className,
      )}
      {...props}
    >
      {withDot && <span className={styles.dot} aria-hidden="true" />}
      {children}
    </span>
  );
}

export default Badge;
