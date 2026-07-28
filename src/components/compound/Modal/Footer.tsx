import type { HTMLAttributes } from "react";
import { cn } from "@/core/utils/cn";
import styles from "./Modal.module.css";

export function ModalFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(styles.footer, className)} {...props} />;
}

export default ModalFooter;
