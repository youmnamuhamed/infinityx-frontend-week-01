/**
 * Joins truthy class names together, filtering out false/null/undefined.
 * Deliberately minimal — no conflict-resolution (unlike tailwind-merge)
 * since IX-Design components use scoped CSS Modules, not competing
 * Tailwind utility classes, so there's nothing to reconcile.
 */
export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}

export default cn;
