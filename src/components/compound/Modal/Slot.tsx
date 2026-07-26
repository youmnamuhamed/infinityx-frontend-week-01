"use client";

import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from "react";
import { mergeRefs } from "@/core/utils/mergeRefs";

/**
 * IX-Design — Slot
 * -----------------------------------------------------------------------
 * Enables the `asChild` prop pattern: instead of a component always
 * rendering its own DOM element (e.g. <button>), `asChild` tells it to
 * merge its behavior/props/ref onto whatever single child element the
 * consumer passed in — so <Modal.Trigger asChild><a href="...">...
 * </a></Modal.Trigger> renders a real <a>, not a <button> wrapping an
 * <a> (which is invalid HTML and breaks styling/semantics).
 *
 * Usage inside a component:
 *   const Component = asChild ? Slot : "button";
 *   return <Component {...props}>{children}</Component>;
 */

type AnyProps = Record<string, unknown>;

function mergeProps(slotProps: AnyProps, childProps: AnyProps): AnyProps {
  const merged: AnyProps = { ...slotProps, ...childProps };

  for (const key in childProps) {
    const slotValue = slotProps[key];
    const childValue = childProps[key];
    const isHandler = /^on[A-Z]/.test(key);

    if (isHandler && typeof slotValue === "function" && typeof childValue === "function") {
      merged[key] = (...args: unknown[]) => {
        (childValue as (...a: unknown[]) => void)(...args);
        (slotValue as (...a: unknown[]) => void)(...args);
      };
    } else if (key === "className") {
      merged[key] = [slotValue, childValue].filter(Boolean).join(" ");
    } else if (key === "style") {
      merged[key] = { ...(slotValue as object), ...(childValue as object) };
    }
  }

  return merged;
}

export interface SlotProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
}

export const Slot = forwardRef<HTMLElement, SlotProps>(function Slot(
  { children, ...slotProps },
  ref
) {
  if (!isValidElement(children)) {
    if (Children.count(children) > 1) {
      throw new Error(
        "Slot: asChild requires exactly one child element, but multiple children were passed."
      );
    }
    return null;
  }

  const child = children as React.ReactElement<AnyProps> & { ref?: Ref<unknown> };

  return cloneElement(child, {
    ...mergeProps(slotProps as AnyProps, child.props),
    ref: mergeRefs(ref, child.ref),
  });
});

export default Slot;
