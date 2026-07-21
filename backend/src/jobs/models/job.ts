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
