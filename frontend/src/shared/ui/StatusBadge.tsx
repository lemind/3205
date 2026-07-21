import type { ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'error';

const TONE_CLASS: Record<BadgeTone, string> = {
  neutral: 'badge-neutral',
  info: 'badge-info',
  success: 'badge-success',
  warning: 'badge-warning',
  error: 'badge-error',
};

export function StatusBadge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={`badge badge-sm badge-outline neon-text font-mono ${TONE_CLASS[tone]} min-w-24 justify-center whitespace-nowrap`}
    >
      [ {children} ]
    </span>
  );
}
