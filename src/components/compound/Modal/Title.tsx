"use client";

import type { HTMLAttributes } from "react";
import { cn } from "@/core/utils/cn";
import { useModalContext } from "./context";
import styles from "./Modal.module.css";

export function ModalTitle({ id, className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  const { titleId } = useModalContext("Title");

  // Uses the context-generated id by default so Content's aria-labelledby
  // resolves automatically — but an explicit `id` prop (as in the spec's
  // usage example, id="modal-title") always wins.
  return <h2 id={id ?? titleId} className={cn(styles.title, className)} {...props} />;
}

export default ModalTitle;
