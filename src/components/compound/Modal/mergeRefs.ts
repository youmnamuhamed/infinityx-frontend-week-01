import type { Ref } from "react";

/**
 * Combines multiple refs (forwarded + internal) into one callback ref.
 * Used wherever a component needs to attach its own ref to a node
 * (e.g. Modal.Content's focus-trap ref) while still forwarding whatever
 * ref the consumer passed in.
 */
export function mergeRefs<T>(...refs: Array<Ref<T> | undefined>) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === "function") ref(node);
      else (ref as { current: T | null }).current = node;
    }
  };
}

export default mergeRefs;
