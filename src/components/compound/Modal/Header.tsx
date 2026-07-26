import type { HTMLAttributes } from "react";
import { cn } from "@/core/utils/cn";
import styles from "./Modal.module.css";

export function ModalHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(styles.header, className)} {...props} />;
}

export default ModalHeader;
