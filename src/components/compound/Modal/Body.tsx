import type { HTMLAttributes } from "react";
import { cn } from "@/core/utils/cn";
import styles from "./Modal.module.css";

export function ModalBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(styles.body, className)} {...props} />;
}

export default ModalBody;
