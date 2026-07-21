import { UrlCheckResult } from './url-check-result';

export type JobStatus =
  'pending' | 'in_progress' | 'completed' | 'cancelled' | 'failed';

export interface Job {
  id: string;
  createdAt: string;
  status: JobStatus;
  results: UrlCheckResult[];
  cancelledAt: string | null;
}

/** Wire shape for GET /api/jobs — urlCount/successCount/errorCount are derived, not stored (see data-model.md). */
export interface JobSummaryResponse {
  id: string;
  createdAt: string;
  status: JobStatus;
  urlCount: number;
  successCount: number;
  errorCount: number;
}

/** Wire shape for GET /api/jobs/:id. */
export interface JobDetailResponse extends JobSummaryResponse {
  results: UrlCheckResult[];
}
