import type { JobSummary } from './model';

// Single source of truth for "is there nothing left to poll for," shared by
// JobList and JobDetail (JobDetail's data is a JobSummary too, via extends).
// Not just `job.status !== 'pending' && !== 'in_progress'`: cancelling flips
// job.status to 'cancelled' immediately, while the in-flight checks it let
// finish (and the still-queued ones waiting for a slot) keep changing for a
// while after — so 'cancelled' additionally needs the counts to have caught
// up. 'completed'/'failed' both mean the background loop has already exited
// for good (nothing will ever change again), so they're settled outright.
export function isJobSettled(job: JobSummary): boolean {
  if (job.status === 'completed' || job.status === 'failed') {
    return true;
  }
  if (job.status === 'cancelled') {
    return job.successCount + job.errorCount + job.cancelledCount === job.urlCount;
  }
  return false;
}
