// src/components/primitive/FieldError.tsx

interface FieldErrorProps {
  id: string;
  message?: string;
}

/**
 * Always renders the same element (present or empty) so screen readers
 * are already subscribed to it via aria-live before an error appears —
 * swapping the element in/out on error would mean the first error of a
 * session goes unannounced.
 */
export function FieldError({ id, message }: FieldErrorProps) {
  return (
    <p
      id={id}
      aria-live="polite"
      className="mt-1.5 min-h-\[1\.25rem\] text-sm text-red-600"
    >
      {message ?? ""}
    </p>
  );
}
