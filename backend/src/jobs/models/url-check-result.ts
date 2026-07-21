export type UrlCheckStatus =
  'pending' | 'in_progress' | 'success' | 'error' | 'cancelled';

export interface UrlCheckResult {
  url: string;
  status: UrlCheckStatus;
  httpStatus: number | null;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
}
