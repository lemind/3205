export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      className={`loading loading-bars text-accent neon-text ${className}`}
      aria-label="loading"
      role="status"
    />
  );
}
