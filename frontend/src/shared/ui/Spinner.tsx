export function Spinner({ className = '' }: { className?: string }) {
  return <span className={`loading loading-spinner ${className}`} aria-label="loading" role="status" />;
}
