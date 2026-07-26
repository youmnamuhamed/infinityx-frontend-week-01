// src/components/skeletons/ResourceListSkeleton.tsx
export function ResourceListSkeleton() {
  return (
    <div
      className="resource-list-skeleton"
      role="status"
      aria-live="polite"
      aria-label="Loading resource details"
    >
      <div className="skeleton-line skeleton-line--title" />
      <div className="skeleton-block" />
      <div className="skeleton-line skeleton-line--wide" />
      <div className="skeleton-line skeleton-line--wide" />
    </div>
  );
}