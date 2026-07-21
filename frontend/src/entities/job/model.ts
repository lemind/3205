export type JobStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'failed';

export type UrlCheckStatus = 'pending' | 'in_progress' | 'success' | 'error' | 'cancelled';

export interface UrlCheckResult {
  url: string;
  status: UrlCheckStatus;
  httpStatus: number | null;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
}

export interface JobSummary {
  id: string;
  createdAt: string;
  status: JobStatus;
  urlCount: number;
  successCount: number;
  errorCount: number;
  cancelledCount: number;
}

export interface JobDetail extends JobSummary {
  results: UrlCheckResult[];
}
