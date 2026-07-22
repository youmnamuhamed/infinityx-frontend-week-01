// src/components/skeletons/MetricsCardSkeleton.tsx
export function MetricsCardSkeleton() {
  return (
    <div
      className="metrics-card-skeleton"
      role="status"
      aria-live="polite"
      aria-label="Loading dashboard metrics"
    >
      <div className="skeleton-line skeleton-line--title" />
      <div className="skeleton-line skeleton-line--value" />
      <div className="skeleton-line skeleton-line--subtitle" />
    </div>
  );
}
